import { ModelType } from '../types';

export type WorkspaceView = 'home' | 'divination' | 'records' | 'chat' | 'settings';
export type SettingsWorkspaceTab = 'profile' | 'general' | 'personalization' | 'charts' | 'knowledge' | 'help' | 'security';

export const MODEL_ROUTES: Partial<Record<ModelType, string>> = {
  [ModelType.BAZI]: '/bazi',
  [ModelType.ZIWEI]: '/ziwei',
  [ModelType.DAILY_FORTUNE]: '/daily',
  [ModelType.MONTHLY_FORTUNE]: '/monthly',
  [ModelType.QIMEN]: '/qimen',
  [ModelType.LIUYAO]: '/liuyao',
  [ModelType.MEIHUA]: '/meihua',
  [ModelType.DALIUREN]: '/daliuren',
  [ModelType.TAIYI]: '/taiyi',
  [ModelType.XIAOLIUREN]: '/xiaoliuren',
  [ModelType.ALMANAC]: '/almanac',
};

export const WORKSPACE_ROUTES: Record<Exclude<WorkspaceView, 'divination'>, string> = {
  home: '/',
  records: '/records',
  chat: '/chat',
  settings: '/settings',
};

export const SETTINGS_TAB_ROUTES: Record<SettingsWorkspaceTab, string> = {
  profile: '/settings/profile',
  general: '/settings/general',
  personalization: '/settings/personalization',
  charts: '/settings/charts',
  knowledge: '/settings/knowledge',
  help: '/settings/help',
  security: '/settings/security',
};

type ParsedAppRoute =
  | { workspace: 'divination'; modelType: ModelType; caseId?: string }
  | { workspace: Exclude<WorkspaceView, 'divination' | 'settings'> }
  | { workspace: 'settings'; settingsTab: SettingsWorkspaceTab };

const ROUTE_MODELS = new Map(
  Object.entries(MODEL_ROUTES)
    .filter((entry): entry is [ModelType, string] => Boolean(entry[1]))
    .map(([modelType, pathname]) => [pathname, modelType])
);

const ROUTE_WORKSPACES = new Map(
  Object.entries(WORKSPACE_ROUTES).map(([workspace, pathname]) => [pathname, workspace as Exclude<WorkspaceView, 'divination'>])
);

const ROUTE_SETTINGS_TABS = new Map(
  Object.entries(SETTINGS_TAB_ROUTES).map(([tab, pathname]) => [pathname, tab as SettingsWorkspaceTab])
);

export const getCaseRoute = (modelType: ModelType, caseId: string) => {
  if (modelType !== ModelType.BAZI && modelType !== ModelType.ZIWEI) return MODEL_ROUTES[modelType] || '/';
  return `${MODEL_ROUTES[modelType]}/${encodeURIComponent(caseId)}`;
};

export const parseAppRoute = (pathname: string): ParsedAppRoute | null => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const caseMatch = normalizedPath.match(/^\/(bazi|ziwei)\/([^/]+)$/);
  if (caseMatch) {
    try {
      return {
        workspace: 'divination',
        modelType: caseMatch[1] === 'bazi' ? ModelType.BAZI : ModelType.ZIWEI,
        caseId: decodeURIComponent(caseMatch[2]),
      };
    } catch {
      return null;
    }
  }

  const settingsTab = ROUTE_SETTINGS_TABS.get(normalizedPath);
  if (settingsTab) return { workspace: 'settings', settingsTab };

  const workspace = ROUTE_WORKSPACES.get(normalizedPath);
  if (workspace === 'settings') return { workspace: 'settings', settingsTab: 'profile' };
  if (workspace) return { workspace };

  const modelType = ROUTE_MODELS.get(normalizedPath);
  return modelType ? { workspace: 'divination', modelType } : null;
};

export const navigateTo = (pathname: string, options?: { replace?: boolean }) => {
  if (typeof window === 'undefined' || window.location.pathname === pathname) return;
  const method = options?.replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', pathname);
};
