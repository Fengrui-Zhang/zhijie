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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-stone-200 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-800">账号设置</h3>
          <button type="button" onClick={onClose} className="text-sm text-stone-400 hover:text-stone-600">关闭</button>
        </div>

        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="w-full py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
          >
            注销账号
          </button>
        ) : (
          <div className="space-y-3 border border-red-200 rounded-lg p-4 bg-red-50">
            <p className="text-xs text-red-700 font-medium">
              注销账号后，所有会话记录、聊天消息和剩余额度将被永久删除，无法恢复。
            </p>
            <p className="text-xs text-red-600">请输入 <strong>确认注销</strong> 以继续：</p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="确认注销"
              className="w-full border border-red-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-300 outline-none"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="flex-1 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== '确认注销' || deleting}
                className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
