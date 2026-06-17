import {
  calculateBazi,
  toBaziJson,
  toBaziText,
  type BaziOutput,
} from 'taibu-core/bazi';
import {
  calculateBaziDayun,
  type DayunOutput,
} from 'taibu-core/bazi-dayun';
import {
  resolveBaziPillars,
} from 'taibu-core/bazi-pillars-resolve';
import {
  calculateQimen,
  toQimenJson,
  toQimenText,
  type QimenOutput,
} from 'taibu-core/qimen';
import {
  calculateZiwei,
  calculateZiweiDataWithAstrolabe,
  calculateZiweiHoroscopeDataWithAstrolabe,
  toZiweiJson,
  toZiweiText,
  type ZiweiOutput,
} from 'taibu-core/ziwei';
import {
  toZiweiHoroscopeJson,
} from 'taibu-core/ziwei-horoscope';
import {
  calculateMeihua,
  toMeihuaJson,
  toMeihuaText,
  type MeihuaInput,
  type MeihuaOutput,
} from 'taibu-core/meihua';
import {
  calculateLiuyao,
  toLiuyaoCanonicalJson,
  toLiuyaoCanonicalText,
  type LiuyaoInput,
  type LiuyaoOutput,
} from 'taibu-core/liuyao';
import {
  calculateDaliuren,
  toDaliurenJson,
  toDaliurenText,
  type DaliurenOutput,
} from 'taibu-core/daliuren';
import {
  calculateTaiyi,
  toTaiyiJson,
  toTaiyiText,
  type TaiyiMode,
  type TaiyiOutput,
} from 'taibu-core/taiyi';
import {
  calculateXiaoliurenData,
  toXiaoliurenJson,
  toXiaoliurenText,
  type XiaoliurenOutput,
} from 'taibu-core/xiaoliuren';
import {
  calculateDailyAlmanac,
  toAlmanacJson,
  toAlmanacText,
  type AlmanacOutput,
} from 'taibu-core/almanac';
import {
  STEM_ELEMENTS,
  ZHI_WUXING,
  calculateTenGod,
  getElementRelation,
} from 'taibu-core/utils';
import {
  HIDDEN_STEM_DETAILS,
  LIU_CHONG,
  LIU_HE,
  TAO_HUA,
  YI_MA,
} from 'taibu-core/data/shensha';
import { HEXAGRAMS } from 'taibu-core/data/hexagrams';
import { Solar } from 'lunar-javascript';
import { ModelType, LiuyaoMode, type BaseParams, type QimenParams } from '../types';
import { normalizeZhijieShenSha, type BaziShenShaContext } from '../utils/baziShensha';

type ChartRequest = {
  modelType: ModelType;
  params: BaseParams | QimenParams;
};

const sexLabel = (sex: number | undefined) => (sex === 1 ? '女' : '男');
const gender = (sex: number | undefined): 'male' | 'female' => (sex === 1 ? 'female' : 'male');
const pad2 = (value: number) => String(value).padStart(2, '0');
type BirthInput = ReturnType<typeof commonBirthInput>;

const dateTimeString = (params: BaseParams) =>
  `${params.year}-${pad2(params.month)}-${pad2(params.day)}T${pad2(params.hours)}:${pad2(params.minute)}`;
const dateOnlyString = (params: BaseParams) =>
  `${params.year}-${pad2(params.month)}-${pad2(params.day)}`;
const pillar = (value?: { gan: string; zhi: string } | string) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return `${value.gan}${value.zhi}`;
};
const splitPillar = (value: string) => ({
  gan: value.slice(0, 1),
  zhi: value.slice(1, 2),
});
const emptyGuaDescription = {
  gua_shiye: '',
  gua_jingshang: '',
  gua_hunlian: '',
  gua_juece: '',
};
const hexagramByCode = new Map(HEXAGRAMS.map((item) => [item.code, item]));
const hexagramByName = new Map(HEXAGRAMS.map((item) => [item.name, item]));

function buildBirthPlace(params: BaseParams) {
  return [params.province, params.city].filter(Boolean).join(' ') || undefined;
}

async function normalizeBirthParams(params: BaseParams): Promise<BaseParams> {
  if (params.calendarType !== 'pillars') return params;
  const pillars = params.pillars;
  if (!pillars?.year || !pillars.month || !pillars.day || !pillars.hour) {
    throw new Error('四柱排盘需要填写完整的年柱、月柱、日柱、时柱');
  }
  const resolved = await resolveBaziPillars({
    yearPillar: pillars.year,
    monthPillar: pillars.month,
    dayPillar: pillars.day,
    hourPillar: pillars.hour,
  });
  const candidate = resolved.candidates[0];
  if (!candidate) {
    throw new Error('未能根据输入四柱反推出可用出生时间，请检查四柱是否正确');
  }
  return {
    ...params,
    year: candidate.birthYear,
    month: candidate.birthMonth,
    day: candidate.birthDay,
    hours: candidate.birthHour,
    minute: candidate.birthMinute,
    calendarType: candidate.nextCall.arguments.calendarType,
    isLeapMonth: candidate.isLeapMonth,
  };
}

function commonBirthInput(params: BaseParams) {
  return {
    birthYear: params.year,
    birthMonth: params.month,
    birthDay: params.day,
    birthHour: params.hours,
    birthMinute: params.minute,
    gender: gender(params.sex),
    birthPlace: buildBirthPlace(params),
    calendarType: params.calendarType === 'lunar' ? 'lunar' as const : 'solar' as const,
    isLeapMonth: Boolean(params.isLeapMonth),
    longitude: params.useTrueSolar && params.timeInputMode !== 'quick' && typeof params.longitude === 'number'
      ? params.longitude
      : undefined,
  };
}

function buildTrueSolarInfo(params: BaseParams, chart: { trueSolarTimeInfo?: BaziOutput['trueSolarTimeInfo'] }) {
  const info = chart.trueSolarTimeInfo;
  if (!info) return undefined;
  return {
    province: params.province,
    city: params.district || params.city || params.birthPlace || '',
    jingdu: String(info.longitude),
    weidu: typeof params.latitude === 'number' ? String(params.latitude) : undefined,
    shicha: `${info.trueSolarTime}（校正${info.correctionMinutes}分钟）`,
  };
}

function patternFromTenGod(tenGod?: string) {
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
}

function buildBaseInfo(params: BaseParams, dayun?: DayunOutput, chart?: BaziOutput) {
  const solar = `${params.year}-${pad2(params.month)}-${pad2(params.day)} ${pad2(params.hours)}:${pad2(params.minute)}`;
  return {
    sex: sexLabel(params.sex),
    name: params.name || '匿名',
    gongli: solar,
    nongli: params.calendarType === 'lunar' ? `农历${params.year}-${pad2(params.month)}-${pad2(params.day)}${params.isLeapMonth ? '（闰月）' : ''}` : '',
    qiyun: dayun ? `${dayun.startAge}岁（${dayun.startAgeDetail}）` : '',
    jiaoyun: '',
    zhengge: patternFromTenGod(chart?.fourPillars?.month?.tenGod),
    zhen: chart ? buildTrueSolarInfo(params, chart) : undefined,
  };
}

function adaptBazi(params: BaseParams, chart: BaziOutput, dayun: DayunOutput) {
  const shenShaContext: BaziShenShaContext = {
    yearStem: chart.fourPillars.year.stem,
    yearBranch: chart.fourPillars.year.branch,
    monthStem: chart.fourPillars.month.stem,
    monthBranch: chart.fourPillars.month.branch,
    dayStem: chart.fourPillars.day.stem,
    dayBranch: chart.fourPillars.day.branch,
    hourStem: chart.fourPillars.hour.stem,
    hourBranch: chart.fourPillars.hour.branch,
    sex: params.sex,
    kongZhi: chart.kongWang?.kongZhi || [],
  };
  chart.fourPillars.year.shenSha = normalizeZhijieShenSha(chart.fourPillars.year.shenSha, shenShaContext, {
    stem: chart.fourPillars.year.stem,
    branch: chart.fourPillars.year.branch,
    position: 'year',
  });
  chart.fourPillars.month.shenSha = normalizeZhijieShenSha(chart.fourPillars.month.shenSha, shenShaContext, {
    stem: chart.fourPillars.month.stem,
    branch: chart.fourPillars.month.branch,
    position: 'month',
  });
  chart.fourPillars.day.shenSha = normalizeZhijieShenSha(chart.fourPillars.day.shenSha, shenShaContext, {
    stem: chart.fourPillars.day.stem,
    branch: chart.fourPillars.day.branch,
    position: 'day',
  });
  chart.fourPillars.hour.shenSha = normalizeZhijieShenSha(chart.fourPillars.hour.shenSha, shenShaContext, {
    stem: chart.fourPillars.hour.stem,
    branch: chart.fourPillars.hour.branch,
    position: 'hour',
  });
  for (const item of dayun.list || []) {
    const stem = item.ganZhi?.slice(0, 1) || item.stem || '';
    const branch = item.ganZhi?.slice(1, 2) || item.branch || '';
    item.shenSha = normalizeZhijieShenSha(item.shenSha, shenShaContext, { stem, branch, position: 'fortune' });
    for (const liunian of item.liunianList || []) {
      const yearStem = liunian.gan || liunian.ganZhi?.slice(0, 1) || '';
      const yearBranch = liunian.zhi || liunian.ganZhi?.slice(1, 2) || '';
      liunian.shenSha = normalizeZhijieShenSha(liunian.shenSha, shenShaContext, {
        stem: yearStem,
        branch: yearBranch,
        position: 'fortune',
      });
    }
  }
  const pillars = [
    chart.fourPillars.year,
    chart.fourPillars.month,
    chart.fourPillars.day,
    chart.fourPillars.hour,
  ];
  const hidden = pillars.map((item) => item.hiddenStems.map((stem) => stem.stem).join(' '));
  const hiddenGods = pillars.map((item) => item.hiddenStems.map((stem) => stem.tenGod).join(' '));
  const dayunList = dayun.list || [];
  const taibuText = toBaziText(chart, { name: params.name, dayun, detailLevel: 'full' });
  const fortuneContext = {
    dayStem: chart.fourPillars.day.stem,
    dayBranch: chart.fourPillars.day.branch,
    yearStem: chart.fourPillars.year.stem,
    yearBranch: chart.fourPillars.year.branch,
    monthStem: chart.fourPillars.month.stem,
    monthBranch: chart.fourPillars.month.branch,
    hourStem: chart.fourPillars.hour.stem,
    hourBranch: chart.fourPillars.hour.branch,
    sex: params.sex,
    kongZhi: chart.kongWang?.kongZhi || [],
  };

  return {
    taibuText,
    taibuJson: toBaziJson(chart, { dayun }),
    base_info: buildBaseInfo(params, dayun, chart),
    bazi_info: {
      kw: chart.kongWang?.kongZhi?.join('') || '',
      tg_cg_god: pillars.map((item, index) => index === 2 ? '日主' : item.tenGod || ''),
      bazi: pillars.map((item) => `${item.stem}${item.branch}`),
      dz_cg: hidden,
      dz_cg_god: hiddenGods,
      day_cs: pillars.map((item) => item.diShi || ''),
      na_yin: pillars.map((item) => item.naYin || ''),
    },
    start_info: {
      jishen: pillars.map((item) => item.shenSha.join(' ')),
      xz: '',
      sx: '',
    },
    dayun_info: {
      list: dayunList,
      big_god: dayunList.map((item) => item.tenGod || ''),
      big: dayunList.map((item) => item.ganZhi),
      big_cs: dayunList.map((item) => item.diShi || ''),
      big_start_year: dayunList.map((item) => item.startYear),
      big_end_year: dayunList.map((item, index) => {
        const next = dayunList[index + 1]?.startYear;
        return next ? next - 1 : item.startYear + 9;
      }),
      xu_sui: dayunList.map((item) => item.startAge),
    },
    detail_info: {
      sizhu: {
        year: { tg: chart.fourPillars.year.stem, dz: chart.fourPillars.year.branch },
        month: { tg: chart.fourPillars.month.stem, dz: chart.fourPillars.month.branch },
        day: { tg: chart.fourPillars.day.stem, dz: chart.fourPillars.day.branch },
        hour: { tg: chart.fourPillars.hour.stem, dz: chart.fourPillars.hour.branch },
      },
      shensha: {
        year: chart.fourPillars.year.shenSha.join(' '),
        month: chart.fourPillars.month.shenSha.join(' '),
        day: chart.fourPillars.day.shenSha.join(' '),
        hour: chart.fourPillars.hour.shenSha.join(' '),
      },
      dayunshensha: dayunList.map((item) => ({
        tgdz: item.ganZhi,
        shensha: item.shenSha.join(' '),
      })),
      fortuneContext,
      zhuxing: { day: chart.dayMaster },
    },
  };
}

function adaptQimen(params: QimenParams, chart: QimenOutput) {
  const siZhu = {
    year: splitPillar(chart.siZhu.year),
    month: splitPillar(chart.siZhu.month),
    day: splitPillar(chart.siZhu.day),
    hour: splitPillar(chart.siZhu.hour),
  };
  const taibuText = toQimenText(chart, { detailLevel: 'full' });
  return {
    taibuText,
    taibuJson: toQimenJson(chart, { detailLevel: 'full' }),
    name: params.name || '匿名',
    sex: sexLabel(params.sex),
    gongli: chart.dateInfo.solarDate,
    nongli: chart.dateInfo.lunarDate,
    jieqi_pre: chart.dateInfo.solarTerm,
    jieqi_next: chart.dateInfo.solarTermRange || '',
    sizhu_info: {
      year_gan: siZhu.year.gan,
      year_zhi: siZhu.year.zhi,
      month_gan: siZhu.month.gan,
      month_zhi: siZhu.month.zhi,
      day_gan: siZhu.day.gan,
      day_zhi: siZhu.day.zhi,
      hour_gan: siZhu.hour.gan,
      hour_zhi: siZhu.hour.zhi,
    },
    dunju: `${chart.dunType === 'yang' ? '阳遁' : '阴遁'}${chart.juNumber}局`,
    dingju: chart.yuan,
    panlei: chart.panType,
    fushou: chart.xunShou,
    xunshou: chart.xunShou,
    zhifu_info: {
      zhifu_name: chart.zhiFu.star,
      zhifu_luogong: String(chart.zhiFu.palace),
      zhishi_name: chart.zhiShi.gate,
      zhishi_luogong: String(chart.zhiShi.palace),
    },
    xunkong_info: {
      year_xunkong: '',
      month_xunkong: '',
      day_xunkong: chart.kongWang.dayKong.branches.join(''),
      hour_xunkong: chart.kongWang.hourKong.branches.join(''),
    },
    xunshou_info: {
      year_xunshou: '',
      month_xunshou: '',
      day_xunshou: chart.xunShou,
      hour_xunshou: chart.xunShou,
    },
    maxing_info: {
      maxing_name: chart.yiMa.branch,
      maxing_luogong: String(chart.yiMa.palace || ''),
    },
    kongwang_info: {
      kongwang_name: chart.kongWang.hourKong.branches.join(''),
      kongwang_luogong: chart.kongWang.hourKong.palaces.join(','),
    },
    gong_pan: chart.palaces.map((palace) => ({
      name: palace.palaceName,
      index: palace.palaceIndex,
      gong_pan_index: palace.palaceIndex,
      tianpan: { jiuxing: palace.star, sanqiliuyi: palace.heavenStem },
      dipan: { sanqiliuyi: palace.earthStem },
      renpan: { bamen: palace.gate },
      shenpan: { bashen: palace.deity },
      description: {
        luo_gong_desc: `${palace.palaceName}${palace.palaceIndex}宫`,
        gong_ju: palace.formations.join('、'),
      },
      is_kongwang: Boolean(palace.isKongWang),
      is_maxing: Boolean(palace.isYiMa),
      yingan: '',
    })),
  };
}

function adaptZiwei(params: BaseParams, chart: ZiweiOutput, input: BirthInput, horoscopeJson?: Record<string, any>) {
  const taibuText = toZiweiText(chart, { detailLevel: 'full' });
  const soulPalace = chart.palaces.find((item) => item.name === '命宫' || item.earthlyBranch === chart.earthlyBranchOfSoulPalace);
  const bodyPalace = chart.palaces.find((item) => item.isBodyPalace || item.earthlyBranch === chart.earthlyBranchOfBodyPalace);
  return {
    taibuText,
    taibuJson: toZiweiJson(chart, { detailLevel: 'full' }),
    horoscopeJson,
    calcInput: input,
    base_info: {
      sex: sexLabel(params.sex),
      name: params.name || '匿名',
      gongli: chart.solarDate,
      nongli: chart.lunarDate,
      minggong: soulPalace?.earthlyBranch || chart.earthlyBranchOfSoulPalace || '',
      shengong: bodyPalace?.earthlyBranch || chart.earthlyBranchOfBodyPalace || '',
      mingju: chart.fiveElement,
      mingzhu: chart.soul,
      shenzhu: chart.body,
      zhen: chart.trueSolarTimeInfo ? {
        city: params.district || params.city || '',
        shicha: `${chart.trueSolarTimeInfo.trueSolarTime}（校正${chart.trueSolarTimeInfo.correctionMinutes}分钟）`,
      } : undefined,
    },
    detail_info: {
      xiantian_info: {
        gong_pan: chart.palaces.map((palace) => {
          const majors = palace.majorStars || [];
          const minors = [...(palace.minorStars || []), ...(palace.adjStars || [])];
          return {
            minggong: palace.name,
            yinshou: `${palace.heavenlyStem}${palace.earthlyBranch}`,
            ziweixing: majors[0]?.name || '',
            ziweixing_xingyao: majors[0]?.brightness || '',
            tianfuxing: majors[1]?.name || '',
            tianfuxing_xingyao: majors[1]?.brightness || '',
            yearganxing: minors.map((star) => star.name).join('、'),
            daxian: palace.decadalRange ? `${palace.decadalRange[0]}-${palace.decadalRange[1]}` : '',
          };
        }),
      },
    },
  };
}

function buildGuaDetails(name: string, code: string, guaCi?: string, xiangCi?: string) {
  const meta = hexagramByCode.get(code) || hexagramByName.get(name);
  return {
    gua_name: name || meta?.name || '',
    gua_mark: code || meta?.code || '',
    gua_qian: guaCi || xiangCi || '',
    gua_qian_desc: xiangCi || '',
    gua_description: { ...emptyGuaDescription, gua_juece: xiangCi || guaCi || '' },
    gua_xiongji: meta?.nature || '',
  };
}

function adaptMeihua(chart: MeihuaOutput) {
  const gz = chart.ganZhiTime;
  const taibuText = toMeihuaText(chart, { detailLevel: 'full' });
  return {
    taibuText,
    taibuJson: toMeihuaJson(chart, { detailLevel: 'full' }),
    gongli: chart.castMeta.inputSnapshot?.date || '',
    nongli: '',
    sizhu_info: {
      year_gan: gz.year.gan,
      year_zhi: gz.year.zhi,
      month_gan: gz.month.gan,
      month_zhi: gz.month.zhi,
      day_gan: gz.day.gan,
      day_zhi: gz.day.zhi,
      hour_gan: gz.hour.gan,
      hour_zhi: gz.hour.zhi,
    },
    gua_info: {
      bengua: buildGuaDetails(chart.mainHexagram.name, chart.mainHexagram.code, chart.mainHexagram.guaCi, chart.mainHexagram.xiangCi),
      hugua: chart.nuclearHexagram
        ? buildGuaDetails(chart.nuclearHexagram.name, chart.nuclearHexagram.code, chart.nuclearHexagram.guaCi, chart.nuclearHexagram.xiangCi)
        : buildGuaDetails('', ''),
      biangua: chart.changedHexagram
        ? buildGuaDetails(chart.changedHexagram.name, chart.changedHexagram.code, chart.changedHexagram.guaCi, chart.changedHexagram.xiangCi)
        : buildGuaDetails('', ''),
      cuogua: chart.oppositeHexagram ? buildGuaDetails(chart.oppositeHexagram.name, '', chart.oppositeHexagram.guaCi, chart.oppositeHexagram.xiangCi) : buildGuaDetails('', ''),
      zonggua: chart.reversedHexagram ? buildGuaDetails(chart.reversedHexagram.name, '', chart.reversedHexagram.guaCi, chart.reversedHexagram.xiangCi) : buildGuaDetails('', ''),
    },
    has_biangua: chart.changedHexagram ? '1' : '0',
    dongyao: String(chart.movingLine),
  };
}

function lineCodeFromParams(params: BaseParams) {
  return [1, 2, 3, 4, 5, 6]
    .map((index) => {
      const raw = Number((params as unknown as Record<string, unknown>)[`gua_yao${index}`] ?? 0);
      return raw === 1 || raw === 3 ? '1' : '0';
    })
    .join('');
}

function changedCodeFromParams(params: BaseParams, baseCode: string) {
  return baseCode.split('').map((value, index) => {
    const raw = Number((params as unknown as Record<string, unknown>)[`gua_yao${index + 1}`] ?? 0);
    return raw === 2 || raw === 3 ? (value === '1' ? '0' : '1') : value;
  }).join('');
}

function buildLiuyaoInput(params: BaseParams, question: string): LiuyaoInput {
  const panModel = params.pan_model || LiuyaoMode.AUTO;
  const base = {
    question,
    yongShenTargets: ['父母', '兄弟', '子孙', '妻财', '官鬼'] as LiuyaoInput['yongShenTargets'],
    date: dateTimeString(params),
    detailLevel: 'full' as const,
  };
  if (panModel === LiuyaoMode.MANUAL) {
    const code = lineCodeFromParams(params);
    const changed = changedCodeFromParams(params, code);
    const hexagramName = hexagramByCode.get(code)?.name;
    const changedHexagramName = hexagramByCode.get(changed)?.name;
    if (!hexagramName) throw new Error('手动卦象无法匹配六十四卦');
    return {
      ...base,
      method: 'select',
      hexagramName,
      changedHexagramName: changed !== code ? changedHexagramName : undefined,
    };
  }
  if (panModel === LiuyaoMode.NUMBER || panModel === LiuyaoMode.SINGLE_NUM) {
    const value = Number(params.number || 0);
    return { ...base, method: 'number', numbers: params.yao_add_time ? [value, params.hours + 1] : [value, value] };
  }
  if (panModel === LiuyaoMode.DOUBLE_NUM) {
    return { ...base, method: 'number', numbers: [Number(params.number_up || 0), Number(params.number_down || 0)] };
  }
  return { ...base, method: panModel === LiuyaoMode.CUSTOM_TIME ? 'time' : 'auto' };
}

function buildMeihuaInput(params: BaseParams, question: string): MeihuaInput {
  const panModel = params.pan_model || LiuyaoMode.AUTO;
  const base = { question, date: dateTimeString(params), detailLevel: 'full' as const };
  if (panModel === LiuyaoMode.MANUAL) {
    const code = lineCodeFromParams(params);
    const hexagramName = hexagramByCode.get(code)?.name;
    const movingLine = [1, 2, 3, 4, 5, 6].find((index) => {
      const raw = Number((params as unknown as Record<string, unknown>)[`gua_yao${index}`] ?? 0);
      return raw === 2 || raw === 3;
    }) || 1;
    return { ...base, method: 'select', hexagramName, movingLine };
  }
  if (panModel === LiuyaoMode.NUMBER || panModel === LiuyaoMode.SINGLE_NUM) {
    const value = Number(params.number || 0);
    return { ...base, method: 'number_pair', numbers: params.yao_add_time ? [value, params.hours + 1] : [value, value] };
  }
  if (panModel === LiuyaoMode.DOUBLE_NUM) {
    return { ...base, method: 'number_pair', numbers: [Number(params.number_up || 0), Number(params.number_down || 0)] };
  }
  return { ...base, method: 'time' };
}

function adaptLiuyao(params: BaseParams, chart: LiuyaoOutput) {
  const gz = chart.ganZhiTime;
  const baseCode = chart.fullYaos
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((yao) => String(yao.type))
    .join('');
  const changedCode = chart.fullYaos
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((yao) => String(yao.changedYao ? (yao.type === 1 ? 0 : 1) : yao.type))
    .join('');
  const toYaoInfo = (includeChanged: boolean) => {
    const liuqin: Record<string, string> = {};
    const liushen: Record<string, string> = {};
    for (const yao of chart.fullYaos) {
      const key = `gua_yao${yao.position}`;
      const source = includeChanged && yao.changedYao ? yao.changedYao : yao;
      liuqin[key] = `${source.liuQin || ''}${source.naJia || ''}${source.wuXing || ''}`;
      liushen[key] = yao.liuShen || '';
    }
    return { liuqin, liushen };
  };
  const benguaYao = toYaoInfo(false);
  const bianguaYao = toYaoInfo(true);
  const fuShenArr = chart.fullYaos
    .filter((yao) => yao.fuShen)
    .map((yao) => ({
      fushen: `${yao.fuShen?.liuQin || ''}${yao.fuShen?.naJia || ''}${yao.fuShen?.wuXing || ''}`,
      fushen_yao_position: String(yao.position),
    }));
  const taibuText = toLiuyaoCanonicalText(chart);
  return {
    taibuText,
    taibuJson: toLiuyaoCanonicalJson(chart),
    sex: sexLabel(params.sex),
    model: String(params.pan_model || LiuyaoMode.AUTO),
    gongli: dateTimeString(params),
    nongli: '',
    nianming: params.born_year ? `${params.born_year}` : '',
    has_biangua: chart.changedHexagramName ? '1' : '0',
    dongyao: chart.fullYaos.filter((yao) => yao.isChanging).map((yao) => yao.position).join(','),
    guashen: chart.guaShen?.branch || '',
    kongwang: chart.kongWang.kongDizhi.join(''),
    shensha_info: {
      yima: chart.globalShenSha.find((item) => item.includes('驿马')) || '',
      taohua: chart.globalShenSha.find((item) => item.includes('桃花')) || '',
      guiren: chart.globalShenSha.find((item) => item.includes('贵人')) || '',
      rilu: chart.globalShenSha.find((item) => item.includes('禄')) || '',
    },
    sizhu_info: {
      year_gan: gz.year.gan,
      year_zhi: gz.year.zhi,
      month_gan: gz.month.gan,
      month_zhi: gz.month.zhi,
      day_gan: gz.day.gan,
      day_zhi: gz.day.zhi,
      hour_gan: gz.hour.gan,
      hour_zhi: gz.hour.zhi,
    },
    gua_info: {
      bengua: {
        ...buildGuaDetails(chart.hexagramName, baseCode, chart.guaCi, chart.xiangCi),
        gua_gong: chart.hexagramGong,
        gua_yao_info: {
          liuqin: benguaYao.liuqin,
          shiying: {
            shi_yao_position: String(chart.fullYaos.find((yao) => yao.isShiYao)?.position || ''),
            ying_yao_position: String(chart.fullYaos.find((yao) => yao.isYingYao)?.position || ''),
          },
          liushen: benguaYao.liushen,
          fushen: {
            has_fushen: fuShenArr.length ? '1' : '0',
            fushen_arr: fuShenArr,
          },
        },
      },
      biangua: chart.changedHexagramName ? {
        ...buildGuaDetails(chart.changedHexagramName, changedCode, chart.changedGuaCi, chart.changedXiangCi),
        gua_gong: chart.changedHexagramGong || '',
        gua_yao_info: {
          liuqin: bianguaYao.liuqin,
          shiying: { shi_yao_position: '', ying_yao_position: '' },
          liushen: bianguaYao.liushen,
        },
      } : undefined,
    },
  };
}

function buildGenericBaseInfo(params: BaseParams, extra: Record<string, unknown> = {}) {
  return {
    name: params.name || '匿名',
    sex: sexLabel(params.sex),
    gongli: `${dateOnlyString(params)} ${pad2(params.hours)}:${pad2(params.minute)}`,
    question: (params as QimenParams).question || '',
    ...extra,
  };
}

function adaptDaliuren(params: BaseParams, chart: DaliurenOutput) {
  return {
    taibuText: toDaliurenText(chart, { detailLevel: 'full' }),
    taibuJson: toDaliurenJson(chart),
    base_info: buildGenericBaseInfo(params, {
      nongli: chart.dateInfo.lunarDate || '',
      keName: chart.keName,
      yueJiang: chart.dateInfo.yueJiangName || chart.dateInfo.yueJiang,
      xun: chart.dateInfo.xun,
      kongWang: chart.dateInfo.kongWang,
    }),
    detail_info: {
      daliuren: {
        dateInfo: chart.dateInfo,
        tianDiPan: chart.tianDiPan,
        siKe: chart.siKe,
        sanChuan: chart.sanChuan,
        keTi: chart.keTi,
        shenSha: chart.shenSha,
        gongInfos: chart.gongInfos,
      },
    },
  };
}

function adaptTaiyi(params: BaseParams, chart: TaiyiOutput) {
  return {
    taibuText: toTaiyiText(chart, { detailLevel: 'full' }),
    taibuJson: toTaiyiJson(chart),
    base_info: buildGenericBaseInfo(params, {
      mode: chart.boardMeta.modeLabel,
      solarDateTime: chart.datetimeContext.solarDateTime,
      lunarDate: chart.datetimeContext.lunarDate,
      yearGanZhi: chart.datetimeContext.yearGanZhi,
      monthGanZhi: chart.datetimeContext.monthGanZhi,
      dayGanZhi: chart.datetimeContext.dayGanZhi,
      hourGanZhi: chart.datetimeContext.hourGanZhi,
    }),
    detail_info: {
      taiyi: chart,
    },
  };
}

function solarToLunarMonthDay(params: BaseParams) {
  const lunar = Solar.fromYmd(params.year, params.month, params.day).getLunar() as any;
  return {
    lunarMonth: Number(lunar.getMonth()),
    lunarDay: Number(lunar.getDay()),
  };
}

function adaptXiaoliuren(params: BaseParams, chart: XiaoliurenOutput) {
  return {
    taibuText: toXiaoliurenText(chart),
    taibuJson: toXiaoliurenJson(chart),
    base_info: buildGenericBaseInfo(params, {
      lunarMonth: chart.input.lunarMonth,
      lunarDay: chart.input.lunarDay,
      shichen: chart.input.shichen,
      result: chart.result.name,
      nature: chart.result.nature,
    }),
    detail_info: {
      xiaoliuren: chart,
    },
  };
}

function kongWangFromGanZhi(stem?: string, branch?: string) {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const stemIndex = stems.indexOf(stem || '');
  const branchIndex = branches.indexOf(branch || '');
  if (stemIndex < 0 || branchIndex < 0) return '';
  const dayIndex = Array.from({ length: 60 }, (_, index) => index)
    .find((index) => index % 10 === stemIndex && index % 12 === branchIndex);
  if (dayIndex === undefined) return '';
  return ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'][Math.floor(dayIndex / 10)] || '';
}

function withKongWang<T extends AlmanacOutput>(chart: T) {
  const kongWang = kongWangFromGanZhi(chart.dayInfo?.stem, chart.dayInfo?.branch);
  if (!kongWang) return chart;
  return {
    ...chart,
    kongWang,
    almanac: {
      ...(chart as any).almanac,
      kongWang,
    },
  } as T & { kongWang: string; almanac: T['almanac'] & { kongWang: string } };
}

function adaptAlmanac(params: BaseParams, chart: AlmanacOutput) {
  const enhancedChart = withKongWang(chart);
  return {
    taibuText: toAlmanacText(enhancedChart),
    taibuJson: toAlmanacJson(enhancedChart),
    base_info: buildGenericBaseInfo(params, {
      date: enhancedChart.date,
      ganZhi: enhancedChart.dayInfo.ganZhi,
      dayStem: enhancedChart.dayInfo.stem,
      dayBranch: enhancedChart.dayInfo.branch,
      tenGod: enhancedChart.tenGod || '',
      kongWang: (enhancedChart as any).kongWang || '',
    }),
    detail_info: {
      almanac: enhancedChart,
    },
  };
}

type FortuneLevel = '凶' | '小凶' | '平' | '中吉' | '吉' | '大吉';
type FortuneScores = {
  overall: number;
  career: number;
  love: number;
  wealth: number;
  health: number;
  social: number;
};
type FortuneLevels = Record<keyof FortuneScores, FortuneLevel>;
type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
type FiveElement = '木' | '火' | '土' | '金' | '水';

const LEVEL_ORDER: FortuneLevel[] = ['凶', '小凶', '平', '中吉', '吉', '大吉'];
const ELEMENT_RELATION_WEIGHTS: Record<string, number> = {
  same: 70,
  produce: 75,
  produced: 85,
  control: 62,
  controlled: 50,
};
const TEN_GOD_ADJUSTMENTS: Record<string, Partial<FortuneScores>> = {
  比肩: { career: 5, love: 0, wealth: -5, health: 5, social: 10 },
  劫财: { career: 0, love: -5, wealth: -10, health: 5, social: 5 },
  食神: { career: 5, love: 10, wealth: 5, health: 10, social: 8 },
  伤官: { career: -5, love: 5, wealth: 5, health: 0, social: -5 },
  偏财: { career: 5, love: 5, wealth: 15, health: 0, social: 5 },
  正财: { career: 5, love: 10, wealth: 10, health: 0, social: 5 },
  七杀: { career: 10, love: -5, wealth: 5, health: -5, social: -3 },
  正官: { career: 15, love: 5, wealth: 5, health: 0, social: 8 },
  偏印: { career: 5, love: 0, wealth: -5, health: 5, social: 0 },
  正印: { career: 10, love: 5, wealth: 0, health: 10, social: 5 },
};
const STEM_ELEMENTS_MAP = STEM_ELEMENTS as Record<HeavenlyStem, FiveElement>;
const BRANCH_ELEMENTS = ZHI_WUXING as Record<string, FiveElement>;
const BRANCH_HIDDEN_STEMS: Record<string, HeavenlyStem[]> = Object.fromEntries(
  Object.entries(HIDDEN_STEM_DETAILS).map(([branch, stems]) => [
    branch,
    stems.map((item) => item.stem as HeavenlyStem),
  ])
) as Record<string, HeavenlyStem[]>;
const ELEMENT_COLORS: Record<FiveElement, string> = {
  木: '绿色',
  火: '红色',
  土: '黄色',
  金: '白色',
  水: '黑色/蓝色',
};
const ELEMENT_DIRECTIONS: Record<FiveElement, string> = {
  木: '东方',
  火: '南方',
  土: '中央',
  金: '西方',
  水: '北方',
};

function clampWeight(value: number) {
  return Math.max(30, Math.min(98, Math.round(value)));
}

function weightToLevel(value: number): FortuneLevel {
  if (value >= 85) return '大吉';
  if (value >= 75) return '吉';
  if (value >= 65) return '中吉';
  if (value >= 55) return '平';
  if (value >= 45) return '小凶';
  return '凶';
}

function compareLevels(left: FortuneLevel, right: FortuneLevel) {
  return LEVEL_ORDER.indexOf(left) - LEVEL_ORDER.indexOf(right);
}

function isLevelFavorable(level: FortuneLevel) {
  return compareLevels(level, '中吉') >= 0;
}

function fortuneLevelToChartValue(level: FortuneLevel) {
  const map: Record<FortuneLevel, number> = {
    大吉: 92,
    吉: 78,
    中吉: 65,
    平: 52,
    小凶: 40,
    凶: 30,
  };
  return map[level];
}

function calcHiddenStemBonus(userDayStem: HeavenlyStem, branch: string) {
  const hiddenStems = BRANCH_HIDDEN_STEMS[branch];
  if (!hiddenStems?.length) return 0;
  const weights = [0.6, 0.3, 0.1];
  const userElement = STEM_ELEMENTS_MAP[userDayStem];
  let bonus = 0;
  for (let index = 0; index < hiddenStems.length; index += 1) {
    const stemElement = STEM_ELEMENTS_MAP[hiddenStems[index]];
    const relation = getElementRelation(userElement, stemElement);
    const relationWeights: Record<string, number> = {
      produced: 6,
      same: 3,
      produce: 1,
      control: -2,
      controlled: -5,
    };
    bonus += (relationWeights[relation] || 0) * (weights[index] || 0.1);
  }
  return bonus;
}

function calcBranchInteraction(userDayBranch: string, flowBranch: string) {
  const result = { career: 0, love: 0, wealth: 0, health: 0, social: 0 };
  if (LIU_HE[userDayBranch] === flowBranch) {
    result.career += 4;
    result.love += 5;
    result.wealth += 3;
    result.health += 3;
    result.social += 5;
  }
  if (LIU_CHONG[userDayBranch] === flowBranch) {
    result.career -= 5;
    result.love -= 4;
    result.wealth -= 3;
    result.health -= 6;
    result.social -= 4;
  }
  if (TAO_HUA[userDayBranch] === flowBranch) {
    result.love += 4;
    result.social += 3;
  }
  if (YI_MA[userDayBranch] === flowBranch) {
    result.career += 3;
    result.wealth += 2;
  }
  return result;
}

function calcFortuneByStemBranch(
  userDayStem: HeavenlyStem,
  userDayBranch: string,
  flowStem: HeavenlyStem,
  flowBranch: string
) {
  const relation = getElementRelation(STEM_ELEMENTS_MAP[userDayStem], STEM_ELEMENTS_MAP[flowStem]);
  const baseWeight = ELEMENT_RELATION_WEIGHTS[relation] || 65;
  const tenGod = calculateTenGod(userDayStem, flowStem);
  const hiddenBonus = calcHiddenStemBonus(userDayStem, flowBranch);
  const branchBonus = calcBranchInteraction(userDayBranch, flowBranch);
  const adj = TEN_GOD_ADJUSTMENTS[tenGod] || {};
  const career = clampWeight(baseWeight + (adj.career || 0) + hiddenBonus + branchBonus.career);
  const love = clampWeight(baseWeight + (adj.love || 0) + hiddenBonus + branchBonus.love);
  const wealth = clampWeight(baseWeight + (adj.wealth || 0) + hiddenBonus + branchBonus.wealth);
  const health = clampWeight(baseWeight + (adj.health || 0) + hiddenBonus + branchBonus.health);
  const social = clampWeight(baseWeight + (adj.social || 0) + hiddenBonus + branchBonus.social);
  const overall = clampWeight((career + love + wealth + health + social) / 5);
  const scores = { overall, career, love, wealth, health, social };
  return {
    tenGod,
    levels: {
      overall: weightToLevel(overall),
      career: weightToLevel(career),
      love: weightToLevel(love),
      wealth: weightToLevel(wealth),
      health: weightToLevel(health),
      social: weightToLevel(social),
    } satisfies FortuneLevels,
    scores,
  };
}

function getLuckyElement(userElement: FiveElement): FiveElement {
  const order: FiveElement[] = ['木', '火', '土', '金', '水'];
  const index = order.indexOf(userElement);
  return order[(index + 4) % 5];
}

function generateDailyAdvice(tenGod: string, levels: FortuneLevels) {
  const tenGodAdvice: Record<string, string> = {
    比肩: '今日适合与朋友合作，互帮互助',
    劫财: '注意财务支出，避免借贷',
    食神: '创意灵感丰富，适合发挥才华',
    伤官: '思维活跃但需谨言慎行',
    偏财: '有意外之财，可适当投资',
    正财: '正财运佳，努力工作有回报',
    七杀: '压力较大，但挑战中有机遇',
    正官: '贵人运旺，适合拓展人脉',
    偏印: '适合学习研究，提升自我',
    正印: '长辈相助，学业事业顺遂',
  };
  const advice = [tenGodAdvice[tenGod] || '顺其自然，平常心对待'];
  if (compareLevels(levels.overall, '吉') >= 0) advice.push('整体运势极佳，可大胆行动');
  else if (compareLevels(levels.overall, '平') < 0) advice.push('今日宜静不宜动，稳健为上');
  if (compareLevels(levels.career, '吉') >= 0) advice.push('事业运强劲，把握晋升机会');
  else if (compareLevels(levels.career, '平') < 0) advice.push('职场需低调行事，避免冲突');
  if (compareLevels(levels.wealth, '平') < 0) advice.push('财运平平，不宜大额消费投资');
  if (compareLevels(levels.health, '平') < 0) advice.push('注意休息，避免过度劳累');
  return advice.slice(0, 4);
}

function generateMonthlySummary(tenGod: string, overall: FortuneLevel) {
  const tenGodSummary: Record<string, string> = {
    比肩: '本月人际关系活跃，适合团队合作',
    劫财: '本月财务需谨慎，防止意外支出',
    食神: '本月创意运势佳，适合发展副业',
    伤官: '本月思维活跃，但需注意言行',
    偏财: '本月偏财运旺，可尝试投资',
    正财: '本月正财稳定，努力有回报',
    七杀: '本月挑战与机遇并存，需果断行动',
    正官: '本月事业运强，贵人相助',
    偏印: '本月适合学习进修，提升能力',
    正印: '本月稳健发展，长辈贵人相助',
  };
  let summary = tenGodSummary[tenGod] || '本月运势平稳，顺其自然';
  if (compareLevels(overall, '吉') >= 0) summary += '。整体运势极佳，可积极把握机会。';
  else if (compareLevels(overall, '中吉') >= 0) summary += '。运势良好，稳步前进即可。';
  else summary += '。建议稳健行事，避免冒险。';
  return summary;
}

function fortuneFromDate(bazi: BaziOutput, date: Date) {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const eightChar = solar.getLunar().getEightChar();
  const dayStem = eightChar.getDayGan() as HeavenlyStem;
  const dayBranch = eightChar.getDayZhi();
  const userDayStem = bazi.dayMaster as HeavenlyStem;
  const userDayBranch = bazi.fourPillars.day.branch;
  const result = calcFortuneByStemBranch(userDayStem, userDayBranch, dayStem, dayBranch);
  const luckyElement = getLuckyElement(STEM_ELEMENTS_MAP[userDayStem]);
  return {
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    dayStem,
    dayBranch,
    tenGod: result.tenGod,
    ...result.levels,
    advice: generateDailyAdvice(result.tenGod, result.levels),
    luckyColor: ELEMENT_COLORS[luckyElement],
    luckyDirection: ELEMENT_DIRECTIONS[luckyElement],
    _chart: result.scores,
  };
}

function buildTrend(bazi: BaziOutput, centerDate: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(centerDate);
    date.setDate(centerDate.getDate() + index - 2);
    const fortune = fortuneFromDate(bazi, date);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      fullDate: fortune.date,
      dayOfMonth: date.getDate(),
      scores: fortune._chart,
      level: fortune.overall,
    };
  });
}

function buildMonthCalendar(bazi: BaziOutput, year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const fortune = fortuneFromDate(bazi, new Date(year, month - 1, day));
    return {
      day,
      level: fortune.overall,
      scores: fortune._chart,
      trend: isLevelFavorable(fortune.overall) ? 'up' : compareLevels(fortune.overall, '平') < 0 ? 'down' : 'neutral',
    };
  });
}

async function buildDailyFortune(params: BaseParams) {
  const target = {
    ...params,
    year: params.targetYear || params.year,
    month: params.targetMonth || params.month,
    day: params.targetDay || params.day,
  };
  const input = commonBirthInput(params);
  const bazi = calculateBazi(input);
  const fortune = fortuneFromDate(bazi, new Date(target.year, target.month - 1, target.day));
  const almanac = withKongWang(await calculateDailyAlmanac({
    date: dateOnlyString(target),
    dayMaster: bazi.fourPillars.day.stem,
    birthYear: params.year,
    birthMonth: params.month,
    birthDay: params.day,
    birthHour: params.hours,
  }));
  const trend = buildTrend(bazi, new Date(target.year, target.month - 1, target.day));
  const text = [
    '【每日运势】',
    `姓名：${params.name || '匿名'}（${sexLabel(params.sex)}）`,
    `日期：${dateOnlyString(target)}`,
    `日干支：${fortune.dayStem}${fortune.dayBranch}`,
    `十神：${fortune.tenGod}`,
    '',
    `综合：${fortune.overall}`,
    `事业：${fortune.career}`,
    `感情：${fortune.love}`,
    `财富：${fortune.wealth}`,
    `健康：${fortune.health}`,
    `人际：${fortune.social}`,
    '',
    `幸运色：${fortune.luckyColor}`,
    `吉方位：${fortune.luckyDirection}`,
    `建议：${fortune.advice.join(' ')}`,
  ].join('\n');

  return {
    taibuText: text,
    taibuJson: { bazi: toBaziJson(bazi), almanac: toAlmanacJson(almanac), fortune, trend },
    base_info: buildGenericBaseInfo(params, {
      date: dateOnlyString(target),
      dayMaster: `${bazi.fourPillars.day.stem}${bazi.fourPillars.day.branch}`,
      todayGanZhi: almanac.dayInfo.ganZhi,
    }),
    detail_info: {
      fortune: {
        type: 'daily',
        ...fortune,
        trend,
        almanac,
        chartValueMap: {
          overall: fortuneLevelToChartValue(fortune.overall),
          career: fortuneLevelToChartValue(fortune.career),
          love: fortuneLevelToChartValue(fortune.love),
          wealth: fortuneLevelToChartValue(fortune.wealth),
          health: fortuneLevelToChartValue(fortune.health),
          social: fortuneLevelToChartValue(fortune.social),
        },
      },
    },
  };
}

async function buildMonthlyFortune(params: BaseParams) {
  const target = {
    ...params,
    year: params.targetYear || params.year,
    month: params.targetMonth || params.month,
    day: params.targetDay || params.day,
  };
  const input = commonBirthInput(params);
  const bazi = calculateBazi(input);
  const midMonthParams = { ...target, day: Math.min(15, target.day || 15) };
  const solar = Solar.fromYmd(target.year, target.month, 15);
  const eightChar = solar.getLunar().getEightChar();
  const monthStem = eightChar.getMonthGan() as HeavenlyStem;
  const monthBranch = eightChar.getMonthZhi();
  const monthly = calcFortuneByStemBranch(
    bazi.dayMaster as HeavenlyStem,
    bazi.fourPillars.day.branch,
    monthStem,
    monthBranch
  );
  const summary = generateMonthlySummary(monthly.tenGod, monthly.levels.overall);
  const calendar = buildMonthCalendar(bazi, target.year, target.month);
  const almanac = withKongWang(await calculateDailyAlmanac({
    date: dateOnlyString(midMonthParams),
    dayMaster: bazi.fourPillars.day.stem,
    birthYear: params.year,
    birthMonth: params.month,
    birthDay: params.day,
    birthHour: params.hours,
  }));
  const text = [
    '【每月运势】',
    `姓名：${params.name || '匿名'}（${sexLabel(params.sex)}）`,
    `月份：${target.year}-${pad2(target.month)}`,
    `命局日主：${bazi.fourPillars.day.stem}${bazi.fourPillars.day.branch}`,
    `流月干支：${monthStem}${monthBranch}`,
    `主运十神：${monthly.tenGod}`,
    '',
    `综合：${monthly.levels.overall}`,
    `事业：${monthly.levels.career}`,
    `感情：${monthly.levels.love}`,
    `财富：${monthly.levels.wealth}`,
    `健康：${monthly.levels.health}`,
    `人际：${monthly.levels.social}`,
    '',
    `总结：${summary}`,
  ].join('\n');

  return {
    taibuText: text,
    taibuJson: { bazi: toBaziJson(bazi), almanac: toAlmanacJson(almanac), monthly, summary, calendar },
    base_info: buildGenericBaseInfo(params, {
      month: `${target.year}-${pad2(target.month)}`,
      dayMaster: `${bazi.fourPillars.day.stem}${bazi.fourPillars.day.branch}`,
    }),
    detail_info: {
      fortune: {
        type: 'monthly',
        year: target.year,
        month: target.month,
        monthStem,
        monthBranch,
        tenGod: monthly.tenGod,
        ...monthly.levels,
        _chart: monthly.scores,
        summary,
        calendar,
        almanac,
      },
    },
  };
}

export async function calculateTaibuChart({ modelType, params }: ChartRequest) {
  switch (modelType) {
    case ModelType.QIMEN: {
      const qimenParams = params as QimenParams;
      const chart = await calculateQimen({
        year: qimenParams.year,
        month: qimenParams.month,
        day: qimenParams.day,
        hour: qimenParams.hours,
        minute: qimenParams.minute,
        question: qimenParams.question,
        panType: 'zhuan',
        juMethod: qimenParams.ju_model === 2 ? 'maoshan' : 'chaibu',
        zhiFuJiGong: qimenParams.ju_model === 0 ? 'ji_wugong' : 'ji_liuyi',
      });
      return adaptQimen(qimenParams, chart);
    }
    case ModelType.BAZI: {
      const base = await normalizeBirthParams(params as BaseParams);
      const input = commonBirthInput(base);
      const [chart, dayun] = [
        calculateBazi(input),
        calculateBaziDayun(input),
      ];
      return adaptBazi(base, chart, dayun);
    }
    case ModelType.ZIWEI: {
      const base = await normalizeBirthParams(params as BaseParams);
      const input = commonBirthInput(base);
      const { output, astrolabe } = calculateZiweiDataWithAstrolabe(input);
      const horoscopeJson = toZiweiHoroscopeJson(
        calculateZiweiHoroscopeDataWithAstrolabe(astrolabe, { targetDate: new Date() }),
        { detailLevel: 'full' },
      ) as Record<string, any>;
      return adaptZiwei(base, output || calculateZiwei(input), input, horoscopeJson);
    }
    case ModelType.MEIHUA: {
      const base = params as BaseParams;
      const chart = calculateMeihua(buildMeihuaInput(base, (base as QimenParams).question || '所问之事'));
      return adaptMeihua(chart);
    }
    case ModelType.LIUYAO: {
      const base = params as BaseParams;
      const chart = await calculateLiuyao(buildLiuyaoInput(base, (base as QimenParams).question || '所问之事'));
      return adaptLiuyao(base, chart);
    }
    case ModelType.DALIUREN: {
      const base = params as BaseParams;
      const chart = calculateDaliuren({
        date: dateOnlyString(base),
        hour: base.hours,
        minute: base.minute,
        timezone: 'Asia/Shanghai',
        question: (base as QimenParams).question || undefined,
        birthYear: base.born_year,
        gender: gender(base.sex),
      });
      return adaptDaliuren(base, chart);
    }
    case ModelType.TAIYI: {
      const base = params as BaseParams;
      const chart = calculateTaiyi({
        mode: (base.taiyi_mode || 'hour') as TaiyiMode,
        date: dateOnlyString(base),
        hour: base.hours,
        minute: base.minute,
        timezone: 'Asia/Shanghai',
        question: (base as QimenParams).question || undefined,
      });
      return adaptTaiyi(base, chart);
    }
    case ModelType.XIAOLIUREN: {
      const base = params as BaseParams;
      const lunar = solarToLunarMonthDay(base);
      const chart = calculateXiaoliurenData({
        lunarMonth: lunar.lunarMonth,
        lunarDay: lunar.lunarDay,
        hour: base.hours,
        question: (base as QimenParams).question || undefined,
      });
      return adaptXiaoliuren(base, chart);
    }
    case ModelType.ALMANAC: {
      const base = params as BaseParams;
      const chart = await calculateDailyAlmanac({
        date: dateOnlyString(base),
        birthYear: base.born_year,
        birthMonth: base.month,
        birthDay: base.day,
        birthHour: base.hours,
      });
      return adaptAlmanac(base, chart);
    }
    case ModelType.DAILY_FORTUNE:
      return buildDailyFortune(params as BaseParams);
    case ModelType.MONTHLY_FORTUNE:
      return buildMonthlyFortune(params as BaseParams);
    default:
      throw new Error('不支持的排盘类型');
  }
}
