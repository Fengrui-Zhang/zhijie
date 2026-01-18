
export enum ModelType {
  QIMEN = 'qimen',
  BAZI = 'bazi',
  ZIWEI = 'ziwei',
  MEIHUA = 'meihua',
  LIUYAO = 'liuyao'
}

export enum LiuyaoMode {
  AUTO = 1,       // 自动起卦 (Current Time)
  CUSTOM_TIME = 2,// 自选时间
  LIFETIME = 3,   // 终身卦
  MANUAL = 4,     // 手工指定 (Manual Lines)
  NUMBER = 5,     // 数字起卦
  SINGLE_NUM = 6, // 单数起卦
  DOUBLE_NUM = 7  // 双数起卦
}

export interface BaseParams {
  year: number;
  month: number;
  day: number;
  hours: number;
  minute: number;
  sex: number; // 0 male, 1 female
  name?: string;
  born_year?: number;
  province?: string;
  city?: string;
  
  // Liuyao Specifics
  pan_model?: number;
  yao_add_time?: number; // 0 or 1
  
  // Manual Lines (Mode 4)
  // 0: 少阴 (Young Yin), 1: 少阳 (Young Yang), 2: 老阴 (Old Yin), 3: 老阳 (Old Yang)
  gua_yao1?: number;
  gua_yao2?: number;
  gua_yao3?: number;
  gua_yao4?: number;
  gua_yao5?: number;
  gua_yao6?: number;

  // Numbers (Mode 5, 6, 7)
  number?: number;
  number_up?: number;
  number_down?: number;
}

export interface QimenParams extends BaseParams {
  question: string;
}

// --- Qimen Types ---
export interface PalaceData {
  name: string;
  index: number;
  gong_pan_index: number;
  tianpan: { jiuxing: string; sanqiliuyi: string; jiuxing_tianqin_sanqiliuyi?: string; };
  dipan: { sanqiliuyi: string; jiuxing_tianqin_sanqiliuyi?: string; };
  renpan: { bamen: string; };
  shenpan: { bashen: string; };
  description: { luo_gong_desc: string; };
  is_kongwang: boolean | number | string;
  is_maxing: boolean | number | string;
}

export interface QimenResponse {
  gongli: string;
  nongli: string;
  sizhu_info: {
    year_gan: string; year_zhi: string;
    month_gan: string; month_zhi: string;
    day_gan: string; day_zhi: string;
    hour_gan: string; hour_zhi: string;
  };
  dunju: string;
  xunshou: string;
  zhifu_info: {
    zhifu_name: string; zhifu_luogong: string;
    zhishi_name: string; zhishi_luogong: string;
  };
  xunkong_info: {
    year_xunkong: string; month_xunkong: string;
    day_xunkong: string; hour_xunkong: string;
  };
  gong_pan: any[];
}

// --- Bazi Types ---
export interface BaziResponse {
  base_info: {
    sex: string;
    name: string;
    gongli: string;
    nongli: string;
    qiyun: string;
    jiaoyun: string;
    zhengge: string;
    zhen?: {
      city: string;
      shicha: string;
    };
  };
  bazi_info: {
    kw: string; // Empty Void
    tg_cg_god: string[]; // Ten Gods (Heavenly Stems)
    bazi: string[]; // [Year, Month, Day, Hour] Pillars
    dz_cg: string[]; // Hidden Stems
    day_cs: string[]; // 12 Life Stages
    na_yin: string[]; // Na Yin
  };
  dayun_info: {
    big_god: string[]; // Dayun Gods
    big: string[]; // Dayun Pillars
    big_start_year: number[];
    big_end_year: number[];
    xu_sui: number[];
  };
  detail_info: {
    sizhu: {
      year: { tg: string; dz: string; };
      month: { tg: string; dz: string; };
      day: { tg: string; dz: string; };
      hour: { tg: string; dz: string; };
    };
    shensha: {
      year: string;
      month: string;
      day: string;
      hour: string;
    };
    zhuxing?: {
      day: string;
      [key: string]: any;
    };
  };
}

// --- Ziwei Types ---
export interface ZiweiStar {
  name: string;
  brightness?: string; // e.g. 陷, 平, 庙
  type?: 'main' | 'bad' | 'good' | 'aux'; 
}

export interface ZiweiPalace {
  minggong: string; // Palace Name (e.g. 迁移宫)
  yinshou: string; // Heavenly Stem/Branch of palace (e.g. 癸亥)
  ziweixing: string; // Main Star 1
  ziweixing_xingyao: string; // Brightness
  tianfuxing: string; // Main Star 2
  tianfuxing_xingyao: string;
  // We will flatten other stars in the UI logic or map them dynamically
  // The API returns distinct fields for stars like hourxing, monthxing, etc.
  [key: string]: any; 
  liunian_age_str?: string;
  daxian?: string; // Age range
}

export interface ZiweiResponse {
  base_info: {
    sex: string;
    name: string;
    gongli: string;
    nongli: string;
    minggong: string; // Life Palace Branch
    shengong: string; // Body Palace Branch
    mingju: string; // Element
    mingzhu: string;
    shenzhu: string;
    zhen?: {
      city: string;
      shicha: string;
    };
  };
  detail_info: {
    xiantian_info: {
      gong_pan: ZiweiPalace[];
    };
  };
}

// --- Meihua Types ---
export interface GuaDetails {
  gua_name: string;
  gua_mark: string; // Binary string e.g. "010001"
  gua_qian: string; // Poem
  gua_qian_desc: string; // Meaning
  gua_description: {
    gua_shiye: string;
    gua_jingshang: string;
    gua_hunlian: string;
    gua_juece: string;
    [key: string]: string;
  };
  gua_xiongji: string; // Auspiciousness
}

export interface MeihuaResponse {
  gongli: string;
  nongli: string;
  sizhu_info: {
    year_gan: string; year_zhi: string;
    month_gan: string; month_zhi: string;
    day_gan: string; day_zhi: string;
    hour_gan: string; hour_zhi: string;
  };
  gua_info: {
    bengua: GuaDetails;
    hugua: GuaDetails;
    biangua: GuaDetails;
    cuogua: GuaDetails;
    zonggua: GuaDetails;
  };
  has_biangua: string;
  dongyao: string; // Moving line string e.g. "1,6"
}

// --- Liuyao Types ---
export interface LiuyaoGuaInfo {
  gua_name: string;
  gua_gong: string;
  gua_mark: string;
  gua_qian: string;
  gua_qian_desc: string;
  gua_xiongji: string;
  gua_description: {
    gua_shiye: string;
    gua_jingshang: string;
    gua_hunlian: string;
    gua_juece: string;
    [key: string]: string;
  };
  gua_yao_info: {
    liuqin: Record<string, string>; // "gua_yao1" -> "父母丙辰土"
    shiying: {
      shi_yao_position: string;
      ying_yao_position: string;
    };
    liushen: Record<string, string>; // "gua_yao1" -> "勾陈" (Only present in Bengua)
    fushen?: {
      has_fushen: string;
      fushen_arr: Array<{
        fushen: string;
        fushen_yao_position: string;
      }>;
    };
  };
}

export interface ShenshaInfo {
  yima: string;
  taohua: string;
  guiren: string;
  rilu: string;
}

export interface LiuyaoResponse {
  sex: string;
  model: string;
  gongli: string;
  nongli: string;
  nianming: string;
  has_biangua: string;
  dongyao: string;
  guashen: string;
  kongwang: string;
  shensha_info: ShenshaInfo;
  sizhu_info: {
    year_gan: string; year_zhi: string;
    month_gan: string; month_zhi: string;
    day_gan: string; day_zhi: string;
    hour_gan: string; hour_zhi: string;
  };
  gua_info: {
    bengua: LiuyaoGuaInfo;
    biangua?: LiuyaoGuaInfo;
  };
}
