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
  calculateQimen,
  toQimenJson,
  toQimenText,
  type QimenOutput,
} from 'taibu-core/qimen';
import {
  calculateZiwei,
  toZiweiJson,
  toZiweiText,
  type ZiweiOutput,
} from 'taibu-core/ziwei';
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
import { HEXAGRAMS } from 'taibu-core/data/hexagrams';
import { ModelType, LiuyaoMode, type BaseParams, type QimenParams } from '../types';

type ChartRequest = {
  modelType: ModelType;
  params: BaseParams | QimenParams;
};

const sexLabel = (sex: number | undefined) => (sex === 1 ? '女' : '男');
const gender = (sex: number | undefined): 'male' | 'female' => (sex === 1 ? 'female' : 'male');
const pad2 = (value: number) => String(value).padStart(2, '0');
const dateTimeString = (params: BaseParams) =>
  `${params.year}-${pad2(params.month)}-${pad2(params.day)}T${pad2(params.hours)}:${pad2(params.minute)}`;
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

function commonBirthInput(params: BaseParams) {
  return {
    birthYear: params.year,
    birthMonth: params.month,
    birthDay: params.day,
    birthHour: params.hours,
    birthMinute: params.minute,
    gender: gender(params.sex),
    birthPlace: buildBirthPlace(params),
  };
}

function buildBaseInfo(params: BaseParams, dayun?: DayunOutput) {
  const solar = `${params.year}-${pad2(params.month)}-${pad2(params.day)} ${pad2(params.hours)}:${pad2(params.minute)}`;
  return {
    sex: sexLabel(params.sex),
    name: params.name || '匿名',
    gongli: solar,
    nongli: '',
    qiyun: dayun ? `${dayun.startAge}岁（${dayun.startAgeDetail}）` : '',
    jiaoyun: '',
    zhengge: '',
  };
}

function adaptBazi(params: BaseParams, chart: BaziOutput, dayun: DayunOutput) {
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

  return {
    taibuText,
    taibuJson: toBaziJson(chart, { dayun }),
    base_info: buildBaseInfo(params, dayun),
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

function adaptZiwei(params: BaseParams, chart: ZiweiOutput) {
  const taibuText = toZiweiText(chart, { detailLevel: 'full' });
  const soulPalace = chart.palaces.find((item) => item.name === '命宫' || item.earthlyBranch === chart.earthlyBranchOfSoulPalace);
  const bodyPalace = chart.palaces.find((item) => item.isBodyPalace || item.earthlyBranch === chart.earthlyBranchOfBodyPalace);
  return {
    taibuText,
    taibuJson: toZiweiJson(chart, { detailLevel: 'full' }),
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
      const base = params as BaseParams;
      const input = commonBirthInput(base);
      const [chart, dayun] = [
        calculateBazi(input),
        calculateBaziDayun(input),
      ];
      return adaptBazi(base, chart, dayun);
    }
    case ModelType.ZIWEI: {
      const base = params as BaseParams;
      const chart = calculateZiwei(commonBirthInput(base));
      return adaptZiwei(base, chart);
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
    default:
      throw new Error('不支持的排盘类型');
  }
}
