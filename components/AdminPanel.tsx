'use client';

import React, { useState, useEffect, useCallback } from 'react';

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

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      <header className="bg-stone-900 text-stone-100 py-4 px-4 shadow-lg border-b-4 border-red-700 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-xs px-3 py-1 rounded border border-stone-600 text-stone-300 hover:text-white hover:border-stone-400 transition"
            >
              ← 返回
            </button>
            <h1 className="text-lg font-bold tracking-wider">管理系统</h1>
          </div>
          <span className="text-xs text-stone-400">共 {users.length} 位用户</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

        <div className="mb-4 p-4 border border-stone-200 rounded-lg bg-white">
          <h4 className="text-xs font-bold text-stone-500 uppercase mb-3">快速添加账号</h4>
          <div className="flex flex-wrap gap-2 items-end">
            <input
              type="text"
              value={addName}
              onChange={(e) => { setAddName(e.target.value); setAddError(''); }}
              placeholder="昵称"
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-2 focus:ring-amber-400 outline-none"
            />
            <input
              type="email"
              value={addEmail}
              onChange={(e) => { setAddEmail(e.target.value); setAddError(''); }}
              placeholder="邮箱"
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-40 focus:ring-2 focus:ring-amber-400 outline-none"
            />
            <div className="relative inline-block">
              <input
                type={showAddPassword ? 'text' : 'password'}
                value={addPassword}
                onChange={(e) => { setAddPassword(e.target.value); setAddError(''); }}
                placeholder="密码（至少6位）"
                className="border border-stone-300 rounded-lg px-3 py-2 pr-8 text-sm w-36 focus:ring-2 focus:ring-amber-400 outline-none"
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
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50"
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
            className="w-full max-w-xs border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>

        {loading ? (
          <p className="text-sm text-stone-500">加载中...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-600 text-xs uppercase tracking-wider">
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
                  <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 text-stone-700">{user.email}</td>
                    <td className="px-3 py-2 text-stone-700">{user.name}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>
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
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          onClick={() => { setDetailUser(null); setShowPasswordModal(false); setRevealPasswordId(null); }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-stone-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-800">用户详情</h3>
              <div className="flex gap-2">
                {detailUser.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(detailUser)}
                    className="text-xs px-2 py-1 rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
                  >
                    复制账号信息
                  </button>
                )}
                <button type="button" onClick={() => { setDetailUser(null); setRevealPasswordId(null); }} className="text-sm text-stone-400 hover:text-stone-600">关闭</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              <div><span className="text-stone-400">邮箱</span><span className="ml-2">{detailUser.email}</span></div>
              <div><span className="text-stone-400">昵称</span><span className="ml-2">{detailUser.name}</span></div>
              <div><span className="text-stone-400">角色</span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${detailUser.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>
                  {detailUser.role === 'admin' ? '管理员' : '用户'}
                </span>
              </div>
              <div><span className="text-stone-400">额度</span>
                {editingId === detailUser.id ? (
                  <span className="ml-2 flex items-center gap-1">
                    <input type="number" value={editQuota} onChange={(e) => setEditQuota(e.target.value)} className="w-16 border rounded px-1 text-xs" min={0} />
                    <button type="button" onClick={() => handleUpdateQuota(detailUser.id)} className="text-xs text-green-600">✓</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs text-stone-400">✕</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => { setEditingId(detailUser.id); setEditQuota(String(detailUser.quota)); }} className="ml-2 text-amber-600 hover:text-amber-800">{detailUser.quota}</button>
                )}
              </div>
              <div><span className="text-stone-400">密码</span>
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
              <div><span className="text-stone-400">注册时间</span><span className="ml-2">{new Date(detailUser.createdAt).toLocaleString('zh-CN')}</span></div>
            </div>

            {showPasswordModal && (
              <div className="mb-4 p-4 border border-amber-200 rounded-lg bg-amber-50">
                <p className="text-xs text-stone-600 mb-2">输入新密码（至少6位）</p>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                    placeholder="新密码"
                    className="w-full border border-stone-300 rounded px-3 py-1.5 pr-16 text-sm mb-2"
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
                  <button type="button" onClick={() => { setShowPasswordModal(false); setNewPassword(''); setPasswordError(''); }} className="text-xs px-2 py-1 rounded border border-stone-300 text-stone-600">取消</button>
                  <button type="button" onClick={() => handleChangePassword(detailUser.id)} className="text-xs px-2 py-1 rounded bg-amber-600 text-white">确认</button>
                </div>
              </div>
            )}

            <div className="border-t border-stone-100 pt-4">
              <h4 className="text-xs font-bold text-stone-500 uppercase mb-2">会话列表</h4>
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
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition ${selectedSessionId === s.id ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:bg-stone-50'}`}
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
                <div className="border border-stone-200 rounded-lg p-3">
                  <h5 className="text-xs font-bold text-stone-500 mb-2">对话消息</h5>
                  {messagesLoading ? (
                    <p className="text-xs text-stone-400">加载中...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-stone-400">暂无消息</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {messages.map(m => (
                        <div key={m.id} className="flex gap-2 items-start border-b border-stone-100 pb-2 last:border-0">
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
          </div>
        </div>
      )}
    </div>
  );
}
