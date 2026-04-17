'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { login } from '@cafetoolbox/supabase/auth';
import { BrandMark } from '@cafetoolbox/ui';
import type { LoginResult } from '@cafetoolbox/supabase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  /* ── Theme sync (same key as landing) ── */
  useEffect(() => {
    const saved = window.localStorage.getItem('cafetoolbox-theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem('cafetoolbox-theme', theme);
  }, [theme, mounted]);

  const isDark = theme === 'dark';

  /* ── Form handler ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result: LoginResult = await login(email, password);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } else {
      setError(result.message || 'Đăng nhập thất bại');
      setLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? 'bg-[#0F1115] text-white' : 'bg-cream text-charcoal'}`}>
      {/* ── Dynamic background ── */}
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

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ── Header ── */}
        <nav className={`border-b ${isDark ? 'border-white/10 bg-[#12151B]' : 'border-borderMain bg-white'}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="rounded-2xl bg-charcoal p-1.5 shadow-[0_10px_30px_rgba(18,18,18,0.15)] ring-1 ring-black/5">
                <BrandMark className="shrink-0 rounded-xl [filter:brightness(0)_invert(1)]" size={40} />
              </div>
              <span className="text-xl font-semibold tracking-tight">CafeToolbox</span>
            </Link>
            <div className="flex items-center gap-3">
              {mounted && (
                <button
                  onClick={() => setTheme((c) => (c === 'dark' ? 'light' : 'dark'))}
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
                    <span className="theme-toggle-star absolute left-[14%] top-[22%] h-1 w-1 rounded-full bg-white" />
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
                  <span className={`absolute left-1 top-1 h-7 w-7 rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isDark ? 'translate-x-0' : 'translate-x-[42px]'}`}>
                    <span className={`absolute inset-[-3px] rounded-full transition-all duration-700 ${isDark ? 'shadow-[0_0_14px_rgba(129,140,248,0.5)]' : 'shadow-[0_0_14px_rgba(251,191,36,0.6)]'}`} />
                    <span className={`absolute inset-0 rounded-full transition-all duration-700 ${isDark ? 'bg-gradient-to-br from-[#e2e8f0] to-[#c7d2e0]' : 'bg-gradient-to-br from-[#fde68a] to-[#f59e0b]'}`} />
                    {/* Sun */}
                    <svg viewBox="0 0 24 24" fill="none" className={`absolute inset-0 h-full w-full p-1 transition-all duration-500 ${isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
                      <g className={isDark ? '' : 'theme-toggle-rays'}>
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                          <line key={a} x1="12" y1="2.5" x2="12" y2="5" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
                        ))}
                      </g>
                      <circle cx="12" cy="12" r="4" fill="#92400e" />
                    </svg>
                    {/* Moon */}
                    <svg viewBox="0 0 24 24" fill="none" className={`absolute inset-0 h-full w-full p-1.5 transition-all duration-500 ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}>
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#475569" />
                      <circle cx="14" cy="9.5" r="1" fill="#334155" opacity="0.4" />
                      <circle cx="10.5" cy="14.5" r="0.7" fill="#334155" opacity="0.3" />
                    </svg>
                  </span>
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* ── Login form ── */}
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[420px]">
            <div className={`rounded-lg border p-8 backdrop-blur-md transition-colors duration-300 ${isDark ? 'border-white/10 bg-[#12151B]/80' : 'border-borderMain bg-white/85'}`}>
              {/* Card header */}
              <div className="mb-6">
                <h1 className={`text-xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-charcoal'}`}>
                  Đăng nhập
                </h1>
                <p className={`mt-1 text-sm ${isDark ? 'text-white/60' : 'text-charcoalMuted'}`}>
                  Nhập email và mật khẩu để tiếp tục
                </p>
              </div>

              {/* Success */}
              {success && (
                <div className={`rounded-lg border p-4 mb-6 transition-colors duration-300 ${isDark ? 'border-neon/30 bg-neon/10' : 'bg-neonGhost border-neon'}`}>
                  <div className="flex items-center gap-3">
                    <span className="iconify text-neon" data-icon="lucide:check-circle" data-width="20" />
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-charcoal'}`}>
                      Đăng nhập thành công! Đang chuyển hướng...
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && !success && (
                <div className={`rounded-lg border p-4 mb-6 transition-colors duration-300 ${isDark ? 'border-red-400/30 bg-red-500/10' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`iconify ${isDark ? 'text-red-400' : 'text-red-500'}`} data-icon="lucide:alert-circle" data-width="20" />
                    <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              {!success && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-charcoal'}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      required
                      disabled={loading}
                      className={`w-full px-4 py-3 rounded-lg text-sm placeholder:opacity-50 focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
                        isDark
                          ? 'border border-white/15 bg-white/5 text-white placeholder:text-white/40'
                          : 'border border-borderMain bg-white text-charcoal placeholder:text-charcoalMuted'
                      }`}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-charcoal'}`}>
                      Mật khẩu
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      required
                      disabled={loading}
                      minLength={6}
                      className={`w-full px-4 py-3 rounded-lg text-sm placeholder:opacity-50 focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
                        isDark
                          ? 'border border-white/15 bg-white/5 text-white placeholder:text-white/40'
                          : 'border border-borderMain bg-white text-charcoal placeholder:text-charcoalMuted'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || success}
                    className={`w-full font-medium px-6 py-3 rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark
                        ? 'bg-white text-charcoal hover:bg-white/90'
                        : 'bg-charcoal text-white hover:bg-charcoalLight'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="iconify animate-spin h-4 w-4" data-icon="lucide:loader-2" />
                        Đang xử lý...
                      </span>
                    ) : (
                      'Đăng nhập'
                    )}
                  </button>
                </form>
              )}

              {/* Footer links */}
              {!success && (
                <div className={`mt-6 pt-6 border-t flex items-center justify-end text-sm ${isDark ? 'border-white/10' : 'border-borderLight'}`}>
                  <Link
                    href="/forgot-password"
                    className={`transition-colors duration-200 ${isDark ? 'text-white/60 hover:text-white' : 'text-charcoalMuted hover:text-charcoal'}`}
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
              )}
            </div>

            {/* Back to home */}
            {!success && (
              <div className="mt-6 text-center">
                <Link
                  href="/"
                  className={`inline-flex items-center gap-1.5 text-sm transition-colors duration-200 ${isDark ? 'text-white/60 hover:text-white' : 'text-charcoalMuted hover:text-charcoal'}`}
                >
                  <span className="iconify h-4 w-4" data-icon="lucide:arrow-left" />
                  Quay lại trang chủ
                </Link>
              </div>
            )}
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className={`mt-auto border-t ${isDark ? 'border-white/10 bg-[#12151B]' : 'border-borderMain bg-white'}`}>
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center gap-3">
                <BrandMark className="shrink-0 rounded-xl shadow-[0_8px_24px_rgba(18,18,18,0.12)]" size={32} />
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-charcoal'}`}>CafeToolbox</span>
              </div>
              <div className={`flex items-center gap-6 text-sm ${isDark ? 'text-white/65' : 'text-charcoalMuted'}`}>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-charcoal'}`}>GitHub</a>
                <a href="#" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-charcoal'}`}>Privacy Policy</a>
                <a href="#" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-charcoal'}`}>Terms of Service</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
