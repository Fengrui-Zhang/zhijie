const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

const QUESTION_WORDS = /是否|能否|能不能|会不会|怎样|怎么样|如何|何时|什么时候|哪天|有没有|可不可以|好吗|有利|不利|结果|成败|吉凶/;
const FOLLOW_UP_WORDS = /这件事|此事|上述|刚才|继续|进一步|具体|落实|后续|然后|应期/;

export type ShanghaiParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function getShanghaiParts(date = new Date()): ShanghaiParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const values = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

const pad2 = (value: number) => String(value).padStart(2, '0');
const EARTHLY_BRANCHES = [
  { name: '子', range: '23:00–01:00' },
  { name: '丑', range: '01:00–03:00' },
  { name: '寅', range: '03:00–05:00' },
  { name: '卯', range: '05:00–07:00' },
  { name: '辰', range: '07:00–09:00' },
  { name: '巳', range: '09:00–11:00' },
  { name: '午', range: '11:00–13:00' },
  { name: '未', range: '13:00–15:00' },
  { name: '申', range: '15:00–17:00' },
  { name: '酉', range: '17:00–19:00' },
  { name: '戌', range: '19:00–21:00' },
  { name: '亥', range: '21:00–23:00' },
] as const;

function getEarthlyBranchIndex(hour: number) {
  return hour === 23 || hour === 0 ? 0 : Math.floor((hour + 1) / 2);
}

export function getShanghaiDateTime(date = new Date()) {
  const parts = getShanghaiParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}:00+08:00`;
}

export function getEarthlyBranchBucket(date = new Date()) {
  const parts = getShanghaiParts(date);
  let bucketDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const branchIndex = getEarthlyBranchIndex(parts.hour);
  if (parts.hour === 23 || parts.hour === 0) {
    if (parts.hour === 0) bucketDate = new Date(bucketDate.getTime() - 86_400_000);
  }
  const y = bucketDate.getUTCFullYear();
  const m = pad2(bucketDate.getUTCMonth() + 1);
  const d = pad2(bucketDate.getUTCDate());
  return `${y}-${m}-${d}:branch-${branchIndex}`;
}

export function getEarthlyBranchLabel(date = new Date()) {
  const branch = EARTHLY_BRANCHES[getEarthlyBranchIndex(getShanghaiParts(date).hour)];
  return `${branch.name}时（${branch.range}）`;
}

export function parseAgentDateTime(value: unknown, fallback = new Date()): Date {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') throw new Error('时间必须使用 ISO 日期时间字符串');
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+08:00` : value;
  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime())) throw new Error('时间格式无效');
  const year = getShanghaiParts(parsed).year;
  if (year < 1900 || year > 2100) throw new Error('时间必须在 1900 至 2100 年之间');
  return parsed;
}

export function detectMultipleDivinationQuestions(message: string): string[] {
  const normalized = message.trim();
  if (!normalized || /综合验证|多种术数.*同一/.test(normalized)) return [];
  const punctuationSegments = normalized
    .split(/[？?]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3 && QUESTION_WORDS.test(item));
  if (punctuationSegments.length >= 2) return punctuationSegments;

  const connectiveSegments = normalized
    .split(/(?:\n+|另外|还有|再问|第二[个点题]|第三[个点题]|同时(?:想问)?)/)
    .map((item) => item.replace(/^\s*[一二三四五六七八九十\d]+[、.．:：]\s*/, '').trim())
    .filter((item) => item.length >= 4 && QUESTION_WORDS.test(item));
  return connectiveSegments.length >= 2 ? connectiveSegments : [];
}

export function isLikelyFollowUp(message: string) {
  return FOLLOW_UP_WORDS.test(message);
}

export function inferMatterKey(question: string) {
  const text = question.toLowerCase().replace(/\s+/g, '');
  const categories: Array<[string, RegExp]> = [
    ['career', /工作|事业|职位|调动|跳槽|升职|入职|领导|同事|项目|考试|求职/],
    ['relationship', /感情|恋爱|婚姻|对象|复合|分手|夫妻|桃花/],
    ['wealth', /财运|投资|股票|基金|生意|合作|合同|买卖|求财|收入/],
    ['health', /健康|疾病|身体|手术|康复|怀孕/],
    ['travel', /出行|搬家|迁居|旅行|赴任|出差/],
    ['study', /学业|考试|升学|论文|录取/],
    ['family', /父母|子女|孩子|家庭|亲人/],
  ];
  const category = categories.find(([, pattern]) => pattern.test(text))?.[0] || 'general';
  return category;
}

export function hasPositiveNumbersForQuestions(message: string, questionCount: number) {
  const numbers = message.match(/\d+/g)?.map(Number).filter((value) => value > 0) ?? [];
  const onlyEnumeration = numbers.length === questionCount && numbers.every((value, index) => value === index + 1);
  return numbers.length >= questionCount && !onlyEnumeration;
}
