import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
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

const usage = () => {
  console.log(
    'Usage: npx tsx scripts/test-knowledge.mjs <query> [board] [topK] [--preview N] [--full] [--json]'
  );
};

const run = async () => {
  await loadEnvFile(path.join(process.cwd(), '.env.local'));

  const args = process.argv.slice(2);
  const flags = {
    preview: 300,
    full: false,
    json: false,
  };
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--full') {
      flags.full = true;
      continue;
    }
    if (arg === '--json') {
      flags.json = true;
      continue;
    }
    if (arg === '--preview') {
      const value = Number(args[i + 1]);
      if (Number.isFinite(value) && value >= 0) {
        flags.preview = value;
        i += 1;
      }
      continue;
    }
    positional.push(arg);
  }

  const query = positional[0];
  const board = positional[1] || 'bazi';
  const topK = Number(positional[2] || 5);

  if (!query) {
    usage();
    process.exit(1);
  }

  const { retrieveKnowledge } = await import('../utils/knowledge.ts');
  const results = await retrieveKnowledge(board, query, topK, true);

  if (results.length === 0) {
    console.log('No results.');
    return;
  }

  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  results.forEach((item, index) => {
    const score = Number.isFinite(item.score) ? item.score.toFixed(4) : '0.0000';
    const header = [
      `rank: ${index + 1}`,
      `score: ${score}`,
      `source: ${item.source || ''}`,
      `id: ${item.id || ''}`,
      `level: ${item.level ?? ''}`,
      `parentId: ${item.parentId ?? ''}`,
      `groupId: ${item.groupId ?? ''}`,
      `title: ${item.title || ''}`,
    ].join('\n');

    const rawText = item.text || '';
    const text = flags.full || rawText.length <= flags.preview
      ? rawText
      : `${rawText.slice(0, flags.preview)}...`;

    console.log(header);
    console.log('-----');
    console.log(text);
    console.log('-----');
  });
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
