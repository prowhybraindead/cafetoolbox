'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@cafetoolbox/supabase/client';

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: 'user' | 'superadmin';
};

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (me?.role !== 'superadmin') {
        setIsSuperadmin(false);
        setLoading(false);
        return;
      }

      setIsSuperadmin(true);

      const { data, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, display_name, role')
        .order('created_at', { ascending: false });

      if (usersError) {
        setError('Không thể tải danh sách users');
      } else {
        setProfiles((data ?? []) as Profile[]);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-cream p-8">Đang tải...</div>;
  }

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen bg-cream p-8">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Không có quyền truy cập</h1>
        <p className="text-charcoalMuted mb-4">Trang này chỉ dành cho superadmin.</p>
        <Link href="/dashboard" className="text-sm text-charcoal hover:text-neon">Quay lại dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-charcoal mb-2">Quản lý users</h1>
        <p className="text-charcoalMuted mb-8">Danh sách tài khoản trong hệ thống</p>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="bg-white border border-borderMain rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-borderLight">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Tên hiển thị</th>
                <th className="text-left px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-borderLight">
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3">{p.display_name || '-'}</td>
                  <td className="px-4 py-3">{p.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-charcoalMuted hover:text-charcoal">Quay lại dashboard</Link>
        </div>
      </main>
    </div>
  );
}
