import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTenGod } from 'taibu-core/utils';
import { HIDDEN_STEM_DETAILS } from 'taibu-core/data/shensha';
import { analyzeBaziCharacter, characterTenGod, HIDDEN_STEMS, STEMS, type AnalysisPillar, type CharacterSelection } from '../lib/bazi-character-analysis';

const chart = (values: string[]): AnalysisPillar[] => values.map((ganZhi, index) => ({ key: ['year', 'month', 'day', 'hour'][index], title: ['年柱', '月柱', '日柱', '时柱'][index], kind: 'natal', ganZhi }));
const flow = (key: string, ganZhi: string): AnalysisPillar => ({ key, title: key === 'dayun' ? '大运' : '流年', kind: 'flow', ganZhi });
const target: CharacterSelection = { columnKey: 'day', kind: 'stem' };
const base = chart(['甲寅', '丙午', '甲戌', '戊辰']);

test('全部100组十神与排盘库一致，非法输入不猜测', () => {
  for (const day of STEMS) for (const stem of STEMS) assert.equal(characterTenGod(day, stem), calculateTenGod(day, stem));
  assert.equal(characterTenGod('', '甲'), null);
  assert.equal(characterTenGod('甲', '甲子'), null);
});

test('十二地支藏干与现有排盘库同序，本中余气不随目标重排', () => {
  for (const [branch, stems] of Object.entries(HIDDEN_STEMS)) assert.deepEqual(stems, HIDDEN_STEM_DETAILS[branch].map((item) => item.stem));
  const result = analyzeBaziCharacter(base, { columnKey: 'hour', kind: 'hidden', hiddenStem: '癸' })!;
  assert.deepEqual(result.hidden.map((item) => item.qi), ['本气', '中气', '余气']);
  assert.equal(result.hidden[2].stem, '癸');
});

test('每份有独立来源路径，参与方合并不限制展开份额', () => {
  const result = analyzeBaziCharacter(base, target)!;
  assert.equal(result.finalShares, 3);
  assert.deepEqual(result.units.map((unit) => unit.id), ['day:stem', 'year:branch', 'hour:branch']);
  assert.equal(result.parties.length, 2);
  assert.ok(result.units.every((unit) => unit.paths.length && unit.reasons.length));
});

test('自身与坐下根、同地支禄根只记一次', () => {
  const result = analyzeBaziCharacter(base, { columnKey: 'year', kind: 'stem' })!;
  assert.equal(result.units.filter((unit) => unit.id === 'year:branch').length, 1);
  assert.ok(!result.units.some((unit) => unit.id === 'year:stem'));
  assert.ok(result.roots.find((root) => root.pillarKey === 'year')?.tags.includes('禄根'));
});

test('相同干支在不同柱保留物理位置，明透通根不重复追加', () => {
  const result = analyzeBaziCharacter(chart(['甲寅', '乙卯', '甲寅', '乙卯']), target)!;
  assert.equal(result.finalShares, 4);
  assert.equal(result.parties.length, 3);
  assert.equal(new Set(result.units.map((unit) => unit.id)).size, 4);
  assert.ok(result.units.every((unit) => unit.id.endsWith(':branch')));
});

test('无根无气仍有自身虚浮落点，不冒充有效力量', () => {
  const result = analyzeBaziCharacter(chart(['庚酉', '辛酉', '甲午', '丁巳']), target)!;
  assert.equal(result.finalShares, 1);
  assert.match(result.rootStatus, /无根无气/);
  assert.match(result.units[0].reasons[0], /虚浮/);
});

test('邻干生我但供方无根时不计份', () => {
  const result = analyzeBaziCharacter(chart(['庚酉', '癸酉', '甲午', '丁巳']), target)!;
  assert.equal(result.finalShares, 1);
  assert.ok(!result.units.some((unit) => unit.id === 'month:stem'));
});

test('邻干生扶供方有根，来源展开一层并在根处终止', () => {
  const result = analyzeBaziCharacter(chart(['庚申', '癸酉', '甲午', '丁巳']), target)!;
  assert.equal(result.finalShares, 3);
  assert.deepEqual(result.units.map((unit) => unit.id), ['day:stem', 'month:stem', 'year:branch']);
  assert.ok(result.units.find((unit) => unit.id === 'year:branch')!.paths.some((path) => /藏壬.*月柱癸.*日柱甲/.test(path)));
  assert.ok(!result.units.some((unit) => unit.id === 'month:branch'), '不能再递归酉金生癸水');
});

test('远处藏干仅相生不能自动成为有效贡献', () => {
  const result = analyzeBaziCharacter(chart(['庚申', '辛酉', '甲午', '丁巳']), target)!;
  assert.equal(result.finalShares, 1);
  assert.match(result.sources.find((source) => source.id === 'year:support-branch')!.note, /暂不加份/);
});

test('同柱坐下生扶只记地支一份，不把藏干拆开', () => {
  const result = analyzeBaziCharacter(chart(['庚酉', '辛酉', '甲子', '丁巳']), target)!;
  assert.equal(result.finalShares, 2);
  assert.deepEqual(result.units.map((unit) => unit.id), ['day:stem', 'day:branch']);
});

test('大运、流年根源叠加，重复路径去重，本命账本不被污染', () => {
  const original = JSON.stringify(base);
  const dayun = analyzeBaziCharacter([...base, flow('dayun', '癸卯')], target)!;
  const year = analyzeBaziCharacter([...base, flow('dayun', '癸卯'), flow('liunian', '壬子')], target)!;
  assert.equal(dayun.natalShares, 3);
  assert.equal(dayun.finalShares, 5);
  assert.equal(year.natalShares, 3);
  assert.equal(year.finalShares, 6);
  assert.deepEqual(dayun.sources.find((source) => source.id === 'hour:support-branch')!.tags, ['来源已合并']);
  assert.equal(year.units.filter((unit) => unit.id === 'hour:branch').length, 1);
  assert.ok(year.units.find((unit) => unit.id === 'hour:branch')!.paths.length > 1);
  assert.equal(analyzeBaziCharacter(base, target)!.finalShares, 3);
  assert.equal(JSON.stringify(base), original);
});

test('岁运使原局供方得根时，新增来源可来自原局，不能只数岁运柱', () => {
  const original = chart(['庚酉', '癸酉', '甲午', '丁巳']);
  const result = analyzeBaziCharacter([...original, flow('dayun', '壬子')], target)!;
  assert.equal(result.natalShares, 1);
  assert.ok(result.addedUnits.some((unit) => unit.id === 'month:stem' && unit.layer === 'natal'));
});

test('岁运六冲只标记条件，不武断删除原有根源', () => {
  const result = analyzeBaziCharacter([...base, flow('dayun', '庚申')], target)!;
  assert.equal(result.finalShares, 3);
  assert.ok(result.interactions.some((item) => /六冲/.test(item.text)));
  assert.equal(result.natalRoots.length, 2);
});

test('地支以本气判十神，藏干逐字判定，日干单独标日主', () => {
  const branch = analyzeBaziCharacter(base, { columnKey: 'hour', kind: 'branch' })!;
  const hidden = analyzeBaziCharacter(base, { columnKey: 'hour', kind: 'hidden', hiddenStem: '癸' })!;
  assert.equal(branch.char, '辰');
  assert.equal(branch.stem, '戊');
  assert.equal(branch.tenGod, '偏财');
  assert.equal(hidden.tenGod, '正印');
  assert.equal(analyzeBaziCharacter(base, target)!.isDayMaster, true);
  assert.equal(analyzeBaziCharacter(base, { columnKey: 'year', kind: 'stem' })!.isDayMaster, false);
});

test('岁运目标随同一列更新，不携带旧藏干或旧字符', () => {
  const selected: CharacterSelection = { columnKey: 'dayun', kind: 'stem' };
  assert.equal(analyzeBaziCharacter([...base, flow('dayun', '癸卯')], selected)!.char, '癸');
  const updated = analyzeBaziCharacter([...base, flow('dayun', '庚申')], selected)!;
  assert.equal(updated.char, '庚');
  assert.equal(updated.natalShares, null);
  assert.equal(analyzeBaziCharacter(base, selected), null);
  assert.equal(analyzeBaziCharacter([...base, flow('dayun', '庚申')], { columnKey: 'dayun', kind: 'hidden', hiddenStem: '乙' }), null);
});

test('残缺原局和重复柱键停止分析，非法岁运不参与', () => {
  assert.equal(analyzeBaziCharacter(base.slice(0, 3), target), null);
  assert.equal(analyzeBaziCharacter([...base, base[0]], target), null);
  assert.equal(analyzeBaziCharacter(chart(['甲寅', '未知', '甲戌', '戊辰']), target), null);
  assert.equal(analyzeBaziCharacter([...base, flow('dayun', '—')], target)!.finalShares, 3);
});
