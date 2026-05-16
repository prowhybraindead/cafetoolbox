"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "cafetoolbox-theme";

function resolveTheme(): Theme {
  if (typeof document === "undefined") return "light";

  const domTheme = document.documentElement.dataset.theme;
  if (domTheme === "light" || domTheme === "dark") {
    return domTheme;
  }

  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new CustomEvent("cafetoolbox-theme-change", { detail: theme }));
}

export function StatusThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = resolveTheme();
    setTheme(current);
    applyTheme(current);
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        const nextTheme = isDark ? "light" : "dark";
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--status-border)] bg-[var(--status-bg-strong)] px-3.5 py-2 text-xs font-medium text-[var(--status-text)] transition-colors hover:border-neon/70 hover:text-neon"
      aria-label={isDark ? "Chuyen sang giao dien sang" : "Chuyen sang giao dien toi"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {mounted ? (
        <>
          {isDark ? <MoonStar className="h-3.5 w-3.5" /> : <SunMedium className="h-3.5 w-3.5" />}
          <span>{isDark ? "Dark" : "Light"}</span>
        </>
      ) : (
        <>
          <SunMedium className="h-3.5 w-3.5" />
          <span>Theme</span>
        </>
      )}
    </button>
  );
}
