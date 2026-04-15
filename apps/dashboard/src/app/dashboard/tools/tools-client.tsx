'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Tool = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: string;
  size: string | null;
  [key: string]: unknown;
};

const statusLabels: Record<string, string> = {
  active: 'Hoạt động',
  beta: 'Beta',
  archived: 'Lưu trữ',
  maintenance: 'Bảo trì',
};

const sizeLabels: Record<string, string> = {
  small: 'Nhỏ',
  medium: 'Trung bình',
  large: 'Lớn',
};

export function ToolsPageClient({ tools, error }: { tools: Tool[]; error: string | null }) {
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

  const cardClass = `rounded-xl border p-6 transition-all duration-200 ${
    isDark
      ? 'border-white/10 bg-white/5 hover:border-neon/40 hover:bg-white/8'
      : 'border-white/55 bg-white/40 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] hover:border-neon hover:bg-white/50'
  }`;

  const tagBase = 'text-xs px-2.5 py-1 rounded font-medium';

  function getStatusClass(status: string) {
    if (isDark) {
      switch (status) {
        case 'active': return `${tagBase} bg-neon/15 text-neon`;
        case 'beta': return `${tagBase} bg-blue-500/15 text-blue-400`;
        case 'archived': return `${tagBase} bg-white/10 text-white/40`;
        case 'maintenance': return `${tagBase} bg-yellow-500/15 text-yellow-400`;
        default: return `${tagBase} bg-white/10 text-white/50`;
      }
    }
    switch (status) {
      case 'active': return `${tagBase} bg-neonGhost text-neon`;
      case 'beta': return `${tagBase} bg-blue-100 text-blue-600`;
      case 'archived': return `${tagBase} bg-gray-100 text-gray-600`;
      case 'maintenance': return `${tagBase} bg-yellow-100 text-yellow-600`;
      default: return `${tagBase} bg-gray-100 text-gray-600`;
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-charcoal'}`}>
          Bộ công cụ
        </h1>
        <p className={isDark ? 'text-white/60' : 'text-charcoal'}>
          Duyệt qua tất cả công cụ hiện có trong hệ thống
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className={`rounded-lg p-6 mb-6 ${
          isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="iconify text-red-500" data-icon="lucide:alert-circle" data-width="20" />
            <p className={`font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              Lỗi tải công cụ: {error}
            </p>
          </div>
        </div>
      )}

      {/* Tools Grid */}
      {!error && tools.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div key={tool.id} className={cardClass}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-white/10' : 'bg-charcoal'
                }`}>
                  <span className="iconify text-neon" data-icon={tool.icon} data-width="24" />
                </div>
                <span className={getStatusClass(tool.status)}>
                  {statusLabels[tool.status] || tool.status}
                </span>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-charcoal'}`}>
                {tool.name}
              </h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-white/55' : 'text-charcoal'}`}>
                {tool.description}
              </p>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-charcoal'}`}>
                  Kích thước: {sizeLabels[tool.size ?? ''] || tool.size || '−'}
                </span>
                {tool.status === 'active' || tool.status === 'beta' ? (
                  <Link
                    href={`/api/tools/launch?toolId=${encodeURIComponent(tool.id)}`}
                    className={`text-sm font-medium transition-colors ${
                      isDark ? 'text-neon hover:text-neon/80' : 'text-charcoal hover:text-neon'
                    }`}
                  >
                    Mở →
                  </Link>
                ) : (
                  <span className={`text-sm ${isDark ? 'text-white/30' : 'text-charcoal'}`}>
                    Không khả dụng
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !error ? (
        <div className={cardClass}>
          <div className="p-12 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDark ? 'bg-white/10' : 'bg-borderLight'
            }`}>
              <span className={`iconify ${isDark ? 'text-white/30' : 'text-charcoal'}`} data-icon="lucide:package" data-width="32" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-charcoal'}`}>
              Chưa có công cụ
            </h3>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-charcoal'}`}>
              Chưa có công cụ nào trong cơ sở dữ liệu. Liên hệ quản trị viên để thêm.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
