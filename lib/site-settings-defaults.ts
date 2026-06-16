import updates from '@/data/updates.json';

export interface PublicSiteSettings {
  announcementTitle: string;
  announcementUpdatedAt: string;
  announcementItems: string[];
  announcementContent: string;
  welcomeIntro: string;
  registrationEnabled: boolean;
  registrationClosedContact: string;
  guestModeEnabled: boolean;
}

export const DEFAULT_REGISTRATION_CONTACT = '微信：zixu9498422';
export const DEFAULT_WELCOME_INTRO = [
  '融合 Taibu 本地排盘算法，排盘信息完整准确，减少人工换算误差。',
  '参考四柱八字与奇门遁甲古籍资料，断卦有依据，判断更可靠。',
  '专业优化 AI 提示词，提问更简单，回答更精准。',
  '新注册用户默认 15 次提问额度；每日 8:00 会将低于 3 次的账号补足至 3 次。访客排盘不消耗次数，AI 解读与追问受访客额度限制。',
].join('\n');

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  announcementTitle: updates.title || '功能介绍',
  announcementUpdatedAt: updates.updated_at || '',
  announcementItems: Array.isArray(updates.items) ? updates.items.filter((item): item is string => typeof item === 'string') : [],
  announcementContent: '',
  welcomeIntro: DEFAULT_WELCOME_INTRO,
  registrationEnabled: true,
  registrationClosedContact: DEFAULT_REGISTRATION_CONTACT,
  guestModeEnabled: true,
};

export const normalizeAnnouncementItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [...DEFAULT_SITE_SETTINGS.announcementItems];

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

export const normalizePublicSiteSettings = (value: unknown): PublicSiteSettings => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  const source = value as Partial<PublicSiteSettings>;
  const announcementTitle = typeof source.announcementTitle === 'string' && source.announcementTitle.trim()
    ? source.announcementTitle.trim()
    : DEFAULT_SITE_SETTINGS.announcementTitle;
  const announcementUpdatedAt = typeof source.announcementUpdatedAt === 'string' && source.announcementUpdatedAt.trim()
    ? source.announcementUpdatedAt.trim()
    : DEFAULT_SITE_SETTINGS.announcementUpdatedAt;
  const announcementContent = typeof source.announcementContent === 'string'
    ? source.announcementContent.trim()
    : DEFAULT_SITE_SETTINGS.announcementContent;
  const welcomeIntro = typeof source.welcomeIntro === 'string' && source.welcomeIntro.trim()
    ? source.welcomeIntro.trim()
    : DEFAULT_SITE_SETTINGS.welcomeIntro;
  const registrationClosedContact = typeof source.registrationClosedContact === 'string' && source.registrationClosedContact.trim()
    ? source.registrationClosedContact.trim()
    : DEFAULT_SITE_SETTINGS.registrationClosedContact;

  return {
    announcementTitle,
    announcementUpdatedAt,
    announcementItems: normalizeAnnouncementItems(source.announcementItems),
    announcementContent,
    welcomeIntro,
    registrationEnabled: typeof source.registrationEnabled === 'boolean'
      ? source.registrationEnabled
      : DEFAULT_SITE_SETTINGS.registrationEnabled,
    registrationClosedContact,
    guestModeEnabled: typeof source.guestModeEnabled === 'boolean'
      ? source.guestModeEnabled
      : DEFAULT_SITE_SETTINGS.guestModeEnabled,
  };
};
