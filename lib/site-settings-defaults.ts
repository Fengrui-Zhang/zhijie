import updates from '@/data/updates.json';

export interface PublicSiteSettings {
  announcementTitle: string;
  announcementUpdatedAt: string;
  announcementItems: string[];
  announcementContent: string;
  registrationEnabled: boolean;
  registrationClosedContact: string;
  guestModeEnabled: boolean;
}

export const DEFAULT_REGISTRATION_CONTACT = '微信：zixu9498422';

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  announcementTitle: updates.title || '新增功能',
  announcementUpdatedAt: updates.updated_at || '',
  announcementItems: Array.isArray(updates.items) ? updates.items.filter((item): item is string => typeof item === 'string') : [],
  announcementContent: '',
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
  const registrationClosedContact = typeof source.registrationClosedContact === 'string' && source.registrationClosedContact.trim()
    ? source.registrationClosedContact.trim()
    : DEFAULT_SITE_SETTINGS.registrationClosedContact;

  return {
    announcementTitle,
    announcementUpdatedAt,
    announcementItems: normalizeAnnouncementItems(source.announcementItems),
    announcementContent,
    registrationEnabled: typeof source.registrationEnabled === 'boolean'
      ? source.registrationEnabled
      : DEFAULT_SITE_SETTINGS.registrationEnabled,
    registrationClosedContact,
    guestModeEnabled: typeof source.guestModeEnabled === 'boolean'
      ? source.guestModeEnabled
      : DEFAULT_SITE_SETTINGS.guestModeEnabled,
  };
};
