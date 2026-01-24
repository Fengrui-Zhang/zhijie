import fs from 'node:fs/promises';
import path from 'node:path';
import { embedText } from './embedding';

type KnowledgeChunk = {
  id: string;
  text: string;
  source: string;
  embedding: number[];
  docId?: string;
  groupId?: string;
  parentId?: string | null;
  level?: number;
  title?: string;
  order?: number;
  indexVersion?: number;
};

type KnowledgeIndex = {
  version: number;
  board: string;
  model: string;
  createdAt: string;
  chunks: KnowledgeChunk[];
};

type CachedChunk = KnowledgeChunk & {
  vector: Float32Array;
};

type CachedKnowledgeIndex = Omit<KnowledgeIndex, 'chunks'> & {
  chunks: CachedChunk[];
};

type RetrievedChunk = {
  text: string;
  source: string;
  score: number;
  id?: string;
  docId?: string;
  groupId?: string;
  parentId?: string | null;
  level?: number;
  title?: string;
  order?: number;
  indexVersion?: number;
};

const indexCache = new Map<string, CachedKnowledgeIndex>();
const USE_HIER_KNOWLEDGE = process.env.USE_HIER_KNOWLEDGE === 'true';

const normalizeVector = (input: number[]): Float32Array => {
  const vector = new Float32Array(input.length);
  let norm = 0;
  for (let i = 0; i < input.length; i += 1) {
    const value = input[i];
    norm += value * value;
  }
  norm = Math.sqrt(norm);
  if (!norm) {
    for (let i = 0; i < input.length; i += 1) {
      vector[i] = input[i];
    }
    return vector;
  }
  for (let i = 0; i < input.length; i += 1) {
    vector[i] = input[i] / norm;
  }
  return vector;
};

const loadIndex = async (board: string): Promise<CachedKnowledgeIndex | null> => {
  if (indexCache.has(board)) {
    return indexCache.get(board) ?? null;
  }

  const indexPath = path.join(process.cwd(), 'data', 'index', `${board}.json`);
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as KnowledgeIndex;
    const chunks = parsed.chunks.map(chunk => ({
      ...chunk,
      vector: normalizeVector(chunk.embedding),
    }));
    const cached: CachedKnowledgeIndex = { ...parsed, chunks };
    indexCache.set(board, cached);
    return cached;
  } catch {
    return null;
  }
};

const dotProduct = (a: Float32Array, b: Float32Array) => {
  let dot = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
  }

  return dot;
};

const normalizeText = (text: string) =>
  text.replace(/\s+/g, '').replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '').toLowerCase();

const buildBigrams = (text: string) => {
  const bigrams = new Set<string>();
  for (let i = 0; i < text.length - 1; i += 1) {
    bigrams.add(text.slice(i, i + 2));
  }
  return bigrams;
};

const isRedundant = (text: string, selected: string[]) => {
  const normalized = normalizeText(text);
  if (!normalized) return true;

  const bigrams = buildBigrams(normalized);
  for (const existing of selected) {
    const existingNormalized = normalizeText(existing);
    if (!existingNormalized) continue;
    if (existingNormalized.includes(normalized) || normalized.includes(existingNormalized)) {
      return true;
    }
    const existingBigrams = buildBigrams(existingNormalized);
    let intersection = 0;
    for (const bigram of bigrams) {
      if (existingBigrams.has(bigram)) intersection += 1;
    }
    const union = bigrams.size + existingBigrams.size - intersection;
    if (union > 0 && intersection / union > 0.85) return true;
  }
  return false;
};

const retrieveKnowledgeFlat = async (
  board: string,
  query: string,
  topK = 5,
  strict = false
): Promise<RetrievedChunk[]> => {
  const index = await loadIndex(board);
  if (!index || index.chunks.length === 0) {
    if (strict) {
      throw new Error(
        `Knowledge index not found for "${board}". Run: npm run ingest:knowledge -- ${board}`
      );
    }
    return [];
  }

  const queryEmbedding = await embedText(query);
  const queryVector = normalizeVector(queryEmbedding);
  const scored = index.chunks.map(chunk => ({
    text: chunk.text,
    source: chunk.source,
    score: dotProduct(queryVector, chunk.vector),
    id: chunk.id,
    docId: chunk.docId,
    groupId: chunk.groupId,
    parentId: chunk.parentId ?? undefined,
    level: chunk.level,
    title: chunk.title,
    order: chunk.order,
    indexVersion: chunk.indexVersion,
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
};

export const retrieveKnowledgeHierarchical = async (
  board: string,
  query: string,
  options: { topP?: number; topM?: number; maxChars?: number } = {},
  strict = false
): Promise<RetrievedChunk[]> => {
  const index = await loadIndex(board);
  if (!index || index.chunks.length === 0) {
    if (strict) {
      throw new Error(
        `Knowledge index not found for "${board}". Run: npm run ingest:knowledge -- ${board}`
      );
    }
    return [];
  }

  const parents = index.chunks.filter(chunk => chunk.level === 0);
  if (parents.length === 0) {
    return retrieveKnowledgeFlat(board, query, options.topM || 5, strict);
  }

  const queryEmbedding = await embedText(query);
  const queryVector = normalizeVector(queryEmbedding);

  const topP = Math.min(3, Math.max(1, options.topP ?? 2));
  const topM = Math.min(6, Math.max(3, options.topM ?? 4));
  const maxChars = Math.max(500, options.maxChars ?? 3500);

  const parentScores = parents
    .map(parent => ({
      parent,
      score: dotProduct(queryVector, parent.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topP);

  const childrenByParent = new Map<string, CachedChunk[]>();
  for (const chunk of index.chunks) {
    if (chunk.level !== 1 || !chunk.parentId) continue;
    const list = childrenByParent.get(chunk.parentId) || [];
    list.push(chunk);
    childrenByParent.set(chunk.parentId, list);
  }

  const results: RetrievedChunk[] = [];
  const selectedTexts: string[] = [];
  let usedChars = 0;

  for (const { parent, score } of parentScores) {
    const children = childrenByParent.get(parent.id) || [];
    const childScores = children
      .map(child => ({
        child,
        score: dotProduct(queryVector, child.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topM)
      .sort((a, b) => (a.child.order ?? 0) - (b.child.order ?? 0));

    const parts: string[] = [];
    if (parent.text) parts.push(parent.text.trim());

    for (const { child } of childScores) {
      const cleaned = child.text.trim();
      if (!cleaned) continue;
      if (isRedundant(cleaned, selectedTexts)) continue;
      const projectedLength = usedChars + parts.join('\n').length + cleaned.length + 1;
      if (projectedLength > maxChars) break;
      parts.push(cleaned);
      selectedTexts.push(cleaned);
    }

    if (parts.length === 0) continue;
    const sectionText = parts.join('\n');
    if (usedChars + sectionText.length > maxChars) break;
    usedChars += sectionText.length;
    results.push({
      text: sectionText,
      source: parent.source,
      score,
      id: parent.id,
      docId: parent.docId,
      groupId: parent.groupId,
      parentId: parent.parentId ?? undefined,
      level: parent.level,
      title: parent.title,
      order: parent.order,
      indexVersion: parent.indexVersion,
    });
  }

  return results;
};

export const retrieveKnowledge = async (
  board: string,
  query: string,
  topK = 5,
  strict = false
): Promise<RetrievedChunk[]> => {
  if (USE_HIER_KNOWLEDGE) {
    return retrieveKnowledgeHierarchical(
      board,
      query,
      { topP: 2, topM: Math.min(6, Math.max(3, topK)), maxChars: 3500 },
      strict
    );
  }

  return retrieveKnowledgeFlat(board, query, topK, strict);
};

export const formatKnowledgeContext = (chunks: RetrievedChunk[]) => {
  if (chunks.length === 0) return '';

  const lines = chunks.map((chunk, index) => {
    const cleaned = chunk.text.replace(/\s+/g, ' ').trim();
    return `[${index + 1}] (${chunk.source}) ${cleaned}`;
  });

  return [
    '以下是可能相关的参考资料，请优先基于这些内容回答。',
    ...lines,
  ].join('\n');
};
