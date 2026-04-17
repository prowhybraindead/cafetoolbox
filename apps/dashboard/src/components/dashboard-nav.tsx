'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect, type ReactNode, type SVGProps } from 'react';
import { BrandMark } from '@cafetoolbox/ui';

function IconShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

function LayoutDashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="4.5" rx="1.5" />
      <rect x="14" y="10.5" width="7" height="9.5" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
    </IconShell>
  );
}

function WrenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6.4 5.9l-4 4a1.5 1.5 0 0 0 2.1 2.1l4-4a4.5 4.5 0 0 0 5.9-6.4l-2.1 2.1-1.9-.6-.6-1.9Z" />
    </IconShell>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2.2 2.2 0 1 1-3.1 3.1l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2.2 2.2 0 1 1-4.4 0v-.1A1.8 1.8 0 0 0 7 19.25a1.8 1.8 0 0 0-1.98.36l-.06.06a2.2 2.2 0 1 1-3.1-3.1l.06-.06A1.8 1.8 0 0 0 2.28 15a1.8 1.8 0 0 0-1.65-1.1H.5a2.2 2.2 0 1 1 0-4.4h.13A1.8 1.8 0 0 0 2.28 8 1.8 1.8 0 0 0 1.92 6.02l-.06-.06a2.2 2.2 0 1 1 3.1-3.1l.06.06A1.8 1.8 0 0 0 7 2.28 1.8 1.8 0 0 0 8.1.63V.5a2.2 2.2 0 1 1 4.4 0v.13A1.8 1.8 0 0 0 13.75 2a1.8 1.8 0 0 0 1.98-.36l.06-.06a2.2 2.2 0 1 1 3.1 3.1l-.06.06A1.8 1.8 0 0 0 19.72 9c.67 0 1.22.55 1.22 1.22v.56c0 .67-.55 1.22-1.22 1.22h-.1A1.8 1.8 0 0 0 18 12.72a1.8 1.8 0 0 0 1.4 2.28Z" />
    </IconShell>
  );
}

function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M12 3 19 6v5c0 5-3.2 8.7-7 10-3.8-1.3-7-5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </IconShell>
  );
}

function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconShell>
  );
}

function LogOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M10 17H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />
      <path d="m14 7 5 5-5 5" />
      <path d="M19 12H10" />
    </IconShell>
  );
}

export type UserInfo = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

function normalizeRole(role: string | null | undefined) {
  if (!role) return 'user';

  const normalized = role.toLowerCase();
  if (normalized === 'superadmin' || normalized === 'admin') {
    return 'superadmin';
  }

  return 'user';
}

export function DashboardNav({ initialUser, theme, setTheme, mounted }: {
  initialUser?: UserInfo | null;
  theme?: 'light' | 'dark';
  setTheme?: (t: (c: 'light' | 'dark') => 'light' | 'dark') => void;
  mounted?: boolean;
}) {
  const [info, setInfo] = useState<UserInfo | null>(initialUser ?? null);
  const [initials, setInitials] = useState(
    (initialUser?.display_name || initialUser?.email?.split('@')[0] || 'User').charAt(0).toUpperCase()
  );
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUser) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadUserInfo() {
      if (!active) return;

      try {
        const response = await fetch('/api/me', { credentials: 'include' });

        if (!active) return;

        if (!response.ok) {
          setInfo(null);
          setInitials('U');
          return;
        }

        const data = (await response.json()) as {
          profile: UserInfo;
          rawRole: string;
        };

        if (!active) return;

        setInfo(data.profile);
        const displayName = data.profile.display_name || data.profile.email.split('@')[0] || 'User';
        setInitials(displayName.charAt(0).toUpperCase());
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUserInfo();

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => {
      active = false;
      document.removeEventListener('mousedown', handleClick);
    };
  }, [initialUser]);

  const displayName = info?.display_name || info?.email?.split('@')[0] || 'User';
  const isSuperAdmin = normalizeRole(info?.role) === 'superadmin';
  const roleLabel = isSuperAdmin ? 'Superadmin' : 'User';
  const isDark = theme === 'dark';

  return (
    <nav className={`border-b sticky top-0 z-40 transition-colors duration-300 ${isDark ? 'border-white/10 bg-[#12151B]/95 backdrop-blur-md' : 'border-borderMain bg-white/95 backdrop-blur-md'}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="rounded-2xl bg-charcoal p-1 shadow-[0_8px_20px_rgba(18,18,18,0.15)] ring-1 ring-black/5">
              <BrandMark className="shrink-0 rounded-xl [filter:brightness(0)_invert(1)]" size={28} />
            </div>
            <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-charcoal'}`}>CafeToolbox</span>
          </Link>

          {/* Center Nav */}
          <div className="hidden sm:flex items-center gap-1">
            <NavLink href="/dashboard" icon={LayoutDashboardIcon} label="Dashboard" isDark={isDark} />
            <NavLink href="/dashboard/tools" icon={WrenchIcon} label="Công cụ" isDark={isDark} />
            <NavLink href="/dashboard/settings" icon={SettingsIcon} label="Cài đặt" isDark={isDark} />
          </div>

          {/* Right: Theme toggle + Admin + Profile */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            {mounted && setTheme && (
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
                  <span
                    className={`absolute inset-[-3px] rounded-full transition-all duration-700 ${
                      isDark
                        ? 'shadow-[0_0_14px_rgba(129,140,248,0.5)]'
                        : 'shadow-[0_0_14px_rgba(251,191,36,0.6)]'
                    }`}
                  />
                  <span
                    className={`absolute inset-0 rounded-full transition-all duration-700 ${
                      isDark
                        ? 'bg-gradient-to-br from-[#e2e8f0] to-[#c7d2e0]'
                        : 'bg-gradient-to-br from-[#fde68a] to-[#f59e0b]'
                    }`}
                  />

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`absolute inset-0 h-full w-full p-1 transition-all duration-500 ${
                      isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                    }`}
                  >
                    <g className={isDark ? '' : 'theme-toggle-rays'}>
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                        <line
                          key={angle}
                          x1="12" y1="2.5" x2="12" y2="5"
                          stroke="#92400e"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          transform={`rotate(${angle} 12 12)`}
                        />
                      ))}
                    </g>
                    <circle cx="12" cy="12" r="4" fill="#92400e" />
                  </svg>

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`absolute inset-0 h-full w-full p-1.5 transition-all duration-500 ${
                      isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
                    }`}
                  >
                    <path
                      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                      fill="#475569"
                    />
                    <circle cx="14" cy="9.5" r="1" fill="#334155" opacity="0.4" />
                    <circle cx="10.5" cy="14.5" r="0.7" fill="#334155" opacity="0.3" />
                  </svg>
                </span>
              </button>
            )}

            {isSuperAdmin && (
              <Link
                href="/admin"
                className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  isDark
                    ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                    : 'bg-charcoal text-neon hover:bg-charcoalLight'
                }`}
              >
                <ShieldIcon className="h-3 w-3" />
                Admin
              </Link>
            )}

            {/* Profile Pill */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`flex items-center gap-2 pl-0.5 pr-2 py-0.5 rounded-full border transition-all hover:shadow-sm ${
                  isDark
                    ? 'border-white/15 bg-white/5 hover:border-white/30'
                    : 'border-borderMain bg-white hover:border-charcoal/30'
                }`}
                disabled={loading}
              >
                <div className="w-7 h-7 bg-charcoal rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                  {info?.avatar_url ? (
                    <Image src={info.avatar_url} alt="" width={28} height={28} unoptimized className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <span className="text-neon text-xs font-semibold">{initials}</span>
                  )}
                </div>
                <div className="text-left hidden md:block leading-tight">
                  <p className={`text-xs font-semibold max-w-[104px] truncate ${isDark ? 'text-white' : 'text-charcoal'}`}>{displayName}</p>
                  <div className="max-w-[104px] truncate mt-0.5">
                    {isSuperAdmin ? (
                      <span className="role-badge-shimmer inline-flex items-center gap-1 px-1.5 py-px rounded-full font-semibold text-[9px] bg-gradient-to-r from-amber-400/20 via-yellow-300/30 to-amber-400/20 text-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.25),inset_0_0_0_0.5px_rgba(251,191,36,0.35)]">
                        <svg className="h-2 w-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" /></svg>
                        {roleLabel}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-medium ${isDark ? 'bg-white/10 text-white/55' : 'bg-charcoal/8 text-charcoal'}`}>
                        <span className={`role-dot-pulse h-1 w-1 rounded-full ${isDark ? 'bg-white/30' : 'bg-charcoal/35'}`} />
                        {roleLabel}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDownIcon className={`h-3 w-3 hidden md:block ${isDark ? 'text-white/50' : 'text-charcoal'}`} />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className={`absolute right-0 top-full mt-2 w-56 border rounded-xl shadow-lg py-2 z-50 transition-colors ${
                  isDark ? 'bg-[#1A1D24] border-white/10' : 'bg-white border-borderMain'
                }`}>
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-borderMain'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-charcoal rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        {info?.avatar_url ? (
                          <Image src={info.avatar_url} alt="" width={40} height={40} unoptimized className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-neon text-sm font-semibold">{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-charcoal'}`}>{displayName}</p>
                        <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-charcoal'}`}>{info?.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {isSuperAdmin ? (
                        <span className="role-badge-shimmer inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gradient-to-r from-amber-400/20 via-yellow-300/30 to-amber-400/20 text-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.25),inset_0_0_0_0.5px_rgba(251,191,36,0.35)]">
                          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" /></svg>
                          {roleLabel}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-white/10 text-white/55' : 'bg-charcoal/8 text-charcoal'}`}>
                          <span className={`role-dot-pulse h-1 w-1 rounded-full ${isDark ? 'bg-white/30' : 'bg-charcoal/35'}`} />
                          {roleLabel}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${isDark ? 'bg-white/5 text-white/50 border-white/10' : 'bg-cream text-charcoal border-borderMain'}`}>
                        <span className="role-dot-pulse h-1.5 w-1.5 rounded-full bg-green-500" />
                        Online
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <DropdownLink href="/dashboard/settings" icon={SettingsIcon} label="Hồ sơ & cài đặt" onClick={() => setMenuOpen(false)} highlight isDark={isDark} />
                    <DropdownLink href="/dashboard" icon={LayoutDashboardIcon} label="Dashboard" onClick={() => setMenuOpen(false)} isDark={isDark} />
                    <DropdownLink href="/dashboard/tools" icon={WrenchIcon} label="Công cụ" onClick={() => setMenuOpen(false)} isDark={isDark} />
                    {isSuperAdmin && (
                      <DropdownLink href="/admin" icon={ShieldIcon} label="Admin Panel" onClick={() => setMenuOpen(false)} highlight isDark={isDark} />
                    )}
                  </div>
                  <div className={`border-t pt-1 ${isDark ? 'border-white/10' : 'border-borderMain'}`}>
                    <DropdownLink href="/logout" icon={LogOutIcon} label="Đăng xuất" onClick={() => setMenuOpen(false)} danger isDark={isDark} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon: Icon, label, isDark }: { href: string; icon: React.ComponentType<SVGProps<SVGSVGElement>>; label: string; isDark?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        isDark
          ? 'text-white/60 hover:text-white hover:bg-white/8'
          : 'text-charcoal hover:text-charcoal hover:bg-cream'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function DropdownLink({
  href,
  icon: Icon,
  label,
  onClick,
  highlight,
  danger,
  isDark,
}: {
  href: string;
  icon: React.ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
  highlight?: boolean;
  danger?: boolean;
  isDark?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
        danger
          ? isDark
            ? 'text-red-400 hover:bg-red-500/10'
            : 'text-red-600 hover:bg-red-50'
          : highlight
          ? isDark
            ? 'text-white font-medium hover:bg-white/8'
            : 'text-charcoal font-medium hover:bg-cream'
          : isDark
          ? 'text-white/55 hover:text-white hover:bg-white/8'
          : 'text-charcoal hover:text-charcoal hover:bg-cream'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
