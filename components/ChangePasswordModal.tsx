'use client';

import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ onClose, onSuccess }: Props) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少需要6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || '修改失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
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
          <h3 className="text-sm font-bold text-stone-800">修改密码</h3>
          <button type="button" onClick={onClose} className="glass-chip rounded-full px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-white/70 transition">
            关闭
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => { setOldPassword(e.target.value); setError(''); }}
            placeholder="旧密码"
            className="glass-input w-full rounded-2xl px-3 py-2.5 text-sm outline-none"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
            placeholder="新密码（至少6位）"
            className="glass-input w-full rounded-2xl px-3 py-2.5 text-sm outline-none"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            placeholder="确认新密码"
            className="glass-input w-full rounded-2xl px-3 py-2.5 text-sm outline-none"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="glass-chip flex-1 rounded-2xl py-2.5 text-sm text-stone-600 hover:bg-white/70 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="glass-panel-dark flex-1 rounded-2xl py-2.5 text-sm text-amber-200 hover:brightness-105 disabled:opacity-50"
          >
            {loading ? '提交中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  );
}
