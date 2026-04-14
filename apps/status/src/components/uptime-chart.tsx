"use client";

import { useEffect, useState, useCallback } from "react";

type UptimeDataPoint = {
  date: string;
  uptime: number | null;
};

type UptimeChartProps = {
  serviceId: string;
  serviceName: string;
};

type RangeKey = "1d" | "7d" | "30d";

const RANGE_CONFIG: Record<RangeKey, { label: string; days: number }> = {
  "1d": { label: "24h", days: 1 },
  "7d": { label: "7 ngày", days: 7 },
  "30d": { label: "30 ngày", days: 30 },
};

function getUptimeColor(uptime: number | null): string {
  if (uptime === null) return "bg-charcoal/10";
  if (uptime >= 99.5) return "bg-green-500";
  if (uptime >= 95) return "bg-yellow-500";
  if (uptime >= 80) return "bg-orange-500";
  return "bg-red-500";
}

function getUptimeTooltip(uptime: number | null, date: string): string {
  const formatted = new Date(date + "T00:00:00Z").toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

  if (uptime === null) return `${formatted}: Không có dữ liệu`;
  return `${formatted}: ${uptime.toFixed(2)}% uptime`;
}

export function UptimeChart({ serviceId, serviceName }: UptimeChartProps) {
  const [range, setRange] = useState<RangeKey>("7d");
  const [data, setData] = useState<UptimeDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { days } = RANGE_CONFIG[range];
      const response = await fetch(
        `/api/uptime-history?serviceId=${serviceId}&days=${days}`
      );
      if (!response.ok) {
        if (response.status === 500) {
          // Likely migration not run yet — table doesn't exist
          setData([]);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const result: UptimeDataPoint[] = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [serviceId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate summary
  const validData = data.filter((d) => d.uptime !== null);
  const avgUptime =
    validData.length > 0
      ? validData.reduce((sum, d) => sum + (d.uptime ?? 0), 0) / validData.length
      : null;

  return (
    <div className="rounded-2xl border border-borderLight p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{serviceName}</h3>
          <p className="mt-1 text-sm text-charcoalMuted">
            {avgUptime !== null ? (
              <>Uptime TB: <span className="font-medium text-charcoal">{avgUptime.toFixed(2)}%</span></>
            ) : (
              "Chưa có dữ liệu"
            )}
            {" · "}{RANGE_CONFIG[range].label}
          </p>
        </div>

        {/* Range tabs */}
        <div className="flex rounded-lg border border-borderLight bg-charcoal/5 p-0.5">
          {(Object.keys(RANGE_CONFIG) as RangeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                range === key
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-charcoalMuted hover:text-charcoal"
              }`}
            >
              {RANGE_CONFIG[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart bars */}
      <div className="mt-4">
        {loading ? (
          <div className="flex h-16 items-center justify-center text-sm text-charcoalMuted">
            Đang tải...
          </div>
        ) : error ? (
          <div className="flex h-16 items-center justify-center text-sm text-red-600">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-16 flex-col items-center justify-center gap-1 text-sm text-charcoalMuted">
            <span>Chưa có dữ liệu lịch sử uptime</span>
            <span className="text-xs">Chạy migration + aggregate-uptime-daily để tạo dữ liệu</span>
          </div>
        ) : (
          <div className="flex items-end gap-[3px]" style={{ height: `${range === "30d" ? 48 : 56}px` }}>
            {data.map((point) => (
              <div
                key={point.date}
                className={`group relative flex-1 rounded-sm transition-all hover:opacity-80 ${getUptimeColor(point.uptime)}`}
                style={{ minHeight: "6px" }}
                title={getUptimeTooltip(point.uptime, point.date)}
              >
                {/* Tooltip on hover */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-charcoal px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {getUptimeTooltip(point.uptime, point.date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date range label */}
      {!loading && data.length > 0 && (
        <div className="mt-2 flex justify-between text-xs text-charcoalMuted">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      )}
    </div>
  );
}
