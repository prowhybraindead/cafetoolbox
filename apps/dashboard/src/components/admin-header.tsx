'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { BrandMark } from '@cafetoolbox/ui';

type AdminHeaderUser = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

function normalizeRole(role: string | null | undefined) {
  if (!role) return 'user';
  const normalized = role.toLowerCase();
  if (normalized === 'superadmin' || normalized === 'admin') return 'superadmin';
  return 'user';
}

export function AdminHeader({ user }: { user: AdminHeaderUser | null }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('cafetoolbox-theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem('cafetoolbox-theme', theme);
    document.documentElement.dataset.theme = theme;
    window.dispatchEvent(new CustomEvent('cafetoolbox-theme-change', { detail: theme }));
  }, [theme, mounted]);

  const isDark = theme === 'dark';
  const displayName = user?.display_name || user?.email?.split('@')[0] || 'Admin';
  const initials = displayName.charAt(0).toUpperCase();
  const isSuperAdmin = normalizeRole(user?.role) === 'superadmin';

  return (
    <nav className={`border-b backdrop-blur-md ${isDark ? 'border-white/10 bg-[#12151B]/95' : 'border-borderMain bg-white/95'}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="rounded-2xl bg-charcoal p-1 shadow-[0_8px_20px_rgba(18,18,18,0.15)] ring-1 ring-black/5">
                <BrandMark className="shrink-0 rounded-xl [filter:brightness(0)_invert(1)]" size={30} />
              </div>
              <div className="leading-tight">
                <p className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-charcoal'}`}>CafeToolbox</p>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${isDark ? 'text-neon' : 'text-charcoal'}`}>Admin Panel</p>
              </div>
            </Link>
          </div>

          <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
            <div className={`relative rounded-full p-[1px] pointer-events-auto ${isDark ? 'bg-gradient-to-r from-indigo-400/40 via-neon/35 to-cyan-300/40' : 'bg-gradient-to-r from-charcoal/60 via-neon/65 to-charcoal/60'}`}>
              <div className={`flex items-center gap-2.5 pl-0.5 pr-3 py-0.5 rounded-full min-w-[240px] ${isDark ? 'bg-[#11151D]' : 'bg-white/95'}`}>
                <div className="w-7 h-7 bg-charcoal rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                  {user?.avatar_url ? (
                    <Image src={user.avatar_url} alt="" width={28} height={28} unoptimized className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <span className="text-neon text-xs font-semibold">{initials}</span>
                  )}
                </div>
                <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-charcoal'} flex-1 min-w-0 max-w-[130px] truncate`}>{displayName}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0 ${isSuperAdmin ? 'bg-neon/20 text-neon' : isDark ? 'bg-white/10 text-white/65' : 'bg-charcoal/8 text-charcoal'}`}>
                  <span className={`h-1 w-1 rounded-full ${isSuperAdmin ? 'bg-neon' : isDark ? 'bg-white/40' : 'bg-charcoal/50'}`} />
                  {isSuperAdmin ? 'Superadmin' : 'Admin'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme((c) => (c === 'dark' ? 'light' : 'dark'))}
                className={`group relative mt-0.5 h-9 w-[78px] overflow-hidden rounded-full border transition-all duration-700 ${
                  isDark
                    ? 'border-indigo-400/25 bg-gradient-to-r from-[#0f172a] to-[#1e1b4b]'
                    : 'border-sky-300/60 bg-gradient-to-r from-[#7dd3fc] to-[#38bdf8]'
                }`}
                aria-label={isDark ? 'Đổi sang giao diện sáng' : 'Đổi sang giao diện tối'}
                title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
              >
                <span className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="theme-toggle-star absolute left-[14%] top-[22%] h-1 w-1 rounded-full bg-white" style={{ animationDelay: '0s' }} />
                  <span className="theme-toggle-star absolute left-[38%] top-[60%] h-0.5 w-0.5 rounded-full bg-white" style={{ animationDelay: '0.7s' }} />
                  <span className="theme-toggle-star absolute left-[58%] top-[18%] h-0.5 w-0.5 rounded-full bg-white/80" style={{ animationDelay: '1.4s' }} />
                  <span className="theme-toggle-star absolute left-[72%] top-[55%] h-1 w-1 rounded-full bg-white/90" style={{ animationDelay: '0.3s' }} />
                  <span className="theme-toggle-star absolute left-[86%] top-[30%] h-0.5 w-0.5 rounded-full bg-white/70" style={{ animationDelay: '1s' }} />
                </span>
                <span className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
                  <span className="theme-toggle-cloud absolute right-[10%] top-[16%] h-3 w-5 rounded-full bg-white/40" />
                  <span className="theme-toggle-cloud absolute right-[32%] top-[54%] h-2.5 w-4 rounded-full bg-white/30" style={{ animationDelay: '1.2s' }} />
                  <span className="theme-toggle-cloud absolute right-[58%] top-[24%] h-2 w-3 rounded-full bg-white/20" style={{ animationDelay: '2.4s' }} />
                </span>

                <span
                  className={`absolute left-1 top-1 h-7 w-7 rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isDark ? 'translate-x-0' : 'translate-x-[42px]'
                  }`}
                >
                  <span className={`absolute inset-[-3px] rounded-full transition-all duration-700 ${isDark ? 'shadow-[0_0_14px_rgba(129,140,248,0.5)]' : 'shadow-[0_0_14px_rgba(251,191,36,0.6)]'}`} />
                  <span className={`absolute inset-0 rounded-full transition-all duration-700 ${isDark ? 'bg-gradient-to-br from-[#e2e8f0] to-[#c7d2e0]' : 'bg-gradient-to-br from-[#fde68a] to-[#f59e0b]'}`} />
                </span>
              </button>
            )}

            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                isDark
                  ? 'border-neon/35 bg-neon/10 text-neon hover:bg-neon/15'
                  : 'border-charcoal bg-charcoal text-neon hover:bg-charcoalLight'
              }`}
            >
              <span className="iconify h-4 w-4" data-icon="lucide:arrow-left" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
