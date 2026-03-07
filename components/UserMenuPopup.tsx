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
  onOpenChangePassword: () => void;
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
  onOpenChangePassword,
  onOpenDeleteAccount,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/42 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-sm rounded-[30px] border border-white/55 p-6 space-y-4 shadow-[0_28px_80px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-800">{name || '用户'}</h3>
          <button type="button" onClick={onClose} className="glass-chip rounded-full px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-white/70 transition">
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

        <div className="border-t border-white/50 pt-4 space-y-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="glass-chip w-full py-2.5 rounded-2xl border border-red-300/70 text-red-600 text-sm hover:bg-red-50/70 transition"
            >
              管理系统
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenChangePassword();
            }}
            className="glass-chip w-full py-2.5 rounded-2xl text-stone-600 text-sm hover:bg-white/70 transition"
          >
            修改密码
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="glass-chip w-full py-2.5 rounded-2xl text-stone-600 text-sm hover:bg-white/70 transition"
          >
            退出账号
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDeleteAccount();
            }}
            className="glass-chip w-full py-2.5 rounded-2xl border border-red-300/70 text-red-600 text-sm hover:bg-red-50/70 transition"
          >
            注销账号
          </button>
        </div>
      </div>
    </div>
  );
}
