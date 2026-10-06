import assert from 'node:assert/strict';
import test from 'node:test';
import { expiredSessionsWhere, retainedSessionsWhere, setSessionPermanence, getRetentionCutoff } from '../lib/session-retention';

type Row = { id: string; userId: string; isPermanent: boolean; retentionResetAt: Date | null; createdAt: Date };
const cutoff = new Date('2026-10-01T00:00:00Z');
const old = new Date('2026-08-01T00:00:00Z');
const now = new Date('2026-10-16T00:00:00Z');
function matches(row: Row, where: any): boolean {
  return Object.entries(where).every(([key, condition]: [string, any]) => {
    if (key === 'OR') return condition.some((part: any) => matches(row, part));
    const value = row[key as keyof Row];
    if (condition && typeof condition === 'object') {
      if ('gte' in condition) return value instanceof Date && value >= condition.gte;
      if ('lt' in condition) return value instanceof Date && value < condition.lt;
    }
    return value === condition;
  });
}
function database(row: Row) {
  return { divinationSession: { updateMany: async ({ where, data }: any) => {
    if (!matches(row, where)) return { count: 0 };
    Object.assign(row, data);
    return { count: 1 };
  } } } as unknown as Parameters<typeof setSessionPermanence>[0];
}
const makeRow = (): Row => ({ id: 'session-a', userId: 'owner-a', isPermanent: false, retentionResetAt: null, createdAt: old });

test('old defaults expire, permanent and recently released sessions remain visible', () => {
  for (const [overrides, retained] of [
    [{}, false],
    [{ isPermanent: true }, true],
    [{ isPermanent: true, retentionResetAt: old }, true],
    [{ retentionResetAt: now }, true],
    [{ retentionResetAt: old }, false],
    [{ createdAt: cutoff }, true],
    [{ retentionResetAt: cutoff }, true],
  ] as const) {
    const row = { ...makeRow(), ...overrides };
    assert.equal(matches(row, retainedSessionsWhere(cutoff)), retained);
    assert.equal(matches(row, expiredSessionsWhere(cutoff)), !retained);
  }
});

test('disabling restarts the retention clock without rewriting creation time', async () => {
  const row = makeRow(); const db = database(row);
  await setSessionPermanence(db, row.userId, row.id, true, old);
  assert.equal(matches(row, expiredSessionsWhere(cutoff)), false);
  await setSessionPermanence(db, row.userId, row.id, false, now);
  assert.equal(row.retentionResetAt, now);
  assert.equal(row.createdAt, old);
  assert.equal(matches(row, retainedSessionsWhere(cutoff)), true);
  const later = new Date('2026-11-01T00:00:00Z');
  assert.equal(matches(row, expiredSessionsWhere(getRetentionCutoff(later))), true);
});

test('repeated off requests do not extend retention; another on/off cycle restarts it', async () => {
  const row = makeRow(); const db = database(row);
  await setSessionPermanence(db, row.userId, row.id, false, now);
  assert.equal(row.retentionResetAt, null);
  await setSessionPermanence(db, row.userId, row.id, true, now);
  await setSessionPermanence(db, row.userId, row.id, false, now);
  const later = new Date('2026-10-18T00:00:00Z');
  await setSessionPermanence(db, row.userId, row.id, false, later);
  assert.equal(row.retentionResetAt, now);
  await setSessionPermanence(db, row.userId, row.id, true, later);
  await setSessionPermanence(db, row.userId, row.id, false, later);
  assert.equal(row.retentionResetAt, later);
});

test('another user cannot change a record retention setting', async () => {
  const row = makeRow();
  assert.deepEqual(await setSessionPermanence(database(row), 'other-user', row.id, true, now), { count: 0 });
  assert.equal(row.isPermanent, false);
  assert.equal(row.retentionResetAt, null);
});
