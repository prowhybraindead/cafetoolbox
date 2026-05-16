"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RefreshCw } from "lucide-react";

const REFRESH_INTERVAL_MS = 60_000;

export function AutoRefresh() {
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          requestAnimationFrame(() => window.location.reload());
          return REFRESH_INTERVAL_MS / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCountdown(REFRESH_INTERVAL_MS / 1000);
    }
  }, [enabled]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--status-border-soft)] bg-[var(--status-bg-soft)] px-2 py-1 text-xs text-[var(--status-muted)]">
      <button
        type="button"
        onClick={() => setEnabled((prev) => !prev)}
        className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 text-[11px] font-medium transition-colors hover:border-neon/40 hover:text-neon"
      >
        {enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {enabled ? "Pause" : "Resume"}
      </button>
      <span className="inline-flex items-center gap-1 pr-1">
        <RefreshCw className={`h-3 w-3 ${enabled ? "animate-spin [animation-duration:2s]" : ""}`} />
        {enabled ? `Refresh sau ${countdown}s` : "Auto refresh dang tat"}
      </span>
    </div>
  );
}
