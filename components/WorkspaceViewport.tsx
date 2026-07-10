import React from 'react';
import type { WorkspaceView } from '../lib/app-routes';

type WorkspaceViewportProps = {
  isLoggedIn: boolean;
  workspaceView: WorkspaceView;
  historyCollapsed: boolean;
  children: React.ReactNode;
};

export default function WorkspaceViewport({
  isLoggedIn,
  workspaceView,
  historyCollapsed,
  children,
}: WorkspaceViewportProps) {
  return (
    <main
      className={`min-h-0 flex-1 overflow-y-auto transition-[padding] duration-300 xl:pl-[260px] ${
        isLoggedIn && workspaceView === 'divination'
          ? historyCollapsed ? '2xl:pr-[72px]' : '2xl:pr-[320px]'
          : ''
      }`}
    >
      <div className="mx-auto mt-6 w-full max-w-[1180px] px-3 pb-24 xl:pb-6">
        {children}
      </div>
    </main>
  );
}
