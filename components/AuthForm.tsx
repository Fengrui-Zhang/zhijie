'use client';

import React, { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

interface AuthFormProps {
  onSuccess: () => void;
  onSkip: () => void;
  registrationEnabled: boolean;
  registrationClosedContact: string;
  guestModeEnabled: boolean;
}

export default function AuthForm({
  onSuccess,
  onSkip,
  registrationEnabled,
  registrationClosedContact,
  guestModeEnabled,
}: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!registrationEnabled && mode === 'register') {
      setMode('login');
      setError('');
    }
  }, [mode, registrationEnabled]);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setCodeCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [codeCooldown]);

  const handleSendCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('请先填写邮箱');
      return;
    }

    setError('');
    setNotice('');
    setCodeSending(true);
    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '验证码发送失败');
        return;
      }
      setVerificationCode('');
      setNotice('验证码已发送，请查看邮箱');
      setCodeCooldown(60);
    } catch {
      setError('验证码发送失败，请稍后重试');
    } finally {
      setCodeSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, code: verificationCode }),
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
            {registrationEnabled && (
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
            )}
          </div>

          {!registrationEnabled && (
            <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs leading-6 text-amber-800">
              注册通道已关闭，若有需要请联系{registrationClosedContact}
            </div>
          )}

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
                onChange={e => {
                  setEmail(e.target.value);
                  if (mode === 'register') {
                    setVerificationCode('');
                    setNotice('');
                  }
                }}
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

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  邮箱验证码
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    inputMode="numeric"
                    pattern="\d{6}"
                    placeholder="6位验证码"
                    className="min-w-0 flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={codeSending || codeCooldown > 0 || !email.trim()}
                    className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
                  >
                    {codeSending ? '发送中' : codeCooldown > 0 ? `${codeCooldown}s` : '发送验证码'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">
                {error}
              </div>
            )}

            {notice && (
              <div className="text-emerald-700 text-sm bg-emerald-50 rounded-lg p-3">
                {notice}
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

          {guestModeEnabled && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                暂不登录，直接使用
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          登录后可保存排盘记录与聊天历史
        </p>
      </div>
    </div>
  );
}
