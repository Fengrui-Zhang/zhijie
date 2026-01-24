import fs from 'node:fs/promises';
import path from 'node:path';

const loadEnvFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    raw.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) return;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // Ignore missing env file.
  }
};

const getEmbeddingConfig = () => {
  const apiKey = process.env.EMBEDDING_API_KEY || process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.EMBEDDING_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.EMBEDDING_MODEL;
  const provider = (process.env.EMBEDDING_PROVIDER || 'openai').toLowerCase();

  if (!apiKey) {
    throw new Error('Missing EMBEDDING_API_KEY (or DEEPSEEK_API_KEY).');
  }
  if (!model) {
    throw new Error('Missing EMBEDDING_MODEL.');
  }

  return { apiKey, baseUrl, model, provider };
};

const listTxtFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTxtFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) {
      files.push(fullPath);
    }
  }

  return files;
};

const chunkByDelimiter = (text, delimiter) => {
  return text
    .split(delimiter)
    .map(chunk => chunk.replace(/^\s+|\s+$/g, ''))
    .filter(Boolean);
};

const chunkText = (text, maxChars = 800, overlap = 120) => {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return [];

  const step = Math.max(1, maxChars - overlap);
  const chunks = [];
  for (let start = 0; start < cleaned.length; start += step) {
    const slice = cleaned.slice(start, start + maxChars).trim();
    if (slice) chunks.push(slice);
  }
  return chunks;
};

const embedTexts = async (inputs) => {
  const { apiKey, baseUrl, model, provider } = getEmbeddingConfig();

  if (provider === 'dashscope') {
    const response = await fetch(
      `${baseUrl}/api/v1/services/embeddings/text-embedding/text-embedding`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: {
            texts: inputs,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Embedding request failed.');
    }

    const data = await response.json();
    const embeddings = data.output?.embeddings?.map(item => item.embedding);

    if (!embeddings || embeddings.length !== inputs.length) {
      throw new Error('Embedding response is invalid.');
    }

    return embeddings;
  }

  const response = await fetch(`${baseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: inputs }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Embedding request failed.');
  }

  const data = await response.json();
  const embeddings = data.data?.map(item => item.embedding);

  if (!embeddings || embeddings.length !== inputs.length) {
    throw new Error('Embedding response is invalid.');
  }

  return embeddings;
};

const ingest = async () => {
  await loadEnvFile(path.join(process.cwd(), '.env.local'));
  const args = process.argv.slice(2);
  const rewrite = args.includes('--rewrite') || args.includes('--overwrite');
  const board = args.find(arg => !arg.startsWith('-')) || 'bazi';
  const baseDir = process.cwd();
  const knowledgeDir = path.join(baseDir, 'data', 'knowledge', board);
  const indexPath = path.join(baseDir, 'data', 'index', `${board}.json`);
  let existingIndex = null;
  if (!rewrite) {
    try {
      const rawIndex = await fs.readFile(indexPath, 'utf8');
      existingIndex = JSON.parse(rawIndex);
    } catch {
      existingIndex = null;
    }
  }

  const files = await listTxtFiles(knowledgeDir);
  if (files.length === 0) {
    throw new Error(`No .txt files found in ${knowledgeDir}`);
  }

  const chunks = [];
  let fileCounter = 0;
  if (Array.isArray(existingIndex?.chunks)) {
    const maxCounter = existingIndex.chunks.reduce((acc, item) => {
      if (!item?.id || typeof item.id !== 'string') return acc;
      const match = item.id.match(new RegExp(`^${board}-(\\d+)-`));
      const value = match ? Number(match[1]) : NaN;
      return Number.isFinite(value) ? Math.max(acc, value) : acc;
    }, -1);
    fileCounter = maxCounter + 1;
  }

  const maxChars = Number(process.env.EMBEDDING_MAX_CHARS) || 2000;
  const overlap = Number(process.env.EMBEDDING_OVERLAP) || 200;

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const fileChunks =
      (board === 'qimen' || board === 'bazi')
        ? chunkByDelimiter(raw, '###').flatMap(chunk =>
            chunk.length > maxChars ? chunkText(chunk, maxChars, overlap) : [chunk]
          )
        : chunkText(raw, maxChars, overlap);
    const source = path.relative(knowledgeDir, filePath);
    fileChunks.forEach((text, chunkIndex) => {
      chunks.push({
        id: `${board}-${fileCounter}-${chunkIndex}`,
        text,
        source,
      });
    });
    fileCounter += 1;
  }

  const batchSize =
    Number(process.env.EMBEDDING_BATCH_SIZE) ||
    (getEmbeddingConfig().provider === 'dashscope' ? 10 : 50);
  const embeddings = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchEmbeddings = await embedTexts(batch.map(item => item.text));
    batchEmbeddings.forEach((embedding, idx) => {
      embeddings.push({ ...batch[idx], embedding });
    });
    console.log(`Embedded ${Math.min(i + batchSize, chunks.length)} / ${chunks.length}`);
  }

  const { model } = getEmbeddingConfig();
  const existingChunks = Array.isArray(existingIndex?.chunks)
    ? existingIndex.chunks
    : [];
  const index = {
    version: existingIndex?.version ?? 1,
    board: existingIndex?.board ?? board,
    model: existingIndex?.model ?? model,
    createdAt: existingIndex?.createdAt ?? new Date().toISOString(),
    chunks: existingChunks.concat(embeddings),
  };

  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');

  console.log(`Saved index to ${indexPath}`);
};

ingest().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
