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
        setEditingId(null);
      }
    } catch { /* ignore */ }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`确定删除用户 ${email}？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
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
                    <td className="px-3 py-2 text-center">
                      {user.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
