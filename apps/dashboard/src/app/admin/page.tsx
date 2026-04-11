import Link from 'next/link';
import { headers } from 'next/headers';
import type { SVGProps } from 'react';

function IconShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
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

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconShell>
  );
}

export default async function AdminPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${protocol}://${host}`;

  const response = await fetch(`${baseUrl}/api/admin/stats`, {
    cache: 'no-store',
  });

  const statsResult = (await response.json()) as {
    categories?: number;
    tools?: number;
    users?: number;
  };

  const stats = [
    { label: 'Danh mục', count: statsResult.categories ?? 0, icon: FolderIcon, href: '/admin/categories', color: 'bg-blue-500', iconClass: 'text-white' },
    { label: 'Công cụ', count: statsResult.tools ?? 0, icon: WrenchIcon, href: '/admin/tools', color: 'bg-neon', iconClass: 'text-charcoal' },
    { label: 'Người dùng', count: statsResult.users ?? 0, icon: UsersIcon, href: '/admin/users', color: 'bg-purple-500', iconClass: 'text-white' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal">Admin Panel</h1>
        <p className="text-sm text-charcoalMuted mt-1">Quản lý toàn bộ hệ thống CafeToolbox</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-3 gap-5 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white border border-borderMain rounded-xl p-6 hover:border-neon/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-charcoalMuted">{stat.label}</p>
                <p className="text-3xl font-bold text-charcoal mt-1">{stat.count}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-6 w-6 ${stat.iconClass}`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-borderMain rounded-xl p-6">
        <h2 className="text-lg font-semibold text-charcoal mb-4">Thao tác nhanh</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            href="/admin/categories"
            className="flex items-center gap-3 p-4 rounded-lg border border-borderMain hover:border-neon/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-charcoal text-neon flex items-center justify-center">
              <PlusIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">Thêm danh mục mới</p>
              <p className="text-xs text-charcoalMuted">Tạo nhóm phân loại công cụ</p>
            </div>
          </Link>
          <Link
            href="/admin/tools"
            className="flex items-center gap-3 p-4 rounded-lg border border-borderMain hover:border-neon/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-charcoal text-neon flex items-center justify-center">
              <PlusIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">Thêm công cụ mới</p>
              <p className="text-xs text-charcoalMuted">Đăng ký công cụ vào hệ thống</p>
            </div>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-4 rounded-lg border border-borderMain hover:border-neon/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-charcoal text-neon flex items-center justify-center">
              <UsersIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">Quản lý người dùng</p>
              <p className="text-xs text-charcoalMuted">Xem và phân quyền user</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
