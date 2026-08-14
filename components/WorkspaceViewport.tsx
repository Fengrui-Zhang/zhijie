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
      className={`glass-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto transition-[padding] duration-300 xl:pl-[276px] ${
        isLoggedIn && workspaceView === 'divination'
          ? historyCollapsed ? '2xl:pr-[72px]' : '2xl:pr-[320px]'
          : ''
      }`}
    >
      <div className="mx-auto mt-5 w-full max-w-[1180px] px-3 pb-28 md:px-5 xl:mt-6 xl:pb-8">
        {children}
      </div>
    </main>
  );
}
