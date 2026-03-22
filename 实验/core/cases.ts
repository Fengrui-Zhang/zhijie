import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExperimentCase } from '../types.ts';

const CASES_PATH = path.join(process.cwd(), '实验', 'cases', 'bazi_cases.json');

let cachedCases: ExperimentCase[] | null = null;

function validateCase(input: ExperimentCase) {
  if (!input?.id || !input?.name || input?.board !== 'bazi') {
    throw new Error(`Invalid experiment case: ${JSON.stringify(input)}`);
  }
  if (!input.params || typeof input.params.year !== 'number') {
    throw new Error(`Invalid params for case ${input.id}`);
  }
  if (!input.question?.trim()) {
    throw new Error(`Missing question for case ${input.id}`);
  }
  if (!input.reference?.summary) {
    throw new Error(`Missing reference summary for case ${input.id}`);
  }
}

export async function loadCases() {
  if (cachedCases) return cachedCases;
  const raw = await fs.readFile(CASES_PATH, 'utf8');
  const cases = JSON.parse(raw) as ExperimentCase[];
  cases.forEach(validateCase);
  cachedCases = cases;
  return cases;
}

export async function listCaseSummaries() {
  const cases = await loadCases();
  return cases.map((item) => ({
    id: item.id,
    name: item.name,
    board: item.board,
    question: item.question,
    summary: item.reference.summary,
  }));
}

export async function getCaseById(caseId: string) {
  const cases = await loadCases();
  const found = cases.find((item) => item.id === caseId);
  if (!found) {
    throw new Error(`Case not found: ${caseId}`);
  }
  return found;
}
