'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode, type SVGProps } from 'react';
import { AdminHeader } from './admin-header';

type AdminShellUser = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

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

function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
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

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="8" r="3" />
      <path d="M22 20v-1a3.5 3.5 0 0 0-2.5-3.35" />
      <path d="M16.5 5.2a3 3 0 0 1 0 5.6" />
    </IconShell>
  );
}

function AdminNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-charcoal hover:bg-white/60 transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function AdminThemeShell({
  user,
  children,
}: {
  user: AdminShellUser | null;
  children: ReactNode;
}) {
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
    const handleThemeChange = () => syncTheme();
    const handleStorage = () => syncTheme();
    window.addEventListener('cafetoolbox-theme-change', handleThemeChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('cafetoolbox-theme-change', handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <div className={`admin-scope ${isDark ? 'admin-dark' : 'admin-light'} relative min-h-screen overflow-hidden ${isDark ? 'bg-[#0F1115] text-white' : 'bg-cream text-charcoal'}`}>
      {isDark ? (
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(99,102,241,0.2),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_50%_-20%,rgba(71,85,130,0.45),transparent_52%),linear-gradient(to_bottom,#060910,#0C1221_42%,#121C31)]" />
          <span className="landing-bg-star absolute left-[8%] top-[14%] h-1 w-1 rounded-full bg-white/80" />
          <span className="landing-bg-star absolute left-[22%] top-[27%] h-[3px] w-[3px] rounded-full bg-white/70" style={{ animationDelay: '0.8s' }} />
          <span className="landing-bg-star absolute left-[49%] top-[9%] h-1 w-1 rounded-full bg-white/80" style={{ animationDelay: '1.9s' }} />
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#A6E0FF_0%,#87D6FF_24%,#5BC0EE_44%,#309FD8_66%,#1B7FC0_100%)]" />
          <div className="landing-bg-wave-a landing-bg-wave-swell absolute left-[-20%] bottom-[14%] h-40 w-[150%] rounded-[100%] bg-white/22 blur-[1px]" />
          <div className="landing-bg-wave-b landing-bg-wave-break absolute left-[-16%] bottom-[8%] h-32 w-[138%] rounded-[100%] bg-[#E1F7FF]/30" />
          <div className="landing-bg-wave-a landing-bg-wave-swell absolute left-[-28%] bottom-[2%] h-30 w-[160%] rounded-[100%] bg-[#CCEEFF]/34" style={{ animationDuration: '18s', animationDelay: '1.2s' }} />
        </div>
      )}

      <div className="relative z-10">
        <AdminHeader user={user} />

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-8">
            <aside className="w-56 shrink-0">
              <nav className={`space-y-1 rounded-xl p-2 ${isDark ? 'border border-white/10 bg-white/5' : 'glass-light-card'}`}>
                <AdminNavLink href="/admin" icon={LayoutDashboardIcon} label="Tổng quan" />
                <AdminNavLink href="/admin/categories" icon={FolderIcon} label="Danh mục" />
                <AdminNavLink href="/admin/tools" icon={WrenchIcon} label="Công cụ" />
                <AdminNavLink href="/admin/users" icon={UsersIcon} label="Người dùng" />
              </nav>
            </aside>

            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

