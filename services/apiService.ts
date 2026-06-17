
import { 
  QimenParams, QimenResponse, 
  BaseParams, BaziResponse, 
  ZiweiResponse, MeihuaResponse, LiuyaoResponse,
  GenericTaibuResponse,
  ModelType, LiuyaoMode 
} from '../types';
import { buildZiweiAnalysisPrompt } from '../lib/ziwei-prompt';

async function fetchChart<T>(modelType: ModelType, params: Record<string, unknown>): Promise<T> {
  try {
    const response = await fetch('/api/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelType, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network Error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    return json.data as T;
  } catch (error: any) {
    console.error(`Chart error for ${modelType}:`, error.message);
    throw new Error(error.message || '排盘失败，请稍后重试。');
  }
}

// --- 1. Qimen ---
export const fetchQimen = async (params: QimenParams) => {
  const zhen = params.zhen ?? ((params.province && params.city) ? 1 : 2);
  const juModel = params.ju_model ?? 1;

  const requestPayload: Record<string, unknown> = {
    name: params.name || '匿名',
    sex: params.sex,
    year: params.year,
    month: params.month,
    day: params.day,
    hours: params.hours,
    minute: params.minute,
    ju_model: juModel,
    zhen,
    question: params.question,
  };

  if (params.province) requestPayload.province = params.province;
  if (params.city) requestPayload.city = params.city;

  if (params.pan_model !== undefined) {
    requestPayload.pan_model = params.pan_model;
    if (params.pan_model === 0) {
      requestPayload.fei_pan_model = params.fei_pan_model ?? 1;
    }
  }

  return fetchChart<QimenResponse>(ModelType.QIMEN, requestPayload);
};

// --- 2. Bazi ---
export const fetchBazi = async (params: BaseParams) => {
  return fetchChart<BaziResponse>(ModelType.BAZI, { ...params, name: params.name || '匿名' });
};

// --- 3. Ziwei ---
export const fetchZiwei = async (params: BaseParams) => {
  return fetchChart<ZiweiResponse>(ModelType.ZIWEI, { ...params, name: params.name || '匿名' });
};

const buildModePayload = (params: BaseParams) => {
  const panModel = params.pan_model || LiuyaoMode.AUTO;

  const requestPayload: Record<string, unknown> = {
    sex: params.sex,
    born_year: params.born_year || 1990,
    pan_model: panModel,
    name: params.name || '匿名',
    question: (params as QimenParams).question || '',
  };

  requestPayload.year = params.year;
  requestPayload.month = params.month;
  requestPayload.day = params.day;
  requestPayload.hours = params.hours;
  requestPayload.minute = params.minute;

  if (panModel === LiuyaoMode.MANUAL) {
    requestPayload.gua_yao1 = params.gua_yao1 ?? 0;
    requestPayload.gua_yao2 = params.gua_yao2 ?? 0;
    requestPayload.gua_yao3 = params.gua_yao3 ?? 0;
    requestPayload.gua_yao4 = params.gua_yao4 ?? 0;
    requestPayload.gua_yao5 = params.gua_yao5 ?? 0;
    requestPayload.gua_yao6 = params.gua_yao6 ?? 0;
  }
  else if (panModel === LiuyaoMode.NUMBER || panModel === LiuyaoMode.SINGLE_NUM) {
    requestPayload.number = params.number || 0;
    requestPayload.yao_add_time = params.yao_add_time ?? 0;
  }
  else if (panModel === LiuyaoMode.DOUBLE_NUM) {
    requestPayload.number_up = params.number_up || 0;
    requestPayload.number_down = params.number_down || 0;
    requestPayload.yao_add_time = params.yao_add_time ?? 0;
  }

  return requestPayload;
};

// --- 4. Meihua (All Modes) ---
export const fetchMeihua = async (params: BaseParams) => {
  return await fetchChart<MeihuaResponse>(ModelType.MEIHUA, buildModePayload(params));
};

// --- 5. Liuyao (All Modes) ---
export const fetchLiuyao = async (params: BaseParams) => {
  return await fetchChart<LiuyaoResponse>(ModelType.LIUYAO, buildModePayload(params));
};

export const fetchDaliuren = async (params: BaseParams) => {
  return await fetchChart<GenericTaibuResponse>(ModelType.DALIUREN, { ...params, name: params.name || '匿名' });
};

export const fetchTaiyi = async (params: BaseParams) => {
  return await fetchChart<GenericTaibuResponse>(ModelType.TAIYI, { ...params, name: params.name || '匿名' });
};

export const fetchXiaoliuren = async (params: BaseParams) => {
  return await fetchChart<GenericTaibuResponse>(ModelType.XIAOLIUREN, { ...params, name: params.name || '匿名' });
};

export const fetchAlmanac = async (params: BaseParams) => {
  return await fetchChart<GenericTaibuResponse>(ModelType.ALMANAC, { ...params, name: params.name || '匿名' });
};

export const fetchDailyFortune = async (params: BaseParams) => {
  return await fetchChart<GenericTaibuResponse>(ModelType.DAILY_FORTUNE, { ...params, name: params.name || '匿名' });
};

export const fetchMonthlyFortune = async (params: BaseParams) => {
  return await fetchChart<GenericTaibuResponse>(ModelType.MONTHLY_FORTUNE, { ...params, name: params.name || '匿名' });
};


// --- Prompt Formatters ---

export const formatQimenPrompt = (data: QimenResponse, question: string) => {
  if (data.taibuText) {
    return `【任务要求】
你是精通奇门遁甲的大师。请基于排盘，用通俗专业语言解答用户疑惑。关注用神、时令、吉凶。

${data.taibuText}

【用户问题】
${question.trim() || '无'}`;
  }
  const {
    name,
    sex,
    gongli,
    nongli,
    jieqi_pre,
    jieqi_next,
    sizhu_info,
    xunkong_info,
    xunshou_info,
    dunju,
    dingju,
    panlei,
    fushou,
    xunshou,
    zhifu_info,
    maxing_info,
    kongwang_info,
    gong_pan,
  } = data;

  const palaceLabels = ['一宫', '二宫', '三宫', '四宫', '五宫', '六宫', '七宫', '八宫', '中宫'];
  const normalizeFlag = (value: unknown) => value === 1 || value === '1' || value === true ? '是' : '否';
  const fmt = (value?: string) => value && value.trim() ? value : '无';
  const userQuestion = question.trim() || '无';

  const palaceLines = gong_pan.map((gong: any, index: number) => {
    const label = palaceLabels[index] || `宫位${index + 1}`;
    return `${label}：
- 八神：${fmt(gong.shenpan?.bashen)}
- 九星：${fmt(gong.tianpan?.jiuxing)}
- 八门：${fmt(gong.renpan?.bamen)}
- 天盘干：${fmt(gong.tianpan?.sanqiliuyi)}
- 地盘干：${fmt(gong.dipan?.sanqiliuyi)}
- 隐干：${fmt(gong.yingan)}
- 宫局：${fmt(gong.description?.gong_ju)}
- 空亡：${normalizeFlag(gong.is_kongwang)}
- 马星：${normalizeFlag(gong.is_maxing)}`;
  }).join('\n\n');

  return `【任务要求】
你是精通奇门遁甲的大师。请基于排盘，用通俗专业语言解答用户疑惑。关注用神、时令、吉凶。

【用户信息】
姓名：${fmt(name)}
性别：${fmt(sex)}

【起盘时间】
公历：${fmt(gongli)}
农历：${fmt(nongli)}
上个节气：${fmt(jieqi_pre)}
下个节气：${fmt(jieqi_next)}

【四柱信息】
年柱：${fmt(`${sizhu_info?.year_gan || ''}${sizhu_info?.year_zhi || ''}`)}
月柱：${fmt(`${sizhu_info?.month_gan || ''}${sizhu_info?.month_zhi || ''}`)}
日柱：${fmt(`${sizhu_info?.day_gan || ''}${sizhu_info?.day_zhi || ''}`)}
时柱：${fmt(`${sizhu_info?.hour_gan || ''}${sizhu_info?.hour_zhi || ''}`)}

【旬空信息】
年柱旬空：${fmt(xunkong_info?.year_xunkong)}
月柱旬空：${fmt(xunkong_info?.month_xunkong)}
日柱旬空：${fmt(xunkong_info?.day_xunkong)}
时柱旬空：${fmt(xunkong_info?.hour_xunkong)}

【旬首信息】
年柱旬首：${fmt(xunshou_info?.year_xunshou)}
月柱旬首：${fmt(xunshou_info?.month_xunshou)}
日柱旬首：${fmt(xunshou_info?.day_xunshou)}
时柱旬首：${fmt(xunshou_info?.hour_xunshou)}

【奇门总览】
遁局：${fmt(dunju)}
定局：${fmt(dingju)}
盘类：${fmt(panlei)}
符首：${fmt(fushou)}
旬首：${fmt(xunshou)}
值符：${fmt(zhifu_info?.zhifu_name)}（落${fmt(zhifu_info?.zhifu_luogong)}宫）
值使：${fmt(zhifu_info?.zhishi_name)}（落${fmt(zhifu_info?.zhishi_luogong)}宫）
马星：${fmt(maxing_info?.maxing_name)}（落${fmt(maxing_info?.maxing_luogong)}宫）
空亡：${fmt(kongwang_info?.kongwang_name)}（落${fmt(kongwang_info?.kongwang_luogong)}宫）

【九宫盘面】
${palaceLines}

【用户问题】
${userQuestion}`;
};

export const formatBaziPrompt = (data: BaziResponse) => {
  if (data.taibuText) {
    return `【八字命理排盘】
${data.taibuText}

喜用神分析需AI自行推断。`;
  }
  const { base_info, bazi_info, dayun_info, detail_info, start_info } = data;
  const shenshaInfo = detail_info?.shensha
    ? `年柱: ${detail_info.shensha.year}\n  月柱: ${detail_info.shensha.month}\n  日柱: ${detail_info.shensha.day}\n  时柱: ${detail_info.shensha.hour}`
    : '无';
  const jishenInfo = start_info?.jishen && start_info.jishen.length > 0
    ? `年柱: ${start_info.jishen[0] || '—'}\n  月柱: ${start_info.jishen[1] || '—'}\n  日柱: ${start_info.jishen[2] || '—'}\n  时柱: ${start_info.jishen[3] || '—'}`
    : '无';
  const dayunShenshaInfo = detail_info?.dayunshensha && detail_info.dayunshensha.length > 0
    ? detail_info.dayunshensha.map((item) => `${item.tgdz}: ${item.shensha}`).join('；')
    : '无';
  const dayunRanges = dayun_info?.big?.map((name, idx) => {
    const start = dayun_info.big_start_year?.[idx];
    const end = dayun_info.big_end_year?.[idx];
    const age = dayun_info.xu_sui?.[idx];
    const startText = start ?? '—';
    const endText = end ?? '—';
    const ageText = age ?? '—';
    return `${name}（${startText}-${endText}，${ageText}岁起）`;
  }) || [];
  return `
  【八字命理排盘】
  姓名: ${base_info.name} (${base_info.sex})
  公历: ${base_info.gongli}
  真太阳时调整: ${base_info.zhen?.shicha || '无'}
  八字: ${bazi_info.bazi.join(' ')}
  五行纳音: ${bazi_info.na_yin.join(' ')}
  格局: ${base_info.zhengge}
  神煞:
  四柱神煞:
  ${shenshaInfo}
  吉神凶煞:
  ${jishenInfo}
  大运神煞: ${dayunShenshaInfo}
  喜用神分析需AI自行推断。

  大运: ${dayun_info.big.join(' -> ')}
  大运起止: ${dayunRanges.join('；')}
  起运: ${base_info.qiyun}
  `;
};

export const formatZiweiPrompt = (data: ZiweiResponse) => {
  return buildZiweiAnalysisPrompt(data);
};

export const formatMeihuaPrompt = (data: MeihuaResponse, question: string) => {
  if (data.taibuText) {
    return `【梅花易数起卦】
${data.taibuText}

用户求测: "${question}"

请利用梅花易数体用生克之理，分析事情成败、应期及建议。`;
  }
  const { gua_info, dongyao } = data;
  return `
  【梅花易数起卦】
  时间: ${data.gongli}
  本卦: ${gua_info.bengua.gua_name} (${gua_info.bengua.gua_qian}) - ${gua_info.bengua.gua_xiongji}
  互卦: ${gua_info.hugua.gua_name}
  变卦: ${gua_info.biangua.gua_name}
  动爻: ${dongyao || '无'}

  用户求测: "${question}"

  请利用梅花易数体用生克之理，分析事情成败、应期及建议。
  `;
};

export const formatLiuyaoPrompt = (data: LiuyaoResponse, question: string) => {
  if (data.taibuText) {
    return `【六爻纳甲筮法】
${data.taibuText}

用户问题: "${question}"

请基于六亲、六神、世应及五行生克，结合变卦与空亡神煞，详细推断吉凶成败。`;
  }
  const { gua_info, sizhu_info, shensha_info, kongwang } = data;
  const ben = gua_info.bengua;
  const bian = gua_info.biangua;

  return `
  【六爻纳甲筮法】
  时间四柱: ${sizhu_info.year_gan}${sizhu_info.year_zhi}年 ${sizhu_info.month_gan}${sizhu_info.month_zhi}月 ${sizhu_info.day_gan}${sizhu_info.day_zhi}日 ${sizhu_info.hour_gan}${sizhu_info.hour_zhi}时
  空亡: ${kongwang}
  驿马:${shensha_info.yima} 桃花:${shensha_info.taohua} 贵人:${shensha_info.guiren} 日禄:${shensha_info.rilu}
  
  本卦: ${ben.gua_name} (${ben.gua_gong})
  ${ben.gua_qian}
  
  变卦: ${bian ? `${bian.gua_name} (${bian.gua_gong})` : '无'}
  
  世应: 世爻在${ben.gua_yao_info.shiying.shi_yao_position}爻, 应爻在${ben.gua_yao_info.shiying.ying_yao_position}爻
  
  用户问题: "${question}"
  
  请基于六亲、六神、世应及五行生克，结合变卦与空亡神煞，详细推断吉凶成败。
  `;
};

const formatGenericTaibuPrompt = (
  title: string,
  roleInstruction: string,
  data: GenericTaibuResponse,
  question: string
) => {
  const userQuestion = question.trim() || '请结合排盘做专业解读。';
  return `【${title}】
${data.taibuText || JSON.stringify(data.taibuJson || data.detail_info || data.base_info, null, 2)}

【用户问题】
${userQuestion}

${roleInstruction}`;
};

export const formatDaliurenPrompt = (data: GenericTaibuResponse, question: string) =>
  formatGenericTaibuPrompt(
    '大六壬排盘',
    '请以大六壬体系为基础，重点参考四课三传、天将、课体、神煞与所问事项，判断吉凶、趋势和应期。',
    data,
    question
  );

export const formatTaiyiPrompt = (data: GenericTaibuResponse, question: string) =>
  formatGenericTaibuPrompt(
    '太乙神数排盘',
    '请以太乙神数体系为基础，结合局式、主客、星神、格局信号和所问事项做结构化判断。',
    data,
    question
  );

export const formatXiaoliurenPrompt = (data: GenericTaibuResponse, question: string) =>
  formatGenericTaibuPrompt(
    '小六壬排盘',
    '请以小六壬六宫课体为基础，结合所落宫位、五行属性、诗诀和用户问题做直接判断。',
    data,
    question
  );

export const formatAlmanacPrompt = (data: GenericTaibuResponse, question: string) =>
  formatGenericTaibuPrompt(
    '黄历择日',
    '请结合黄历宜忌、日课干支、神煞、冲煞和用户要做的事情，给出是否适合、注意事项与替代建议。',
    data,
    question
  );

export const formatDailyFortunePrompt = (data: GenericTaibuResponse, question: string) =>
  formatGenericTaibuPrompt(
    '每日运势',
    '请结合命局日主、当日干支和分类运势，给出今日重点、风险提醒和可执行建议，不要输出重要日期提醒。',
    data,
    question
  );

export const formatMonthlyFortunePrompt = (data: GenericTaibuResponse, question: string) =>
  formatGenericTaibuPrompt(
    '每月运势',
    '请结合命局日主、月度趋势和分类运势，给出本月重点、节奏安排和可执行建议，不要输出重要日期提醒。',
    data,
    question
  );
