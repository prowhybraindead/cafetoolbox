"use client";

import { useEffect, useState } from "react";

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

  return <span>Thời gian trên trang hiển thị theo UTC · Last refresh: {formatUtcDateTime(lastRefreshAt)}</span>;
}
