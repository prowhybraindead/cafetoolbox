"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const REFRESH_INTERVAL_MS = 60_000;

export function AutoRefresh() {
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Reset countdown and reload the page
          // Use requestAnimationFrame to avoid state update after unmount
          requestAnimationFrame(() => window.location.reload());
          return REFRESH_INTERVAL_MS / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-charcoalMuted">
      <RefreshCw className="h-3 w-3" />
      Tự cập nhật sau {countdown}s
    </span>
  );
}
