import { createServerClient } from "@cafetoolbox/supabase";

/**
 * GET /api/health
 * Public health check endpoint
 * 
 * Used by external health monitors or status page to verify service is running.
 * Returns simple 200 if database is accessible.
 */

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Quick database check: count services
    const { count, error } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("[health] Database error:", error);
      return Response.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          message: "Database connection failed",
        },
        { status: 503 }
      );
    }

    return Response.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services_count: count,
        version: "1.0.0",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[health] Error:", error);
    return Response.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
