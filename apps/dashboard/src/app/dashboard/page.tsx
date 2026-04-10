import Link from 'next/link';
import { createServerClient } from '@cafetoolbox/supabase';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="border-b border-borderMain bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon rounded-lg flex items-center justify-center">
              <span
                className="iconify text-charcoal"
                data-icon="lucide:terminal"
                data-width="20"
              />
            </div>
            <span className="text-xl font-semibold tracking-tight">CafeToolbox</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-charcoalMuted">
              {user?.email || 'Guest'}
            </span>
            <Link
              href="/logout"
              className="text-charcoalMuted hover:text-charcoal transition-colors"
            >
              Đăng xuất
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
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
              <span
                className="iconify text-neon"
                data-icon="lucide:wrench"
                data-width="20"
              />
              <span className="font-mono text-xs text-neon bg-neonGhost px-2 py-0.5 rounded">
                Tools
              </span>
            </div>
            <div className="text-3xl font-semibold font-mono">{toolsCount || 0}</div>
            <p className="text-xs text-charcoalMuted mt-1">Tổng số công cụ</p>
          </div>

          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span
                className="iconify text-neon"
                data-icon="lucide:server"
                data-width="20"
              />
              <span className="font-mono text-xs text-neon bg-neonGhost px-2 py-0.5 rounded">
                Services
              </span>
            </div>
            <div className="text-3xl font-semibold font-mono">{servicesCount || 0}</div>
            <p className="text-xs text-charcoalMuted mt-1">Service hoạt động</p>
          </div>

          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span
                className="iconify text-neon"
                data-icon="lucide:zap"
                data-width="20"
              />
              <span className="font-mono text-xs text-neon bg-neonGhost px-2 py-0.5 rounded">
                Status
              </span>
            </div>
            <div className={`text-3xl font-semibold font-mono ${statusClass}`}>{statusLabel}</div>
            <p className="text-xs text-charcoalMuted mt-1">Trạng thái dịch vụ hiện tại</p>
          </div>

          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span
                className="iconify text-neon"
                data-icon="lucide:clock"
                data-width="20"
              />
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
                <span
                  className="iconify text-neon group-hover:text-charcoal"
                  data-icon="lucide:wrench"
                  data-width="24"
                />
              </div>
              <span
                className="iconify text-charcoalMuted"
                data-icon="lucide:arrow-right"
                data-width="20"
              />
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
                <span
                  className="iconify text-neon group-hover:text-charcoal"
                  data-icon="lucide:settings"
                  data-width="24"
                />
              </div>
              <span
                className="iconify text-charcoalMuted"
                data-icon="lucide:arrow-right"
                data-width="20"
              />
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
    </div>
  );
}

