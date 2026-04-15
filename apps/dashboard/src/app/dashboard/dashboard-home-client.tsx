'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function DashboardHomeClient({
  toolsCount,
  servicesCount,
  services,
}: {
  toolsCount: number;
  servicesCount: number;
  services: { status: string; uptime: number }[];
}) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const syncTheme = () => {
      const domTheme = document.documentElement.dataset.theme;
      if (domTheme === 'dark' || domTheme === 'light') {
        setIsDark(domTheme === 'dark');
        return;
      }

      const saved = window.localStorage.getItem('cafetoolbox-theme');
      setIsDark(saved === 'dark');
    };

    const handleThemeChange = () => syncTheme();
    const handleStorage = () => syncTheme();

    window.addEventListener('cafetoolbox-theme-change', handleThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('cafetoolbox-theme-change', handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [mounted]);

  const hasMajorOutage = services.some((s) => s.status === 'major_outage');
  const hasPartialOutage = services.some((s) => s.status === 'partial_outage');
  const hasDegraded = services.some((s) => s.status === 'degraded');

  let statusLabel = 'Hoạt động';
  let statusDotColor = 'bg-green-500';

  if (services.length === 0) {
    statusLabel = 'Không có dữ liệu';
    statusDotColor = isDark ? 'bg-white/30' : 'bg-charcoalMuted';
  } else if (hasMajorOutage) {
    statusLabel = 'Sự cố lớn';
    statusDotColor = 'bg-red-500';
  } else if (hasPartialOutage) {
    statusLabel = 'Sự cố cục bộ';
    statusDotColor = 'bg-orange-500';
  } else if (hasDegraded) {
    statusLabel = 'Giảm hiệu suất';
    statusDotColor = 'bg-yellow-500';
  }

  const uptimeAverage =
    services.length > 0
      ? services.reduce((total, s) => total + s.uptime, 0) / services.length
      : 0;

  const metricCards = [
    { tag: 'Tools', value: String(toolsCount), label: 'Tổng số công cụ', icon: 'lucide:wrench' },
    { tag: 'Services', value: String(servicesCount), label: 'Service hoạt động', icon: 'lucide:server' },
    { tag: 'Status', value: statusLabel, label: 'Trạng thái dịch vụ', isStatus: true },
    { tag: 'Uptime', value: `${uptimeAverage.toFixed(2)}%`, label: 'Uptime trung bình', icon: 'lucide:clock' },
  ];

  const cardClass = `rounded-lg border p-6 transition-colors duration-300 ${
    isDark
      ? 'border-white/10 bg-white/5'
      : 'border-white/55 bg-white/42 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
  }`;

  const tagClass = `font-mono text-xs px-2 py-0.5 rounded ${
    isDark ? 'text-neon bg-neon/10' : 'text-neon bg-neonGhost'
  }`;

  const labelClass = `text-xs mt-1 ${isDark ? 'text-white/50' : 'text-charcoal'}`;

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-charcoal'}`}>
          Dashboard
        </h1>
        <p className={isDark ? 'text-white/60' : 'text-charcoal'}>
          Chào mừng quay lại! Theo dõi tổng quan hệ thống của bạn.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {metricCards.map((card) => (
          <div key={card.tag} className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              {card.icon && (
                <span className={`iconify h-5 w-5 text-neon`} data-icon={card.icon} />
              )}
              {card.isStatus && (
                <span className={`role-dot-pulse h-2 w-2 rounded-full ${statusDotColor}`} />
              )}
              {!card.isStatus && !card.icon && (
                <span className={`iconify h-5 w-5 text-neon`} data-icon="lucide:activity" />
              )}
              <span className={tagClass}>{card.tag}</span>
            </div>
            <div className={`text-2xl font-semibold font-mono ${isDark ? 'text-white' : 'text-charcoal'}`}>
              {card.value}
            </div>
            <p className={labelClass}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-5">
        <Link
          href="/dashboard/tools"
          className={`rounded-lg border p-6 transition-all duration-200 group ${
            isDark
              ? 'border-white/10 bg-white/5 hover:border-neon/40 hover:bg-white/8'
              : 'border-white/55 bg-white/38 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] hover:border-neon hover:bg-white/48'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              isDark
                ? 'bg-white/10 group-hover:bg-neon'
                : 'bg-charcoal group-hover:bg-neon'
            }`}>
              <span className={`iconify h-6 w-6 transition-colors ${
                isDark ? 'text-neon group-hover:text-charcoal' : 'text-neon group-hover:text-charcoal'
              }`} data-icon="lucide:wrench" />
            </div>
            <span className={`iconify h-5 w-5 ${isDark ? 'text-white/30' : 'text-charcoal'}`} data-icon="lucide:arrow-right" />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-charcoal'}`}>
            Bộ công cụ
          </h3>
          <p className={`text-sm ${isDark ? 'text-white/55' : 'text-charcoal'}`}>
            Xem và sử dụng tất cả công cụ hiện có trong hệ thống
          </p>
        </Link>

        <Link
          href="/dashboard/settings"
          className={`rounded-lg border p-6 transition-all duration-200 group ${
            isDark
              ? 'border-white/10 bg-white/5 hover:border-neon/40 hover:bg-white/8'
              : 'border-white/55 bg-white/38 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] hover:border-neon hover:bg-white/48'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              isDark
                ? 'bg-white/10 group-hover:bg-neon'
                : 'bg-charcoal group-hover:bg-neon'
            }`}>
              <span className={`iconify h-6 w-6 transition-colors ${
                isDark ? 'text-neon group-hover:text-charcoal' : 'text-neon group-hover:text-charcoal'
              }`} data-icon="lucide:settings" />
            </div>
            <span className={`iconify h-5 w-5 ${isDark ? 'text-white/30' : 'text-charcoal'}`} data-icon="lucide:arrow-right" />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-charcoal'}`}>
            Cài đặt
          </h3>
          <p className={`text-sm ${isDark ? 'text-white/55' : 'text-charcoal'}`}>
            Quản lý thông tin profile và cài đặt tài khoản
          </p>
        </Link>
      </div>
    </main>
  );
}
