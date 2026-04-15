'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PickerTab = dynamic(
  () => import('./components/picker-tab').then((mod) => ({ default: mod.PickerTab })),
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

const ExtractorTab = dynamic(
  () => import('./components/extractor-tab').then((mod) => ({ default: mod.ExtractorTab })),
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

const ContrastCheckerTab = dynamic(
  () => import('./components/contrast-tab').then((mod) => ({ default: mod.ContrastCheckerTab })),
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

type Tab = 'picker' | 'extractor' | 'contrast';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'picker',
    label: 'Picker',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="m14.12 9.88-4.24 4.24a3 3 0 1 0 4.24-4.24Z" />
      </svg>
    ),
  },
  {
    id: 'extractor',
    label: 'Extractor',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'contrast',
    label: 'Contrast',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
      </svg>
    ),
  },
];

export default function ColorSensePage() {
  const [activeTab, setActiveTab] = useState<Tab>('picker');
  const [toast, setToast] = useState<string | null>(null);
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

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(text);
      setTimeout(() => setToast(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setToast(text);
      setTimeout(() => setToast(null), 2000);
    }
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-charcoal flex items-center justify-center">
            <svg className="w-5 h-5 text-neon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="2.5" />
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <div>
            <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-charcoal'}`}>
              ColorSense
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/65' : 'text-charcoal'}`}>
              Chọn màu, trích xuất từ ảnh, và kiểm tra độ tương phản WCAG
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={`flex gap-1 p-1 border rounded-lg w-fit mb-8 ${isDark ? 'bg-white/5 border-white/10' : 'border-white/55 bg-white/45 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)]'}`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-charcoal text-white shadow-sm'
                : isDark
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-charcoal hover:text-charcoal hover:bg-neonGhost'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={`border rounded-2xl p-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-white/55 bg-white/40 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)]'}`}>
        {activeTab === 'picker' && <PickerTab onCopy={copyToClipboard} />}
        {activeTab === 'extractor' && <ExtractorTab onCopy={copyToClipboard} />}
        {activeTab === 'contrast' && <ContrastCheckerTab onCopy={copyToClipboard} />}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-2 bg-charcoal text-white px-4 py-3 rounded-xl shadow-lg">
            <svg className="w-4 h-4 text-neon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="text-sm font-mono">{toast}</span>
          </div>
        </div>
      )}

      {/* Toast animation */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </main>
  );
}
