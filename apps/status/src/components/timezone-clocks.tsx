"use client";

import { useEffect, useState } from "react";
import { Globe, Clock } from "lucide-react";

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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-borderLight bg-white px-5 py-4 shadow-[0_4px_12px_rgba(26,26,26,0.04)]">
      <div className="flex items-center gap-2 text-charcoalMuted">
        <Globe className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wider">{clock.label}</span>
      </div>
      <p className="font-mono text-2xl font-semibold tracking-tight text-charcoal tabular-nums">
        {time || "--:--:--"}
      </p>
      <p className="text-xs text-charcoalMuted">{date || "..."}</p>
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-charcoal/5 px-2.5 py-0.5 text-xs text-charcoalMuted">
        <Clock className="h-3 w-3" />
        {clock.abbr}
      </span>
    </div>
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
          <div
            key={clock.tz}
            className="flex flex-col items-center gap-2 rounded-2xl border border-borderLight bg-white px-5 py-4"
          >
            <div className="flex items-center gap-2 text-charcoalMuted">
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">{clock.label}</span>
            </div>
            <p className="font-mono text-2xl font-semibold tracking-tight text-charcoalMuted">--:--:--</p>
            <p className="text-xs text-charcoalMuted">...</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-charcoal/5 px-2.5 py-0.5 text-xs text-charcoalMuted">
              <Clock className="h-3 w-3" />
              {clock.abbr}
            </span>
          </div>
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
