'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
      const meResponse = await fetch('/api/me', { credentials: 'include' });
      if (meResponse.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!meResponse.ok) {
        setError('Không thể kiểm tra quyền truy cập');
        setLoading(false);
        return;
      }

      const meData = (await meResponse.json()) as { profile?: { role?: string | null } };

      if (meData.profile?.role !== 'superadmin') {
        setIsSuperadmin(false);
        setLoading(false);
        return;
      }

      setIsSuperadmin(true);

      const usersResponse = await fetch('/api/admin/users', { credentials: 'include' });
      const usersData = (await usersResponse.json()) as {
        error?: string;
        profiles?: Profile[];
      };

      if (!usersResponse.ok) {
        setError(usersData.error || 'Không thể tải danh sách users');
      } else {
        setProfiles(usersData.profiles ?? []);
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
