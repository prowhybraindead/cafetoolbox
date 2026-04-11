'use client';

import { useEffect, useState } from 'react';

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'superadmin';
  created_at: string;
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState<string | null>(null); // user id being saved
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'user' as 'user' | 'superadmin',
  });

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    avatar_url: '',
    role: 'user' as 'user' | 'superadmin',
    password: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users', { credentials: 'include' });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Không thể tải danh sách người dùng');
        setProfiles([]);
        return;
      }

      const data = (await response.json()) as { profiles?: Profile[] };
      setProfiles(data.profiles ?? []);
    } catch {
      setError('Không thể tải danh sách người dùng');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRole(userId: string, currentRole: string) {
    setSaving(userId);
    setError('');
    setSuccess('');

    const newRole = currentRole === 'superadmin' ? 'user' : 'superadmin';

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; profile?: Profile };

      if (!response.ok) {
        setError(data.error || 'Không thể cập nhật quyền');
      } else {
        setProfiles((currentProfiles) =>
          currentProfiles.map((profile) =>
            profile.id === userId && data.profile ? data.profile : profile
          )
        );
        setSuccess(`Đã cập nhật quyền thành "${newRole}"`);
      }
    } catch {
      setError('Không thể cập nhật quyền');
    }
    setSaving(null);
  }

  async function handleUpdateName(userId: string, newName: string) {
    setSaving(userId);
    setError('');

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ display_name: newName }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; profile?: Profile };

      if (!response.ok) {
        setError(data.error || 'Không thể cập nhật tên hiển thị');
      } else {
        setProfiles((currentProfiles) =>
          currentProfiles.map((profile) =>
            profile.id === userId && data.profile ? data.profile : profile
          )
        );
        setSuccess('Đã cập nhật tên hiển thị');
      }
    } catch {
      setError('Không thể cập nhật tên hiển thị');
    }

    setSaving(null);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createForm),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error || 'Không thể tạo user');
      } else {
        setSuccess('Đã tạo user thành công');
        setShowCreate(false);
        setCreateForm({
          email: '',
          password: '',
          display_name: '',
          role: 'user',
        });
        await loadData();
      }
    } catch {
      setError('Không thể tạo user');
    }

    setCreating(false);
  }

  async function handleDeleteUser(userId: string) {
    setSaving(userId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error || 'Không thể xóa user');
      } else {
        setSuccess('Đã xóa user thành công');
        setDeleteId(null);
        await loadData();
      }
    } catch {
      setError('Không thể xóa user');
    }

    setSaving(null);
  }

  function openEdit(profile: Profile) {
    setEditId(profile.id);
    setEditForm({
      display_name: profile.display_name ?? '',
      avatar_url: profile.avatar_url ?? '',
      role: profile.role,
      password: '',
    });
    setShowEdit(true);
    setError('');
    setSuccess('');
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const payload: Record<string, string> = {
        display_name: editForm.display_name,
        avatar_url: editForm.avatar_url,
        role: editForm.role,
      };

      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const response = await fetch(`/api/admin/users/${editId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; profile?: Profile };

      if (!response.ok) {
        setError(data.error || 'Không thể cập nhật user');
      } else {
        setProfiles((current) =>
          current.map((profile) =>
            profile.id === editId && data.profile ? data.profile : profile
          )
        );
        setSuccess(editForm.password ? 'Đã cập nhật user và đổi mật khẩu' : 'Đã cập nhật user thành công');
        setShowEdit(false);
      }
    } catch {
      setError('Không thể cập nhật user');
    }

    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-charcoalMuted">Đang tải...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Quản lý Người dùng</h1>
          <p className="text-sm text-charcoalMuted mt-1">Xem và phân quyền tài khoản trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-charcoalMuted">{profiles.length} người dùng</span>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors flex items-center gap-2"
          >
            <span className="iconify" data-icon="lucide:user-plus" data-width="16" />
            Tạo user
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="iconify text-red-500" data-icon="lucide:alert-circle" data-width="18" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <span className="iconify" data-icon="lucide:x" data-width="16" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="iconify text-green-500" data-icon="lucide:check-circle" data-width="18" />
          <p className="text-sm text-green-600 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">
            <span className="iconify" data-icon="lucide:x" data-width="16" />
          </button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-charcoal mb-5">Tạo user mới</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="new-user@cafetoolbox.app"
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Tên hiển thị</label>
                <input
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Quyền</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as 'user' | 'superadmin' }))}
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neon/50"
                >
                  <option value="user">user</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-charcoalMuted hover:text-charcoal"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-charcoal text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-charcoalLight transition-colors"
                >
                  {creating ? 'Đang tạo...' : 'Tạo user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-charcoal mb-5">Chỉnh sửa user</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Tên hiển thị</label>
                <input
                  value={editForm.display_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Avatar URL</label>
                <input
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, avatar_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Quyền</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as 'user' | 'superadmin' }))}
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neon/50"
                >
                  <option value="user">user</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Mật khẩu mới (admin reset)</label>
                <input
                  type="password"
                  minLength={6}
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Để trống nếu không đổi"
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
                <p className="text-xs text-charcoalMuted mt-1">Nhập để reset mật khẩu user bằng quyền admin.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 text-sm text-charcoalMuted hover:text-charcoal"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="bg-charcoal text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-charcoalLight transition-colors"
                >
                  {editing ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="iconify text-red-500" data-icon="lucide:trash-2" data-width="24" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal text-center mb-2">Xóa user?</h3>
            <p className="text-sm text-charcoalMuted text-center mb-6">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-borderMain rounded-lg text-sm text-charcoalMuted hover:text-charcoal"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteUser(deleteId)}
                disabled={saving === deleteId}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {saving === deleteId ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {profiles.length === 0 ? (
        <div className="bg-white border border-borderMain rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-borderLight rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="iconify text-charcoalMuted" data-icon="lucide:users" data-width="32" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-2">Chưa có người dùng</h3>
        </div>
      ) : (
        <div className="bg-white border border-borderMain rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-borderMain bg-cream/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Người dùng</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Email</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Quyền</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Ngày tạo</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-borderMain last:border-0 hover:bg-cream/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-charcoal rounded-full flex items-center justify-center shrink-0">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <span className="text-neon text-sm font-medium">
                            {(profile.display_name || profile.email).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <EditableName
                        name={profile.display_name}
                        onSave={(name) => handleUpdateName(profile.id, name)}
                        disabled={saving === profile.id}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-charcoalMuted">{profile.email}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        profile.role === 'superadmin'
                          ? 'bg-neonGhost text-neon'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-charcoalMuted">
                      {new Date(profile.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(profile)}
                        disabled={saving === profile.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-cream text-charcoal hover:bg-borderLight"
                        title="Sửa user"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => toggleRole(profile.id, profile.role)}
                        disabled={saving === profile.id}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          profile.role === 'superadmin'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                        title={profile.role === 'superadmin' ? 'Hạ quyền xuống user' : 'Nâng quyền lên superadmin'}
                      >
                        {saving === profile.id
                          ? '...'
                          : profile.role === 'superadmin'
                          ? 'Hạ quyền'
                          : 'Nâng quyền'}
                      </button>
                      <button
                        onClick={() => setDeleteId(profile.id)}
                        disabled={saving === profile.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-red-50 text-red-600 hover:bg-red-100"
                        title="Xóa user"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EditableName({
  name,
  onSave,
  disabled,
}: {
  name: string | null;
  onSave: (name: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name || '');

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSave(value);
              setEditing(false);
            }
            if (e.key === 'Escape') {
              setEditing(false);
              setValue(name || '');
            }
          }}
          className="px-2 py-1 border border-neon rounded text-sm w-32 focus:outline-none"
          autoFocus
        />
        <button
          onClick={() => {
            onSave(value);
            setEditing(false);
          }}
          className="text-neon text-xs"
          disabled={disabled}
        >
          ✓
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm font-medium text-charcoal hover:text-neon transition-colors"
      title="Click để sửa tên"
    >
      {name || <span className="text-charcoalMuted italic">Chưa đặt tên</span>}
    </button>
  );
}
