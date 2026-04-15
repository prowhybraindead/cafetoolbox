"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { BrandMark } from '@cafetoolbox/ui';

type UserInfo = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

type LandingOverview = {
  toolsCount: number;
  openIncidents: number;
  averageUptime: number;
  healthyServices: number;
  totalServices: number;
  securityTech?: string;
};

function normalizeRole(role: string | null | undefined) {
  if (!role) return 'user';

  const normalized = role.toLowerCase();
  if (normalized === 'superadmin' || normalized === 'admin') {
    return 'superadmin';
  }

  return 'user';
}

export default function HomePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [overview, setOverview] = useState<LandingOverview | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? window.localStorage.getItem('cafetoolbox-theme') : null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem('cafetoolbox-theme', theme);
  }, [theme, mounted]);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch('/api/me', { credentials: 'include' });

        if (!active) return;

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = (await response.json()) as { profile: UserInfo };
        setUser(data.profile);
      } finally {
        if (active) {
          setCheckedAuth(true);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const response = await fetch('/api/landing/overview', { cache: 'no-store' });
        if (!active || !response.ok) return;

        const data = (await response.json()) as LandingOverview;
        setOverview(data);
      } catch {
        // Keep UI stable; fallback values are shown.
      }
    }

    loadOverview();
    return () => {
      active = false;
    };
  }, []);

  const displayName = user?.display_name || user?.email?.split('@')[0] || 'User';
  const roleLabel = normalizeRole(user?.role) === 'superadmin' ? 'Superadmin' : 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const toolsCount = overview?.toolsCount ?? 0;
  const averageUptime = overview?.averageUptime ?? 0;
  const healthyServices = overview?.healthyServices ?? 0;
  const totalServices = overview?.totalServices ?? 0;
  const securityTech = overview?.securityTech ?? 'Supabase Auth + RLS';
  const isDark = theme === 'dark';

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? 'bg-[#0F1115] text-white' : 'bg-cream text-charcoal'}`}>
      {/* Dynamic background */}
      {isDark ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(99,102,241,0.2),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_50%_-20%,rgba(71,85,130,0.45),transparent_52%),linear-gradient(to_bottom,#060910,#0C1221_42%,#121C31)]" />
          <span className="landing-bg-star absolute left-[8%] top-[14%] h-1 w-1 rounded-full bg-white/80" />
          <span className="landing-bg-star absolute left-[22%] top-[27%] h-[3px] w-[3px] rounded-full bg-white/70" style={{ animationDelay: '0.8s' }} />
          <span className="landing-bg-star absolute left-[35%] top-[18%] h-[2px] w-[2px] rounded-full bg-white/70" style={{ animationDelay: '1.4s' }} />
          <span className="landing-bg-star absolute left-[49%] top-[9%] h-1 w-1 rounded-full bg-white/80" style={{ animationDelay: '1.9s' }} />
          <span className="landing-bg-star absolute left-[63%] top-[24%] h-[3px] w-[3px] rounded-full bg-white/70" style={{ animationDelay: '0.5s' }} />
          <span className="landing-bg-star absolute left-[77%] top-[16%] h-[2px] w-[2px] rounded-full bg-white/75" style={{ animationDelay: '2.1s' }} />
          <span className="landing-bg-star absolute left-[89%] top-[29%] h-1 w-1 rounded-full bg-white/70" style={{ animationDelay: '1.2s' }} />
          <span className="landing-bg-star absolute left-[13%] top-[36%] h-[2px] w-[2px] rounded-full bg-white/65" style={{ animationDelay: '2.8s' }} />
          <span className="landing-bg-star absolute left-[56%] top-[33%] h-1 w-1 rounded-full bg-white/72" style={{ animationDelay: '3.2s' }} />
          <span className="landing-bg-star absolute left-[84%] top-[41%] h-[2px] w-[2px] rounded-full bg-white/60" style={{ animationDelay: '1.7s' }} />

          <span className="landing-bg-shooting-a absolute right-[18%] top-[12%] h-[2px] w-28 origin-right bg-gradient-to-l from-white via-white/40 to-transparent blur-[0.2px]" />
          <span className="landing-bg-shooting-b absolute right-[5%] top-[28%] h-[2px] w-24 origin-right bg-gradient-to-l from-[#c7d2fe] via-[#c7d2fe]/40 to-transparent blur-[0.2px]" style={{ animationDelay: '2.9s' }} />
          <span className="landing-bg-shooting-c absolute right-[28%] top-[6%] h-[2px] w-32 origin-right bg-gradient-to-l from-[#e2e8f0] via-[#e2e8f0]/45 to-transparent blur-[0.15px]" style={{ animationDelay: '5.1s' }} />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#A6E0FF_0%,#87D6FF_24%,#5BC0EE_44%,#309FD8_66%,#1B7FC0_100%)]" />
          <div className="landing-bg-wave-a landing-bg-wave-swell absolute left-[-20%] bottom-[14%] h-40 w-[150%] rounded-[100%] bg-white/22 blur-[1px]" />
          <div className="landing-bg-wave-b landing-bg-wave-break absolute left-[-16%] bottom-[8%] h-32 w-[138%] rounded-[100%] bg-[#E1F7FF]/30" />
          <div className="landing-bg-wave-a landing-bg-wave-swell absolute left-[-28%] bottom-[2%] h-30 w-[160%] rounded-[100%] bg-[#CCEEFF]/34" style={{ animationDuration: '18s', animationDelay: '1.2s' }} />
          <div className="landing-bg-wave-b landing-bg-wave-break absolute left-[-24%] bottom-[-4%] h-24 w-[155%] rounded-[100%] bg-[#BEE6FF]/38" style={{ animationDuration: '5.6s', animationDelay: '0.8s' }} />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F3DFC2]/78 to-transparent" />
        </div>
      )}

      <div className="relative z-10">
      {/* Navigation */}
      <nav className={`border-b ${isDark ? 'border-white/10 bg-[#12151B]' : 'border-borderMain bg-white'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-charcoal p-1.5 shadow-[0_10px_30px_rgba(18,18,18,0.15)] ring-1 ring-black/5">
              <BrandMark className="shrink-0 rounded-xl [filter:brightness(0)_invert(1)]" size={40} />
            </div>
            <span className="text-xl font-semibold tracking-tight">CafeToolbox</span>
          </div>
          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                className={`group relative mt-0.5 h-9 w-[78px] overflow-hidden rounded-full border transition-all duration-700 ${
                  isDark
                    ? 'border-indigo-400/25 bg-gradient-to-r from-[#0f172a] to-[#1e1b4b]'
                    : 'border-sky-300/60 bg-gradient-to-r from-[#7dd3fc] to-[#38bdf8]'
                }`}
                aria-label={isDark ? 'Đổi sang giao diện sáng' : 'Đổi sang giao diện tối'}
                title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
              >
                {/* Stars */}
                <span className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="theme-toggle-star absolute left-[14%] top-[22%] h-1 w-1 rounded-full bg-white" style={{ animationDelay: '0s' }} />
                  <span className="theme-toggle-star absolute left-[38%] top-[60%] h-0.5 w-0.5 rounded-full bg-white" style={{ animationDelay: '0.7s' }} />
                  <span className="theme-toggle-star absolute left-[58%] top-[18%] h-0.5 w-0.5 rounded-full bg-white/80" style={{ animationDelay: '1.4s' }} />
                  <span className="theme-toggle-star absolute left-[72%] top-[55%] h-1 w-1 rounded-full bg-white/90" style={{ animationDelay: '0.3s' }} />
                  <span className="theme-toggle-star absolute left-[86%] top-[30%] h-0.5 w-0.5 rounded-full bg-white/70" style={{ animationDelay: '1s' }} />
                </span>

                {/* Clouds */}
                <span className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
                  <span className="theme-toggle-cloud absolute right-[10%] top-[16%] h-3 w-5 rounded-full bg-white/40" />
                  <span className="theme-toggle-cloud absolute right-[32%] top-[54%] h-2.5 w-4 rounded-full bg-white/30" style={{ animationDelay: '1.2s' }} />
                  <span className="theme-toggle-cloud absolute right-[58%] top-[24%] h-2 w-3 rounded-full bg-white/20" style={{ animationDelay: '2.4s' }} />
                </span>

                {/* Knob */}
                <span
                  className={`absolute left-1 top-1 h-7 w-7 rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isDark ? 'translate-x-0' : 'translate-x-[42px]'
                  }`}
                >
                  {/* Glow ring */}
                  <span
                    className={`absolute inset-[-3px] rounded-full transition-all duration-700 ${
                      isDark
                        ? 'shadow-[0_0_14px_rgba(129,140,248,0.5)]'
                        : 'shadow-[0_0_14px_rgba(251,191,36,0.6)]'
                    }`}
                  />
                  {/* Knob face */}
                  <span
                    className={`absolute inset-0 rounded-full transition-all duration-700 ${
                      isDark
                        ? 'bg-gradient-to-br from-[#e2e8f0] to-[#c7d2e0]'
                        : 'bg-gradient-to-br from-[#fde68a] to-[#f59e0b]'
                    }`}
                  />

                  {/* Sun SVG */}
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

                  {/* Moon SVG */}
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
            <Link
              href="/dashboard"
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                isDark
                  ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                  : 'border-borderMain bg-white text-charcoal hover:bg-cream'
              }`}
            >
              Dashboard
            </Link>
            {user ? (
              <Link
                href="/dashboard/settings"
                className={`flex items-center gap-2.5 rounded-full border pl-1 pr-3 py-1 transition-all hover:shadow-sm ${
                  isDark
                    ? 'border-white/15 bg-white/5 hover:border-white/30'
                    : 'border-borderMain bg-white hover:border-charcoal/30'
                }`}
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-charcoal flex items-center justify-center">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt="" width={32} height={32} unoptimized className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="text-neon text-sm font-semibold">{initials}</span>
                  )}
                </div>
                <div className="text-left leading-tight hidden md:block">
                  <p className={`max-w-[120px] truncate text-sm font-medium ${isDark ? 'text-white' : 'text-charcoal'}`}>{displayName}</p>
                  <p className={`max-w-[120px] truncate text-[10px] ${isDark ? 'text-white/60' : 'text-charcoalMuted'}`}>{roleLabel}</p>
                </div>
              </Link>
            ) : (
              checkedAuth && (
                <Link
                  href="/login"
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isDark
                      ? 'bg-white text-charcoal hover:bg-white/90'
                      : 'bg-charcoal text-white hover:bg-charcoalLight'
                  }`}
                >
                  Đăng nhập
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      <section className={`border-b ${isDark ? 'border-white/10 bg-[#12151B]/70' : 'border-borderMain bg-white/70'}`}>
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neon bg-neonGhost px-3 py-1.5 text-xs font-medium uppercase tracking-[0.1em]">
              Workspace điều khiển nhanh
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Mọi công cụ vận hành của team, nằm gọn trong một dashboard.
            </h1>
            <p className={`mt-5 max-w-2xl text-base leading-7 ${isDark ? 'text-white/70' : 'text-charcoalMuted'}`}>
              Truy cập nhanh công cụ, theo dõi trạng thái dịch vụ và chuyển đổi nội dung ngay từ cùng một nơi.
              Thiết kế ưu tiên tốc độ thao tác, rõ ràng và dễ mở rộng khi team lớn dần.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-white text-charcoal hover:bg-white/90'
                    : 'bg-charcoal text-white hover:bg-charcoalLight'
                }`}
              >
                Vào Dashboard
                <span className="iconify h-4 w-4" data-icon="lucide:arrow-right" />
              </Link>
              <Link
                href="/dashboard/tools"
                className={`inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                    : 'border-borderMain bg-white text-charcoal hover:bg-cream'
                }`}
              >
                Mở công cụ
              </Link>
              <Link
                href="https://status.cafetoolbox.app"
                className={`inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                    : 'border-borderMain bg-white text-charcoal hover:bg-cream'
                }`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Xem Status
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-borderMain bg-charcoal p-6 text-white shadow-[0_20px_40px_rgba(18,18,18,0.18)]">
            <h2 className="text-lg font-semibold">Tổng quan nhanh</h2>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="iconify h-4 w-4 text-neon" data-icon="lucide:wrench" />
                  <span className="text-sm text-white/90">Tools đang mở</span>
                </div>
                <span className="text-sm font-semibold">{toolsCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="iconify h-4 w-4 text-neon" data-icon="lucide:shield-check" />
                  <span className="text-sm text-white/90">Công nghệ bảo mật</span>
                </div>
                <span className="max-w-[160px] text-right text-xs font-semibold text-white">{securityTech}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="iconify h-4 w-4 text-neon" data-icon="lucide:chart-no-axes-combined" />
                  <span className="text-sm text-white/90">Uptime trung bình</span>
                </div>
                <span className="text-sm font-semibold">{averageUptime.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="iconify h-4 w-4 text-neon" data-icon="lucide:shield-check" />
                  <span className="text-sm text-white/90">Dịch vụ healthy</span>
                </div>
                <span className="text-sm font-semibold">{healthyServices}/{totalServices}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Lối tắt theo tác vụ</h2>
            <p className={`mt-2 text-sm ${isDark ? 'text-white/65' : 'text-charcoalMuted'}`}>Mở đúng khu vực bạn cần chỉ với một lần bấm.</p>
          </div>
          <Link href="/dashboard/tools" className={`text-sm font-medium underline-offset-4 hover:underline ${isDark ? 'text-white/90' : 'text-charcoal'}`}>
            Xem toàn bộ công cụ
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/tools/convertube" className={`rounded-lg border p-5 transition-colors ${isDark ? 'border-white/15 bg-white/5 hover:bg-white/10' : 'border-borderMain bg-white hover:bg-cream'}`}>
            <p className="text-base font-semibold">Convertube</p>
            <p className={`mt-1 text-sm ${isDark ? 'text-white/65' : 'text-charcoalMuted'}`}>Dán link và tải MP4/MP3 ngay trong dashboard.</p>
          </Link>
          <Link href="/dashboard/settings" className={`rounded-lg border p-5 transition-colors ${isDark ? 'border-white/15 bg-white/5 hover:bg-white/10' : 'border-borderMain bg-white hover:bg-cream'}`}>
            <p className="text-base font-semibold">Cài đặt hệ thống</p>
            <p className={`mt-1 text-sm ${isDark ? 'text-white/65' : 'text-charcoalMuted'}`}>Quản lý profile, quyền và thông tin workspace.</p>
          </Link>
          <Link href="/admin" className={`rounded-lg border p-5 transition-colors ${isDark ? 'border-white/15 bg-white/5 hover:bg-white/10' : 'border-borderMain bg-white hover:bg-cream'}`}>
            <p className="text-base font-semibold">Khu vực quản trị</p>
            <p className={`mt-1 text-sm ${isDark ? 'text-white/65' : 'text-charcoalMuted'}`}>Theo dõi dịch vụ, sự cố và phân quyền nâng cao.</p>
          </Link>
        </div>
      </section>

      <footer className={`mt-auto border-t ${isDark ? 'border-white/10 bg-[#12151B]' : 'border-borderMain bg-white'}`}>
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <BrandMark className="shrink-0 rounded-xl shadow-[0_8px_24px_rgba(18,18,18,0.12)]" size={32} />
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-charcoal'}`}>CafeToolbox</span>
            </div>
            <div className={`flex items-center gap-6 text-sm ${isDark ? 'text-white/65' : 'text-charcoalMuted'}`}>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-charcoal'}`}>
                GitHub
              </a>
              <a href="#" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-charcoal'}`}>
                Privacy Policy
              </a>
              <a href="#" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-charcoal'}`}>
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
