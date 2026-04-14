import { createServerClient } from "@cafetoolbox/supabase";
import { NextResponse } from "next/server";

type DailyRow = {
  date: string;
  uptime_percentage: number | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "30", 10) || 30));

  if (!serviceId) {
    return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });
  }

  const supabase = await createServerClient();

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
