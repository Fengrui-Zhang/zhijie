import React from 'react';
import { ModelType } from '../types';
import {
  PROFESSIONAL_FEATURE_BAZI_COMPAT,
  PROFESSIONAL_FEATURE_JOINT,
} from '../lib/professional-features';
import type { WorkspaceView } from '../lib/app-routes';

type AppNavigationProps = {
  mobile?: boolean;
  workspaceView: WorkspaceView;
  modelType: ModelType;
  professionalSelectedProject: string | null;
  professionalOpen: boolean;
  onToggleProfessional: () => void;
  onModelChange: (modelType: ModelType) => void;
  onProfessionalFeature: (feature: string) => void;
  onWorkspaceChange: (workspace: Exclude<WorkspaceView, 'divination'>) => void;
  onMobileClose?: () => void;
};

const COMMON_TASKS: Array<[ModelType, string]> = [
  [ModelType.BAZI, '四柱八字'],
  [ModelType.ZIWEI, '紫微斗数'],
  [ModelType.DAILY_FORTUNE, '每日运势'],
  [ModelType.MONTHLY_FORTUNE, '每月运势'],
];

const PROFESSIONAL_TOOLS: Array<[ModelType, string]> = [
  [ModelType.QIMEN, '奇门遁甲'],
  [ModelType.LIUYAO, '六爻纳甲'],
  [ModelType.MEIHUA, '梅花易数'],
  [ModelType.DALIUREN, '大六壬'],
  [ModelType.TAIYI, '太乙神数'],
  [ModelType.XIAOLIUREN, '小六壬'],
];

const WORKSPACES: Array<[Exclude<WorkspaceView, 'divination' | 'home'>, string]> = [
  ['records', '分析记录'],
  ['chat', '问智解'],
  ['settings', '设置'],
];

type NavIconName = 'home' | 'bazi' | 'ziwei' | 'sun' | 'moon' | 'qimen' | 'liuyao' | 'meihua' | 'daliuren' | 'taiyi' | 'xiaoliuren' | 'calendar' | 'joint' | 'compatibility' | 'records' | 'chat' | 'settings';

const NAV_ICONS: Record<string, NavIconName> = {
  [ModelType.BAZI]: 'bazi', [ModelType.ZIWEI]: 'ziwei', [ModelType.DAILY_FORTUNE]: 'sun',
  [ModelType.MONTHLY_FORTUNE]: 'moon', [ModelType.QIMEN]: 'qimen', [ModelType.LIUYAO]: 'liuyao',
  [ModelType.MEIHUA]: 'meihua', [ModelType.DALIUREN]: 'daliuren', [ModelType.TAIYI]: 'taiyi',
  [ModelType.XIAOLIUREN]: 'xiaoliuren', [ModelType.ALMANAC]: 'calendar',
  [PROFESSIONAL_FEATURE_JOINT]: 'joint', [PROFESSIONAL_FEATURE_BAZI_COMPAT]: 'compatibility',
  records: 'records', chat: 'chat', settings: 'settings', home: 'home',
};

const NavIcon = ({ name }: { name: NavIconName }) => {
  const paths: Record<NavIconName, React.ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5" /><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>,
    bazi: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
    ziwei: <><circle cx="12" cy="12" r="8.5" /><path d="m12 6 1.4 3.2 3.5.3-2.7 2.3.8 3.4-3-1.8-3 1.8.8-3.4-2.7-2.3 3.5-.3L12 6Z" /></>,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" /></>,
    moon: <path d="M19.5 15.2A8.5 8.5 0 0 1 8.8 4.5a8.5 8.5 0 1 0 10.7 10.7Z" />,
    qimen: <><path d="M5 5h5M14 5h5M5 9h14M5 15h14M5 19h5M14 19h5" /></>,
    liuyao: <><path d="M5 4h14M5 7h5M14 7h5M5 10h14M5 14h5M14 14h5M5 17h14M5 20h5M14 20h5" /></>,
    meihua: <><path d="M12 21v-8" /><path d="M12 13C4 13 4 5 8 4c3-.7 4 2.5 4 5 0-5 7-6 8-2 1 4-4 6-8 6Z" /></>,
    daliuren: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></>,
    taiyi: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /><path d="M12 3.5v5.5M12 15v5.5M3.5 12H9M15 12h5.5" /></>,
    xiaoliuren: <><path d="M7 4h10l3 8-8 8-8-8 3-8Z" /><path d="M8 9h8M9.5 13h5" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17M8 14h3M14 14h2M8 18h3" /></>,
    joint: <><circle cx="8" cy="12" r="4.5" /><circle cx="16" cy="12" r="4.5" /></>,
    compatibility: <><path d="M12 20S4 15.6 4 9.4A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.4C20 15.6 12 20 12 20Z" /></>,
    records: <><path d="M6 3.5h9l3 3V21H6z" /><path d="M15 3.5V7h3M9 11h6M9 15h6" /></>,
    chat: <><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7 2-.7Z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

const navButtonClass = (selected: boolean) => `group flex min-h-11 w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left text-sm font-semibold ${
  selected
    ? 'border-white/10 bg-stone-900/90 text-amber-100 shadow-[0_8px_22px_rgba(28,25,23,0.16)]'
    : 'border-transparent text-stone-600 hover:bg-white/65 hover:text-stone-900'
}`;

export function AppNavigation({
  mobile = false,
  workspaceView,
  modelType,
  professionalSelectedProject,
  professionalOpen,
  onToggleProfessional,
  onModelChange,
  onProfessionalFeature,
  onWorkspaceChange,
  onMobileClose,
}: AppNavigationProps) {
  const finishMobileAction = () => {
    if (mobile) onMobileClose?.();
  };

  const selectModel = (type: ModelType) => {
    onModelChange(type);
    finishMobileAction();
  };

  const selectWorkspace = (view: Exclude<WorkspaceView, 'divination'>) => {
    onWorkspaceChange(view);
    finishMobileAction();
  };

  return (
    <nav
      className={mobile
        ? 'flex flex-col px-1 pb-2'
        : 'glass-panel-soft flex h-[calc(100vh-92px)] w-[252px] flex-col rounded-[24px] border border-white/70 p-3'}
      aria-label="功能导航"
    >
      <div className="mb-3 px-2 pt-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">工作台</div>
      </div>

      <button type="button" onClick={() => selectWorkspace('home')} className={`${navButtonClass(workspaceView === 'home')} mb-3`} aria-current={workspaceView === 'home' ? 'page' : undefined}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${workspaceView === 'home' ? 'bg-white/10' : 'bg-white/55 text-stone-500'}`}><NavIcon name="home" /></span>
        <span className="flex-1">首页</span><span className="text-stone-400">›</span>
      </button>

      <div className={mobile ? 'grid gap-4 md:grid-cols-3' : 'glass-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'}>
        <NavGroup label="命理运势">
          {COMMON_TASKS.map(([type, label]) => {
            const selected = workspaceView === 'divination' && modelType === type && !professionalSelectedProject;
            return <NavButton key={type} icon={NAV_ICONS[type]} label={label} selected={selected} onClick={() => selectModel(type)} />;
          })}
        </NavGroup>

        <div className="space-y-2">
          <button type="button" onClick={onToggleProfessional} aria-expanded={professionalOpen} className="flex min-h-8 w-full items-center justify-between rounded-lg px-2 text-[11px] font-bold tracking-[0.16em] text-stone-400 hover:bg-white/40 hover:text-stone-600">
            <span>预测占卜</span><span className={`text-base font-normal transition-transform ${professionalOpen ? 'rotate-45' : ''}`}>+</span>
          </button>
          {professionalOpen && (
            <div className="materialize-in space-y-1">
              {PROFESSIONAL_TOOLS.map(([type, label]) => {
                const selected = workspaceView === 'divination' && modelType === type && !professionalSelectedProject;
                return <NavButton key={type} icon={NAV_ICONS[type]} label={label} selected={selected} onClick={() => selectModel(type)} />;
              })}
            </div>
          )}
        </div>

        <NavGroup label="择日工具">
          <NavButton
            label="黄历/择日"
            icon="calendar"
            selected={workspaceView === 'divination' && modelType === ModelType.ALMANAC && !professionalSelectedProject}
            onClick={() => selectModel(ModelType.ALMANAC)}
          />
        </NavGroup>

        {professionalOpen && (
          <NavGroup label="进阶功能">
            {[
              [PROFESSIONAL_FEATURE_JOINT, '八字+紫微联合分析'],
              [PROFESSIONAL_FEATURE_BAZI_COMPAT, '八字合盘'],
            ].map(([feature, label]) => (
              <NavButton
                key={feature}
                icon={NAV_ICONS[feature]}
                label={label}
                selected={professionalSelectedProject === feature}
                onClick={() => {
                  onProfessionalFeature(feature);
                  finishMobileAction();
                }}
              />
            ))}
          </NavGroup>
        )}

        <NavGroup label="工作区">
          {WORKSPACES.map(([view, label]) => (
            <NavButton key={view} icon={NAV_ICONS[view]} label={label} selected={workspaceView === view} onClick={() => selectWorkspace(view)} />
          ))}
        </NavGroup>
      </div>
    </nav>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="px-2 pb-0.5 text-[11px] font-bold tracking-[0.16em] text-stone-400">{label}</div>
      {children}
    </div>
  );
}

function NavButton({ icon, label, selected, onClick }: { icon: NavIconName; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={navButtonClass(selected)} aria-current={selected ? 'page' : undefined}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${selected ? 'bg-white/10 text-amber-100' : 'bg-white/55 text-stone-500 group-hover:text-stone-800'}`}><NavIcon name={icon} /></span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className={selected ? 'text-amber-200/75' : 'text-stone-300'}>›</span>
    </button>
  );
}

type MobileBottomNavigationProps = {
  items: Array<{ id: string; label: string; active: boolean; onClick: () => void }>;
  moreActive: boolean;
  onMore: () => void;
};

export function MobileBottomNavigation({ items, moreActive, onMore }: MobileBottomNavigationProps) {
  const allItems = [...items, { id: 'more-bottom', label: '更多', active: moreActive, onClick: onMore }];
  return (
    <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-[22px] border border-white/80 bg-white/88 p-1.5 shadow-[0_18px_50px_rgba(28,25,23,0.16)] backdrop-blur-2xl xl:hidden" aria-label="移动端主导航">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${allItems.length}, minmax(0, 1fr))` }}>
        {allItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            aria-current={item.active ? 'page' : undefined}
            className={`rounded-[16px] px-1.5 py-2 text-[11px] font-bold ${item.active ? 'bg-stone-900 text-amber-100 shadow-sm' : 'text-stone-500 hover:bg-white/70 hover:text-stone-900'}`}
          >
            <span className="block">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
