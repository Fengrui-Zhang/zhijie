'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_SITE_SETTINGS,
  type PublicSiteSettings,
} from '@/lib/site-settings-defaults';
import DialogPortal, { DialogBody } from './DialogPortal';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  quota: number;
  createdAt: string;
  _count: { sessions: number };
}

interface SessionItem {
  id: string;
  modelType: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface MessageItem {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Props {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuota, setEditQuota] = useState('');
  const [error, setError] = useState('');

  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [detailSessions, setDetailSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [plainPasswordCache, setPlainPasswordCache] = useState<Record<string, string>>({});
  const [revealPasswordId, setRevealPasswordId] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<PublicSiteSettings>(DEFAULT_SITE_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSavedAt, setSettingsSavedAt] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        setUsers(await res.json());
      } else {
        setError('加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const fetchSiteSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/site-settings');
      if (res.ok) {
        const data = await res.json();
        setSiteSettings({
          ...DEFAULT_SITE_SETTINGS,
          ...data,
          announcementItems: Array.isArray(data.announcementItems) ? data.announcementItems : DEFAULT_SITE_SETTINGS.announcementItems,
        });
        setSettingsError('');
      } else {
        setSettingsError('站点配置加载失败');
      }
    } catch {
      setSettingsError('站点配置加载失败');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteSettings();
  }, [fetchSiteSettings]);

  const fetchDetailSessions = useCallback(async (userId: string) => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions`);
      if (res.ok) {
        setDetailSessions(await res.json());
        setSelectedSessionId(null);
        setMessages([]);
      }
    } catch {
      setDetailSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/messages`);
      if (res.ok) {
        setMessages(await res.json());
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailUser) {
      fetchDetailSessions(detailUser.id);
    }
  }, [detailUser, fetchDetailSessions]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchMessages(selectedSessionId);
    } else {
      setMessages([]);
    }
  }, [selectedSessionId, fetchMessages]);

  const handleUpdateQuota = async (id: string) => {
    const quota = parseInt(editQuota, 10);
    if (isNaN(quota) || quota < 0) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quota }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, quota } : u));
        if (detailUser?.id === id) setDetailUser(prev => prev ? { ...prev, quota } : null);
        setEditingId(null);
      }
    } catch { /* ignore */ }
  };

  const handleChangePassword = async (id: string) => {
    const pwd = newPassword.trim();
    if (pwd.length < 6) {
      setPasswordError('密码至少需要6位');
      return;
    }
    setPasswordError('');
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        setPlainPasswordCache(prev => ({ ...prev, [id]: pwd }));
        setShowPasswordModal(false);
        setNewPassword('');
      } else {
        const data = await res.json();
        setPasswordError(data.error || '修改失败');
      }
    } catch {
      setPasswordError('网络错误');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch { /* ignore */ }
  };

  const handleAddUser = async () => {
    const name = addName.trim();
    const email = addEmail.trim();
    const password = addPassword.trim();
    if (!name || !email || !password) {
      setAddError('请填写昵称、邮箱和密码');
      return;
    }
    if (password.length < 6) {
      setAddError('密码至少需要6位');
      return;
    }
    setAddError('');
    setAddLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        const { plainPassword, ...userData } = data;
        if (plainPassword) {
          setPlainPasswordCache(prev => ({ ...prev, [data.id]: plainPassword }));
        }
        setUsers(prev => [{ ...userData, _count: { sessions: 0 } }, ...prev]);
        setAddName('');
        setAddEmail('');
        setAddPassword('');
      } else {
        setAddError(data.error || '添加失败');
      }
    } catch {
      setAddError('网络错误');
    } finally {
      setAddLoading(false);
    }
  };

  const handleCopyAccount = async (user: UserRow) => {
    const pwd = plainPasswordCache[user.id] || '';
    const text = `用户名：${user.name}\n邮箱：${user.email}\n密码：${pwd}\n额度：${user.quota}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError('复制失败');
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`确定删除用户 ${email}？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        if (detailUser?.id === id) setDetailUser(null);
      }
    } catch { /* ignore */ }
  };

  const handleAnnouncementItemChange = (index: number, value: string) => {
    setSiteSettings((current) => ({
      ...current,
      announcementItems: current.announcementItems.map((item, itemIndex) => (
        itemIndex === index ? value : item
      )),
    }));
  };

  const handleAddAnnouncementItem = () => {
    setSiteSettings((current) => ({
      ...current,
      announcementItems: [...current.announcementItems, ''],
    }));
  };

  const handleRemoveAnnouncementItem = (index: number) => {
    setSiteSettings((current) => {
      const nextItems = current.announcementItems.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        announcementItems: nextItems.length > 0 ? nextItems : [''],
      };
    });
  };

  const handleSaveSiteSettings = async () => {
    setSettingsSaving(true);
    setSettingsError('');
    try {
      const payload: PublicSiteSettings = {
        ...siteSettings,
        announcementTitle: siteSettings.announcementTitle.trim() || DEFAULT_SITE_SETTINGS.announcementTitle,
        announcementUpdatedAt: siteSettings.announcementUpdatedAt.trim() || DEFAULT_SITE_SETTINGS.announcementUpdatedAt,
        announcementItems: siteSettings.announcementItems.map((item) => item.trim()).filter(Boolean),
        announcementContent: siteSettings.announcementContent.trim(),
        welcomeIntro: siteSettings.welcomeIntro.trim() || DEFAULT_SITE_SETTINGS.welcomeIntro,
        registrationClosedContact: siteSettings.registrationClosedContact.trim() || DEFAULT_SITE_SETTINGS.registrationClosedContact,
      };
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsError(data.error || '保存站点配置失败');
        return;
      }
      setSiteSettings({
        ...DEFAULT_SITE_SETTINGS,
        ...data,
        announcementItems: Array.isArray(data.announcementItems) ? data.announcementItems : DEFAULT_SITE_SETTINGS.announcementItems,
      });
      setSettingsSavedAt(new Date().toLocaleString('zh-CN', { hour12: false }));
    } catch {
      setSettingsError('保存站点配置失败');
    } finally {
      setSettingsSaving(false);
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-shell relative min-h-screen overflow-x-hidden font-serif text-stone-800">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.82))]" />
      <div className="pointer-events-none absolute left-[-14%] top-[6%] -z-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.12),rgba(255,255,255,0)_72%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-10%] top-[28%] -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,0.1),rgba(255,255,255,0)_72%)] blur-3xl" />
      <div className="pointer-events-none absolute left-[18%] bottom-[10%] -z-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(226,232,240,0.14),rgba(255,255,255,0)_72%)] blur-3xl" />

      <header className="glass-topbar sticky top-0 z-20 border-b border-amber-500/35 px-4 py-4 text-stone-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-stone-600/70 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-400 hover:text-white"
            >
              ← 返回
            </button>
            <h1 className="text-lg font-bold tracking-wider">管理系统</h1>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
            共 {users.length} 位用户
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="glass-panel-soft mb-4 rounded-[24px] border border-red-200/70 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="glass-panel-soft mb-4 rounded-[28px] border border-white/60 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-800">公告编辑</h3>
              <p className="mt-1 text-xs text-stone-500">维护站点公告内容，供后续公告入口使用。</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              {settingsSavedAt && <span>已保存：{settingsSavedAt}</span>}
              <button
                type="button"
                onClick={() => void fetchSiteSettings()}
                className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
              >
                刷新
              </button>
            </div>
          </div>

          {settingsError && (
            <div className="mt-3 rounded-2xl border border-red-200/70 bg-red-50/70 px-4 py-3 text-xs text-red-700">
              {settingsError}
            </div>
          )}

          {settingsLoading ? (
            <p className="mt-4 text-sm text-stone-500">站点配置加载中...</p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                      公告标题
                    </label>
                    <input
                      type="text"
                      value={siteSettings.announcementTitle}
                      onChange={(e) => setSiteSettings((current) => ({ ...current, announcementTitle: e.target.value }))}
                      className="glass-input w-full rounded-2xl px-3 py-2 text-sm outline-none"
                      placeholder="站点公告"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                      更新时间
                    </label>
                    <input
                      type="text"
                      value={siteSettings.announcementUpdatedAt}
                      onChange={(e) => setSiteSettings((current) => ({ ...current, announcementUpdatedAt: e.target.value }))}
                      className="glass-input w-full rounded-2xl px-3 py-2 text-sm outline-none"
                      placeholder="2026.04"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                      公告条目
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAnnouncementItem}
                      className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                    >
                      新增条目
                    </button>
                  </div>
                  <div className="space-y-2">
                    {siteSettings.announcementItems.map((item, index) => (
                      <div key={`announcement-item-${index}`} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleAnnouncementItemChange(index, e.target.value)}
                          className="glass-input flex-1 rounded-2xl px-3 py-2 text-sm outline-none"
                          placeholder={`条目 ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAnnouncementItem(index)}
                          className="glass-chip rounded-full px-3 py-1.5 text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                    补充正文
                  </label>
                  <textarea
                    value={siteSettings.announcementContent}
                    onChange={(e) => setSiteSettings((current) => ({ ...current, announcementContent: e.target.value }))}
                    className="glass-input min-h-[160px] w-full rounded-[24px] px-4 py-3 text-sm leading-7 outline-none"
                    placeholder="可选，用于补充更完整的公告说明。"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-panel-soft rounded-[24px] border border-white/60 p-4">
                  <h4 className="text-sm font-bold text-stone-800">功能控制</h4>
                  <p className="mt-1 text-xs text-stone-500">控制注册与访客模式是否对前台开放。</p>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                      首页介绍
                    </label>
                    <textarea
                      value={siteSettings.welcomeIntro}
                      onChange={(e) => setSiteSettings((current) => ({ ...current, welcomeIntro: e.target.value }))}
                      className="glass-input min-h-[180px] w-full rounded-[22px] px-4 py-3 text-sm leading-7 outline-none"
                      placeholder={DEFAULT_SITE_SETTINGS.welcomeIntro}
                    />
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="rounded-[20px] border border-white/60 bg-white/45 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-stone-700">账号注册</div>
                          <p className="mt-1 text-xs text-stone-500">关闭后仅保留管理员手动创建账号。</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSiteSettings((current) => ({ ...current, registrationEnabled: !current.registrationEnabled }))}
                          className={`rounded-full px-3 py-1.5 text-xs transition ${
                            siteSettings.registrationEnabled
                              ? 'bg-emerald-100/90 text-emerald-700'
                              : 'bg-stone-800 text-stone-100'
                          }`}
                        >
                          {siteSettings.registrationEnabled ? '已开启' : '已关闭'}
                        </button>
                      </div>
                      {!siteSettings.registrationEnabled && (
                        <div className="mt-3">
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                            联系方式
                          </label>
                          <input
                            type="text"
                            value={siteSettings.registrationClosedContact}
                            onChange={(e) => setSiteSettings((current) => ({ ...current, registrationClosedContact: e.target.value }))}
                            className="glass-input w-full rounded-2xl px-3 py-2 text-sm outline-none"
                            placeholder={DEFAULT_SITE_SETTINGS.registrationClosedContact}
                          />
                        </div>
                      )}
                    </div>

                    <div className="rounded-[20px] border border-white/60 bg-white/45 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-stone-700">访客模式</div>
                          <p className="mt-1 text-xs text-stone-500">关闭后，未登录用户只能先登录再使用功能。</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSiteSettings((current) => ({ ...current, guestModeEnabled: !current.guestModeEnabled }))}
                          className={`rounded-full px-3 py-1.5 text-xs transition ${
                            siteSettings.guestModeEnabled
                              ? 'bg-emerald-100/90 text-emerald-700'
                              : 'bg-stone-800 text-stone-100'
                          }`}
                        >
                          {siteSettings.guestModeEnabled ? '已开启' : '已关闭'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/60 bg-white/45 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-stone-700">日运/月运算法</div>
                          <p className="mt-1 text-xs text-stone-500">喜忌逻辑会先判断八字强弱与喜忌，再计算日运、月运和趋势评分。</p>
                        </div>
                        <div className="inline-flex rounded-full border border-stone-200 bg-white/60 p-1">
                          {[
                            ['default', '默认逻辑'],
                            ['preference', '喜忌逻辑'],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setSiteSettings((current) => ({
                                ...current,
                                fortuneAlgorithmMode: value as PublicSiteSettings['fortuneAlgorithmMode'],
                              }))}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                siteSettings.fortuneAlgorithmMode === value
                                  ? 'bg-stone-900 text-amber-200 shadow-sm'
                                  : 'text-stone-500 hover:text-stone-800'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSiteSettings}
                  disabled={settingsSaving}
                  className="glass-cta w-full rounded-2xl px-4 py-3 text-sm text-amber-300 transition hover:brightness-105 disabled:opacity-50"
                >
                  {settingsSaving ? '保存中...' : '保存站点配置'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel-soft mb-4 rounded-[28px] border border-white/60 p-4 md:p-5">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">快速添加账号</h4>
          <div className="flex flex-wrap gap-2 items-end">
            <input
              type="text"
              value={addName}
              onChange={(e) => { setAddName(e.target.value); setAddError(''); }}
              placeholder="昵称"
              className="glass-input w-28 rounded-2xl px-3 py-2 text-sm outline-none"
            />
            <input
              type="email"
              value={addEmail}
              onChange={(e) => { setAddEmail(e.target.value); setAddError(''); }}
              placeholder="邮箱"
              className="glass-input w-40 rounded-2xl px-3 py-2 text-sm outline-none"
            />
            <div className="relative inline-block">
              <input
                type={showAddPassword ? 'text' : 'password'}
                value={addPassword}
                onChange={(e) => { setAddPassword(e.target.value); setAddError(''); }}
                placeholder="密码（至少6位）"
                className="glass-input w-36 rounded-2xl px-3 py-2 pr-8 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAddPassword(!showAddPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                title={showAddPassword ? '隐藏密码' : '显示密码'}
              >
                {showAddPassword ? '隐藏' : '显示'}
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddUser}
              disabled={addLoading}
              className="glass-cta rounded-2xl px-4 py-2 text-sm text-amber-300 transition hover:brightness-105 disabled:opacity-50"
            >
              {addLoading ? '添加中...' : '添加'}
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 mt-2">{addError}</p>}
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索邮箱或昵称..."
            className="glass-input w-full max-w-xs rounded-2xl px-3 py-2 text-sm outline-none"
          />
        </div>

        {loading ? (
          <p className="text-sm text-stone-500">加载中...</p>
        ) : (
          <div className="glass-panel-soft overflow-x-auto rounded-[30px] border border-white/60 p-2 shadow-[0_20px_60px_rgba(120,113,108,0.14)]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-white/55 text-stone-600 text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2">邮箱</th>
                  <th className="text-left px-3 py-2">昵称</th>
                  <th className="text-center px-3 py-2">角色</th>
                  <th className="text-center px-3 py-2">额度</th>
                  <th className="text-center px-3 py-2">会话数</th>
                  <th className="text-left px-3 py-2">注册时间</th>
                  <th className="text-center px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="border-b border-white/70 hover:bg-white/45">
                    <td className="px-3 py-2 text-stone-700">{user.email}</td>
                    <td className="px-3 py-2 text-stone-700">{user.name}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${user.role === 'admin' ? 'bg-red-100/85 text-red-700' : 'bg-white/70 text-stone-600'}`}>
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingId === user.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={editQuota}
                            onChange={(e) => setEditQuota(e.target.value)}
                            className="w-16 border border-stone-300 rounded px-2 py-0.5 text-xs text-center"
                            min={0}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuota(user.id)}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-xs text-stone-400 hover:text-stone-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingId(user.id); setEditQuota(String(user.quota)); }}
                          className="text-stone-700 hover:text-amber-600 cursor-pointer"
                          title="点击修改额度"
                        >
                          {user.quota}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-stone-500">{user._count.sessions}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-3 py-2 text-center flex gap-2 justify-center items-center">
                      <button
                        type="button"
                        onClick={() => setDetailUser(user)}
                        className="text-xs text-amber-600 hover:text-amber-800"
                      >
                        详情
                      </button>
                      {user.role !== 'admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(user)}
                            className="text-xs text-stone-500 hover:text-stone-700"
                            title="复制账号信息"
                          >
                            复制
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {detailUser && (
        <DialogPortal
          open
          onClose={() => { setDetailUser(null); setShowPasswordModal(false); setRevealPasswordId(null); }}
          ariaLabel="用户详情"
          mobileFill
          layerClassName="z-[60]"
          panelClassName="max-w-2xl"
        >
            <div className="glass-panel-soft flex shrink-0 items-center justify-between border-b border-white/50 px-5 py-4 md:px-6">
              <h3 className="text-sm font-bold text-stone-800">用户详情</h3>
              <div className="flex gap-2">
                {detailUser.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(detailUser)}
                    className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                  >
                    复制账号信息
                  </button>
                )}
                <button type="button" onClick={() => { setDetailUser(null); setRevealPasswordId(null); }} className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700">关闭</button>
              </div>
            </div>

            <DialogBody className="p-5 md:p-6">

            <div className="mb-6 grid gap-3 text-sm md:grid-cols-2">
              <div className="glass-panel-soft rounded-[22px] border border-white/60 px-4 py-3"><span className="text-stone-400">邮箱</span><span className="ml-2">{detailUser.email}</span></div>
              <div className="glass-panel-soft rounded-[22px] border border-white/60 px-4 py-3"><span className="text-stone-400">昵称</span><span className="ml-2">{detailUser.name}</span></div>
              <div className="glass-panel-soft rounded-[22px] border border-white/60 px-4 py-3"><span className="text-stone-400">角色</span>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${detailUser.role === 'admin' ? 'bg-red-100/85 text-red-700' : 'bg-white/70 text-stone-600'}`}>
                  {detailUser.role === 'admin' ? '管理员' : '用户'}
                </span>
              </div>
              <div className="glass-panel-soft rounded-[22px] border border-white/60 px-4 py-3"><span className="text-stone-400">额度</span>
                {editingId === detailUser.id ? (
                  <span className="ml-2 flex items-center gap-1">
                    <input type="number" value={editQuota} onChange={(e) => setEditQuota(e.target.value)} className="glass-input w-16 rounded-xl px-2 py-1 text-xs" min={0} />
                    <button type="button" onClick={() => handleUpdateQuota(detailUser.id)} className="text-xs text-green-600">✓</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs text-stone-400">✕</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => { setEditingId(detailUser.id); setEditQuota(String(detailUser.quota)); }} className="ml-2 text-amber-600 hover:text-amber-800">{detailUser.quota}</button>
                )}
              </div>
              <div className="glass-panel-soft rounded-[22px] border border-white/60 px-4 py-3"><span className="text-stone-400">密码</span>
                <span className="ml-2 font-mono text-stone-400">
                  {detailUser && revealPasswordId === detailUser.id && plainPasswordCache[detailUser.id]
                    ? plainPasswordCache[detailUser.id]
                    : '********'}
                </span>
                {detailUser && plainPasswordCache[detailUser.id] ? (
                  <button
                    type="button"
                    onClick={() => setRevealPasswordId(prev => prev === detailUser.id ? null : detailUser.id)}
                    className="ml-2 text-xs text-amber-600 hover:text-amber-800"
                    title={revealPasswordId === detailUser.id ? '隐藏密码' : '点击查看密码'}
                  >
                    {revealPasswordId === detailUser.id ? '隐藏' : '显示'}
                  </button>
                ) : (
                  <span className="ml-1 text-xs text-stone-400">（修改密码后可查看）</span>
                )}
                <button type="button" onClick={() => setShowPasswordModal(true)} className="ml-2 text-xs text-amber-600 hover:text-amber-800">修改密码</button>
              </div>
              <div className="glass-panel-soft rounded-[22px] border border-white/60 px-4 py-3"><span className="text-stone-400">注册时间</span><span className="ml-2">{new Date(detailUser.createdAt).toLocaleString('zh-CN')}</span></div>
            </div>

            {showPasswordModal && (
              <div className="glass-panel-soft mb-4 rounded-[24px] border border-amber-200/70 bg-amber-50/55 p-4">
                <p className="text-xs text-stone-600 mb-2">输入新密码（至少6位）</p>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                    placeholder="新密码"
                    className="glass-input mb-2 w-full rounded-2xl px-3 py-2 pr-16 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 text-xs"
                    title={showNewPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showNewPassword ? '隐藏' : '显示'}
                  </button>
                </div>
                {passwordError && <p className="text-xs text-red-600 mb-2">{passwordError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowPasswordModal(false); setNewPassword(''); setPasswordError(''); }} className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-600">取消</button>
                  <button type="button" onClick={() => handleChangePassword(detailUser.id)} className="glass-cta rounded-full px-3 py-1.5 text-xs text-amber-300">确认</button>
                </div>
              </div>
            )}

            <div className="border-t border-white/60 pt-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">会话列表</h4>
              {sessionsLoading ? (
                <p className="text-xs text-stone-400">加载中...</p>
              ) : detailSessions.length === 0 ? (
                <p className="text-xs text-stone-400">暂无会话</p>
              ) : (
                <div className="space-y-1 mb-4">
                  {detailSessions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSessionId(prev => prev === s.id ? null : s.id)}
                      className={`w-full rounded-[20px] border px-3 py-2 text-left text-xs transition ${selectedSessionId === s.id ? 'border-amber-200 bg-amber-50/70 shadow-[0_10px_25px_rgba(245,158,11,0.08)]' : 'border-white/65 bg-white/48 hover:bg-white/62'}`}
                    >
                      <span className="font-medium">{s.title}</span>
                      <span className="text-stone-400 ml-2">({s.modelType})</span>
                      <span className="text-stone-400 ml-2">{s._count.messages} 条消息</span>
                      <span className="text-stone-400 ml-2">{new Date(s.createdAt).toLocaleString('zh-CN')}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedSessionId && (
                <div className="glass-panel-soft rounded-[24px] border border-white/60 p-3">
                  <h5 className="text-xs font-bold text-stone-500 mb-2">对话消息</h5>
                  {messagesLoading ? (
                    <p className="text-xs text-stone-400">加载中...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-stone-400">暂无消息</p>
                  ) : (
                    <div className="glass-scrollbar max-h-60 space-y-3 overflow-y-auto">
                      {messages.map(m => (
                        <div key={m.id} className="flex items-start gap-2 border-b border-white/55 pb-2 last:border-0">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-stone-500">{m.role === 'user' ? '用户' : m.role === 'assistant' ? 'AI' : '系统'}</span>
                            <p className="text-xs text-stone-700 mt-0.5 break-words line-clamp-3">{m.content}</p>
                            <span className="text-[10px] text-stone-400">{new Date(m.createdAt).toLocaleString('zh-CN')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(m.id)}
                            className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            </DialogBody>
        </DialogPortal>
      )}
    </div>
  );
}
