import { createServerClient } from "@cafetoolbox/supabase";
import { NextResponse } from "next/server";

type DailyRow = {
  date: string;
  uptime_percentage: number | null;
};

type HeartbeatRow = {
  is_healthy: boolean | null;
  checked_at?: string | null;
  created_at?: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "30", 10) || 30));

  if (!serviceId) {
    return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });
  }

  const supabase = await createServerClient();

  // For 1d view, return 24 hourly buckets from raw heartbeats.
  if (days === 1) {
    const endTs = new Date();
    const startTs = new Date(endTs.getTime() - 24 * 60 * 60 * 1000);

    const tryFetchHeartbeats = async (timestampColumn: "checked_at" | "created_at") => {
      const { data, error } = await supabase
        .from("service_heartbeats")
        .select(`is_healthy, ${timestampColumn}`)
        .eq("service_id", serviceId)
        .gte(timestampColumn, startTs.toISOString())
        .lt(timestampColumn, endTs.toISOString())
        .order(timestampColumn, { ascending: true });

      return { data: (data ?? []) as HeartbeatRow[], error };
    };

    let timestampColumn: "checked_at" | "created_at" = "checked_at";
    let { data: heartbeatRows, error: heartbeatError } = await tryFetchHeartbeats(timestampColumn);

    if (heartbeatError) {
      timestampColumn = "created_at";
      const fallback = await tryFetchHeartbeats(timestampColumn);
      heartbeatRows = fallback.data;
      heartbeatError = fallback.error;
    }

    if (heartbeatError) {
      return NextResponse.json({ error: heartbeatError.message }, { status: 500 });
    }

    const buckets: { total: number; healthy: number }[] = Array.from({ length: 24 }, () => ({
      total: 0,
      healthy: 0,
    }));

    for (const row of heartbeatRows) {
      const ts = timestampColumn === "checked_at" ? row.checked_at : row.created_at;
      if (!ts) continue;
      const offsetMs = new Date(ts).getTime() - startTs.getTime();
      if (offsetMs < 0 || offsetMs >= 24 * 60 * 60 * 1000) continue;

      const bucketIndex = Math.floor(offsetMs / (60 * 60 * 1000));
      if (bucketIndex < 0 || bucketIndex > 23) continue;

      buckets[bucketIndex].total += 1;
      if (row.is_healthy === true) {
        buckets[bucketIndex].healthy += 1;
      }
    }

    const result = buckets.map((bucket, index) => {
      const bucketStart = new Date(startTs.getTime() + index * 60 * 60 * 1000);
      return {
        date: bucketStart.toISOString(),
        uptime: bucket.total > 0 ? (bucket.healthy / bucket.total) * 100 : null,
      };
    });

    return NextResponse.json(result);
  }

  const nowUtc = new Date();
  const endDate = new Date(
    Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate())
  );
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("service_uptime_daily")
    .select("date, uptime_percentage")
    .eq("service_uuid", serviceId)
    .gte("date", startStr)
    .lt("date", endStr)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as DailyRow[];
  const byDate = new Map<string, number | null>();
  for (const row of rows) {
    byDate.set(row.date, row.uptime_percentage ?? null);
  }

  // Fill gaps so every day in range is present
  const result: { date: string; uptime: number | null }[] = [];
  for (let d = new Date(startDate); d < endDate; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    const dateStr = d.toISOString().slice(0, 10);
    result.push({
      date: dateStr,
      uptime: byDate.has(dateStr) ? byDate.get(dateStr)! : null,
    });
  }

  return NextResponse.json(result);
}
