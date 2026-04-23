import { prisma } from '@/lib/prisma';
import {
  DEFAULT_SITE_SETTINGS,
  normalizeAnnouncementItems,
  normalizePublicSiteSettings,
  type PublicSiteSettings,
} from '@/lib/site-settings-defaults';

const SITE_SETTINGS_ID = 'global';

type SiteSettingsRecord = {
  id: string;
  announcementTitle: string;
  announcementUpdatedAt: string;
  announcementItems: string[];
  announcementContent: string;
  registrationEnabled: boolean;
  registrationClosedContact: string;
  guestModeEnabled: boolean;
  updatedAt: Date;
};

const toCreateData = () => ({
  id: SITE_SETTINGS_ID,
  announcementTitle: DEFAULT_SITE_SETTINGS.announcementTitle,
  announcementUpdatedAt: DEFAULT_SITE_SETTINGS.announcementUpdatedAt,
  announcementItems: [...DEFAULT_SITE_SETTINGS.announcementItems],
  announcementContent: DEFAULT_SITE_SETTINGS.announcementContent,
  registrationEnabled: DEFAULT_SITE_SETTINGS.registrationEnabled,
  registrationClosedContact: DEFAULT_SITE_SETTINGS.registrationClosedContact,
  guestModeEnabled: DEFAULT_SITE_SETTINGS.guestModeEnabled,
});

export const serializePublicSiteSettings = (
  settings: Partial<SiteSettingsRecord> | null | undefined
): PublicSiteSettings => {
  if (!settings) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  return normalizePublicSiteSettings({
    announcementTitle: settings.announcementTitle,
    announcementUpdatedAt: settings.announcementUpdatedAt,
    announcementItems: settings.announcementItems,
    announcementContent: settings.announcementContent,
    registrationEnabled: settings.registrationEnabled,
    registrationClosedContact: settings.registrationClosedContact,
    guestModeEnabled: settings.guestModeEnabled,
  });
};

export async function getOrCreateSiteSettings() {
  return prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    update: {},
    create: toCreateData(),
  });
}

export async function getPublicSiteSettings() {
  const settings = await getOrCreateSiteSettings();
  return serializePublicSiteSettings(settings);
}

export async function updateSiteSettings(input: PublicSiteSettings) {
  const next = normalizePublicSiteSettings(input);
  const settings = await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    update: {
      announcementTitle: next.announcementTitle,
      announcementUpdatedAt: next.announcementUpdatedAt,
      announcementItems: normalizeAnnouncementItems(next.announcementItems),
      announcementContent: next.announcementContent,
      registrationEnabled: next.registrationEnabled,
      registrationClosedContact: next.registrationClosedContact,
      guestModeEnabled: next.guestModeEnabled,
    },
    create: {
      id: SITE_SETTINGS_ID,
      announcementTitle: next.announcementTitle,
      announcementUpdatedAt: next.announcementUpdatedAt,
      announcementItems: normalizeAnnouncementItems(next.announcementItems),
      announcementContent: next.announcementContent,
      registrationEnabled: next.registrationEnabled,
      registrationClosedContact: next.registrationClosedContact,
      guestModeEnabled: next.guestModeEnabled,
    },
  });

  return serializePublicSiteSettings(settings);
}
