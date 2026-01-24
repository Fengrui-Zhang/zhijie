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

const normalizeEmbedding = (embedding) => {
  let norm = 0;
  for (const value of embedding) {
    norm += value * value;
  }
  norm = Math.sqrt(norm);
  if (!norm) return embedding;
  return embedding.map(value => value / norm);
};

const extractIntro = (text, maxChars = 250) => {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return '';
  const [firstParagraph] = cleaned.split(/\n{2,}/);
  return (firstParagraph || cleaned).trim().slice(0, maxChars);
};

const parseTopSections = (text, fallbackTitle) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let currentTitle = null;
  let buffer = [];

  const flush = () => {
    if (!currentTitle) return;
    const body = buffer.join('\n').trim();
    sections.push({ title: currentTitle, body });
  };

  for (const line of lines) {
    const match = line.match(/^###(?!#)\s+(.*)$/);
    if (match) {
      flush();
      currentTitle = match[1].trim();
      buffer = [];
      continue;
    }
    if (currentTitle) {
      buffer.push(line);
    }
  }

  flush();

  if (sections.length === 0) {
    const cleaned = text.trim();
    if (cleaned) {
      sections.push({ title: fallbackTitle, body: cleaned });
    }
  }

  return sections;
};

const parseSubSections = (text) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let currentTitle = null;
  let buffer = [];
  let prelude = [];

  const pushSection = (title, linesToJoin) => {
    const body = linesToJoin.join('\n').trim();
    if (body) {
      sections.push({ title, body });
    }
  };

  for (const line of lines) {
    const match = line.match(/^####\s+(.*)$/);
    if (match) {
      if (currentTitle !== null) {
        pushSection(currentTitle, buffer);
      } else if (prelude.length) {
        pushSection(null, prelude);
        prelude = [];
      }
      currentTitle = match[1].trim();
      buffer = [];
      continue;
    }
    if (currentTitle !== null) {
      buffer.push(line);
    } else {
      prelude.push(line);
    }
  }

  if (currentTitle !== null) {
    pushSection(currentTitle, buffer);
  } else if (prelude.length) {
    pushSection(null, prelude);
  }

  return sections;
};

const chunkByParagraphs = (text, maxChars, overlap) => {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(chunk => chunk.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  const pushCurrent = () => {
    if (current) {
      chunks.push(current.trim());
      current = '';
    }
  };

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }
    const candidate = `${current}\n\n${paragraph}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    pushCurrent();
    if (paragraph.length > maxChars) {
      chunks.push(...chunkText(paragraph, maxChars, overlap));
    } else {
      current = paragraph;
    }
  }

  pushCurrent();

  if (overlap > 0 && chunks.length > 1) {
    return chunks.map((chunk, index) => {
      if (index === 0) return chunk;
      const prev = chunks[index - 1];
      const tail = prev.slice(Math.max(0, prev.length - overlap));
      return `${tail}\n${chunk}`.trim();
    });
  }

  return chunks;
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

const KEYWORD_REGEX = /学历|文凭|婚姻|财运|职业|行业|官运|疾病|健康|配偶|财星|官星|印星|用神/;

const isMeaningfulChunk = (text) => {
  const cleaned = text.replace(/\s+/g, '').trim();
  if (cleaned.length >= 30) return true;
  return KEYWORD_REGEX.test(cleaned);
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
  const parentIntroMax = Number(process.env.EMBEDDING_PARENT_INTRO_MAX) || 250;
  const childMaxChars = Number(process.env.EMBEDDING_CHILD_MAX_CHARS) || 900;
  const childOverlap = Number(process.env.EMBEDDING_CHILD_OVERLAP) || 120;

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const source = path.relative(knowledgeDir, filePath);
    const fileTitle = path.basename(filePath, path.extname(filePath));
    const sections = parseTopSections(raw, fileTitle);
    let order = 0;
    let groupIndex = 0;

    for (const section of sections) {
      const docId = `${board}-${fileCounter}`;
      const groupId = `${docId}-g-${groupIndex}`;
      const parentId = `${groupId}-p`;
      const intro = extractIntro(section.body, parentIntroMax);
      const parentText = intro ? `${section.title}\n${intro}` : section.title;

      chunks.push({
        id: parentId,
        text: parentText,
        source,
        docId,
        groupId,
        parentId: null,
        level: 0,
        title: section.title,
        order,
        indexVersion: 2,
      });
      order += 1;

      const subSections = parseSubSections(section.body);
      const childPieces = subSections.length > 0 ? subSections : [{ title: null, body: section.body }];

      for (const sub of childPieces) {
        const title = sub.title || section.title;
        const body = sub.body.trim();
        if (!body) continue;

        const baseChunks =
          body.length > childMaxChars
            ? chunkByParagraphs(body, childMaxChars, childOverlap)
            : [body];

        for (const piece of baseChunks) {
          const childText = sub.title ? `${sub.title}\n${piece}` : piece;
          if (!isMeaningfulChunk(childText)) continue;
          chunks.push({
            id: `${groupId}-c-${order}`,
            text: childText,
            source,
            docId,
            groupId,
            parentId,
            level: 1,
            title,
            order,
            indexVersion: 2,
          });
          order += 1;
        }
      }

      groupIndex += 1;
    }
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
      embeddings.push({ ...batch[idx], embedding: normalizeEmbedding(embedding) });
    });
    console.log(`Embedded ${Math.min(i + batchSize, chunks.length)} / ${chunks.length}`);
  }

  const { model } = getEmbeddingConfig();
  const existingChunks =
    !rewrite && Array.isArray(existingIndex?.chunks) && existingIndex?.version === 2
      ? existingIndex.chunks
      : [];
  if (!rewrite && existingIndex?.version && existingIndex.version !== 2) {
    console.warn('Existing index version mismatch. Rebuilding as version 2 without merging.');
  }
  const index = {
    version: 2,
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
