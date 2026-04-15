import { createServerClient } from "@cafetoolbox/supabase";

type ServiceHealthRpcRow = {
  is_healthy: boolean;
  uptime_24h: number | null;
};

export async function GET() {
  try {
    const supabase = await createServerClient();

    const [toolsResult, incidentsResult, servicesResult] = await Promise.all([
      supabase.from("tools").select("id", { count: "exact", head: true }),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .neq("status", "resolved"),
      supabase.from("services").select("id, status").order("name", { ascending: true }),
    ]);

    if (toolsResult.error || incidentsResult.error || servicesResult.error) {
      const errorMessage =
        toolsResult.error?.message ||
        incidentsResult.error?.message ||
        servicesResult.error?.message ||
        "Failed to fetch landing overview";
      return Response.json({ error: errorMessage }, { status: 500 });
    }

    const services = servicesResult.data ?? [];
    const healthRows: ServiceHealthRpcRow[] = [];

    for (const service of services) {
      const { data, error } = await supabase
        .rpc("get_service_health_status", { service_uuid: service.id })
        .single();

      if (error) {
        healthRows.push({
          is_healthy: service.status === "operational",
          uptime_24h: service.status === "operational" ? 100 : 0,
        });
      } else {
        const row = data as ServiceHealthRpcRow | null;
        healthRows.push({
          is_healthy: row?.is_healthy ?? false,
          uptime_24h: row?.uptime_24h ?? null,
        });
      }
    }

    const totalServices = healthRows.length;
    const healthyServices = healthRows.filter((row) => row.is_healthy).length;
    const averageUptime =
      totalServices > 0
        ? Number(
            (
              healthRows.reduce((sum, row) => sum + Number(row.uptime_24h ?? 0), 0) /
              totalServices
            ).toFixed(2)
          )
        : 0;

    return Response.json(
      {
        toolsCount: toolsResult.count ?? 0,
        openIncidents: incidentsResult.count ?? 0,
        averageUptime,
        healthyServices,
        totalServices,
        securityTech: "Supabase Auth + RLS",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[landing-overview] error", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
