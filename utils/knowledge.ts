import fs from 'node:fs/promises';
import path from 'node:path';
import { embedText } from './embedding';

type KnowledgeChunk = {
  id: string;
  text: string;
  source: string;
  embedding: number[];
};

type KnowledgeIndex = {
  version: number;
  board: string;
  model: string;
  createdAt: string;
  chunks: KnowledgeChunk[];
};

type RetrievedChunk = {
  text: string;
  source: string;
  score: number;
};

const indexCache = new Map<string, KnowledgeIndex>();

const loadIndex = async (board: string): Promise<KnowledgeIndex | null> => {
  if (indexCache.has(board)) {
    return indexCache.get(board) ?? null;
  }

  const indexPath = path.join(process.cwd(), 'data', 'index', `${board}.json`);
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as KnowledgeIndex;
    indexCache.set(board, parsed);
    return parsed;
  } catch {
    return null;
  }
};

const cosineSimilarity = (a: number[], b: number[]) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const retrieveKnowledge = async (
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
  const scored = index.chunks.map(chunk => ({
    text: chunk.text,
    source: chunk.source,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
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
