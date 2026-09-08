/** Static explanations shared by the overview and character inspector. */
export const tenGodKnowledge: Record<string, {
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
