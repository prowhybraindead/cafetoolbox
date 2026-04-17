import { createServerClient } from "@cafetoolbox/supabase";

/**
 * GET /api/services/health
 * Public endpoint for status page to get real-time service health
 * 
 * Returns: Array of services with real uptime data from heartbeats
 */

type ServiceWithHealth = {
  id: string;
  name: string;
  status: "operational" | "degraded" | "partial_outage" | "major_outage";
  uptime_24h: number;
  is_healthy: boolean;
  last_checked_at: string;
  response_time_ms: number | null;
  consecutive_failures: number;
  updated_at: string;
};

type ServiceHealthRpcRow = {
  is_healthy: boolean;
  uptime_24h: number | null;
  last_checked_at: string | null;
  last_response_time_ms: number | null;
  consecutive_failures: number | null;
};

export async function GET(_request: Request) {
  try {
    const supabase = await createServerClient();

    // Get all services
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, name, status, updated_at")
      .order("name", { ascending: true });

    if (servicesError) {
      console.error("[services-health] Services fetch error:", servicesError);
      return Response.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    if (!services || services.length === 0) {
      return Response.json({ services: [] }, { status: 200 });
    }

    // For each service, get health status from function
    const servicesWithHealth: ServiceWithHealth[] = [];

    for (const service of services) {
      const { data: healthData, error: healthError } = await supabase
        .rpc("get_service_health_status", {
          service_uuid: service.id,
        })
        .single();

      const currentStatus: ServiceWithHealth["status"] =
        service.status === "operational" ||
        service.status === "degraded" ||
        service.status === "partial_outage" ||
        service.status === "major_outage"
          ? service.status
          : "degraded";

      if (healthError) {
        console.warn(`[services-health] Error getting health for ${service.id}:`, healthError);
        // Fallback: assume operational with 100% uptime if no heartbeat data
        servicesWithHealth.push({
          id: service.id,
          name: service.name,
          status: currentStatus,
          uptime_24h: 100.0,
          is_healthy: service.status === "operational",
          last_checked_at: new Date().toISOString(),
          response_time_ms: null,
          consecutive_failures: 0,
          updated_at: service.updated_at,
        });
      } else {
        // Map RPC result to our type
        const health = healthData as ServiceHealthRpcRow | null;
        servicesWithHealth.push({
          id: service.id,
          name: service.name,
          status: health?.is_healthy ? "operational" : "degraded",
          uptime_24h: Number(health?.uptime_24h || 100.0),
          is_healthy: health?.is_healthy ?? false,
          last_checked_at: health?.last_checked_at ?? new Date().toISOString(),
          response_time_ms: health?.last_response_time_ms ?? null,
          consecutive_failures: health?.consecutive_failures || 0,
          updated_at: service.updated_at,
        });
      }
    }

    // Cache: 1 minute (can be adjusted)
    return Response.json(
      { services: servicesWithHealth },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[services-health] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
