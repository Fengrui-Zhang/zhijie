'use client';

import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  onDeleted: () => void;
}

export default function AccountSettingsModal({ onClose, onDeleted }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) {
        onDeleted();
      } else {
        const data = await res.json();
        setError(data.error || '注销失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setDeleting(false);
    }
  };

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
          <h3 className="text-sm font-bold text-stone-800">账号设置</h3>
          <button type="button" onClick={onClose} className="glass-chip rounded-full px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-white/70 transition">关闭</button>
        </div>

        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="glass-chip w-full rounded-2xl border border-red-300/70 py-2.5 text-sm text-red-600 hover:bg-red-50/70 transition"
          >
            注销账号
          </button>
        ) : (
          <div className="space-y-3 rounded-[24px] border border-red-200/80 bg-red-50/70 p-4 backdrop-blur-sm">
            <p className="text-xs text-red-700 font-medium">
              注销账号后，所有会话记录、聊天消息和剩余额度将被永久删除，无法恢复。
            </p>
            <p className="text-xs text-red-600">请输入 <strong>确认注销</strong> 以继续：</p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="确认注销"
              className="glass-input w-full rounded-2xl border-red-200/80 px-3 py-2 text-sm outline-none"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="glass-chip flex-1 rounded-2xl py-2 text-sm text-stone-600 hover:bg-white/70 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== '确认注销' || deleting}
                className="glass-chip flex-1 rounded-2xl border border-red-300/70 bg-red-500/90 py-2 text-sm text-white hover:bg-red-600/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '注销中...' : '确认注销'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
