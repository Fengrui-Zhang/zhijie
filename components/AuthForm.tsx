'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';

interface AuthFormProps {
  onSuccess: () => void;
  onSkip: () => void;
}

export default function AuthForm({ onSuccess, onSkip }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || '注册失败');
          setLoading(false);
          return;
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(mode === 'login' ? '邮箱或密码错误' : '注册成功但自动登录失败，请手动登录');
      } else {
        onSuccess();
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 mb-2">元分 · 智解</h1>
          <p className="text-stone-500 text-sm">AI 命理分析平台</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-stone-200 p-8">
          <div className="flex mb-6 bg-stone-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-white shadow text-stone-800 font-medium'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-white shadow text-stone-800 font-medium'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  显示名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="您的名称"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="至少6位"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              暂不登录，直接使用
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          登录后可保存排盘记录与聊天历史
        </p>
      </div>
    </div>
  );
}
