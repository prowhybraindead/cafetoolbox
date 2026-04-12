import Link from 'next/link';
import { createServerClient } from '@cafetoolbox/supabase';
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

function WrenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6.4 5.9l-4 4a1.5 1.5 0 0 0 2.1 2.1l4-4a4.5 4.5 0 0 0 5.9-6.4l-2.1 2.1-1.9-.6-.6-1.9Z" />
    </IconShell>
  );
}

function ServerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
      <path d="M7 7h.01" />
      <path d="M7 17h.01" />
    </IconShell>
  );
}

function ZapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="m13 2-9 12h6l-1 8 9-12h-6l1-8Z" />
    </IconShell>
  );
}

function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconShell>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconShell {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
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

export default async function DashboardPage() {
  const supabase = await createServerClient();

  // Fetch tools count
  const { count: toolsCount } = await supabase
    .from('tools')
    .select('*', { count: 'exact', head: true });

  // Fetch active services count
  const { count: servicesCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'operational');

  const { data: servicesRaw } = await supabase
    .from('services')
    .select('status, uptime');

  const services = servicesRaw || [];
  const hasMajorOutage = services.some((service) => service.status === 'major_outage');
  const hasPartialOutage = services.some((service) => service.status === 'partial_outage');
  const hasDegraded = services.some((service) => service.status === 'degraded');

  let statusLabel = 'Hoạt động';
  let statusClass = 'text-green-500';

  if (services.length === 0) {
    statusLabel = 'Không có dữ liệu';
    statusClass = 'text-charcoalMuted';
  } else if (hasMajorOutage) {
    statusLabel = 'Sự cố lớn';
    statusClass = 'text-red-500';
  } else if (hasPartialOutage) {
    statusLabel = 'Sự cố cục bộ';
    statusClass = 'text-orange-500';
  } else if (hasDegraded) {
    statusLabel = 'Giảm hiệu suất';
    statusClass = 'text-yellow-600';
  }

  const uptimeAverage =
    services.length > 0
      ? services.reduce((total, service) => total + Number(service.uptime || 0), 0) / services.length
      : 0;

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">
            Dashboard
          </h1>
          <p className="text-charcoalMuted">
            Chào mừng quay lại! Theo dõi tổng quan hệ thống của bạn.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <WrenchIcon className="h-5 w-5 text-neon" />
              <span className="font-mono text-xs text-neon bg-neonGhost px-2 py-0.5 rounded">
                Tools
              </span>
            </div>
            <div className="text-3xl font-semibold font-mono">{toolsCount || 0}</div>
            <p className="text-xs text-charcoalMuted mt-1">Tổng số công cụ</p>
          </div>

          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <ServerIcon className="h-5 w-5 text-neon" />
              <span className="font-mono text-xs text-neon bg-neonGhost px-2 py-0.5 rounded">
                Services
              </span>
            </div>
            <div className="text-3xl font-semibold font-mono">{servicesCount || 0}</div>
            <p className="text-xs text-charcoalMuted mt-1">Service hoạt động</p>
          </div>

          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <ZapIcon className="h-5 w-5 text-neon" />
              <span className="font-mono text-xs text-neon bg-neonGhost px-2 py-0.5 rounded">
                Status
              </span>
            </div>
            <div className={`text-3xl font-semibold font-mono ${statusClass}`}>{statusLabel}</div>
            <p className="text-xs text-charcoalMuted mt-1">Trạng thái dịch vụ hiện tại</p>
          </div>

          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <ClockIcon className="h-5 w-5 text-neon" />
              <span className="font-mono text-xs text-neon bg-neonGhost px-2 py-0.5 rounded">
                Uptime
              </span>
            </div>
            <div className="text-3xl font-semibold font-mono">{uptimeAverage.toFixed(2)}%</div>
            <p className="text-xs text-charcoalMuted mt-1">Uptime trung bình từ bảng services</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/dashboard/tools"
            className="bg-white border border-borderMain rounded-xl p-6 hover:border-neon transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-charcoal rounded-lg flex items-center justify-center group-hover:bg-neon transition-colors">
                <WrenchIcon className="h-6 w-6 text-neon group-hover:text-charcoal" />
              </div>
              <ArrowRightIcon className="h-5 w-5 text-charcoalMuted" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              Bộ công cụ
            </h3>
            <p className="text-sm text-charcoalMuted">
              Xem và sử dụng tất cả công cụ hiện có trong hệ thống
            </p>
          </Link>

          <Link
            href="/dashboard/settings"
            className="bg-white border border-borderMain rounded-xl p-6 hover:border-neon transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-charcoal rounded-lg flex items-center justify-center group-hover:bg-neon transition-colors">
                <SettingsIcon className="h-6 w-6 text-neon group-hover:text-charcoal" />
              </div>
              <ArrowRightIcon className="h-5 w-5 text-charcoalMuted" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              Cài đặt
            </h3>
            <p className="text-sm text-charcoalMuted">
              Quản lý thông tin profile và cài đặt tài khoản
            </p>
          </Link>
        </div>
      </main>
  );
}

