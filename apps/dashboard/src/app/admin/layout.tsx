import { createAdminClient, createServerClient } from '@cafetoolbox/supabase';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode, SVGProps } from 'react';

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

function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
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

async function checkSuperAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const rawRole = user.app_metadata?.role ?? user.user_metadata?.role ?? null;

  return rawRole === 'superadmin' || rawRole === 'admin';
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isSuperAdmin = await checkSuperAdmin();

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Top Navigation */}
      <nav className="border-b border-borderMain bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neon rounded-lg flex items-center justify-center">
                  <TerminalIcon className="h-5 w-5 text-charcoal" />
                </div>
                <span className="text-xl font-semibold tracking-tight">CafeToolbox</span>
              </Link>
              <span className="text-xs bg-charcoal text-neon px-2 py-0.5 rounded font-medium">ADMIN</span>
            </div>
            <Link href="/dashboard" className="text-sm text-charcoalMuted hover:text-charcoal transition-colors flex items-center gap-1">
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Quay lại Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-56 shrink-0">
            <nav className="space-y-1">
              <AdminNavLink href="/admin" icon={LayoutDashboardIcon} label="Tổng quan" />
              <AdminNavLink href="/admin/categories" icon={FolderIcon} label="Danh mục" />
              <AdminNavLink href="/admin/tools" icon={WrenchIcon} label="Công cụ" />
              <AdminNavLink href="/admin/users" icon={UsersIcon} label="Người dùng" />
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminNavLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<SVGProps<SVGSVGElement>>; label: string }) {
  // Note: active state will be handled by the page component
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-charcoalMuted hover:bg-white hover:text-charcoal transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
