'use client';

import Link from 'next/link';
import { use } from 'react';
import { createClient } from '@cafetoolbox/supabase/client';

async function getUserRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role || null;
}

export function DashboardNav() {
  const role = use(getUserRole());

  return (
    <nav className="border-b border-borderMain bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-neon rounded-lg flex items-center justify-center">
              <span
                className="iconify text-charcoal"
                data-icon="lucide:terminal"
                data-width="20"
              />
            </div>
            <span className="text-xl font-semibold tracking-tight">CafeToolbox</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/dashboard"
              className="text-charcoalMuted hover:text-charcoal transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/tools"
              className="text-charcoalMuted hover:text-charcoal transition-colors"
            >
              Công cụ
            </Link>
            {role === 'superadmin' && (
              <Link
                href="/dashboard/users"
                className="text-charcoalMuted hover:text-charcoal transition-colors"
              >
                Users
              </Link>
            )}
            <Link
              href="/dashboard/settings"
              className="text-charcoalMuted hover:text-charcoal transition-colors"
            >
              Cài đặt
            </Link>
            <div className="h-4 w-px bg-borderMain"></div>
            <Link
              href="/logout"
              className="text-charcoalMuted hover:text-charcoal transition-colors"
            >
              Đăng xuất
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
