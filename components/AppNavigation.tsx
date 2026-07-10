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

const navButtonClass = (selected: boolean) => `flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
  selected
    ? 'glass-panel-dark border-transparent text-amber-200 shadow-sm'
    : 'border-stone-100 bg-white/60 text-stone-700 hover:bg-white hover:text-stone-900'
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
      className={`${mobile ? 'mb-4' : 'h-[calc(100vh-97px)] w-[236px]'} glass-panel-soft flex flex-col rounded-2xl border border-stone-100/80 p-4 shadow-sm`}
      aria-label="功能导航"
    >
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">功能</div>
        <div className="mt-1 text-lg font-bold text-stone-800">元分 · 智解</div>
      </div>

      <button type="button" onClick={() => selectWorkspace('home')} className={`${navButtonClass(workspaceView === 'home')} mb-4`}>
        <span>首页</span><span>›</span>
      </button>

      <div className={mobile ? 'grid gap-3 md:grid-cols-3' : 'min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'}>
        <NavGroup label="常用任务">
          {COMMON_TASKS.map(([type, label]) => {
            const selected = workspaceView === 'divination' && modelType === type && !professionalSelectedProject;
            return <NavButton key={type} label={label} selected={selected} onClick={() => selectModel(type)} />;
          })}
        </NavGroup>

        <div className="space-y-2">
          <button type="button" onClick={onToggleProfessional} className="flex w-full items-center justify-between px-2 text-xs font-bold tracking-[0.18em] text-stone-400">
            <span>专业工具</span><span>{professionalOpen ? '−' : '+'}</span>
          </button>
          {professionalOpen && (
            <div className="space-y-2">
              {PROFESSIONAL_TOOLS.map(([type, label]) => {
                const selected = workspaceView === 'divination' && modelType === type && !professionalSelectedProject;
                return <NavButton key={type} label={label} selected={selected} onClick={() => selectModel(type)} />;
              })}
            </div>
          )}
        </div>

        <NavGroup label="择日工具">
          <NavButton
            label="黄历/择日"
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
            <NavButton key={view} label={label} selected={workspaceView === view} onClick={() => selectWorkspace(view)} />
          ))}
        </NavGroup>
      </div>
    </nav>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="px-2 text-xs font-bold tracking-[0.18em] text-stone-400">{label}</div>
      {children}
    </div>
  );
}

function NavButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={navButtonClass(selected)}>
      <span>{label}</span><span className={selected ? 'text-amber-200' : 'text-stone-300'}>›</span>
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
    <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-2xl border border-stone-100 bg-white/86 p-2 shadow-lg shadow-stone-900/10 backdrop-blur-xl xl:hidden" aria-label="移动端主导航">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${allItems.length}, minmax(0, 1fr))` }}>
        {allItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`rounded-2xl px-2 py-2 text-xs font-bold transition ${item.active ? 'bg-stone-900 text-amber-200 shadow-sm' : 'text-stone-500 hover:bg-white/70 hover:text-stone-900'}`}
          >
            <span className="block">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
