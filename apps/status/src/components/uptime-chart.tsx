"use client";

import { useEffect, useState, useCallback } from "react";

type UptimeDataPoint = {
  date: string;
  uptime: number | null;
};

type UptimeChartProps = {
  serviceId: string;
};

type RangeKey = "1d" | "7d" | "30d";

const RANGE_CONFIG: Record<RangeKey, { label: string; days: number }> = {
  "1d": { label: "24h", days: 1 },
  "7d": { label: "7 ngày", days: 7 },
  "30d": { label: "30 ngày", days: 30 },
};

function getUptimeColorClass(uptime: number | null): string {
  if (uptime === null) return "bg-charcoal/15";
  if (uptime >= 99.5) return "bg-green-500";
  if (uptime >= 95) return "bg-yellow-500";
  if (uptime >= 80) return "bg-orange-500";
  return "bg-red-500";
}

function getUptimeBarHeight(uptime: number | null) {
  if (uptime === null) return 20;
  return Math.min(100, Math.max(20, uptime));
}

function getUptimeTooltip(uptime: number | null, date: string): string {
  const isHourlyPoint = date.includes("T");
  const parsed = isHourlyPoint ? new Date(date) : new Date(date + "T00:00:00Z");
  const formatted = isHourlyPoint
    ? parsed.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      })
    : parsed.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      });

  if (uptime === null) return `${formatted}: Khong co du lieu`;
  return `${formatted}: ${uptime.toFixed(2)}% uptime`;
}

export function UptimeChart({ serviceId }: UptimeChartProps) {
  const [range, setRange] = useState<RangeKey>("1d");
  const [data, setData] = useState<UptimeDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const { days } = RANGE_CONFIG[range];
      const response = await fetch(`/api/uptime-history?serviceId=${serviceId}&days=${days}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 500) {
          setData([]);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const result: UptimeDataPoint[] = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loi tai du lieu");
    } finally {
      setLoading(false);
    }
  }, [serviceId, range]);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate summary
  const validData = data.filter((d) => d.uptime !== null);
  const avgUptime =
    validData.length > 0
      ? validData.reduce((sum, d) => sum + (d.uptime ?? 0), 0) / validData.length
      : null;

  const formatRangeEdge = (value?: string) => {
    if (!value) return "";
    if (value.includes("T")) {
      return new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      });
    }
    return value;
  };

  return (
    <div className="status-card-soft rounded-2xl p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[var(--status-muted)]">
            {avgUptime !== null ? (
              <>
                Uptime TB: <span className="font-semibold text-[var(--status-text)]">{avgUptime.toFixed(2)}%</span>
              </>
            ) : (
              "Chua co du lieu"
            )}
            {" · "}
            {RANGE_CONFIG[range].label}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-[var(--status-border-soft)] bg-[var(--status-bg-soft)] p-1">
          {(Object.keys(RANGE_CONFIG) as RangeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${range === key
                  ? "bg-[var(--status-bg-strong)] text-[var(--status-text)] shadow-sm"
                  : "text-[var(--status-muted)] hover:text-[var(--status-text)]"
                }`}
              aria-pressed={range === key}
            >
              {RANGE_CONFIG[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--status-muted)]">
        {[
          { label: "99.5%+", color: "bg-green-500" },
          { label: "95-99.49%", color: "bg-yellow-500" },
          { label: "80-94.99%", color: "bg-orange-500" },
          { label: "<80%", color: "bg-red-500" },
          { label: "No data", color: "bg-charcoal/15" },
        ].map((legend) => (
          <span key={legend.label} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${legend.color}`} />
            {legend.label}
          </span>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-[var(--status-border-soft)] text-sm text-[var(--status-muted)]">
            Dang tai du lieu uptime...
          </div>
        ) : error ? (
          <div className="flex h-20 items-center justify-center rounded-xl border border-red-200 bg-red-50/80 text-sm text-red-700">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--status-border-soft)] text-sm text-[var(--status-muted)]">
            <span>Chua co du lieu lich su uptime</span>
            <span className="text-xs">Hay chay aggregate-uptime-daily de tao du lieu</span>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--status-border-soft)] bg-[var(--status-bg-soft)] p-3">
            <div className="flex h-20 items-end gap-[4px]">
              {data.map((point) => (
                <div
                  key={point.date}
                  className="group relative flex-1"
                  title={getUptimeTooltip(point.uptime, point.date)}
                >
                  <div
                    className={`w-full rounded-[3px] transition-opacity hover:opacity-80 ${getUptimeColorClass(point.uptime)}`}
                    style={{ height: `${getUptimeBarHeight(point.uptime)}%` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-charcoal px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {getUptimeTooltip(point.uptime, point.date)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-between text-xs text-[var(--status-muted)]">
              <span>{formatRangeEdge(data[0]?.date)}</span>
              <span>{formatRangeEdge(data[data.length - 1]?.date)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
