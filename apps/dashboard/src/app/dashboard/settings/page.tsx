'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@cafetoolbox/supabase/client';

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Không thể tải thông tin profile');
      } else {
        setProfile(data as Profile);
      }
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      })
      .eq('id', profile.id);

    if (updateError) {
      setError('Cập nhật thất bại');
    } else {
      setSuccess('Đã cập nhật thành công');
    }

    setSaving(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-cream p-8">Đang tải...</div>;
  }

  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-charcoal mb-2">Cài đặt</h1>
        <p className="text-charcoalMuted mb-8">Quản lý thông tin tài khoản của bạn</p>

        <form onSubmit={handleSave} className="bg-white border border-borderMain rounded-xl p-6 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

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
              className="w-full px-4 py-3 border border-borderMain rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Avatar URL</label>
            <input
              value={profile?.avatar_url ?? ''}
              onChange={(e) => setProfile((prev) => (prev ? { ...prev, avatar_url: e.target.value } : prev))}
              className="w-full px-4 py-3 border border-borderMain rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-charcoal text-white px-5 py-2.5 rounded-lg text-sm"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <Link href="/dashboard" className="text-sm text-charcoalMuted hover:text-charcoal">
              Quay lại dashboard
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
