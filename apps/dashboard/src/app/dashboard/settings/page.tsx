'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  last_activity: string | null;
  updated_at: string | null;
};

function normalizeRole(role: string | null | undefined) {
  if (!role) return 'user';

  const normalized = role.toLowerCase();
  if (normalized === 'superadmin' || normalized === 'admin') {
    return 'superadmin';
  }

  return 'user';
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Chưa có dữ liệu';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rawRole, setRawRole] = useState('unknown');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch('/api/me', { credentials: 'include' });

        if (!active) return;

        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }

        const data = (await response.json()) as {
          profile?: Profile;
          rawRole?: string;
          error?: string;
        };

        if (!active) return;

        if (!response.ok || !data.profile) {
          setError(data.error || 'Không thể tải thông tin profile');
        } else {
          setProfile(data.profile);
          setRawRole(data.rawRole || 'unknown');
        }
      } catch {
        if (active) {
          setError('Không thể tải thông tin profile');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const response = await fetch('/api/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || 'Cập nhật thất bại');
    } else {
      const data = (await response.json()) as { profile?: Profile; rawRole?: string };
      if (data.profile) {
        setProfile(data.profile);
      }
      if (data.rawRole) {
        setRawRole(data.rawRole);
      }
      setSuccess('Đã cập nhật thành công');
    }

    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.password.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError('Xác nhận mật khẩu không khớp');
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch('/api/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordForm),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setPasswordError(data.error || 'Không thể đổi mật khẩu');
      } else {
        setPasswordSuccess('Đã đổi mật khẩu thành công');
        setPasswordForm({ password: '', confirmPassword: '' });
      }
    } catch {
      setPasswordError('Không thể đổi mật khẩu');
    }

    setPasswordSaving(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-cream p-8 text-charcoalMuted">Đang tải hồ sơ...</div>;
  }

  const displayName = profile?.display_name || profile?.email.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const normalizedRole = normalizeRole(profile?.role);
  const roleLabel = normalizedRole === 'superadmin' ? 'Superadmin' : 'User';
  const isSuperAdmin = normalizedRole === 'superadmin';

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal mb-2">Cài đặt hồ sơ</h1>
        <p className="text-charcoalMuted">Chỉnh thông tin hiển thị và xem nhanh trạng thái tài khoản.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="bg-white border border-borderMain rounded-xl p-6 h-fit space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-charcoal flex items-center justify-center overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="Avatar" width={64} height={64} unoptimized className="w-full h-full object-cover" />
              ) : (
                <span className="text-neon text-xl font-semibold">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-charcoal truncate">{displayName}</h2>
              <p className="text-sm text-charcoalMuted truncate">{profile?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-borderMain bg-cream p-3">
              <p className="text-charcoalMuted text-xs mb-1">Vai trò</p>
              <p className={`font-semibold ${isSuperAdmin ? 'text-charcoal' : 'text-charcoal'}`}>{roleLabel}</p>
              <p className="text-[11px] text-charcoalMuted mt-1">Raw: {rawRole}</p>
            </div>
            <div className="rounded-lg border border-borderMain bg-cream p-3">
              <p className="text-charcoalMuted text-xs mb-1">Trạng thái</p>
              <p className="font-semibold text-green-600">Sẵn sàng</p>
            </div>
            <div className="rounded-lg border border-borderMain bg-cream p-3 col-span-2">
              <p className="text-charcoalMuted text-xs mb-1">Cập nhật gần nhất</p>
              <p className="font-medium text-charcoal">{formatDate(profile?.updated_at)}</p>
            </div>
            <div className="rounded-lg border border-borderMain bg-cream p-3 col-span-2">
              <p className="text-charcoalMuted text-xs mb-1">Hoạt động gần đây</p>
              <p className="font-medium text-charcoal">{formatDate(profile?.last_activity)}</p>
            </div>
          </div>

          <div className="rounded-lg bg-neonGhost border border-neon/30 p-4">
            <p className="text-sm font-medium text-charcoal mb-1">Mẹo nhanh</p>
            <p className="text-sm text-charcoalMuted leading-relaxed">
              Đổi tên hiển thị và avatar ở đây sẽ cập nhật luôn vào thanh navbar sau khi lưu.
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 text-center bg-charcoal text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors">
              Về dashboard
            </Link>
            <Link href="/logout" className="flex-1 text-center border border-borderMain text-charcoal px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-borderLight transition-colors">
              Đăng xuất
            </Link>
          </div>
        </aside>

        <section className="bg-white border border-borderMain rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-charcoal">Thông tin cá nhân</h2>
              <p className="text-sm text-charcoalMuted mt-1">Tùy chỉnh dữ liệu hồ sơ và ảnh đại diện.</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-cream text-charcoalMuted border border-borderMain">
              {roleLabel}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
            {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">{success}</p>}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Email</label>
                <input
                  value={profile?.email ?? ''}
                  disabled
                  className="w-full px-4 py-3 border border-borderMain rounded-lg bg-borderLight text-charcoalMuted"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Tên hiển thị</label>
                <input
                  value={profile?.display_name ?? ''}
                  onChange={(e) => setProfile((prev) => (prev ? { ...prev, display_name: e.target.value } : prev))}
                  className="w-full px-4 py-3 border border-borderMain rounded-lg bg-white text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon"
                  placeholder="Ví dụ: Minh Anh"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-charcoal mb-2">Avatar URL</label>
                <input
                  value={profile?.avatar_url ?? ''}
                  onChange={(e) => setProfile((prev) => (prev ? { ...prev, avatar_url: e.target.value } : prev))}
                  className="w-full px-4 py-3 border border-borderMain rounded-lg bg-white text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon"
                  placeholder="Dán liên kết ảnh đại diện"
                />
                <p className="text-xs text-charcoalMuted mt-2">Dùng ảnh trực tiếp từ URL công khai. Nếu để trống, hệ thống sẽ dùng chữ cái đầu.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-charcoal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="border border-borderMain text-charcoal px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-borderLight transition-colors"
              >
                Tải lại dữ liệu
              </button>
              <Link href="/dashboard" className="text-sm text-charcoalMuted hover:text-charcoal transition-colors">
                Quay lại dashboard
              </Link>
            </div>

          </form>

          <div className="border-t border-borderLight pt-6 mt-6">
            <h3 className="text-lg font-semibold text-charcoal mb-1">Đổi mật khẩu</h3>
            <p className="text-sm text-charcoalMuted mb-4">Đổi mật khẩu trực tiếp cho tài khoản đang đăng nhập.</p>

            {passwordError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">{passwordSuccess}</p>}

            <form onSubmit={handlePasswordChange} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Mật khẩu mới</label>
                <input
                  type="password"
                  minLength={6}
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 border border-borderMain rounded-lg bg-white text-charcoal focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-borderMain rounded-lg bg-white text-charcoal focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="bg-charcoal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordSaving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
                <Link href="/forgot-password" className="text-sm text-charcoalMuted hover:text-charcoal transition-colors">
                  Quên mật khẩu? Gửi link reset
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
