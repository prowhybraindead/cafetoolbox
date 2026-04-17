import { createAdminClient } from "@cafetoolbox/supabase";
import https from "https";
import http from "http";

const HEALTH_CHECK_SECRET = process.env.HEALTH_CHECK_API_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

type ServiceConfig = {
  service_id: string;
  health_check_url: string;
  timeout_ms: number;
};

type HealthCheckResult = {
  is_healthy: boolean;
  response_time_ms: number | null;
  http_status: number | null;
  error_message: string | null;
};

type CronResult =
  | {
      service_id: string;
      status: "recorded";
      is_healthy: boolean;
      response_time_ms: number | null;
      http_status: number | null;
    }
  | { service_id: string; status: "failed_to_record" }
  | { service_id: string; status: "error"; error: string };

/**
 * Perform HTTP health check on a URL
 * Measures response time and returns status
 */
async function performHealthCheck(
  url: string,
  timeoutMs: number = 5000
): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let settled = false;
    let request: ReturnType<typeof http.request> | null = null;
    const finish = (result: {
      is_healthy: boolean;
      response_time_ms: number | null;
      http_status: number | null;
      error_message: string | null;
    }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timeout = setTimeout(() => {
      request?.destroy(new Error(`Timeout after ${timeoutMs}ms`));
      finish({
        is_healthy: false,
        response_time_ms: null,
        http_status: null,
        error_message: `Timeout after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;

    request = client.request(url, { method: "GET" }, (res) => {
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      const isHealthy = res.statusCode! >= 200 && res.statusCode! < 400;

      finish({
        is_healthy: isHealthy,
        response_time_ms: responseTime,
        http_status: res.statusCode || null,
        error_message: isHealthy ? null : `HTTP ${res.statusCode}`,
      });

      // Consume response to free memory
      res.on("data", () => {});
    });

    request.on("error", (error) => {
      clearTimeout(timeout);
      finish({
        is_healthy: false,
        response_time_ms: null,
        http_status: null,
        error_message: error.message,
      });
    });

    request.end();
  });
}

/**
 * Record heartbeat to dashboard health-check API
 */
async function recordHeartbeat(
  serviceId: string,
  healthData: HealthCheckResult
): Promise<boolean> {
  // Determine base URL - use VERCEL_URL if available (production), else localhost
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const payload = JSON.stringify({
    service_id: serviceId,
    ...healthData,
  });

  return new Promise((resolve) => {
    const url = new URL(`${baseUrl}/api/health-check`);
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-Health-Check-Token": HEALTH_CHECK_SECRET,
      },
    };

    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    let request: ReturnType<typeof http.request> | null = null;
    const timeout = setTimeout(() => {
      request?.destroy(new Error("Record heartbeat timeout"));
      finish(false);
    }, 8000);

    request = client.request(options, (res) => {
      clearTimeout(timeout);
      const statusOk = res.statusCode! >= 200 && res.statusCode! < 300;
      finish(statusOk);

      // Consume response
      res.on("data", () => {});
    });

    request.on("error", (error) => {
      clearTimeout(timeout);
      console.error("[cron] Record heartbeat error:", error.message);
      finish(false);
    });

    request.write(payload);
    request.end();
  });
}

/**
 * GET /api/crons/health-check
 * Vercel Cron job handler - runs once per day (Hobby plan compatible)
 * Checks all enabled services and records heartbeats
 */
export async function GET(request: Request) {
  try {
    // Verify Vercel Cron Authorization header
    const auth = request.headers.get("authorization");
    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
      console.warn("[cron] Unauthorized request");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[cron] Health check job started");

    const supabase = await createAdminClient();

    // Fetch all enabled health check configurations
    const { data: configs, error: configError } = await supabase
      .from("service_health_config")
      .select("service_id, health_check_url, timeout_ms")
      .eq("enabled", true);

    if (configError) {
      console.error("[cron] Config fetch error:", configError);
      return Response.json(
        { error: "Failed to fetch health check configs" },
        { status: 500 }
      );
    }

    if (!configs || configs.length === 0) {
      console.log("[cron] No enabled health check configs found");
      return Response.json(
        { message: "No health checks configured" },
        { status: 200 }
      );
    }

    console.log(`[cron] Running checks for ${configs.length} services`);

    let successCount = 0;
    let failureCount = 0;
    const results: CronResult[] = [];

    // Process each service health check
    for (const config of configs) {
      try {
        const typedConfig = config as ServiceConfig;
        console.log(`[cron] Checking ${typedConfig.service_id}...`);

        // Perform health check
        const healthData = await performHealthCheck(
          typedConfig.health_check_url,
          typedConfig.timeout_ms
        );

        // Record heartbeat
        const recorded = await recordHeartbeat(typedConfig.service_id, healthData);

        if (recorded) {
          successCount++;
          results.push({
            service_id: typedConfig.service_id,
            status: "recorded",
            is_healthy: healthData.is_healthy,
            response_time_ms: healthData.response_time_ms,
            http_status: healthData.http_status,
          });
          console.log(
            `✅ ${typedConfig.service_id}: ${healthData.is_healthy ? "HEALTHY" : "UNHEALTHY"} (${healthData.response_time_ms}ms)`
          );
        } else {
          failureCount++;
          results.push({
            service_id: typedConfig.service_id,
            status: "failed_to_record",
          });
          console.warn(`⚠️  ${typedConfig.service_id}: Failed to record heartbeat`);
        }
      } catch (error) {
        failureCount++;
        console.error(
          `❌ ${(config as ServiceConfig).service_id}: Error`,
          error instanceof Error ? error.message : error
        );
        results.push({
          service_id: (config as ServiceConfig).service_id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const message = `Health check completed: ${successCount} recorded, ${failureCount} failed`;
    console.log(`[cron] ${message}`);

    return Response.json(
      {
        success: true,
        message,
        summary: {
          total: configs.length,
          recorded: successCount,
          failed: failureCount,
        },
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[cron] Unhandled error:", error);
    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
