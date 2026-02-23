'use client';

import React from 'react';

interface Props {
  email: string | null | undefined;
  name: string | null | undefined;
  quota: number | null;
  isAdmin: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenDeleteAccount: () => void;
}

export default function UserMenuPopup({
  email,
  name,
  quota,
  isAdmin,
  onClose,
  onLogout,
  onOpenAdmin,
  onOpenDeleteAccount,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-stone-200 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-800">{name || '用户'}</h3>
          <button type="button" onClick={onClose} className="text-sm text-stone-400 hover:text-stone-600">
            关闭
          </button>
        </div>

        <div className="space-y-2 text-sm text-stone-600">
          <div>
            <span className="text-stone-400">邮箱</span>
            <span className="ml-2">{email || '—'}</span>
          </div>
          <div>
            <span className="text-stone-400">额度</span>
            <span className="ml-2">{quota !== null ? quota : '—'}</span>
          </div>
        </div>

        <div className="border-t border-stone-100 pt-4 space-y-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="w-full py-2 rounded-lg border border-red-500/60 text-red-600 text-sm hover:bg-red-50 transition"
            >
              管理系统
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 transition"
          >
            退出账号
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDeleteAccount();
            }}
            className="w-full py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
          >
            注销账号
          </button>
        </div>
      </div>
    </div>
  );
}
