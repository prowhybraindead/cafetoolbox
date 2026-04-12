'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, type ReactNode, type SVGProps } from 'react';

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

function TerminalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="m5 6 7 6-7 6" />
      <path d="M12 18h7" />
    </IconShell>
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

type UserInfo = {
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

export function DashboardNav({ initialUser }: { initialUser?: UserInfo | null }) {
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

  return (
    <nav className="border-b border-borderMain bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-neon rounded-lg flex items-center justify-center">
              <TerminalIcon className="h-4 w-4 text-charcoal" />
            </div>
            <span className="text-lg font-bold tracking-tight text-charcoal">CafeToolbox</span>
          </Link>

          {/* Center Nav */}
          <div className="hidden sm:flex items-center gap-1">
            <NavLink href="/dashboard" icon={LayoutDashboardIcon} label="Dashboard" />
            <NavLink href="/dashboard/tools" icon={WrenchIcon} label="Công cụ" />
            <NavLink href="/dashboard/settings" icon={SettingsIcon} label="Cài đặt" />
          </div>

          {/* Right: Admin link + Profile Pill */}
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 text-xs bg-charcoal text-neon px-3 py-1.5 rounded-full font-medium hover:bg-charcoalLight transition-colors"
              >
                <ShieldIcon className="h-3 w-3" />
                Admin
              </Link>
            )}

            {/* Profile Pill */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-borderMain bg-white hover:border-charcoal/30 hover:shadow-sm transition-all"
                disabled={loading}
              >
                <div className="w-8 h-8 bg-charcoal rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                  {info?.avatar_url ? (
                    <img src={info.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="text-neon text-sm font-semibold">{initials}</span>
                  )}
                </div>
                <div className="text-left hidden md:block leading-tight">
                  <p className="text-sm font-medium text-charcoal max-w-[120px] truncate">{displayName}</p>
                  <p className="text-[10px] text-charcoalMuted max-w-[120px] truncate">{roleLabel}</p>
                </div>
                <ChevronDownIcon className="h-3.5 w-3.5 text-charcoalMuted hidden md:block" />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-borderMain rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-3 border-b border-borderMain">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-charcoal rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        {info?.avatar_url ? (
                          <img src={info.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-neon text-sm font-semibold">{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-charcoal truncate">{displayName}</p>
                        <p className="text-xs text-charcoalMuted truncate">{info?.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neonGhost text-charcoal font-medium">{roleLabel}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream text-charcoalMuted border border-borderMain">Online</span>
                    </div>
                  </div>
                  <div className="py-1">
                    <DropdownLink href="/dashboard/settings" icon={SettingsIcon} label="Hồ sơ & cài đặt" onClick={() => setMenuOpen(false)} highlight />
                    <DropdownLink href="/dashboard" icon={LayoutDashboardIcon} label="Dashboard" onClick={() => setMenuOpen(false)} />
                    <DropdownLink href="/dashboard/tools" icon={WrenchIcon} label="Công cụ" onClick={() => setMenuOpen(false)} />
                    {isSuperAdmin && (
                      <DropdownLink href="/admin" icon={ShieldIcon} label="Admin Panel" onClick={() => setMenuOpen(false)} highlight />
                    )}
                  </div>
                  <div className="border-t border-borderMain pt-1">
                    <DropdownLink href="/logout" icon={LogOutIcon} label="Đăng xuất" onClick={() => setMenuOpen(false)} danger />
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

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<SVGProps<SVGSVGElement>>; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-charcoalMuted hover:text-charcoal hover:bg-cream transition-colors"
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
}: {
  href: string;
  icon: React.ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : highlight
          ? 'text-charcoal font-medium hover:bg-cream'
          : 'text-charcoalMuted hover:text-charcoal hover:bg-cream'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
