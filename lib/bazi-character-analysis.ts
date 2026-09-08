/**
 * Browser-only, deterministic source tracing. Rules: skills/analyze-bazi-fene.md.
 * The user authorized filling missing counting rules. The application's explicit
 * source-unit-v2 policy is documented in docs/bazi-source-units.md. These nominal
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
// Explicit root relationships, not a search for a hidden generating element.
// Fire follows the user's 寅、巳、午、未、戌 rule; other element defaults are
// documented separately so an analogy is not presented as a user-specified rule.
export const ROOT_RELATIONS: Record<Element, Readonly<Record<string, string>>> = {
  木: { 亥: '长生根', 寅: '同五行根', 卯: '同五行根', 辰: '库中余气根', 未: '墓库根' },
  火: { 寅: '长生根', 巳: '同五行根', 午: '同五行根', 未: '墓库根', 戌: '墓库根' },
  土: { 寅: '长生根（寄火）', 巳: '寄火禄根', 午: '寄火禄刃根', 辰: '同五行根', 未: '同五行根', 戌: '同五行根', 丑: '同五行根' },
  金: { 巳: '长生根', 申: '同五行根', 酉: '同五行根', 丑: '墓库根', 戌: '库中余气根' },
  水: { 申: '长生根', 亥: '同五行根', 子: '同五行根', 辰: '墓库根', 丑: '库中余气根' },
};
export function rootRelation(stem: string, branch: string): string | null {
  const element = stemElement(stem);
  return element ? ROOT_RELATIONS[element][branch] || null : null;
}
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
  memberKeys: string[];
  sourceLabels: string[];
  paths: string[];
  reasons: string[];
}

/** Same-column deduplication first, then merge connected household support. */
function countSourceUnits(columns: readonly AnalysisPillar[], selection: CharacterSelection, stem: string, sources: CharacterSource[]) {
  const target = columns.find((column) => column.key === selection.columnKey)!;
  const units = new Map<string, ShareUnit>();
  const countedSourceIds = new Set<string>();
  const natal = columns.filter((column) => column.kind === 'natal');
  const isHome = (column: AnalysisPillar) => column.kind === 'natal' && natal.indexOf(column) >= 2;
  const homeSupport = new Set<string>();
  const rootsOf = (value: string) => columns.filter((column) => rootRelation(value, column.ganZhi[1]));
  const add = (column: AnalysisPillar, part: 'stem' | 'branch', path: string, reason: string, support = false) => {
    const id = `${column.key}:column`;
    const label = `${column.title}${part === 'stem' ? '天干' : '地支'}${column.ganZhi[part === 'stem' ? 0 : 1]}`;
    const existing = units.get(id);
    if (existing) {
      if (!existing.paths.includes(path)) existing.paths.push(path);
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      if (!existing.sourceLabels.includes(label)) existing.sourceLabels.push(label);
    } else units.set(id, {
      id, label, layer: column.kind, memberKeys: [column.key], sourceLabels: [label], paths: [path], reasons: [reason],
    });
    if (support && isHome(column)) homeSupport.add(column.key);
  };
  add(target, selection.kind === 'stem' ? 'stem' : 'branch', `${target.title}${selection.kind === 'branch' ? target.ganZhi[1] : stem} → 自身落点`,
    '自身落点记一份；同柱坐下即使有根或生扶也合在这一份中。无根时只是虚浮落点，不代表有效力量。');

  for (const source of sources.filter((item) => item.category === 'root')) {
    const column = columns.find((item) => item.key === source.pillarKey)!;
    add(column, 'branch', source.path, '长生、同五行根或墓库按明确根表确认；同柱天干与地支合记一份，禄与藏气不再拆份。');
    countedSourceIds.add(source.id);
  }

  for (const source of sources.filter((item) => item.category !== 'root')) {
    const column = columns.find((item) => item.key === source.pillarKey)!;
    const sameColumn = column.key === target.key;
    const adjacent = column.kind === 'natal' && target.kind === 'natal' && Math.abs(natal.indexOf(column) - natal.indexOf(target)) === 1;
    const involvesFlow = column.kind === 'flow' || target.kind === 'flow';
    // A rooted household donor can participate as a household, not merely as
    // the immediately adjacent stem. This covers 月丁 <- 时乙 + 日卯.
    const homeContact = isHome(column);
    if (source.id.endsWith('support-branch')) {
      const mainElement = stemElement(HIDDEN_STEMS[column.ganZhi[1]][0]);
      const supportingElement = ELEMENTS[(ELEMENTS.indexOf(stemElement(stem)!) + 4) % 5];
      if (mainElement !== supportingElement || selection.kind !== 'stem' || !(sameColumn || adjacent || homeContact || involvesFlow)) continue;
      add(column, 'branch', source.path, '地支本气五行生扶，按实际位置参与；不是因杂气藏干中有生我之物便立根或另加份。同柱并入自身，家内相连生扶合看。', true);
      countedSourceIds.add(source.id);
      continue;
    }
    const hasContact = selection.kind === 'stem' ? sameColumn || adjacent || homeContact || involvesFlow : sameColumn;
    if (!hasContact) continue;
    const donorStem = column.ganZhi[0];
    const donorRoots = rootsOf(donorStem);
    if (!donorRoots.length) continue;
    const relationship = source.category === 'peer' ? '同类帮扶' : '生扶';
    const connectedRoots = donorRoots.filter((root) => root.key === column.key || (isHome(column) && isHome(root)));
    const evidenceRoots = connectedRoots.length ? connectedRoots : donorRoots;
    add(column, 'stem', source.path, `${involvesFlow ? '岁运介入' : sameColumn ? '同柱' : homeContact ? '家内来源' : '相邻天干'}${relationship}，供方有明确根基才参与。同柱与家内相连来源分别合并。`, true);
    for (const donorRoot of evidenceRoots) {
      const path = `${donorRoot.title}${donorRoot.ganZhi[1]}（${rootRelation(donorStem, donorRoot.ganZhi[1])}）→ ${column.title}${donorStem} → ${target.title}${stem}`;
      if (connectedRoots.includes(donorRoot)) {
        add(donorRoot, 'branch', path, '只展开供方同柱或家内相连根基；日时的这条生扶链合记一份，不重复拆出干、支。', true);
      } else {
        // External roots establish a donor's grounding, not automatic transfer
        // of all those roots' shares to the target.
        add(column, 'stem', path, '外部根仅作为供方有根的依据；没有进一步传份关系时，不把供方全盘根基自动叠加到目标。', true);
      }
    }
    countedSourceIds.add(source.id);
  }

  let result = [...units.values()];
  if (homeSupport.size > 1) {
    const members = result.filter((unit) => homeSupport.has(unit.memberKeys[0]));
    const sourceLabels = [...new Set(members.flatMap((unit) => unit.sourceLabels))]
      .sort((a, b) => Number(b.includes('天干')) - Number(a.includes('天干')));
    const containsTarget = members.some((unit) => unit.memberKeys.includes(target.key));
    const merged: ShareUnit = {
      id: 'home:support', label: `${containsTarget ? '自身与' : ''}家内生扶（${sourceLabels.map((label) => label.replace(/天干|地支/g, '')).join('、')}）`,
      layer: 'natal', memberKeys: members.flatMap((unit) => unit.memberKeys), sourceLabels,
      paths: [...new Set(members.flatMap((unit) => unit.paths))],
      reasons: ['日时家内有实际联系的生扶来源合看为一份；不把家内天干和根支拆开重复计份。', ...new Set(members.flatMap((unit) => unit.reasons))],
    };
    const first = result.indexOf(members[0]);
    result = result.filter((unit) => !members.includes(unit));
    result.splice(first, 0, merged);
  }
  return { units: result, countedSourceIds };
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
    const relation = rootRelation(stem, zhi);
    if (relation) {
      const tags = [relation, ...matching.map((item) => `${QI[contents.indexOf(item)]}${item}`)];
      if (zhi === LU[stem]) tags.push('禄根');
      sources.push({
        id: `${column.key}:branch`, pillarKey: column.key, layer: column.kind, category: 'root',
        label: `${column.title}${zhi}`, tags,
        path: `${column.title}${zhi} → ${element}的${relation} → ${targetName}`,
        note: [ownHost ? '这是目标所在位置，同柱不另拆份。' : '根按长生、同五行根和墓库对应表确认；藏干只补充气性，不因相生藏干便立根。',
          column.key === target.key ? '坐下根与目标同柱，合为一份。' : '',
          zhi === LU[stem] ? '禄与此根是同一来源，不重复列份。' : '',
          relation.includes('库') ? '墓库根可确认，开库及取得另判，不追加库份。' : '',
          column.kind === 'flow' ? '岁运根单列，仍遵守同柱合并。' : '',
        ].filter(Boolean).join(''),
      });
    }
    const feed = contents.filter((item) => stemElement(item) === supportElement);
    if (feed.length) {
      const mainFeeds = stemElement(contents[0]) === supportElement;
      sources.push({
        id: `${column.key}:support-branch`, pillarKey: column.key, layer: column.kind, category: 'support',
        label: `${column.title}${zhi}`, tags: ['生扶待核'],
        path: mainFeeds ? `${column.title}${zhi}（${supportElement}，本气${contents[0]}）→ 生${stem}（${element}）`
          : `${column.title}${zhi} → 藏${feed.join('、')}（${supportElement}）· 仅藏干相生线索`,
        note: mainFeeds ? '地支本气五行相生，按位置与家内生扶关系判断是否计入，同柱不重复计份。'
          : '仅杂气藏干中有生我之物，不能据此立根或计为独立生扶份额。',
      });
    }
    // A hidden target may be related to the visible stem in its own column.
    if (selection.kind === 'stem' && column.key === target.key) continue;
    if (stemElement(gan) === supportElement) sources.push({
      id: `${column.key}:support-stem`, pillarKey: column.key, layer: column.kind, category: 'support',
      label: `${column.title}天干${gan}`, tags: ['生扶待核'],
      path: `${column.title}${gan}（${supportElement}）→ 生${stem}（${element}）`,
      note: '存在五行相生关系；供方有明确根基，并符合相邻、同柱、家内来源或岁运介入关系时参与。',
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
      if (relation) interactions.push({ id: `${flow.key}:${original.key}`, text: `${flow.title}${a}与${original.title}${b}${relation}。` });
    }
  }
  const support = sources.filter((source) => source.category === 'support');
  const peers = sources.filter((source) => source.category === 'peer');
  const ledger = countSourceUnits(validColumns, selection, stem, sources);
  const natalLedger = target.kind === 'natal' ? countSourceUnits(natal, selection, stem, sources.filter((source) => source.layer === 'natal')) : null;
  for (const unit of ledger.units) for (const key of unit.memberKeys) {
    if (natal.some((column) => column.key === key)) addParty(key, `${unit.label} · 已计来源`);
  }
  for (const source of sources) {
    if (source.category === 'root') continue;
    const counted = ledger.countedSourceIds.has(source.id);
    const sourceColumn = validColumns.find((column) => column.key === source.pillarKey)!;
    const hiddenFeedOnly = source.id.endsWith('support-branch') && stemElement(HIDDEN_STEMS[sourceColumn.ganZhi[1]][0]) !== supportElement;
    if (hiddenFeedOnly) {
      source.tags = ['藏干相生 · 不计份'];
      source.note = '仅杂气藏干中有生我之物，不据此立根，也不计为独立生扶。该柱若另有自身或明确根源参与，只按相应路径计一次。';
      continue;
    }
    const mergedViaOtherPath = ledger.units.some((unit) => unit.memberKeys.includes(source.pillarKey));
    source.tags = [counted ? source.category === 'support' ? '生扶参与' : '同类参与' : mergedViaOtherPath ? '来源已合并' : source.category === 'support' ? '生扶线索 · 未计份' : '同类线索 · 未计份'];
    source.note = counted ? `${source.note}已按来源单位计入，重复路径不重复加份。`
      : mergedViaOtherPath ? '此条线索本身不额外计份；同柱已作为自身、根源或家内生扶计入，详见份额明细，不能再拆出一份。'
        : `${source.note}此处未满足参与条件，暂不加份。`;
  }
  const rootStatus = roots.length ? '有根系可查' : support.some((source) => ledger.countedSourceIds.has(source.id)) ? '无根 · 有生扶' : support.length ? '无根 · 生扶待核' : peers.length ? '无根 · 同类待核' : '无根无气';
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
    addedUnits: natalLedger ? ledger.units.filter((unit) => unit.memberKeys.some((key) => !natalLedger.units.some((original) => original.memberKeys.includes(key)))) : [],
    shareReason: '自身与坐下同柱只计一份；根须符合长生、同五行根或墓库对应关系。家内相连生扶合看一份，杂气藏干相生不自动计份。每份不代表等量力量。',
    scopeNote: `当前${stem}${element}按明确根表查${Object.keys(ROOT_RELATIONS[element]).join('、')}，生扶另列。仅杂气藏干相生不能立根。无根无气仅指当前规则未检出相应线索，不等于完整旺衰判断。`,
    expansionNote: '生扶只展开至供方同柱或家内相连根基，日时这条来源链合记一份；外部根可说明供方有根，但不自动转移其全部份数。不同直接根仍按实际关系计入，不用参与方数量封顶。冲合只提示条件。',
  };
}

export type CharacterAnalysis = NonNullable<ReturnType<typeof analyzeBaziCharacter>>;
