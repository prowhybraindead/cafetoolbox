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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const domTheme = document.documentElement.dataset.theme;
      if (domTheme === 'dark' || domTheme === 'light') {
        setIsDark(domTheme === 'dark');
        return;
      }

      const saved = window.localStorage.getItem('cafetoolbox-theme');
      setIsDark(saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches));
    };

    syncTheme();
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const domTheme = document.documentElement.dataset.theme;
      if (domTheme === 'dark' || domTheme === 'light') {
        setIsDark(domTheme === 'dark');
        return;
      }

      const saved = window.localStorage.getItem('cafetoolbox-theme');
      setIsDark(saved === 'dark');
    };

    const handleThemeChange = () => syncTheme();
    const handleStorage = () => syncTheme();

    window.addEventListener('cafetoolbox-theme-change', handleThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('cafetoolbox-theme-change', handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

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
    return <div className={`p-8 ${isDark ? 'text-white/50' : 'text-charcoalMuted'}`}>Đang tải hồ sơ...</div>;
  }

  const displayName = profile?.display_name || profile?.email.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const normalizedRole = normalizeRole(profile?.role);
  const roleLabel = normalizedRole === 'superadmin' ? 'Superadmin' : 'User';
  const isSuperAdmin = normalizedRole === 'superadmin';

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-charcoal'}`}>Cài đặt hồ sơ</h1>
        <p className={isDark ? 'text-white/60' : 'text-charcoal'}>Chỉnh thông tin hiển thị và xem nhanh trạng thái tài khoản.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className={`rounded-xl border p-6 h-fit space-y-5 ${isDark ? 'border-white/10 bg-white/5' : 'border-white/55 bg-white/40 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)]'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${isDark ? 'bg-white/10' : 'bg-charcoal'}`}>
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="Avatar" width={64} height={64} unoptimized className="w-full h-full object-cover" />
              ) : (
                <span className={`text-xl font-semibold ${isDark ? 'text-neon' : 'text-neon'}`}>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className={`text-lg font-semibold truncate ${isDark ? 'text-white' : 'text-charcoal'}`}>{displayName}</h2>
              <p className={`text-sm truncate ${isDark ? 'text-white/50' : 'text-charcoal'}`}>{profile?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={`rounded-lg border p-3 ${isDark ? 'border-white/8 bg-white/3' : 'border-white/60 bg-white/45 backdrop-blur-sm'}`}>
              <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-charcoal'}`}>Vai trò</p>
              {isSuperAdmin ? (
                <span className="role-badge-shimmer inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400/20 via-yellow-300/30 to-amber-400/20 text-amber-800 shadow-[0_0_6px_rgba(251,191,36,0.3),inset_0_0_0_0.5px_rgba(251,191,36,0.4)]">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" /></svg>
                  {roleLabel}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-charcoal/8 text-charcoal">
                  <span className="role-dot-pulse h-1 w-1 rounded-full bg-charcoal/40" />
                  {roleLabel}
                </span>
              )}
              <p className={`text-[11px] mt-1.5 ${isDark ? 'text-white/35' : 'text-charcoal'}`}>Raw: {rawRole}</p>
            </div>
            <div className={`rounded-lg border p-3 ${isDark ? 'border-white/8 bg-white/3' : 'border-white/60 bg-white/45 backdrop-blur-sm'}`}>
              <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-charcoal'}`}>Trạng thái</p>
              <p className="font-semibold text-green-500">Sẵn sàng</p>
            </div>
            <div className={`rounded-lg border p-3 col-span-2 ${isDark ? 'border-white/8 bg-white/3' : 'border-white/60 bg-white/45 backdrop-blur-sm'}`}>
              <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-charcoal'}`}>Cập nhật gần nhất</p>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-charcoal'}`}>{formatDate(profile?.updated_at)}</p>
            </div>
            <div className={`rounded-lg border p-3 col-span-2 ${isDark ? 'border-white/8 bg-white/3' : 'border-white/60 bg-white/45 backdrop-blur-sm'}`}>
              <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-charcoal'}`}>Hoạt động gần đây</p>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-charcoal'}`}>{formatDate(profile?.last_activity)}</p>
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${isDark ? 'bg-neon/5 border-neon/20' : 'bg-neonGhost border-neon/30'}`}>
            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-charcoal'}`}>Mẹo nhanh</p>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-charcoal'}`}>
              Đổi tên hiển thị và avatar ở đây sẽ cập nhật luôn vào thanh navbar sau khi lưu.
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className={`flex-1 text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-charcoal text-white hover:bg-charcoalLight'}`}>
              Về dashboard
            </Link>
            <Link href="/logout" className={`flex-1 text-center border px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-white/60 text-charcoal hover:bg-white/45'}`}>
              Đăng xuất
            </Link>
          </div>
        </aside>

        <section className={`rounded-xl border p-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-white/55 bg-white/40 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)]'}`}>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-charcoal'}`}>Thông tin cá nhân</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-charcoal'}`}>Tùy chỉnh dữ liệu hồ sơ và ảnh đại diện.</p>
            </div>
            {isSuperAdmin ? (
              <span className="role-badge-shimmer inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 via-yellow-300/30 to-amber-400/20 text-amber-800 shadow-[0_0_6px_rgba(251,191,36,0.3),inset_0_0_0_0.5px_rgba(251,191,36,0.4)]">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" /></svg>
                {roleLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-charcoal/8 text-charcoal">
                <span className="role-dot-pulse h-1 w-1 rounded-full bg-charcoal/40" />
                {roleLabel}
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {error && <p className={`text-sm rounded-lg px-4 py-3 ${isDark ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-red-600 bg-red-50 border border-red-200'}`}>{error}</p>}
            {success && <p className={`text-sm rounded-lg px-4 py-3 ${isDark ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-green-700 bg-green-50 border border-green-200'}`}>{success}</p>}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-charcoal'}`}>Email</label>
                <input
                  value={profile?.email ?? ''}
                  disabled
                  className={`w-full px-4 py-3 border rounded-lg ${isDark ? 'border-white/10 bg-white/5 text-white/40' : 'border-white/60 bg-white/55 text-charcoal'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-charcoal'}`}>Tên hiển thị</label>
                <input
                  value={profile?.display_name ?? ''}
                  onChange={(e) => setProfile((prev) => (prev ? { ...prev, display_name: e.target.value } : prev))}
                  className={`w-full px-4 py-3 border rounded-lg placeholder:focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon ${isDark ? 'border-white/10 bg-white/5 text-white placeholder:text-white/30' : 'border-white/60 bg-white/55 text-charcoal placeholder:text-charcoal'}`}
                  placeholder="Ví dụ: Minh Anh"
                />
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-charcoal'}`}>Avatar URL</label>
                <input
                  value={profile?.avatar_url ?? ''}
                  onChange={(e) => setProfile((prev) => (prev ? { ...prev, avatar_url: e.target.value } : prev))}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon ${isDark ? 'border-white/10 bg-white/5 text-white placeholder:text-white/30' : 'border-white/60 bg-white/55 text-charcoal placeholder:text-charcoal'}`}
                  placeholder="Dán liên kết ảnh đại diện"
                />
                <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-charcoal'}`}>Dùng ảnh trực tiếp từ URL công khai. Nếu để trống, hệ thống sẽ dùng chữ cái đầu.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-neon text-charcoal hover:bg-neon/90' : 'bg-charcoal text-white hover:bg-charcoalLight'}`}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={`border px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-white/60 text-charcoal hover:bg-white/45'}`}
              >
                Tải lại dữ liệu
              </button>
              <Link href="/dashboard" className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-charcoal hover:text-charcoal'}`}>
                Quay lại dashboard
              </Link>
            </div>

          </form>

          <div className={`border-t pt-6 mt-6 ${isDark ? 'border-white/10' : 'border-borderLight'}`}>
            <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-charcoal'}`}>Đổi mật khẩu</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-charcoal'}`}>Đổi mật khẩu trực tiếp cho tài khoản đang đăng nhập.</p>

            {passwordError && <p className={`text-sm rounded-lg px-4 py-3 mb-4 ${isDark ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-red-600 bg-red-50 border border-red-200'}`}>{passwordError}</p>}
            {passwordSuccess && <p className={`text-sm rounded-lg px-4 py-3 mb-4 ${isDark ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-green-700 bg-green-50 border border-green-200'}`}>{passwordSuccess}</p>}

            <form onSubmit={handlePasswordChange} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-charcoal'}`}>Mật khẩu mới</label>
                <input
                  type="password"
                  minLength={6}
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon ${isDark ? 'border-white/10 bg-white/5 text-white' : 'border-white/60 bg-white/55 text-charcoal'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-charcoal'}`}>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon ${isDark ? 'border-white/10 bg-white/5 text-white' : 'border-white/60 bg-white/55 text-charcoal'}`}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-neon text-charcoal hover:bg-neon/90' : 'bg-charcoal text-white hover:bg-charcoalLight'}`}
                >
                  {passwordSaving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
                <Link href="/forgot-password" className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-charcoal hover:text-charcoal'}`}>
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
