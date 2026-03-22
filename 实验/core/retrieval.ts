import fs from 'node:fs/promises';
import path from 'node:path';
import { embedText } from '../../utils/embedding.ts';
import { retrieveKnowledgeHierarchical } from '../../utils/knowledge.ts';
import type { RetrievedKnowledgeItem } from '../types.ts';

type FlatChunk = {
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
};

type FlatIndex = {
  chunks: FlatChunk[];
};

let flatIndexCache: FlatIndex | null = null;
let rawFlatIndexCache: FlatIndex | null = null;

const normalizeVector = (input: number[]) => {
  let norm = 0;
  for (const value of input) norm += value * value;
  norm = Math.sqrt(norm);
  return input.map((value) => (norm ? value / norm : value));
};

const dotProduct = (a: number[], b: number[]) => {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
};

async function loadFlatIndex() {
  if (flatIndexCache) return flatIndexCache;
  const indexPath = path.join(process.cwd(), 'data', 'index', 'bazi.json');
  const raw = await fs.readFile(indexPath, 'utf8');
  flatIndexCache = JSON.parse(raw) as FlatIndex;
  return flatIndexCache;
}

async function loadRawFlatIndex() {
  if (rawFlatIndexCache) return rawFlatIndexCache;
  const indexPath = path.join(process.cwd(), '实验', 'indexes', 'raw-bazi-book.json');
  const raw = await fs.readFile(indexPath, 'utf8');
  rawFlatIndexCache = JSON.parse(raw) as FlatIndex;
  return rawFlatIndexCache;
}

export async function retrieveFlatKnowledge(query: string, topK = 5): Promise<RetrievedKnowledgeItem[]> {
  const index = await loadFlatIndex();
  const embedding = normalizeVector(await embedText(query));
  return index.chunks
    .map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      text: chunk.text,
      source: chunk.source,
      score: dotProduct(embedding, normalizeVector(chunk.embedding)),
      level: chunk.level,
      parentId: chunk.parentId,
      groupId: chunk.groupId,
      docId: chunk.docId,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
}

export async function retrieveRawFlatKnowledge(query: string, topK = 5): Promise<RetrievedKnowledgeItem[]> {
  const index = await loadRawFlatIndex();
  const embedding = normalizeVector(await embedText(query));
  return index.chunks
    .map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      text: chunk.text,
      source: chunk.source,
      score: dotProduct(embedding, normalizeVector(chunk.embedding)),
      level: chunk.level,
      parentId: chunk.parentId,
      groupId: chunk.groupId,
      docId: chunk.docId,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
}

export async function retrieveHierarchicalKnowledge(query: string, topK = 5): Promise<RetrievedKnowledgeItem[]> {
  return retrieveKnowledgeHierarchical('bazi', query, { topP: 2, topM: Math.min(6, Math.max(3, topK)), maxChars: 3500 }, true);
}
