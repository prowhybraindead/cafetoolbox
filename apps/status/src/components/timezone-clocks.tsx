"use client";

import { useEffect, useState } from "react";
import { Clock3, Globe } from "lucide-react";

type TimezoneClock = {
  label: string;
  tz: string;
  abbr: string;
  description: string;
};

const CLOCKS: TimezoneClock[] = [
  {
    label: "Vercel Server",
    tz: "America/New_York",
    abbr: "EST/EDT",
    description: "US Eastern (Vercel mặc định)",
  },
  {
    label: "UTC",
    tz: "UTC",
    abbr: "UTC",
    description: "Giờ chuẩn quốc tế",
  },
  {
    label: "Việt Nam",
    tz: "Asia/Ho_Chi_Minh",
    abbr: "UTC+7",
    description: "Giờ địa phương (ICT)",
  },
];

function getTimeInTz(timezone: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    hour12: false,
  }).format(new Date());
}

function getDateInTz(timezone: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date());
}

function SingleClock({ clock }: { clock: TimezoneClock }) {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    function tick() {
      setTime(getTimeInTz(clock.tz));
      setDate(getDateInTz(clock.tz));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clock.tz]);

  return (
    <article className="status-card-soft rounded-2xl p-4 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--status-muted)]">
          <Globe className="h-3.5 w-3.5" />
          {clock.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-border-soft)] bg-[var(--status-bg-strong)] px-2 py-1 text-[11px] text-[var(--status-muted)]">
          <Clock3 className="h-3 w-3" />
          {clock.abbr}
        </span>
      </div>

      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight tabular-nums text-[var(--status-text)]">
        {time || "--:--:--"}
      </p>
      <p className="mt-1 text-xs text-[var(--status-muted)]">{date || "..."}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--status-muted)]">{clock.description}</p>
    </article>
  );
}

export function TimezoneClocks() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {CLOCKS.map((clock) => (
          <article key={clock.tz} className="status-card-soft rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--status-muted)]">
                <Globe className="h-3.5 w-3.5" />
                {clock.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-border-soft)] bg-[var(--status-bg-strong)] px-2 py-1 text-[11px] text-[var(--status-muted)]">
                <Clock3 className="h-3 w-3" />
                {clock.abbr}
              </span>
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-[var(--status-muted)]">--:--:--</p>
            <p className="mt-1 text-xs text-[var(--status-muted)]">...</p>
            <p className="mt-2 text-xs leading-5 text-[var(--status-muted)]">{clock.description}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CLOCKS.map((clock) => (
        <SingleClock key={clock.tz} clock={clock} />
      ))}
    </div>
  );
}
