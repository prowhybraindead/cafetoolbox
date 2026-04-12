'use client';

import { useEffect } from 'react';
import { logout } from '@cafetoolbox/supabase/auth';

export default function LogoutPage() {
  useEffect(() => {
    async function handleLogout() {
      // logout() already calls clearAllAuthCookies() internally
      await logout();
      window.location.href = '/login';
    }
    handleLogout();
  }, []);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon mx-auto mb-4"></div>
        <p className="text-charcoalMuted">Đang đăng xuất...</p>
      </div>
    </div>
  );
}
