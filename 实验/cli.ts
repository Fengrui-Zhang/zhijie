import path from 'node:path';
import { METHOD_DEFINITIONS } from './core/constants.ts';
import { runExperiments } from './core/engine.ts';
import type { ExperimentMethodId, RunExperimentOptions } from './types.ts';

function parseArgs(argv: string[]): RunExperimentOptions & { help?: boolean; listMethods?: boolean } {
  const options: RunExperimentOptions & { help?: boolean; listMethods?: boolean } = {
    judge: true,
    markdown: true,
    outputDir: path.join(process.cwd(), '实验', 'outputs'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--list-methods') {
      options.listMethods = true;
      continue;
    }
    if (arg === '--case') {
      options.caseId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--methods') {
      options.methods = argv[i + 1].split(',').map((item) => item.trim().toUpperCase()) as ExperimentMethodId[];
      i += 1;
      continue;
    }
    if (arg === '--no-judge') {
      options.judge = false;
      continue;
    }
    if (arg === '--no-markdown') {
      options.markdown = false;
      continue;
    }
    if (arg === '--output-dir') {
      options.outputDir = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
  }

  return options;
}

function printHelp() {
  console.log(`八字消融实验 CLI

用法：
  npm run experiment:bazi -- [--case CASE_ID] [--methods A,B,C,D,E] [--no-judge] [--no-markdown] [--output-dir PATH]

示例：
  npm run experiment:bazi -- --case bazi-demo-001
  npm run experiment:bazi -- --methods C,D,E
  npm run experiment:bazi -- --case bazi-demo-001 --no-judge
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.listMethods) {
    METHOD_DEFINITIONS.forEach((method) => {
      console.log(`${method.id}: ${method.label}`);
    });
    return;
  }

  const result = await runExperiments(options);
  console.log(`实验完成。输出目录：${result.runDir}`);
  console.log(JSON.stringify(result.summary, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
