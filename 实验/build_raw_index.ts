import fs from 'node:fs/promises';
import path from 'node:path';
import { embedTexts } from '../utils/embedding.ts';
import { loadLocalEnv } from './core/env.ts';

type RawChunk = {
  id: string;
  text: string;
  source: string;
  embedding: number[];
  docId: string;
  groupId: string;
  parentId: null;
  level: 0;
  title: string;
  order: number;
};

type RawIndex = {
  version: number;
  board: string;
  model: string;
  createdAt: string;
  chunks: RawChunk[];
};

const INPUT_TXT = path.join(process.cwd(), '实验', 'raw_text', '盲派基础第一册.txt');
const OUTPUT_INDEX = path.join(process.cwd(), '实验', 'indexes', 'raw-bazi-book.json');

function cleanPageText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u000c/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^-\s*\d+\s*-$/.test(line)) return false;
      if (/^[\d\s.·•-]+$/.test(line)) return false;
      return true;
    })
    .join('\n');
}

function chunkParagraphs(text: string, maxChars = 500, overlap = 80) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 20);

  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = '';
    }
  };

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }
    const candidate = `${current}\n${paragraph}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    flush();
    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }
    const step = Math.max(1, maxChars - overlap);
    for (let start = 0; start < paragraph.length; start += step) {
      const piece = paragraph.slice(start, start + maxChars).trim();
      if (piece) chunks.push(piece);
    }
  }
  flush();
  return chunks;
}

function buildTitle(text: string) {
  const firstLine = text.split('\n')[0]?.trim() || '';
  return firstLine.slice(0, 40) || '原始古籍切块';
}

function splitChunkFurther(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 120) {
    return [cleaned];
  }
  const midpoint = Math.floor(cleaned.length / 2);
  let splitAt = cleaned.lastIndexOf('。', midpoint);
  if (splitAt < 60) splitAt = cleaned.lastIndexOf('，', midpoint);
  if (splitAt < 40) splitAt = midpoint;
  const left = cleaned.slice(0, splitAt + 1).trim();
  const right = cleaned.slice(Math.max(0, splitAt + 1 - 30)).trim();
  return [left, right].filter(Boolean);
}

async function main() {
  await loadLocalEnv();
  const raw = await fs.readFile(INPUT_TXT, 'utf8');
  const cleaned = cleanPageText(raw);
  const chunksText = chunkParagraphs(cleaned, 320, 60);

  if (!chunksText.length) {
    throw new Error('No chunks generated from raw txt.');
  }

  const finalChunks: string[] = [];
  const embeddings: number[][] = [];
  const queue = [...chunksText];
  while (queue.length) {
    const chunk = queue.shift()!;
    try {
      const [embedding] = await embedTexts([chunk]);
      finalChunks.push(chunk);
      embeddings.push(embedding);
    } catch (error: any) {
      const message = error?.message || String(error);
      const smaller = splitChunkFurther(chunk);
      if (smaller.length <= 1 || smaller[0] === chunk) {
        throw new Error(`Failed to embed raw chunk (len=${chunk.length}): ${message}`);
      }
      queue.unshift(...smaller.reverse());
    }
  }

  const chunks: RawChunk[] = finalChunks.map((text, index) => ({
    id: `raw-bazi-${index + 1}`,
    text,
    source: '盲派基础第一册.pdf（原始切块）',
    embedding: embeddings[index],
    docId: 'raw-bazi-book',
    groupId: 'raw-bazi-book',
    parentId: null,
    level: 0,
    title: buildTitle(text),
    order: index + 1,
  }));

  const output: RawIndex = {
    version: 1,
    board: 'bazi-raw-flat',
    model: process.env.EMBEDDING_MODEL || 'unknown',
    createdAt: new Date().toISOString(),
    chunks,
  };

  await fs.mkdir(path.dirname(OUTPUT_INDEX), { recursive: true });
  await fs.writeFile(OUTPUT_INDEX, JSON.stringify(output, null, 2), 'utf8');
  console.log(`raw index built: ${OUTPUT_INDEX}`);
  console.log(`chunks: ${chunks.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
