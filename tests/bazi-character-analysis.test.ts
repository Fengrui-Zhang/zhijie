import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTenGod } from 'taibu-core/utils';
import { HIDDEN_STEM_DETAILS } from 'taibu-core/data/shensha';
import { analyzeBaziCharacter, characterTenGod, HIDDEN_STEMS, STEMS, rootRelation, type AnalysisPillar, type CharacterSelection } from '../lib/bazi-character-analysis';

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
  assert.deepEqual(result.units.map((unit) => unit.id), ['day:column', 'year:column', 'hour:column']);
  assert.equal(result.parties.length, 2);
  assert.ok(result.units.every((unit) => unit.paths.length && unit.reasons.length));
});

test('自身与坐下根、同地支禄根只记一次', () => {
  const result = analyzeBaziCharacter(base, { columnKey: 'year', kind: 'stem' })!;
  assert.equal(result.units.filter((unit) => unit.memberKeys.includes('year')).length, 1);
  assert.ok(result.units.find((unit) => unit.memberKeys.includes('year'))!.paths.some((path) => path.includes('自身落点')));
  assert.ok(result.roots.find((root) => root.pillarKey === 'year')?.tags.includes('禄根'));
});

test('同气天干不触发家内生扶合并，各柱直接地支根分别计入', () => {
  const result = analyzeBaziCharacter(chart(['甲寅', '乙卯', '甲寅', '乙卯']), target)!;
  assert.equal(result.finalShares, 4);
  assert.equal(result.parties.length, 3);
  assert.equal(new Set(result.units.flatMap((unit) => unit.memberKeys)).size, 4);
  assert.ok(!result.units.some((unit) => unit.id === 'home:support'));
  assert.ok(!result.units.flatMap((unit) => unit.paths).some((path) => path.includes('↔')));
});

test('有根的同五行天干也不计份，同干与异阴阳均只保留同气关系', () => {
  for (const peer of ['丙', '丁']) {
    const result = analyzeBaziCharacter(chart(['庚午', `${peer}子`, '丁酉', '辛丑']), target)!;
    assert.equal(result.finalShares, 2, peer);
    assert.deepEqual(result.units.map((unit) => unit.id), ['day:column', 'year:column']);
    assert.deepEqual(result.sources.find((source) => source.id === 'month:peer')!.tags, ['同气明透 · 不计份']);
    assert.ok(!result.parties.some((party) => party.key === 'month'));
  }
});

test('岁运同气天干不加份，岁运地支根仍独立计份并随切换恢复', () => {
  const natal = chart(['庚午', '壬子', '丁酉', '辛丑']);
  const baseline = analyzeBaziCharacter(natal, target)!;
  for (const key of ['dayun', 'liunian']) {
    const peer = analyzeBaziCharacter([...natal, flow(key, '丙子')], target)!;
    assert.deepEqual(peer.units, baseline.units);
    assert.equal(peer.addedUnits.length, 0);
    const rooted = analyzeBaziCharacter([...natal, flow(key, '丙午')], target)!;
    assert.equal(rooted.finalShares, baseline.finalShares + 1);
    assert.deepEqual(rooted.addedUnits[0].sourceLabels, [`${key === 'dayun' ? '大运' : '流年'}地支午`]);
  }
  assert.deepEqual(analyzeBaziCharacter(natal, target)!.units, baseline.units);
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
  assert.ok(!result.units.some((unit) => unit.memberKeys.includes('month')));
});

test('外部根说明供方有根，但不自动把全盘根份数传入目标', () => {
  const result = analyzeBaziCharacter(chart(['庚申', '癸酉', '甲午', '丁巳']), target)!;
  assert.equal(result.finalShares, 2);
  assert.deepEqual(result.units.map((unit) => unit.id), ['day:column', 'month:column']);
  assert.ok(result.units.find((unit) => unit.id === 'month:column')!.paths.some((path) => /年柱申.*月柱癸.*日柱甲/.test(path)));
  assert.ok(!result.units.some((unit) => unit.memberKeys.includes('year')), '外部根只留依据，不自动增加一份');
});

test('远处藏干仅相生不能自动成为有效贡献', () => {
  const result = analyzeBaziCharacter(chart(['庚申', '辛酉', '甲午', '丁巳']), target)!;
  assert.equal(result.finalShares, 1);
  assert.deepEqual(result.sources.find((source) => source.id === 'year:support-branch')!.tags, ['藏干相生 · 不计份']);
});

test('同柱坐下本气生扶并入自身，不另拆地支一份', () => {
  const result = analyzeBaziCharacter(chart(['庚酉', '辛酉', '甲子', '丁巳']), target)!;
  assert.equal(result.finalShares, 1);
  assert.deepEqual(result.units.map((unit) => unit.id), ['day:column']);
  assert.ok(result.units[0].sourceLabels.includes('日柱地支子'));
});

test('大运、流年根源叠加，重复路径去重，本命账本不被污染', () => {
  const original = JSON.stringify(base);
  const dayun = analyzeBaziCharacter([...base, flow('dayun', '癸卯')], target)!;
  const year = analyzeBaziCharacter([...base, flow('dayun', '癸卯'), flow('liunian', '壬子')], target)!;
  assert.equal(dayun.natalShares, 3);
  assert.equal(dayun.finalShares, 4);
  assert.equal(year.natalShares, 3);
  assert.equal(year.finalShares, 5);
  assert.deepEqual(dayun.sources.find((source) => source.id === 'hour:support-branch')!.tags, ['藏干相生 · 不计份']);
  assert.equal(year.units.filter((unit) => unit.memberKeys.includes('hour')).length, 1);
  assert.ok(year.units.find((unit) => unit.id === 'dayun:column')!.paths.length > 1);
  assert.equal(analyzeBaziCharacter(base, target)!.finalShares, 3);
  assert.equal(JSON.stringify(base), original);
});

test('岁运使原局供方得根时，新增来源可来自原局，不能只数岁运柱', () => {
  const original = chart(['庚酉', '癸酉', '甲午', '丁巳']);
  const result = analyzeBaziCharacter([...original, flow('dayun', '壬子')], target)!;
  assert.equal(result.natalShares, 1);
  assert.ok(result.addedUnits.some((unit) => unit.memberKeys.includes('month') && unit.layer === 'natal'));
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

// User-reported regression: a correct total with the wrong provenance is a bug.
const reportedChart = chart(['庚辰', '丁亥', '己卯', '乙丑']);
const ding: CharacterSelection = { columnKey: 'month', kind: 'stem' };

test('庚辰丁亥己卯乙丑：丁的两份必须是自身和家内乙卯，不能是丁加亥', () => {
  const result = analyzeBaziCharacter(reportedChart, ding)!;
  assert.equal(result.finalShares, 2);
  assert.equal(result.natalRoots.length, 0);
  assert.equal(result.rootStatus, '无根 · 有生扶');
  assert.deepEqual(result.units.map((unit) => unit.label), ['月柱天干丁', '家内生扶（时柱乙、日柱卯）']);
  assert.deepEqual(result.units[0].sourceLabels, ['月柱天干丁']);
  assert.deepEqual(new Set(result.units[1].memberKeys), new Set(['day', 'hour']));
  assert.ok(result.units[1].paths.some((path) => /日柱卯.*时柱乙.*月柱丁/.test(path)));
  assert.ok(!result.units.flatMap((unit) => unit.paths).some((path) => path.includes('月柱亥')));
  assert.equal(result.parties.length, 2);
  assert.ok(result.parties.find((party) => party.key === 'home')!.evidence.some((text) => text.includes('家内生扶')));
  assert.match(result.sources.find((source) => source.id === 'month:support-branch')!.tags.join(''), /不计份/);
});

test('家内供方去掉后不再保留虚构的乙卯链；仅杂气藏甲不能给丁加份', () => {
  const result = analyzeBaziCharacter(chart(['庚辰', '丁亥', '己酉', '辛丑']), ding)!;
  assert.equal(result.finalShares, 1);
  assert.equal(result.natalRoots.length, 0);
  assert.deepEqual(result.units[0].sourceLabels, ['月柱天干丁']);
});

test('丁火明确认寅巳午未戌五根，不以亥藏甲或卯木生火代替根', () => {
  for (const branch of ['寅', '巳', '午', '未', '戌']) assert.ok(rootRelation('丁', branch));
  for (const branch of ['亥', '卯', '辰', '丑', '申', '酉', '子']) assert.equal(rootRelation('丁', branch), null);
  assert.equal(rootRelation('丁', '寅'), '长生根');
  assert.equal(rootRelation('丁', '未'), '墓库根');
  assert.equal(rootRelation('丁', '戌'), '墓库根');
});

test('丁坐寅巳午未戌：每种坐下根均与丁自身合一，家内乙卯另外合一', () => {
  for (const branch of ['寅', '巳', '午', '未', '戌']) {
    const result = analyzeBaziCharacter(chart(['庚辰', `丁${branch}`, '己卯', '乙丑']), ding)!;
    assert.equal(result.finalShares, 2, branch);
    assert.equal(result.natalRoots.length, 1, branch);
    assert.equal(result.units.filter((unit) => unit.memberKeys.includes('month')).length, 1, branch);
    assert.ok(result.units[0].paths.some((path) => path.includes('自身落点')), branch);
    assert.ok(result.units[0].paths.some((path) => path.includes('根')), branch);
  }
});

test('同柱合并同时适用于独立的岁运目标和岁运根源', () => {
  const columns = [...reportedChart, flow('dayun', '丁巳')];
  const original = analyzeBaziCharacter(columns, ding)!;
  assert.equal(original.units.filter((unit) => unit.memberKeys.includes('dayun')).length, 1);
  const selected = analyzeBaziCharacter(columns, { columnKey: 'dayun', kind: 'stem' })!;
  assert.equal(selected.units.filter((unit) => unit.memberKeys.includes('dayun')).length, 1);
  assert.ok(selected.units[0].paths.length >= 2);
});

test('家内合并不遮蔽家外直接火根，不能把所有来源一律按参与方封顶', () => {
  const result = analyzeBaziCharacter(chart(['庚午', '丁亥', '己卯', '乙丑']), ding)!;
  assert.equal(result.finalShares, 3);
  assert.equal(result.units[1].label, '年柱地支午');
  const isolatedRoots = analyzeBaziCharacter(chart(['庚午', '丁亥', '己巳', '辛未']), ding)!;
  assert.equal(isolatedRoots.finalShares, 4);
  assert.equal(isolatedRoots.parties.length, 3);
});

test('报告命例岁运切换后恢复本命的两份与正确来源，合并不能重复标新增', () => {
  const baseline = analyzeBaziCharacter(reportedChart, ding)!;
  const result = analyzeBaziCharacter([...reportedChart, flow('dayun', '丁巳')], ding)!;
  assert.equal(result.natalShares, 2);
  assert.equal(result.finalShares, 3);
  assert.equal(result.addedUnits.length, 1);
  assert.deepEqual(result.addedUnits[0].memberKeys, ['dayun']);
  assert.deepEqual(analyzeBaziCharacter(reportedChart, ding)!.units, baseline.units);
});
