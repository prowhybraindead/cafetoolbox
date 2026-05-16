"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

const REFRESH_INTERVAL_MS = 60_000;

function formatUtcDateTime(value: Date) {
  return (
    new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(value) + " (UTC)"
  );
}

export function LastRefresh() {
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLastRefreshAt(new Date());
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-border-soft)] bg-[var(--status-bg-soft)] px-3 py-2 text-xs text-[var(--status-muted)]">
      <Clock3 className="h-3 w-3" />
      UTC · Last refresh: {formatUtcDateTime(lastRefreshAt)}
    </span>
  );
}
