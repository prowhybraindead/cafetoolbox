import { createAdminClient } from "@cafetoolbox/supabase";

/**
 * POST /api/health-check
 * Internal endpoint for external health check workers/Cron jobs
 * 
 * Body:
 * {
 *   "service_id": "uuid",
 *   "is_healthy": true,
 *   "response_time_ms": 123,
 *   "http_status": 200,
 *   "error_message": null
 * }
 * 
 * Requires: X-Health-Check-Token header (secret API key)
 */

const HEALTH_CHECK_SECRET = process.env.HEALTH_CHECK_API_SECRET;

export async function POST(request: Request) {
  try {
    // Verify secret token
    const token = request.headers.get("X-Health-Check-Token");
    if (!token || token !== HEALTH_CHECK_SECRET) {
      return Response.json(
        { error: "Unauthorized: Invalid health check token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { service_id, is_healthy, response_time_ms, http_status, error_message } = body;

    if (!service_id || typeof is_healthy !== "boolean") {
      return Response.json(
        { error: "Missing required fields: service_id, is_healthy" },
        { status: 400 }
      );
    }

    // Create admin client to write heartbeat
    const supabase = await createAdminClient();

    // Record heartbeat
    const { data, error } = await supabase
      .from("service_heartbeats")
      .insert({
        service_id,
        is_healthy,
        response_time_ms: response_time_ms || null,
        http_status: http_status || null,
        error_message: error_message || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[health-check] Insert error:", error);
      return Response.json(
        { error: "Failed to record heartbeat" },
        { status: 500 }
      );
    }

    // Update service status based on health
    const { error: updateError } = await supabase
      .from("services")
      .update({
        status: is_healthy ? "operational" : "partial_outage",
        uptime: is_healthy ? 99.9 : 50.0, // Placeholder; calculate from heartbeats
      })
      .eq("id", service_id);

    if (updateError) {
      console.error("[health-check] Update service error:", updateError);
    }

    return Response.json(
      {
        success: true,
        heartbeat_id: data?.id,
        message: `Service health recorded: ${is_healthy ? "healthy" : "unhealthy"}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[health-check] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
