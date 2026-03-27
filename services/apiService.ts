
import { 
  QimenParams, QimenResponse, 
  BaseParams, BaziResponse, 
  ZiweiResponse, MeihuaResponse, LiuyaoResponse,
  ModelType, LiuyaoMode 
} from '../types';

const ENDPOINTS = {
  [ModelType.QIMEN]: "/Liupan/qimendunjia",
  [ModelType.BAZI]: "/Bazi/paipan",
  [ModelType.ZIWEI]: "/Liupan/zwlpan",
  [ModelType.MEIHUA]: "/Liupan/meihua",
  [ModelType.LIUYAO]: "/Liupan/liuyao",
};

/**
 * Generic Fetcher
 * Optimized to use GET instead of POST because many CORS proxies 
 * have difficulty forwarding POST bodies correctly to the destination.
 * Yuanfenju API supports both GET and POST.
 */
async function fetchApi<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  try {
    const response = await fetch('/api/fortune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network Error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    return json.data as T;
  } catch (error: any) {
    console.error(`Fetch error for ${endpoint}:`, error.message);
    throw new Error(error.message || 'Failed to connect to API.');
  }
}

// --- 1. Qimen ---
export const fetchQimen = async (params: QimenParams) => {
  const zhen = params.zhen ?? ((params.province && params.city) ? 1 : 2);
  const juModel = params.ju_model ?? 1;

  const requestPayload: Record<string, string> = {
    type: '1', // Chai Bu
    name: params.name || '匿名',
    sex: params.sex.toString(),
    year: params.year.toString(),
    month: params.month.toString(),
    day: params.day.toString(),
    hours: params.hours.toString(),
    minute: params.minute.toString(),
    lang: 'zh-cn',
    ju_model: juModel.toString(),
    zhen: zhen.toString(),
  };

  if (params.province) requestPayload.province = params.province;
  if (params.city) requestPayload.city = params.city;

  if (params.pan_model !== undefined) {
    requestPayload.pan_model = params.pan_model.toString();
    if (params.pan_model === 0) {
      requestPayload.fei_pan_model = (params.fei_pan_model ?? 1).toString();
    }
  }

  return fetchApi<QimenResponse>(ENDPOINTS[ModelType.QIMEN], requestPayload);
};

// --- 2. Bazi ---
export const fetchBazi = async (params: BaseParams) => {
  const isZhen = (params.province && params.city) ? '1' : '0';

  return fetchApi<BaziResponse>(ENDPOINTS[ModelType.BAZI], {
    type: '1', 
    name: params.name || '匿名',
    sex: params.sex.toString(),
    year: params.year.toString(),
    month: params.month.toString(),
    day: params.day.toString(),
    hours: params.hours.toString(),
    minute: params.minute.toString(),
    zhen: isZhen,
    province: params.province || '',
    city: params.city || ''
  });
};

// --- 3. Ziwei ---
export const fetchZiwei = async (params: BaseParams) => {
  const isZhen = (params.province && params.city) ? '1' : '0';

  return fetchApi<ZiweiResponse>(ENDPOINTS[ModelType.ZIWEI], {
    type: '1',
    name: params.name || '匿名',
    sex: params.sex.toString(),
    year: params.year.toString(),
    month: params.month.toString(),
    day: params.day.toString(),
    hours: params.hours.toString(),
    minute: params.minute.toString(),
    zhen: isZhen,
    province: params.province || '',
    city: params.city || ''
  });
};

const buildModePayload = (params: BaseParams) => {
  const panModel = params.pan_model || LiuyaoMode.AUTO;

  const requestPayload: Record<string, string> = {
    sex: params.sex.toString(),
    born_year: params.born_year ? params.born_year.toString() : '1990',
    pan_model: panModel.toString(),
  };

  if (panModel === LiuyaoMode.CUSTOM_TIME || panModel === LiuyaoMode.LIFETIME) {
    requestPayload.year = params.year.toString();
    requestPayload.month = params.month.toString();
    requestPayload.day = params.day.toString();
    requestPayload.hours = params.hours.toString();
    requestPayload.minute = params.minute.toString();
  }
  else if (panModel === LiuyaoMode.MANUAL) {
    requestPayload.gua_yao1 = (params.gua_yao1 ?? 0).toString();
    requestPayload.gua_yao2 = (params.gua_yao2 ?? 0).toString();
    requestPayload.gua_yao3 = (params.gua_yao3 ?? 0).toString();
    requestPayload.gua_yao4 = (params.gua_yao4 ?? 0).toString();
    requestPayload.gua_yao5 = (params.gua_yao5 ?? 0).toString();
    requestPayload.gua_yao6 = (params.gua_yao6 ?? 0).toString();
  }
  else if (panModel === LiuyaoMode.NUMBER || panModel === LiuyaoMode.SINGLE_NUM) {
    requestPayload.number = (params.number || 0).toString();
    requestPayload.yao_add_time = (params.yao_add_time ?? 0).toString();
  }
  else if (panModel === LiuyaoMode.DOUBLE_NUM) {
    requestPayload.number_up = (params.number_up || 0).toString();
    requestPayload.number_down = (params.number_down || 0).toString();
    requestPayload.yao_add_time = (params.yao_add_time ?? 0).toString();
  }

  return requestPayload;
};

// --- 4. Meihua (All Modes) ---
export const fetchMeihua = async (params: BaseParams) => {
  return await fetchApi<MeihuaResponse>(
    ENDPOINTS[ModelType.MEIHUA],
    buildModePayload(params)
  );
};

// --- 5. Liuyao (All Modes) ---
export const fetchLiuyao = async (params: BaseParams) => {
  return await fetchApi<LiuyaoResponse>(
    ENDPOINTS[ModelType.LIUYAO],
    buildModePayload(params)
  );
};


// --- Prompt Formatters ---

export const formatQimenPrompt = (data: QimenResponse, question: string) => {
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
  const { base_info, detail_info } = data;
  const ming = detail_info.xiantian_info.gong_pan.find(p => p.minggong === '命宫');
  const shen = detail_info.xiantian_info.gong_pan.find(p => p.minggong === '身宫');
  const caibo = detail_info.xiantian_info.gong_pan.find(p => p.minggong === '财帛宫');
  const guanlu = detail_info.xiantian_info.gong_pan.find(p => p.minggong === '官禄宫');
  const qianyi = detail_info.xiantian_info.gong_pan.find(p => p.minggong === '迁移宫');
  const fuqi = detail_info.xiantian_info.gong_pan.find(p => p.minggong === '夫妻宫');

  const fmtPalace = (p: any) => p ? `[${p.minggong}] 主星:${p.ziweixing}(${p.ziweixing_xingyao}), ${p.tianfuxing}(${p.tianfuxing_xingyao})` : '';

  return `
  【紫微斗数排盘】
  命主: ${base_info.name}, 局: ${base_info.mingju}
  命宫: ${base_info.minggong}, 身宫: ${base_info.shengong}
  真太阳时调整: ${base_info.zhen?.shicha || '无'}
  
  重点宫位:
  ${fmtPalace(ming)}
  ${fmtPalace(shen)}
  ${fmtPalace(caibo)}
  ${fmtPalace(guanlu)}
  ${fmtPalace(qianyi)}
  ${fmtPalace(fuqi)}

  请以紫微斗数大师身份，综合分析命身宫及三方四正，论述其天赋、格局高低及人生重点课题。
  `;
};

export const formatMeihuaPrompt = (data: MeihuaResponse, question: string) => {
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
