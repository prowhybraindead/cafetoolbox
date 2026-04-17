'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { DashboardNav } from './dashboard-nav';
import type { UserInfo } from './dashboard-nav';

export function DashboardShell({ initialUser, children }: { initialUser: UserInfo | null; children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

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
    document.documentElement.dataset.theme = theme;
    window.dispatchEvent(new CustomEvent('cafetoolbox-theme-change', { detail: theme }));
  }, [theme, mounted]);

  const isDark = theme === 'dark';

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? 'bg-[#0F1115] text-white' : 'bg-cream text-charcoal'}`}>
      {/* Dynamic background (N1 parity with landing) */}
      {isDark ? (
        <div className="pointer-events-none fixed inset-0 z-0">
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
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#A6E0FF_0%,#87D6FF_24%,#5BC0EE_44%,#309FD8_66%,#1B7FC0_100%)]" />
          <div className="landing-bg-wave-a landing-bg-wave-swell absolute left-[-20%] bottom-[14%] h-40 w-[150%] rounded-[100%] bg-white/22 blur-[1px]" />
          <div className="landing-bg-wave-b landing-bg-wave-break absolute left-[-16%] bottom-[8%] h-32 w-[138%] rounded-[100%] bg-[#E1F7FF]/30" />
          <div className="landing-bg-wave-a landing-bg-wave-swell absolute left-[-28%] bottom-[2%] h-30 w-[160%] rounded-[100%] bg-[#CCEEFF]/34" style={{ animationDuration: '18s', animationDelay: '1.2s' }} />
          <div className="landing-bg-wave-b landing-bg-wave-break absolute left-[-24%] bottom-[-4%] h-24 w-[155%] rounded-[100%] bg-[#BEE6FF]/38" style={{ animationDuration: '5.6s', animationDelay: '0.8s' }} />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F3DFC2]/78 to-transparent" />
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col">
        <DashboardNav initialUser={initialUser} theme={theme} setTheme={setTheme} mounted={mounted} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
