"use client";

import Link from 'next/link';

export default function HomePage() {
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
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-charcoalMuted hover:text-charcoal transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-neonGhost border border-neon rounded-full px-4 py-2 mb-6">
              <span
                className="iconify text-neon"
                data-icon="lucide:sparkles"
                data-width="16"
              />
              <span className="text-sm text-charcoal font-medium">
                Tất cả công cụ bạn cần trong một nơi
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-6 tracking-tight">
              Bộ công cụ {' '}
              <span className="text-neon">
                đa năng
              </span>
              {' '}cho nhà phát triển
            </h1>
            <p className="text-lg text-charcoalMuted mb-8 leading-relaxed">
              Dễ dàng quản lý dự án, theo dõi trạng thái hệ thống, và sử dụng hàng tá công cụ tiện ích.
              Tối ưu hóa quy trình làm việc của bạn với giao diện người dùng hiện đại và trực quan.
            </p>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="bg-charcoal text-white px-6 py-3 rounded-lg font-medium hover:bg-charcoalLight transition-colors"
              >
                Bắt đầu ngay
              </Link>
              <Link
                href="/login"
                className="border border-borderMain text-charcoal px-6 py-3 rounded-lg font-medium hover:bg-borderLight transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="bg-white border border-borderMain rounded-xl p-6 shadow-sm">
              <div className=" space-y-4">
                <div className="flex items-center gap-3 p-3 bg-charcoal rounded-lg">
                  <span
                    className="iconify text-neon"
                    data-icon="lucide:palette"
                    data-width="20"
                  />
                  <span className="text-white text-sm">Color Picker</span>
                  <span className="ml-auto bg-neon text-charcoal text-xs px-2 py-1 rounded">Active</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-charcoal rounded-lg">
                  <span
                    className="iconify text-neon"
                    data-icon="lucide:code-2"
                    data-width="20"
                  />
                  <span className="text-white text-sm">JSON Formatter</span>
                  <span className="ml-auto bg-neon text-charcoal text-xs px-2 py-1 rounded">Active</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-charcoal rounded-lg">
                  <span
                    className="iconify text-neon"
                    data-icon="lucide:file-text"
                    data-width="20"
                  />
                  <span className="text-white text-sm">Markdown Preview</span>
                  <span className="ml-auto bg-neon text-charcoal text-xs px-2 py-1 rounded">Active</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-charcoal rounded-lg opacity-40">
                  <span
                    className="iconify text-neon"
                    data-icon="lucide:hash"
                    data-width="20"
                  />
                  <span className="text-white text-sm">Regex Tester</span>
                  <span className="ml-auto bg-neonGhost text-charcoal text-xs px-2 py-1 rounded">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-borderMain">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-charcoal mb-4">
            Tính năng nổi bật
          </h2>
          <p className="text-charcoalMuted">
            Tất cả những gì bạn cần để tăng năng suất
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="w-12 h-12 bg-neonGhost border border-neon rounded-lg flex items-center justify-center mb-4">
              <span
                className="iconify text-neon"
                data-icon="lucide:wrench"
                data-width="24"
              />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              Bộ công cụ đa năng
            </h3>
            <p className="text-sm text-charcoalMuted">
              Hơn 20 công cụ tiện ích cho lập trình viên: format code, generate UUID, regex tester, và nhiều hơn nữa.
            </p>
          </div>
          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="w-12 h-12 bg-neonGhost border border-neon rounded-lg flex items-center justify-center mb-4">
              <span
                className="iconify text-neon"
                data-icon="lucide:bar-chart-3"
                data-width="24"
              />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              Status Page
            </h3>
            <p className="text-sm text-charcoalMuted">
              Theo dõi trạng thái của các dịch vụ và project. Thông báo cho người dùng về sự cố bảo trì hoặc lỗi.
            </p>
          </div>
          <div className="bg-white border border-borderMain rounded-xl p-6">
            <div className="w-12 h-12 bg-neonGhost border border-neon rounded-lg flex items-center justify-center mb-4">
              <span
                className="iconify text-neon"
                data-icon="lucide:shield-check"
                data-width="24"
              />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              Bảo mật & RLS
            </h3>
            <p className="text-sm text-charcoalMuted">
              Row Level Security đảm bảo chỉ người dùng được cấp quyền mới truy cập dữ liệu. Việc tạo tài khoản được quản lý bởi Superadmin.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-borderMain bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-neon rounded-lg flex items-center justify-center">
                <span
                  className="iconify text-charcoal"
                  data-icon="lucide:terminal"
                  data-width="16"
                />
              </div>
              <span className="font-semibold text-charcoal">CafeToolbox</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-charcoalMuted">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-charcoal transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-charcoal transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-charcoal transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
