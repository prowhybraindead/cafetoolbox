'use client';

import React, { useEffect, useState } from 'react';

// Import components locally to keep things co-located
// The actual heavy components are loaded via dynamic imports below
import dynamic from 'next/dynamic';

const JwtDecoder = dynamic(
  () => import('./components/jwt-decoder').then((mod) => ({ default: mod.JwtDecoder })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <svg className="w-6 h-6 animate-spin text-charcoalMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    ),
    ssr: false,
  }
);

const JwtGenerator = dynamic(
  () => import('./components/jwt-generator').then((mod) => ({ default: mod.JwtGenerator })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <svg className="w-6 h-6 animate-spin text-charcoalMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    ),
    ssr: false,
  }
);

type Tab = 'decoder' | 'generator';

export default function JwtToolPage() {
  const [activeTab, setActiveTab] = useState<Tab>('decoder');
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
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-charcoal flex items-center justify-center">
            <svg className="w-5 h-5 text-neon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <div>
            <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-charcoal'}`}>
              JWT Toolbox
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/65' : 'text-charcoal'}`}>
              Giải mã và tạo JWT token ngay trên trình duyệt
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={`flex gap-1 p-1 border rounded-lg w-fit mb-8 ${isDark ? 'bg-white/5 border-white/10' : 'border-white/55 bg-white/45 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)]'}`}>
        <button
          onClick={() => setActiveTab('decoder')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'decoder'
              ? 'bg-charcoal text-white shadow-sm'
              : isDark
              ? 'text-white/70 hover:text-white hover:bg-white/10'
              : 'text-charcoal hover:text-charcoal hover:bg-neonGhost'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7 2 10 5-10 5V2z" transform="rotate(0 12 12)" />
              <path d="M2 12h3" />
              <path d="M19 12h3" />
              <path d="M12 2v3" />
              <path d="M12 19v3" />
            </svg>
            Decoder
          </span>
        </button>
        <button
          onClick={() => setActiveTab('generator')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'generator'
              ? 'bg-charcoal text-white shadow-sm'
              : isDark
              ? 'text-white/70 hover:text-white hover:bg-white/10'
              : 'text-charcoal hover:text-charcoal hover:bg-neonGhost'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 19 6v5c0 5-3.2 8.7-7 10-3.8-1.3-7-5-7-10V6l7-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Generator
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className={`border rounded-xl p-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-white/55 bg-white/40 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)]'}`}>
        {activeTab === 'decoder' ? <JwtDecoder /> : <JwtGenerator />}
      </div>

      {/* Footer Info */}
      <div className={`mt-8 flex items-center gap-2 text-[11px] ${isDark ? 'text-white/45' : 'text-charcoal'}`}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>
          Tất cả thao tác thực hiện trên trình duyệt — token và secret không được gửi đến server.
        </span>
      </div>
    </main>
  );
}
