/**
 * Browser-only, deterministic source tracing. Rules: skills/analyze-bazi-fene.md.
 * The user authorized filling missing counting rules. The application's explicit
 * source-unit-v1 policy is documented in docs/bazi-source-units.md. These nominal
 * source units are not strength weights, party counts, ownership or predictions.
 */
export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
export type Element = '木' | '火' | '土' | '金' | '水';
const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

// Same order and qi labels as taibu-core 3.4.0 HIDDEN_STEM_DETAILS.
export const HIDDEN_STEMS: Record<string, readonly string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};
const QI = ['本气', '中气', '余气'];
const LU: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
// Earth storage conventions vary; do not infer a universal earth storehouse.
const STORAGE: Partial<Record<Element, string>> = { 木: '未', 火: '戌', 金: '丑', 水: '辰' };
const CLASH = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
const COMBINE = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];

export const ELEMENT_MEANINGS: Record<Element, { theme: string; text: string; images: string[] }> = {
  木: { theme: '生长 · 舒展', text: '木取生发、向上、条达之象，常用于表达成长、规划与延展。', images: ['草木', '教育', '规划', '生长'] },
  火: { theme: '光明 · 表达', text: '火取温热、发散、照明之象，常用于表达热情、传播与可见度。', images: ['光热', '礼仪', '传播', '表达'] },
  土: { theme: '承载 · 积累', text: '土取承载、包容、稳定之象，常用于表达基础、信用与资源积累。', images: ['土地', '居所', '信用', '承载'] },
  金: { theme: '收敛 · 规则', text: '金取收敛、裁断、坚实之象，常用于表达秩序、边界与执行。', images: ['器物', '制度', '边界', '决断'] },
  水: { theme: '流动 · 融通', text: '水取流动、润下、渗透之象，常用于表达信息、思考与应变。', images: ['江河', '信息', '流通', '智慧'] },
};
const CHARACTER_IMAGES: Record<string, string> = {
  甲: '阳木，如乔木栋梁，取挺拔、建立与担当之象。', 乙: '阴木，如花草藤蔓，取柔韧、适应与联结之象。',
  丙: '阳火，如日光，取照耀、外放与明朗之象。', 丁: '阴火，如灯烛，取专注、细腻与启发之象。',
  戊: '阳土，如山岳厚土，取稳定、支撑与边界之象。', 己: '阴土，如田园，取涵养、经营与包容之象。',
  庚: '阳金，如矿石斧钺，取果决、变革与执行之象。', 辛: '阴金，如珠玉精器，取精细、品质与分寸之象。',
  壬: '阳水，如江海，取流通、开阔与汇聚之象。', 癸: '阴水，如雨露，取滋润、细察与渗透之象。',
  子: '子属阳水，藏癸阴水，取潜藏、孕育与流动之象。', 丑: '丑属阴土，藏己癸辛，取寒湿、收藏与积蓄之象。',
  寅: '寅属阳木，藏甲丙戊，取萌发、开创与伸展之象。', 卯: '卯属阴木，藏乙，取繁茂、柔韧与舒展之象。',
  辰: '辰属阳土，藏戊乙癸，取湿土、蓄水与转化之象。', 巳: '巳属阴火，藏丙庚戊，取升温、活跃与变化之象。',
  午: '午属阳火，藏丁己，取光热、显现与向外之象。', 未: '未属阴土，藏己丁乙，取温燥、培育与收藏之象。',
  申: '申属阳金，藏庚壬戊，取收敛、行动与转折之象。', 酉: '酉属阴金，藏辛，取精器、审美与凝练之象。',
  戌: '戌属阳土，藏戊辛丁，取燥土、守护与收藏之象。', 亥: '亥属阴水，藏壬甲，取涵养、潜藏与萌芽之象。',
};

export interface AnalysisPillar {
  key: string;
  title: string;
  subtitle?: string;
  kind: 'natal' | 'flow';
  ganZhi: string;
}
export interface CharacterSelection {
  columnKey: string;
  kind: 'stem' | 'branch' | 'hidden';
  hiddenStem?: string;
}
export interface CharacterSource {
  id: string;
  pillarKey: string;
  label: string;
  layer: 'natal' | 'flow';
  category: 'root' | 'support' | 'peer';
  tags: string[];
  path: string;
  note: string;
}
export interface SourceParty { key: string; label: string; evidence: string[] }
export interface ShareUnit {
  id: string;
  label: string;
  layer: 'natal' | 'flow';
  paths: string[];
  reasons: string[];
}

/** Finite source expansion: direct donor -> donor roots; no recursive donors. */
function countSourceUnits(columns: readonly AnalysisPillar[], selection: CharacterSelection, stem: string, sources: CharacterSource[]) {
  const target = columns.find((column) => column.key === selection.columnKey)!;
  const element = stemElement(stem)!;
  const units = new Map<string, ShareUnit>();
  const countedSourceIds = new Set<string>();
  const rootsOf = (value: string) => columns.filter((column) => HIDDEN_STEMS[column.ganZhi[1]].some((hidden) => stemElement(hidden) === stemElement(value)));
  const add = (column: AnalysisPillar, part: 'stem' | 'branch', path: string, reason: string) => {
    const id = `${column.key}:${part}`;
    const existing = units.get(id);
    if (existing) {
      if (!existing.paths.includes(path)) existing.paths.push(path);
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    } else units.set(id, {
      id, label: `${column.title}${part === 'stem' ? '天干' : '地支'}${column.ganZhi[part === 'stem' ? 0 : 1]}`,
      layer: column.kind, paths: [path], reasons: [reason],
    });
  };
  const ownRoot = HIDDEN_STEMS[target.ganZhi[1]].some((hidden) => stemElement(hidden) === element);
  add(target, selection.kind !== 'stem' || ownRoot ? 'branch' : 'stem', `${target.title}${selection.kind === 'branch' ? target.ganZhi[1] : stem} → 自身落点`,
    selection.kind === 'stem' && ownRoot ? '自身与坐下同五行根按通根连体合为一份。' : '自身落点记一份；无根时只表示虚浮落点，不代表有效力量。');

  for (const source of sources.filter((item) => item.category === 'root')) {
    const column = columns.find((item) => item.key === source.pillarKey)!;
    add(column, 'branch', source.path, '同一地支的藏根、禄与库中藏气合记一份；不按藏干数量拆份。');
    countedSourceIds.add(source.id);
  }

  for (const source of sources.filter((item) => item.category !== 'root')) {
    const column = columns.find((item) => item.key === source.pillarKey)!;
    const sameColumn = column.key === target.key;
    const natalColumns = columns.filter((item) => item.kind === 'natal');
    const adjacent = column.kind === 'natal' && target.kind === 'natal' && Math.abs(natalColumns.indexOf(column) - natalColumns.indexOf(target)) === 1;
    const involvesFlow = column.kind === 'flow' || target.kind === 'flow';
    if (source.id.endsWith('support-branch')) {
      // Hidden stems in other branches are merely potential feeds. Within one
      // branch, do not invent an internal self-feeding path for a hidden target.
      if (selection.kind !== 'stem' || !sameColumn) continue;
      add(column, 'branch', source.path, '同柱坐下藏干生扶天干，记来源地支一份；与已有根源重合时合并。');
      countedSourceIds.add(source.id);
      continue;
    }
    const hasContact = selection.kind === 'stem' ? adjacent || involvesFlow : sameColumn;
    if (!hasContact) continue;
    const donorStem = column.ganZhi[0];
    const donorRoots = rootsOf(donorStem);
    if (!donorRoots.length) continue;
    const donorOwnRoot = donorRoots.some((item) => item.key === column.key);
    const relationship = source.category === 'peer' ? '同类帮扶' : '生扶';
    add(column, donorOwnRoot ? 'branch' : 'stem', source.path, `${involvesFlow ? '岁运介入' : sameColumn ? '同柱' : '相邻天干'}${relationship}，供方有根才参与；供方通根连体合并。`);
    for (const donorRoot of donorRoots) {
      const hidden = HIDDEN_STEMS[donorRoot.ganZhi[1]].filter((item) => stemElement(item) === stemElement(donorStem));
      add(donorRoot, 'branch', `${donorRoot.title}${donorRoot.ganZhi[1]} → 藏${hidden.join('、')} → ${column.title}${donorStem} → ${target.title}${stem}`,
        '供方来源展开至地支根，每个实际来源只记一次；在藏气处终止，不继续递归生扶。');
    }
    countedSourceIds.add(source.id);
  }
  return { units: [...units.values()], countedSourceIds };
}

export function stemElement(stem: string): Element | null {
  const index = STEMS.indexOf(stem);
  return stem.length === 1 && index >= 0 ? ELEMENTS[Math.floor(index / 2)] : null;
}

export function characterTenGod(dayStem: string, stem: string): string | null {
  const day = STEMS.indexOf(dayStem), target = STEMS.indexOf(stem);
  if (dayStem.length !== 1 || stem.length !== 1 || day < 0 || target < 0) return null;
  const relationship = (Math.floor(target / 2) - Math.floor(day / 2) + 5) % 5;
  const samePolarity = day % 2 === target % 2;
  return [samePolarity ? '比肩' : '劫财', samePolarity ? '食神' : '伤官', samePolarity ? '偏财' : '正财', samePolarity ? '七杀' : '正官', samePolarity ? '偏印' : '正印'][relationship];
}

const isPair = (pairs: string[], a: string, b: string) => pairs.some((pair) => pair === a + b || pair === b + a);

export function analyzeBaziCharacter(columns: readonly AnalysisPillar[], selection: CharacterSelection) {
  const natal = columns.filter((column) => column.kind === 'natal');
  const target = columns.find((column) => column.key === selection.columnKey);
  if (!target || natal.length !== 4 || new Set(columns.map((column) => column.key)).size !== columns.length) return null;
  const validPillar = (column: AnalysisPillar) => column.ganZhi?.length === 2 && STEMS.includes(column.ganZhi[0]) && BRANCHES.includes(column.ganZhi[1]);
  if (!validPillar(target) || !natal.every(validPillar)) return null;
  const validColumns = columns.filter(validPillar);
  const branch = target.ganZhi[1];
  const hidden = HIDDEN_STEMS[branch];
  const stem = selection.kind === 'stem' ? target.ganZhi[0] : selection.kind === 'branch' ? hidden[0] : selection.hiddenStem;
  if (!stem || (selection.kind === 'hidden' && !hidden.includes(stem))) return null;
  const element = stemElement(stem)!;
  const dayMaster = natal[2].ganZhi[0];
  const char = selection.kind === 'branch' ? branch : stem;
  const location = `${target.title}${selection.kind === 'stem' ? '天干' : selection.kind === 'branch' ? '地支' : '藏干'}${char}`;
  const targetName = selection.kind === 'branch' ? `${location}（本气${stem}）` : location;
  const sources: CharacterSource[] = [];
  const supportElement = ELEMENTS[(ELEMENTS.indexOf(element) + 4) % 5];

  for (const column of validColumns) {
    const gan = column.ganZhi[0], zhi = column.ganZhi[1];
    const contents = HIDDEN_STEMS[zhi];
    const matching = contents.filter((item) => stemElement(item) === element);
    const ownHost = column.key === target.key && selection.kind !== 'stem';
    if (matching.length) {
      const tags = matching.map((item) => `${QI[contents.indexOf(item)]}${item}${item === stem ? ' · 同干根' : ' · 同五行根'}`);
      if (zhi === LU[stem]) tags.push('禄根');
      if (zhi === STORAGE[element]) tags.push('墓库线索');
      sources.push({
        id: `${column.key}:branch`, pillarKey: column.key, layer: column.kind, category: 'root',
        label: `${column.title}${zhi}`, tags,
        path: `${column.title}${zhi} → 藏${matching.join('、')} → ${targetName}`,
        note: [ownHost ? '这是目标的藏气落点，不另拆为自身之外的一份。' : '藏干说明根系联系；本、中、余气不视作等量力量。',
          zhi === LU[stem] ? '禄根与此处藏根是同一来源，不重复列份。' : '',
          zhi === STORAGE[element] ? '藏气已按根源单位计入；开库及取得条件另判，不追加库份。' : '',
          column.kind === 'flow' ? '岁运引入的直接根系，按本页来源单位制参与，单列来源。' : '',
        ].filter(Boolean).join(''),
      });
    }
    const feed = contents.filter((item) => stemElement(item) === supportElement);
    if (feed.length) sources.push({
      id: `${column.key}:support-branch`, pillarKey: column.key, layer: column.kind, category: 'support',
      label: `${column.title}${zhi}`, tags: ['生扶待核'],
      path: `${column.title}${zhi} → 藏${feed.join('、')}（${supportElement}）→ 生${stem}（${element}）`,
      note: '其他柱的藏干相生先作线索，须符合本页位置规则才参与；若与根源同柱，合算前核重。',
    });
    // A hidden target may be related to the visible stem in its own column.
    if (selection.kind === 'stem' && column.key === target.key) continue;
    if (stemElement(gan) === supportElement) sources.push({
      id: `${column.key}:support-stem`, pillarKey: column.key, layer: column.kind, category: 'support',
      label: `${column.title}天干${gan}`, tags: ['生扶待核'],
      path: `${column.title}${gan}（${supportElement}）→ 生${stem}（${element}）`,
      note: '存在五行相生关系；符合相邻天干、同柱或岁运介入规则且供方有根时才计入。',
    });
    if (stemElement(gan) === element) sources.push({
      id: `${column.key}:peer`, pillarKey: column.key, layer: column.kind, category: 'peer',
      label: `${column.title}天干${gan}`, tags: [gan === stem ? '同干明透' : '同类明透'],
      path: `${column.title}${gan} ↔ ${targetName}`,
      note: '同类明透不等于地支根；符合位置规则且供方有根时才参与，重合来源合并。',
    });
  }

  const roots = sources.filter((source) => source.category === 'root');
  const natalRoots = roots.filter((source) => source.layer === 'natal');
  const flowSources = sources.filter((source) => source.layer === 'flow');
  // This is explicitly a PARTY ledger, never a share / strength ledger.
  const parties: SourceParty[] = [];
  const addParty = (pillarKey: string, evidence: string) => {
    const index = natal.findIndex((column) => column.key === pillarKey);
    if (index < 0) return;
    const key = index >= 2 ? 'home' : natal[index].key;
    let party = parties.find((item) => item.key === key);
    if (!party) {
      party = { key, label: index >= 2 ? '家内 · 日时' : `家外 · ${natal[index].title}`, evidence: [] };
      parties.push(party);
    }
    if (!party.evidence.includes(evidence)) party.evidence.push(evidence);
  };
  if (target.kind === 'natal') addParty(target.key, `${location} · 自身落点`);
  for (const root of natalRoots) addParty(root.pillarKey, `${root.label} · 根系`);

  const interactions: { id: string; text: string }[] = [];
  const relatedKeys = new Set([target.key, ...natalRoots.map((source) => source.pillarKey)]);
  for (const flow of validColumns.filter((column) => column.kind === 'flow')) {
    for (const original of natal.filter((column) => relatedKeys.has(column.key))) {
      const a = flow.ganZhi[1], b = original.ganZhi[1];
      const relation = isPair(CLASH, a, b) ? '六冲' : isPair(COMBINE, a, b) ? '六合' : null;
      if (relation) interactions.push({ id: `${flow.key}:${original.key}`, text: `${flow.title}${a}与${original.title}${b}${relation}。涉及目标或根源位置，标记作用条件变化；不直接认定冲断根、开库或合化成功。` });
    }
  }
  const support = sources.filter((source) => source.category === 'support');
  const peers = sources.filter((source) => source.category === 'peer');
  const ledger = countSourceUnits(validColumns, selection, stem, sources);
  const natalLedger = target.kind === 'natal' ? countSourceUnits(natal, selection, stem, sources.filter((source) => source.layer === 'natal')) : null;
  for (const source of sources) {
    if (source.category === 'root') continue;
    const counted = ledger.countedSourceIds.has(source.id);
    const mergedViaOtherPath = source.id.endsWith('support-branch') && ledger.units.some((unit) => unit.id === `${source.pillarKey}:branch`);
    source.tags = [counted ? source.category === 'support' ? '生扶参与' : '同类参与' : mergedViaOtherPath ? '来源已合并' : source.category === 'support' ? '生扶线索 · 未计份' : '同类线索 · 未计份'];
    source.note = counted ? `${source.note}已按来源单位计入，重复路径不重复加份。`
      : mergedViaOtherPath ? '此条直接生扶未满足位置条件；同一地支已通过其他根源或供方展开路径计入，详见份额明细，不重复加份。'
        : `${source.note}此处未满足参与条件，暂不加份。`;
  }
  const rootStatus = roots.length ? '有根系可查' : support.some((source) => ledger.countedSourceIds.has(source.id)) ? '无根 · 有生扶' : support.length ? '无根 · 生扶待核' : peers.length ? '无根 · 同类待核' : '无根无气（当前口径）';
  return {
    target, selection, char, stem, branch, element, dayMaster, location,
    polarity: (selection.kind === 'branch' ? BRANCHES.indexOf(branch) : STEMS.indexOf(stem)) % 2 === 0 ? '阳' : '阴',
    imagery: CHARACTER_IMAGES[char], tenGod: characterTenGod(dayMaster, stem)!,
    isDayMaster: target.key === natal[2].key && selection.kind === 'stem',
    hidden: hidden.map((item, index) => ({ stem: item, qi: QI[index], tenGod: characterTenGod(dayMaster, item)! })),
    sources, roots, natalRoots, flowSources, interactions, parties, rootStatus,
    units: ledger.units,
    finalShares: ledger.units.length,
    natalShares: natalLedger?.units.length ?? null,
    natalUnits: natalLedger?.units ?? [],
    addedUnits: natalLedger ? ledger.units.filter((unit) => !natalLedger.units.some((original) => original.id === unit.id)) : [],
    shareReason: '按来源单位计份：自身、直接根源与符合条件的生扶展开来源计入，同一来源多路径合并。每份是一个来源单位，不是等量力量。',
    scopeNote: '按同五行藏干、禄根及生扶线索查根气；未将月令旺衰、合化与制化折算成分数。无根无气仅指本页未检出上述线索。',
    expansionNote: '生扶与同类供方只展开一层到地支根，根处终止。日时合并用于参与方归属，不把家内不同来源压成一份；冲合只标记条件，不直接增减份数。',
  };
}

export type CharacterAnalysis = NonNullable<ReturnType<typeof analyzeBaziCharacter>>;
