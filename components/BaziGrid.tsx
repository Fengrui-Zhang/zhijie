import React, { useMemo, useState } from 'react';
import { Solar } from 'lunar-javascript';
import { calculateBaziLiuRiData, calculateBaziLiuYueData } from 'taibu-core/bazi';
import { BaziResponse } from '../types';
import { getShenShaTone, normalizeZhijieShenSha, type BaziShenShaContext } from '../utils/baziShensha';
import { getWuxingColor } from '../utils/wuxing';
import {
  buildBaziBasicAnalysisSystemPrompt,
  buildBaziBasicAnalysisUserPrompt,
} from '../lib/bazi-basic-analysis-prompts';
import { formatPromptCopyMessages } from '../lib/chat-prompt-copy';
import MarkdownContent from './MarkdownContent';

interface Props {
  data: BaziResponse;
  caseId?: string | null;
  initialAnalysisData?: unknown;
  personalizationPrompt?: string;
  aiPanel?: React.ReactNode;
  onTabChange?: (tab: BaziTab) => void;
  onAnalysisSaved?: (nextInitialAnalysisData: unknown) => void | Promise<void>;
}

const splitList = (value?: string | string[]) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value.split(/[|、\s]+/).filter(Boolean);
};

const labelForPillar = ['年柱', '月柱', '日柱', '时柱'];
const rowLabels = ['主星', '天干', '地支', '藏干', '纳音', '神煞'];
type BaziTab = 'basic' | 'professional' | 'ai' | 'notes';
type AnalysisType = 'wuxing' | 'personality';
type TenGodSourceKey = 'tiangan' | 'dizhi' | 'canggan';
type TenGodLocationMap = Record<string, Partial<Record<TenGodSourceKey, string[]>>>;

const tenGodSourceLabels: Record<TenGodSourceKey, string> = {
  tiangan: '天干',
  dizhi: '地支',
  canggan: '藏干',
};

const elementLabel = (stem: string) => {
  const map: Record<string, string> = {
    甲: '木',
    乙: '木',
    丙: '火',
    丁: '火',
    戊: '土',
    己: '土',
    庚: '金',
    辛: '金',
    壬: '水',
    癸: '水',
  };
  return map[stem] || '';
};

const patternFromTenGod = (tenGod?: string) => {
  const map: Record<string, string> = {
    正官: '正官格',
    七杀: '七杀格',
    正财: '财格',
    偏财: '财格',
    正印: '印格',
    偏印: '印格',
    食神: '食神格',
    伤官: '伤官格',
    比肩: '比劫格',
    劫财: '比劫格',
  };
  return tenGod ? map[tenGod] || '' : '';
};

const dayMasterDescriptions: Record<string, string> = {
  甲: '甲木如参天大树，重原则、有担当，适合在清晰秩序中稳步生长。命局得水木相助则志向舒展，火土金过重时需留意压力和消耗。',
  乙: '乙木如花草藤蔓，柔韧细腻，擅长协调与适应。得水木则灵感生发，金土过旺时容易顾虑增多，需要保持边界。',
  丙: '丙火如太阳，外放坦率，重视表达和影响力。命局火势得宜则热情有号召力，过旺则急躁，过弱则信心不足。',
  丁: '丁火如灯烛，敏锐细致，重精神感受和审美。得木火则才情明亮，水土过重时容易内耗，需要稳定节奏。',
  戊: '戊土如高山厚土，稳重可信，重承诺与结构。土得其位则能承载资源，过厚则迟滞，过弱则难以定盘。',
  己: '己土如田园土壤，包容务实，善于经营细节。得火土则有耐心和执行力，木水过重时需防被事务牵着走。',
  庚: '庚金如斧钺矿石，直接果断，重效率与结果。得火炼、土生则成器，金过旺则锋芒太露，水木过旺则耗力。',
  辛: '辛金如珠玉，精致敏感，重品质、规则和审美。得土金则格局清晰，火过旺需防压力，水旺则思虑增多。',
  壬: '壬水如江河大海，视野开阔，善流动与整合。得金水则智慧通达，土重则受限，火旺则耗神。',
  癸: '癸水如雨露泉水，细腻聪慧，善观察与渗透。得金水则灵性充足，土火过重时需要补充安全感和恢复力。',
};

const tenGodKnowledge: Record<string, {
  alias: string;
  element: string;
  shortDesc: string;
  meaning: string;
  represent: string[];
  character: string[];
  career: string;
  relationship: string;
}> = {
  比肩: {
    alias: '比劫、兄弟',
    element: '与日主同五行、同阴阳',
    shortDesc: '代表兄弟、朋友、同辈',
    meaning: '比肩代表独立、自主和平等竞争，也象征同辈之间的支持与较量。',
    represent: ['兄弟', '朋友', '同事', '合作伙伴', '同辈'],
    character: ['独立自主', '坚强', '重义气', '竞争意识强'],
    career: '适合自主性强、需要协作或竞争意识的领域。',
    relationship: '关系中重平等和尊重，不宜过度控制或依附。',
  },
  劫财: {
    alias: '败财、阳刃',
    element: '与日主同五行、异阴阳',
    shortDesc: '代表竞争、消耗、行动力',
    meaning: '劫财代表争夺、破局和行动冲劲，用得好是胆识，用偏则成冲动消耗。',
    represent: ['竞争者', '对手', '朋友', '破财', '机会争夺'],
    character: ['好胜', '直接', '敢冲', '重情义'],
    career: '适合开拓、销售、竞技、创业等需要胆量的工作。',
    relationship: '需注意冲动表达和第三方干扰，感情中要减少较劲。',
  },
  食神: {
    alias: '寿星、爵星',
    element: '日主所生、同阴阳',
    shortDesc: '代表才华、福气、表达',
    meaning: '食神代表自然流露的才华、口福、享受和温和的创造力。',
    represent: ['才艺', '表达', '口福', '创造力', '子女'],
    character: ['温和', '乐观', '有审美', '会表达'],
    career: '适合教育、内容、餐饮、艺术、服务等领域。',
    relationship: '感情中体贴轻松，适合细水长流。',
  },
  伤官: {
    alias: '伤星',
    element: '日主所生、异阴阳',
    shortDesc: '代表创意、锋芒、突破',
    meaning: '伤官代表强表达、创新和挑战规则的力量，才华明显但也容易锋芒外露。',
    represent: ['才华', '创新', '表现欲', '突破', '子女'],
    character: ['聪明', '不服管', '表达强', '追求自由'],
    career: '适合创意、设计、传播、技术突破和个人品牌。',
    relationship: '容易挑剔，需要被理解和欣赏。',
  },
  偏财: {
    alias: '横财',
    element: '日主所克、同阴阳',
    shortDesc: '代表机会财、人脉、父亲',
    meaning: '偏财代表流动资源、机会、人情往来和非固定收入。',
    represent: ['投资', '客户', '父亲', '偏财', '资源'],
    character: ['慷慨', '会交际', '机会感强', '灵活'],
    career: '适合经营、投资、市场、商务和资源整合。',
    relationship: '异性缘和社交机会较多，需守住边界。',
  },
  正财: {
    alias: '财星',
    element: '日主所克、异阴阳',
    shortDesc: '代表稳定收入、现实经营',
    meaning: '正财代表稳定收益、务实经营和对现实生活的掌控。',
    represent: ['工资', '资产', '妻子', '稳定财源', '生活秩序'],
    character: ['务实', '谨慎', '守信', '重结果'],
    career: '适合财务、运营、管理、银行、实业等稳定领域。',
    relationship: '重责任和长期建设，表达可能偏实际。',
  },
  七杀: {
    alias: '偏官、七煞',
    element: '克日主、同阴阳',
    shortDesc: '代表压力、权威、竞争',
    meaning: '七杀代表挑战、压力、纪律和强竞争环境，制化得宜则有魄力。',
    represent: ['压力', '上司', '权威', '风险', '丈夫'],
    character: ['果断', '有冲劲', '抗压', '强势'],
    career: '适合管理、军警、法律、竞技、创业攻坚。',
    relationship: '需处理强弱关系，避免压迫式沟通。',
  },
  正官: {
    alias: '官星',
    element: '克日主、异阴阳',
    shortDesc: '代表规则、事业、名誉',
    meaning: '正官代表秩序、责任、规范和正向约束，是社会角色与名誉的象征。',
    represent: ['职位', '规则', '上司', '丈夫', '名誉'],
    character: ['自律', '负责', '守规矩', '重名声'],
    career: '适合体制、管理、法律、行政和标准化行业。',
    relationship: '重承诺和责任，适合正式稳定关系。',
  },
  偏印: {
    alias: '枭神、枭印',
    element: '生日主、同阴阳',
    shortDesc: '代表独特思维、偏门学问',
    meaning: '偏印代表非主流知识、灵感、内在保护和独特理解力。',
    represent: ['研究', '艺术', '宗教', '玄学', '继母'],
    character: ['独立', '敏感', '钻研', '不随俗'],
    career: '适合研究、咨询、艺术、技术、玄学和小众专业。',
    relationship: '需要精神理解，容易显得疏离。',
  },
  正印: {
    alias: '印绶、印星',
    element: '生日主、异阴阳',
    shortDesc: '代表学习、贵人、母亲',
    meaning: '正印代表稳定支持、正统学习、保护力和贵人资源。',
    represent: ['母亲', '学历', '贵人', '证书', '房产'],
    character: ['温和', '重学问', '有包容', '重安全'],
    career: '适合教育、学术、医疗、咨询、文化和服务领域。',
    relationship: '照顾欲强，但需避免过度保护。',
  },
};

const hiddenText = (stems?: string, gods?: string) => {
  const stemList = splitList(stems);
  const godList = splitList(gods);
  if (!stemList.length) return '—';
  return stemList.map((stem, index) => `${stem}${godList[index] ? `(${godList[index]})` : ''}`).join(' ');
};

const formatFlowSolarDay = (date?: string, fallbackDay?: number | string) => {
  const match = typeof date === 'string' ? date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) : null;
  if (match) return `${Number(match[3])}`;
  return fallbackDay ? `${fallbackDay}` : '—';
};

const formatFlowLunarDay = (date?: string) => {
  const match = typeof date === 'string' ? date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) : null;
  if (!match) return '—';
  try {
    return Solar.fromYmd(Number(match[1]), Number(match[2]), Number(match[3])).getLunar().getDayInChinese();
  } catch {
    return '—';
  }
};

const formatSolarDateShort = (date?: string) => {
  const match = typeof date === 'string' ? date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) : null;
  if (!match) return '';
  return `${Number(match[2])}.${Number(match[3])}`;
};

const formatFlowMonthRange = (item?: any) => {
  const start = formatSolarDateShort(item?.startDate);
  const end = formatSolarDateShort(item?.endDate);
  if (start && end) return `${start}-${end}`;
  if (start) return start;
  return item?.month ? `${item.month}月` : '—';
};

const shortTenGod = (value?: string) => {
  const map: Record<string, string> = {
    比肩: '比',
    劫财: '劫',
    食神: '食',
    伤官: '伤',
    偏财: '才',
    正财: '财',
    七杀: '杀',
    正官: '官',
    偏印: '枭',
    正印: '印',
    日主: '日',
  };
  return value ? map[value] || value : '';
};

const getGanZhiParts = (item?: any) => {
  const ganZhi = item?.ganZhi || '';
  const gan = item?.gan || item?.stem || ganZhi.charAt(0) || '';
  const zhi = item?.zhi || item?.branch || ganZhi.charAt(1) || '';
  return { gan, zhi };
};

const getBranchTenGod = (item?: any) => item?.branchTenGod || item?.hiddenStems?.[0]?.tenGod || '';

const parseHiddenStemPairs = (value?: string) => {
  const text = value && value !== '—' ? value : '';
  if (!text) return [];
  return text
    .split(/[、\s]+/)
    .map((part) => {
      const match = part.match(/^([甲乙丙丁戊己庚辛壬癸])(?:[·(（]([^()（）·]+)[)）]?)?$/);
      if (!match) return null;
      return { stem: match[1], tenGod: match[2] || '' };
    })
    .filter((item): item is { stem: string; tenGod: string } => Boolean(item));
};

const FlowStemBranch = ({
  gan,
  zhi,
  stemTenGod,
  branchTenGod,
}: {
  gan: string;
  zhi: string;
  stemTenGod?: string;
  branchTenGod?: string;
}) => (
  <div className="mt-1 flex flex-col items-center gap-0.5">
    <div className="flex items-baseline justify-center gap-1 leading-none">
      <span className={`text-sm font-bold sm:text-base md:text-lg ${getWuxingColor(gan)}`}>{gan || '—'}</span>
      {stemTenGod && <span className="text-[9px] font-medium text-stone-500 sm:text-[10px] md:text-xs">{shortTenGod(stemTenGod)}</span>}
    </div>
    <div className="flex items-baseline justify-center gap-1 leading-none">
      <span className={`text-sm font-bold sm:text-base md:text-lg ${getWuxingColor(zhi)}`}>{zhi || '—'}</span>
      {branchTenGod && <span className="text-[9px] font-medium text-stone-500 sm:text-[10px] md:text-xs">{shortTenGod(branchTenGod)}</span>}
    </div>
  </div>
);

const FlowItemButton = ({
  active,
  children,
  onClick,
  wide = false,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  wide?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[72px] shrink-0 whitespace-nowrap border-r border-stone-100 px-1 py-1 text-center transition last:border-r-0 sm:min-h-[80px] sm:px-1.5 sm:py-1.5 md:min-h-[86px] ${
      wide ? 'w-[62px] sm:w-[68px] md:w-[74px]' : 'w-[58px] sm:w-[64px] md:w-[70px]'
    } ${
      active
        ? 'bg-amber-100/70 text-stone-950 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.18)]'
        : 'bg-transparent text-stone-700 hover:bg-white/70'
    }`}
  >
    {children}
  </button>
);

const FlowRail = ({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) => (
  <section className="border-t border-stone-100/80 py-1.5 first:border-t-0 first:pt-0">
    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-1 px-1">
      <div className="text-xs font-bold text-stone-900 sm:text-sm md:text-base">{title}</div>
      {meta && <div className="text-[9px] font-medium text-stone-500 sm:text-[10px] md:text-xs">{meta}</div>}
    </div>
    <div className="-mx-2 overflow-x-auto px-2">
      <div className="flex min-w-max overflow-hidden rounded-xl border border-stone-100 bg-white/45">
        {children}
      </div>
    </div>
  </section>
);

const HiddenStemStack = ({ value }: { value?: string }) => {
  const pairs = parseHiddenStemPairs(value);
  if (!pairs.length) return <span className="text-stone-400">—</span>;
  return (
    <div className="flex flex-col items-center gap-1">
      {pairs.map((item, index) => (
        <div key={`${item.stem}-${item.tenGod}-${index}`} className="flex items-center justify-center gap-1 whitespace-nowrap">
          <span className={`text-xs font-bold md:text-sm ${getWuxingColor(item.stem)}`}>{item.stem}</span>
          {item.tenGod && (
            <>
              <span className="text-[10px] text-stone-300">·</span>
              <span className="text-[10px] font-medium text-stone-500 md:text-xs">{item.tenGod}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const ShenShaList = ({ value, expanded }: { value?: string; expanded: boolean }) => {
  const items = splitList(value);
  if (!items.length) return <span className="text-stone-400">—</span>;
  const visible = expanded ? items : items.slice(0, 3);
  const toneClass = (item: string) => {
    const tone = getShenShaTone(item);
    if (tone === 'good') return 'text-emerald-700';
    if (tone === 'bad') return 'text-red-600';
    return 'text-stone-600';
  };
  return (
    <div className="mx-auto flex max-w-full flex-col items-center gap-1 text-center">
      {visible.map((item, index) => (
        <span key={`${item}-${index}`} className={`max-w-full truncate text-[10px] font-medium leading-4 md:text-xs ${toneClass(item)}`}>
          {item}
        </span>
      ))}
      {!expanded && items.length > 3 && <span className="text-[10px] font-semibold text-stone-400">+{items.length - 3}</span>}
    </div>
  );
};

const addTenGodLocation = (
  store: TenGodLocationMap,
  god: string,
  source: TenGodSourceKey,
  location: string,
) => {
  if (!tenGodKnowledge[god] || god === '日主') return;
  const entry = store[god] || {};
  const list = entry[source] || [];
  if (!list.includes(location)) list.push(location);
  store[god] = { ...entry, [source]: list };
};

const collectTenGodLocations = (data: BaziResponse): TenGodLocationMap => {
  const store: TenGodLocationMap = {};
  (data.bazi_info.tg_cg_god || []).forEach((god, index) => {
    addTenGodLocation(store, god, 'tiangan', labelForPillar[index] || `第${index + 1}柱`);
  });
  (data.bazi_info.dz_cg_god || []).forEach((gods, pillarIndex) => {
    splitList(gods).forEach((god, godIndex) => {
      addTenGodLocation(
        store,
        god,
        godIndex === 0 ? 'dizhi' : 'canggan',
        labelForPillar[pillarIndex] || `第${pillarIndex + 1}柱`,
      );
    });
  });
  return store;
};

const toRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const getSavedBasicAnalysis = (initialAnalysisData: unknown, type: AnalysisType) => {
  const root = toRecord(initialAnalysisData);
  const store = toRecord(root?.baziBasicAnalyses);
  const item = toRecord(store?.[type]);
  const content = item?.content;
  return typeof content === 'string' && content.trim() ? content.trim() : '';
};

const AnalysisCard = ({
  type,
  title,
  subtitle,
  chartText,
  caseId,
  savedContent,
  personalizationPrompt,
  onSaved,
}: {
  type: AnalysisType;
  title: string;
  subtitle: string;
  chartText: string;
  caseId?: string | null;
  savedContent?: string;
  personalizationPrompt?: string;
  onSaved?: (nextInitialAnalysisData: unknown) => void | Promise<void>;
}) => {
  const [content, setContent] = useState(savedContent || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  React.useEffect(() => {
    setContent(savedContent || '');
  }, [savedContent]);

  const run = async (force = false) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/bazi/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, chartText, caseId, force, personalizationPrompt }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || '分析失败，请稍后重试');
      }
      setContent(String(data.content || ''));
      if (data.initialAnalysisData !== undefined) {
        await onSaved?.(data.initialAnalysisData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async () => {
    const text = formatPromptCopyMessages([
      {
        role: 'system',
        content: buildBaziBasicAnalysisSystemPrompt(type, personalizationPrompt || ''),
      },
      {
        role: 'user',
        content: buildBaziBasicAnalysisUserPrompt(chartText),
      },
    ], {
      title: `${title} AI提示词`,
      includeVisualInstruction: false,
      note: '以下内容是该功能实际发送给模型的完整提示词，可复制到其他 AI 软件继续询问。',
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1400);
    } catch {
      setCopiedPrompt(false);
    }
  };

  return (
    <section className="rounded-[26px] border border-white/60 bg-white/55 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-stone-800">{title}</div>
          <div className="mt-1 text-sm text-stone-500">{subtitle}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void copyPrompt()}
            disabled={loading}
            className="rounded-2xl border border-stone-200 bg-white/70 px-3 py-2 text-xs font-bold text-stone-500 transition hover:border-amber-200 hover:bg-white hover:text-stone-800 disabled:opacity-60"
          >
            {copiedPrompt ? '已复制' : '复制AI提示词'}
          </button>
          <button
            type="button"
            onClick={() => run(Boolean(content))}
            disabled={loading}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {loading ? '分析中...' : content ? '重新分析 · 1点' : '开始分析 · 1点'}
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {content ? (
        <div className="mt-5 rounded-[22px] border border-white/70 bg-white/72 p-4 text-sm leading-7 text-stone-700">
          <MarkdownContent content={content} />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-white/45 px-4 py-5 text-sm text-stone-400">
          暂无分析结果
        </div>
      )}
    </section>
  );
};

const TenGodKnowledge = ({ locations }: { locations: TenGodLocationMap }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <section className="rounded-[26px] border border-white/60 bg-white/55 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-bold text-stone-800">十神知识库</div>
          <div className="mt-1 text-sm text-stone-500">命盘中出现的十神会自动标记，点击可展开含义、性格与应用。</div>
        </div>
      </div>
      <div className="divide-y divide-stone-100 overflow-hidden rounded-[22px] border border-white/70 bg-white/55">
        {Object.entries(tenGodKnowledge).map(([god, info]) => {
          const active = expanded === god;
          const sourceMap = locations[god] || {};
          const sourceEntries = (Object.keys(tenGodSourceLabels) as TenGodSourceKey[])
            .map((key) => ({ key, values: sourceMap[key] || [] }))
            .filter((item) => item.values.length > 0);
          const marked = sourceEntries.length > 0;
          return (
            <div key={god}>
              <button
                type="button"
                onClick={() => setExpanded(active ? null : god)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/70 ${marked ? 'bg-amber-50/70' : ''}`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-bold text-stone-800">{god}</span>
                  {sourceEntries.map(({ key, values }) => (
                    <span
                      key={key}
                      title={`${tenGodSourceLabels[key]}：${values.join('、')}`}
                      className="rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                    >
                      {tenGodSourceLabels[key]}
                    </span>
                  ))}
                </div>
                <div className="shrink-0 text-xs text-stone-500">
                  <span>{info.shortDesc}</span>
                  <span className="ml-2 font-bold text-amber-700">{active ? '收起' : '展开'}</span>
                </div>
              </button>
              {active && (
                <div className="space-y-3 px-4 pb-4 text-sm leading-7 text-stone-600">
                  {marked && (
                    <div className="flex flex-wrap gap-2">
                      {sourceEntries.map(({ key, values }) => (
                        <span key={key} className="rounded-full border border-stone-200 bg-white/75 px-2.5 py-1 text-xs text-stone-600">
                          {tenGodSourceLabels[key]}：{values.join('、')}
                        </span>
                      ))}
                    </div>
                  )}
                  <div><span className="font-bold text-stone-700">别名：</span>{info.alias}</div>
                  <div><span className="font-bold text-stone-700">五行关系：</span>{info.element}</div>
                  <div>{info.meaning}</div>
                  <div><span className="font-bold text-stone-700">代表：</span>{info.represent.join('、')}</div>
                  <div className="flex flex-wrap gap-2">
                    {info.character.map((item) => (
                      <span key={item} className="rounded-full border border-stone-200 bg-white/70 px-2.5 py-1 text-xs text-stone-600">{item}</span>
                    ))}
                  </div>
                  <div><span className="font-bold text-stone-700">事业：</span>{info.career}</div>
                  <div><span className="font-bold text-stone-700">感情：</span>{info.relationship}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const CaseNotes = ({ storageKey }: { storageKey: string }) => {
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(storageKey) || '';
  });
  const save = (value: string) => {
    setNotes(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, value);
    }
  };
  return (
    <section className="rounded-[26px] border border-white/60 bg-white/55 p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-base font-bold text-stone-800">断事笔记</div>
        <div className="mt-1 text-sm text-stone-500">记录已验证事件、格局判断、喜忌取用和后续复盘。当前版本保存在本机浏览器。</div>
      </div>
      <textarea
        value={notes}
        onChange={(event) => save(event.target.value)}
        placeholder="例如：2024年换工作，流年与大运应事点；命主反馈的性格、健康、家庭信息；后续断事验证..."
        className="min-h-[260px] w-full rounded-[22px] border border-white/70 bg-white/65 px-4 py-3 text-sm leading-7 text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-amber-200 focus:bg-white"
      />
    </section>
  );
};

const BaziGrid: React.FC<Props> = ({ data, caseId, initialAnalysisData, personalizationPrompt, aiPanel, onTabChange, onAnalysisSaved }) => {
  const { base_info, bazi_info, dayun_info, detail_info } = data;
  const rawDayunList = dayun_info.list || [];
  const [activeTab, setActiveTab] = useState<BaziTab>('basic');
  const [selectedDayunIndex, setSelectedDayunIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [shenShaExpanded, setShenShaExpanded] = useState(false);

  React.useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  const rawPillars = labelForPillar.map((label, index) => {
    const value = bazi_info.bazi[index] || '';
    const key = ['year', 'month', 'day', 'hour'][index] as keyof BaziResponse['detail_info']['shensha'];
    const pillarShenSha = detail_info.shensha?.[key];
    return {
      label,
      ganZhi: value,
      gan: value.charAt(0),
      zhi: value.charAt(1),
      tgGod: bazi_info.tg_cg_god[index] || '',
      hidden: hiddenText(bazi_info.dz_cg[index], bazi_info.dz_cg_god?.[index]),
      nayin: bazi_info.na_yin[index] || '',
      shensha: Array.isArray(pillarShenSha) ? pillarShenSha.join(' ') : pillarShenSha || '',
    };
  });
  const fortuneContext = (detail_info as any).fortuneContext;
  const shenShaContext = useMemo<BaziShenShaContext | null>(() => {
    const sizhu = (detail_info as any).sizhu || {};
    const dayPillar = rawPillars[2];
    const yearPillar = rawPillars[0];
    const monthPillar = rawPillars[1];
    const hourPillar = rawPillars[3];
    const yearStem = fortuneContext?.yearStem || yearPillar?.gan || sizhu.year?.tg || '';
    const yearBranch = fortuneContext?.yearBranch || yearPillar?.zhi || sizhu.year?.dz || '';
    const monthStem = fortuneContext?.monthStem || monthPillar?.gan || sizhu.month?.tg || '';
    const monthBranch = fortuneContext?.monthBranch || monthPillar?.zhi || sizhu.month?.dz || '';
    const dayStem = fortuneContext?.dayStem || dayPillar?.gan || sizhu.day?.tg || '';
    const dayBranch = fortuneContext?.dayBranch || dayPillar?.zhi || sizhu.day?.dz || '';
    if (!yearStem || !yearBranch || !monthStem || !monthBranch || !dayStem || !dayBranch) return null;
    return {
      yearStem,
      yearBranch,
      monthStem,
      monthBranch,
      dayStem,
      dayBranch,
      hourStem: fortuneContext?.hourStem || hourPillar?.gan || sizhu.hour?.tg || '',
      hourBranch: fortuneContext?.hourBranch || hourPillar?.zhi || sizhu.hour?.dz || '',
      sex: fortuneContext?.sex,
      kongZhi: fortuneContext?.kongZhi || [],
    };
  }, [detail_info, fortuneContext, rawPillars]);
  const pillars = useMemo(() => {
    if (!shenShaContext) return rawPillars;
    return rawPillars.map((pillar, index) => ({
      ...pillar,
      shensha: normalizeZhijieShenSha(pillar.shensha, shenShaContext, {
        stem: pillar.gan,
        branch: pillar.zhi,
        position: ['year', 'month', 'day', 'hour'][index] as 'year' | 'month' | 'day' | 'hour',
      }).join(' '),
    }));
  }, [rawPillars, shenShaContext]);
  const dayunList = useMemo(() => {
    if (!shenShaContext) return rawDayunList;
    return rawDayunList.map((item: any) => {
      const stem = item.ganZhi?.slice(0, 1) || item.stem || '';
      const branch = item.ganZhi?.slice(1, 2) || item.branch || '';
      return {
        ...item,
        shenSha: normalizeZhijieShenSha(item.shenSha, shenShaContext, { stem, branch, position: 'fortune' }),
        liunianList: (item.liunianList || []).map((yearItem: any) => {
          const yearStem = yearItem.gan || yearItem.ganZhi?.slice(0, 1) || '';
          const yearBranch = yearItem.zhi || yearItem.ganZhi?.slice(1, 2) || '';
          return {
            ...yearItem,
            shenSha: normalizeZhijieShenSha(yearItem.shenSha, shenShaContext, {
              stem: yearStem,
              branch: yearBranch,
              position: 'fortune',
            }),
          };
        }),
      };
    });
  }, [rawDayunList, shenShaContext]);

  const selectedDayun = selectedDayunIndex !== null ? dayunList[selectedDayunIndex] : null;
  const selectedYearItem = useMemo(() => {
    if (!selectedDayun || selectedYear === null) return null;
    return selectedDayun.liunianList?.find((item: any) => item.year === selectedYear) || null;
  }, [selectedDayun, selectedYear]);
  const liuyueList = useMemo(() => {
    if (!selectedYear || !fortuneContext) return [];
    const list = calculateBaziLiuYueData(selectedYear, fortuneContext);
    if (!shenShaContext) return list;
    return list.map((item: any) => ({
      ...item,
      shenSha: normalizeZhijieShenSha(item.shenSha, shenShaContext, {
        stem: item.gan || item.ganZhi?.slice(0, 1) || '',
        branch: item.zhi || item.ganZhi?.slice(1, 2) || '',
        position: 'fortune',
      }),
    }));
  }, [fortuneContext, selectedYear, shenShaContext]);
  const selectedMonthItem = selectedMonth ? liuyueList.find((item: any) => item.month === selectedMonth) : null;
  const liuriList = useMemo(() => {
    if (!selectedMonthItem || !fortuneContext) return [];
    const list = calculateBaziLiuRiData(selectedMonthItem.startDate, selectedMonthItem.endDate, fortuneContext);
    if (!shenShaContext) return list;
    return list.map((item: any) => ({
      ...item,
      shenSha: normalizeZhijieShenSha(item.shenSha, shenShaContext, {
        stem: item.gan || item.ganZhi?.slice(0, 1) || '',
        branch: item.zhi || item.ganZhi?.slice(1, 2) || '',
        position: 'day',
      }),
    }));
  }, [fortuneContext, selectedMonthItem, shenShaContext]);
  const selectedDayItem = selectedDay ? liuriList.find((item: any) => item.date === selectedDay) : null;
  const visibleDayunList = dayunList.slice(0, 10);
  const dayMaster = bazi_info.bazi[2]?.charAt(0) || detail_info.sizhu.day.tg || '';
  const dayElement = elementLabel(dayMaster);
  const patternText = base_info.zhengge || patternFromTenGod(bazi_info.tg_cg_god?.[1]) || '—';
  const tenGodLocations = useMemo(() => collectTenGodLocations(data), [data]);
  const savedWuxingAnalysis = getSavedBasicAnalysis(initialAnalysisData, 'wuxing');
  const savedPersonalityAnalysis = getSavedBasicAnalysis(initialAnalysisData, 'personality');
  const notesKey = useMemo(() => {
    const identity = `${base_info.name || '匿名'}:${base_info.gongli || bazi_info.bazi.join('')}`;
    return `zhijie:bazi-notes:${identity}`;
  }, [base_info.gongli, base_info.name, bazi_info.bazi]);
  const tabItems: Array<{ key: BaziTab; label: string }> = [
    { key: 'basic', label: '基本信息' },
    { key: 'professional', label: '专业排盘' },
    { key: 'ai', label: 'AI解读' },
    { key: 'notes', label: '断事笔记' },
  ];
  const tableColumns = useMemo(() => {
    const natalColumns = pillars.map((pillar) => ({
      kind: 'natal' as const,
      key: pillar.label,
      title: pillar.label,
      subtitle: '',
      ganZhi: pillar.ganZhi,
      values: {
        主星: pillar.tgGod,
        天干: pillar.gan,
        地支: pillar.zhi,
        藏干: pillar.hidden,
        纳音: pillar.nayin,
        神煞: pillar.shensha || '—',
      },
    }));
    const flowColumns = [
      selectedDayun ? {
        kind: 'flow' as const,
        key: 'dayun',
        title: '大运',
        subtitle: `${selectedDayun.startAge}岁 · ${selectedDayun.startYear}`,
        ganZhi: selectedDayun.ganZhi,
        values: {
          主星: selectedDayun.tenGod || '—',
          天干: selectedDayun.ganZhi?.charAt(0) || '',
          地支: selectedDayun.ganZhi?.charAt(1) || '',
          藏干: hiddenText(
            selectedDayun.hiddenStems?.map((item: any) => item.stem).join(' '),
            selectedDayun.hiddenStems?.map((item: any) => item.tenGod).join(' '),
          ),
          纳音: selectedDayun.naYin || selectedDayun.nayin || '—',
          神煞: selectedDayun.shenSha?.join(' ') || '—',
        },
      } : null,
      selectedYearItem ? {
        kind: 'flow' as const,
        key: 'liunian',
        title: '流年',
        subtitle: `${selectedYearItem.year}年 · ${selectedYearItem.age}岁`,
        ganZhi: selectedYearItem.ganZhi,
        values: {
          主星: selectedYearItem.tenGod || '—',
          天干: selectedYearItem.gan || selectedYearItem.ganZhi?.charAt(0) || '',
          地支: selectedYearItem.zhi || selectedYearItem.ganZhi?.charAt(1) || '',
          藏干: hiddenText(
            selectedYearItem.hiddenStems?.map((item: any) => item.stem).join(' '),
            selectedYearItem.hiddenStems?.map((item: any) => item.tenGod).join(' '),
          ),
          纳音: selectedYearItem.naYin || selectedYearItem.nayin || '—',
          神煞: selectedYearItem.shenSha?.join(' ') || '—',
        },
      } : null,
      selectedMonthItem ? {
        kind: 'flow' as const,
        key: 'liuyue',
        title: '流月',
        subtitle: `${formatFlowMonthRange(selectedMonthItem)} · ${selectedMonthItem.jieQi || ''}`,
        ganZhi: selectedMonthItem.ganZhi,
        values: {
          主星: selectedMonthItem.tenGod || '—',
          天干: selectedMonthItem.gan || selectedMonthItem.ganZhi?.charAt(0) || '',
          地支: selectedMonthItem.zhi || selectedMonthItem.ganZhi?.charAt(1) || '',
          藏干: hiddenText(
            selectedMonthItem.hiddenStems?.map((item: any) => item.stem).join(' '),
            selectedMonthItem.hiddenStems?.map((item: any) => item.tenGod).join(' '),
          ),
          纳音: selectedMonthItem.naYin || '—',
          神煞: selectedMonthItem.shenSha?.join(' ') || '—',
        },
      } : null,
      selectedDayItem ? {
        kind: 'flow' as const,
        key: 'liuri',
        title: '流日',
        subtitle: `${selectedDayItem.date}`,
        ganZhi: selectedDayItem.ganZhi,
        values: {
          主星: selectedDayItem.tenGod || '—',
          天干: selectedDayItem.gan || selectedDayItem.ganZhi?.charAt(0) || '',
          地支: selectedDayItem.zhi || selectedDayItem.ganZhi?.charAt(1) || '',
          藏干: hiddenText(
            selectedDayItem.hiddenStems?.map((item: any) => item.stem).join(' '),
            selectedDayItem.hiddenStems?.map((item: any) => item.tenGod).join(' '),
          ),
          纳音: selectedDayItem.naYin || '—',
          神煞: selectedDayItem.shenSha?.join(' ') || '—',
        },
      } : null,
    ].filter(Boolean);
    return [...natalColumns, ...flowColumns];
  }, [liuriList, liuyueList, pillars, selectedDayItem, selectedDayun, selectedMonthItem, selectedYearItem]);

  const selectDayun = (index: number) => {
    const next = selectedDayunIndex === index ? null : index;
    setSelectedDayunIndex(next);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  const selectYear = (year: number) => {
    setSelectedYear((current) => current === year ? null : year);
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  const selectMonth = (month: number) => {
    setSelectedMonth((current) => current === month ? null : month);
    setSelectedDay(null);
  };

  return (
    <div className="mx-auto my-5 w-full max-w-6xl space-y-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-stone-100/80 pb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">四柱八字</div>
          <h3 className="mt-1 text-2xl font-bold text-stone-900">{base_info.name}（{base_info.sex}）</h3>
        </div>
        <div className="text-right text-xs leading-6 text-stone-500">
          <div>{base_info.gongli}{base_info.nongli ? ` · ${base_info.nongli}` : ''}</div>
          <div>起运：{base_info.qiyun || '—'}</div>
          {base_info.zhen && <div className="text-amber-700">真太阳时：{base_info.zhen.city} {base_info.zhen.shicha}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {tabItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveTab(item.key)}
            className={`rounded-xl border px-2 py-2 text-center text-sm transition md:rounded-2xl md:px-4 md:py-3 md:text-base ${
              activeTab === item.key
                ? 'glass-panel-dark border-transparent text-amber-200 shadow-sm'
                : 'border-stone-100 bg-white/65 text-stone-700 hover:bg-white'
            }`}
          >
            <div className="font-bold">{item.label}</div>
          </button>
        ))}
      </div>

      {activeTab === 'basic' && (
        <div className="space-y-5">
          <section className="rounded-[28px] border border-white/60 bg-white/55 p-5 shadow-sm backdrop-blur-xl">
            <div className="mb-5 text-base font-bold text-stone-800">日主特征</div>
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-stone-100 bg-white/80 text-3xl font-bold shadow-sm md:h-20 md:w-20 md:text-5xl ${getWuxingColor(dayMaster)}`}>
                {dayMaster || '—'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-stone-900">
                  日主「{dayMaster || '—'}」{dayElement ? `，五行属${dayElement}` : ''}
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
                  {dayMasterDescriptions[dayMaster] || '当前命盘日主信息已载入，可结合专业排盘中的月令、大运与流年进一步判断旺衰和取用。'}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ['空亡', bazi_info.kw || '—'],
                    ['起运', base_info.qiyun || '—'],
                    ['格局', patternText],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                      <div className="text-xs text-stone-400">{label}</div>
                      <div className="mt-1 text-sm font-bold text-stone-700">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <AnalysisCard
            type="wuxing"
            title="AI专业五行分析"
            subtitle="深度解读五行配置与喜用神"
            chartText={data.taibuText || JSON.stringify(data.taibuJson || data, null, 2)}
            caseId={caseId}
            savedContent={savedWuxingAnalysis}
            personalizationPrompt={personalizationPrompt}
            onSaved={onAnalysisSaved}
          />
          <AnalysisCard
            type="personality"
            title="AI人格分析"
            subtitle="MBTI风格深度人格解读"
            chartText={data.taibuText || JSON.stringify(data.taibuJson || data, null, 2)}
            caseId={caseId}
            savedContent={savedPersonalityAnalysis}
            personalizationPrompt={personalizationPrompt}
            onSaved={onAnalysisSaved}
          />

          <TenGodKnowledge locations={tenGodLocations} />
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-5">
          <section className="rounded-[28px] border border-white/60 bg-white/55 p-5 shadow-sm backdrop-blur-xl">
            <div className="text-base font-bold text-stone-800">AI解读</div>
            <div className="mt-1 text-sm leading-6 text-stone-500">
              基于当前命例发起问答，后续对话会自动拼接命盘与初始化分析上下文。
            </div>
          </section>
          {aiPanel}
        </div>
      )}

      {activeTab === 'professional' && (
        <div className="rounded-[24px] border border-white/60 bg-white/35 p-2 shadow-[0_18px_48px_rgba(28,25,23,0.08)] backdrop-blur-xl md:rounded-[30px] md:p-5">
      <div className="glass-panel-soft overflow-hidden rounded-[20px] border border-white/60 md:rounded-[26px]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-center">
          <thead>
            <tr>
              <th className="w-11 border-b border-white/60 bg-white/35 p-1.5 text-[10px] font-semibold text-stone-400 md:w-20 md:p-3 md:text-xs">四柱</th>
              {tableColumns.map((column) => (
                <th
                  key={column.key}
                  className={`border-b border-l border-white/60 p-1.5 md:p-3 ${
                    column.kind === 'flow' ? 'bg-amber-50/70 text-amber-800' : 'bg-white/35 text-stone-800'
                  }`}
                >
                  <div className="text-xs font-bold md:text-base">{column.title}</div>
                  {column.subtitle && <div className="mt-1 text-[9px] font-normal leading-3 text-stone-500 md:text-[10px] md:leading-4">{column.subtitle}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((row) => (
              <tr key={row}>
                <th className="border-b border-white/60 bg-white/30 p-1.5 text-[10px] font-semibold text-stone-500 md:p-3 md:text-xs">
                  {row === '神煞' ? (
                    <button
                      type="button"
                      onClick={() => setShenShaExpanded((next) => !next)}
                      className="inline-flex flex-col items-center gap-0.5 text-stone-500 transition hover:text-amber-700"
                    >
                      <span>{row}</span>
                      <span className="text-[9px] font-medium text-amber-700">{shenShaExpanded ? '收起' : '展开'}</span>
                    </button>
                  ) : row}
                </th>
                {tableColumns.map((column) => {
                  const content = column.values[row as keyof typeof column.values] || '—';
                  const colorClass = row === '天干' || row === '地支' ? getWuxingColor(String(content)) : 'text-stone-700';
                  const cellContent = row === '藏干'
                    ? <HiddenStemStack value={String(content)} />
                    : row === '神煞'
                      ? <ShenShaList value={String(content)} expanded={shenShaExpanded} />
                      : content;
                  return (
                    <td key={`${row}-${column.key}`} className="border-b border-l border-white/60 bg-white/20 p-1 align-middle md:p-3">
                      <div
                        className={`mx-auto max-w-full whitespace-normal break-all text-center ${
                          row === '天干' || row === '地支' ? `text-xl font-bold leading-7 md:text-3xl ${colorClass}` : 'text-[9px] leading-4 text-stone-700 md:text-xs md:leading-5'
                        }`}
                      >
                        {cellContent}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-1 border-t border-stone-100/80 pt-2">
        <FlowRail title="大运" meta={base_info.qiyun ? `${base_info.qiyun} 起运` : undefined}>
          {visibleDayunList.map((item: any, index: number) => {
            const { gan, zhi } = getGanZhiParts(item);
            return (
              <FlowItemButton key={`${item.ganZhi}-${index}`} active={selectedDayunIndex === index} onClick={() => selectDayun(index)}>
                <div className="text-[9px] font-semibold text-stone-600 sm:text-[10px] md:text-xs">{item.startAge ? `${item.startAge}岁` : '—'}</div>
                <div className="mt-0.5 text-[9px] font-medium text-stone-500 sm:text-[10px] md:text-xs">{item.startYear || '—'}</div>
                <FlowStemBranch gan={gan} zhi={zhi} stemTenGod={item.tenGod} branchTenGod={getBranchTenGod(item)} />
              </FlowItemButton>
            );
          })}
        </FlowRail>

        {selectedDayun && (
          <FlowRail title="流年">
            {(selectedDayun.liunianList || []).map((item: any) => {
              const { gan, zhi } = getGanZhiParts(item);
              return (
                <FlowItemButton key={item.year} active={selectedYear === item.year} onClick={() => selectYear(item.year)}>
                  <div className="text-[9px] font-semibold text-stone-600 sm:text-[10px] md:text-xs">{item.age ? `${item.age}岁` : '—'}</div>
                  <div className="mt-0.5 text-[9px] font-medium text-stone-500 sm:text-[10px] md:text-xs">{item.year || '—'}</div>
                  <FlowStemBranch gan={gan} zhi={zhi} stemTenGod={item.tenGod} branchTenGod={getBranchTenGod(item)} />
                </FlowItemButton>
              );
            })}
          </FlowRail>
        )}

        {selectedYear && liuyueList.length > 0 && (
          <FlowRail title="流月">
            {liuyueList.map((item: any) => {
              const { gan, zhi } = getGanZhiParts(item);
              return (
                <FlowItemButton key={item.month} active={selectedMonth === item.month} onClick={() => selectMonth(item.month)} wide>
                  <div className="text-[9px] font-semibold text-stone-600 sm:text-[10px] md:text-xs">{formatSolarDateShort(item.startDate) || `${item.month}月`}</div>
                  <div className="mt-0.5 text-[9px] font-medium text-stone-500 sm:text-[10px] md:text-xs">{item.jieQi || '—'}</div>
                  <FlowStemBranch gan={gan} zhi={zhi} stemTenGod={item.tenGod} branchTenGod={getBranchTenGod(item)} />
                </FlowItemButton>
              );
            })}
          </FlowRail>
        )}

        {selectedMonth && liuriList.length > 0 && (
          <FlowRail title="流日" meta={formatFlowMonthRange(selectedMonthItem)}>
            {liuriList.map((item: any) => {
              const { gan, zhi } = getGanZhiParts(item);
              return (
                <FlowItemButton key={item.date} active={selectedDay === item.date} onClick={() => setSelectedDay((current) => current === item.date ? null : item.date)} wide>
                  <div className="text-[9px] font-semibold text-stone-600 sm:text-[10px] md:text-xs">{formatFlowSolarDay(item.date, item.day)}日</div>
                  <div className="mt-0.5 text-[9px] font-medium text-stone-500 sm:text-[10px] md:text-xs">{formatFlowLunarDay(item.date)}</div>
                  <FlowStemBranch gan={gan} zhi={zhi} stemTenGod={item.tenGod} branchTenGod={getBranchTenGod(item)} />
                </FlowItemButton>
              );
            })}
          </FlowRail>
        )}
      </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <CaseNotes storageKey={notesKey} />
      )}
    </div>
  );
};

export default BaziGrid;
