#!/usr/bin/env node

/**
 * Health Check Worker Script
 * 
 * Runs health checks for all configured services and records heartbeats.
 * 
 * Usage:
 *   node scripts/health-check-worker.mjs
 * 
 * Environment Variables Required:
 *   - HEALTH_CHECK_API_SECRET: Token for posting health checks
 *   - DASHBOARD_BASE_URL: Base URL of dashboard (default: http://localhost:3000)
 *   - CHECK_TIMEOUT_MS: Global timeout for checks (default: 10000)
 */

import https from "https";
import http from "http";

const HEALTH_CHECK_SECRET = process.env.HEALTH_CHECK_API_SECRET;
const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || "http://localhost:3000";
const CHECK_TIMEOUT_MS = parseInt(process.env.CHECK_TIMEOUT_MS || "10000", 10);

if (!HEALTH_CHECK_SECRET) {
  console.error("❌ Missing HEALTH_CHECK_API_SECRET environment variable");
  process.exit(1);
}

/**
 * Perform HTTP request and measure response time
 */
async function performHealthCheck(url, method = "GET", timeoutMs = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      resolve({
        is_healthy: false,
        response_time_ms: null,
        http_status: null,
        error_message: `Timeout after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;

    const request = client.request(url, { method }, (res) => {
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      const isHealthy = res.statusCode >= 200 && res.statusCode < 400;

      resolve({
        is_healthy: isHealthy,
        response_time_ms: responseTime,
        http_status: res.statusCode,
        error_message: isHealthy ? null : `HTTP ${res.statusCode}`,
      });

      // Consume response to free up memory
      res.on("data", () => {});
    });

    request.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
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
 * POST heartbeat to dashboard API
 */
async function recordHeartbeat(serviceId, healthData) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      service_id: serviceId,
      ...healthData,
    });

    const url = new URL(`${DASHBOARD_BASE_URL}/api/health-check`);
    const options = {
      hostname: url.hostname,
      port: url.port,
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

    const request = client.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
          data,
        });
      });
    });

    request.on("error", (error) => {
      resolve({
        status: 500,
        success: false,
        error: error.message,
      });
    });

    request.write(payload);
    request.end();
  });
}

/**
 * Main worker function
 */
async function runHealthChecks() {
  console.log("🏥 Starting health check worker...");
  console.log(`📍 Dashboard: ${DASHBOARD_BASE_URL}`);
  console.log(`⏱️  Check timeout: ${CHECK_TIMEOUT_MS}ms\n`);

  try {
    // For now, perform hardcoded checks (normally would fetch from Supabase)
    // In production, fetch service_health_config from Supabase
    const checks = [
      {
        service_id: "dashboard-app",
        url: "https://cafetoolbox.app/api/health",
        name: "Dashboard App",
      },
      {
        service_id: "status-page",
        url: "https://status.cafetoolbox.app/",
        name: "Status Page",
      },
      {
        service_id: "api-services",
        url: "https://cafetoolbox.app/api/health",
        name: "API Services",
      },
    ];

    let successCount = 0;
    let failureCount = 0;

    for (const check of checks) {
      try {
        console.log(`⏳ Checking ${check.name}...`);

        // Perform health check
        const healthData = await performHealthCheck(check.url, "GET", CHECK_TIMEOUT_MS);

        // Record heartbeat
        const result = await recordHeartbeat(check.service_id, healthData);

        if (result.success) {
          successCount++;
          console.log(`✅ ${check.name}: ${healthData.is_healthy ? "HEALTHY" : "UNHEALTHY"} (${healthData.response_time_ms}ms)`);
        } else {
          failureCount++;
          console.log(`⚠️  ${check.name}: Failed to record heartbeat (${result.status})`);
        }
      } catch (error) {
        failureCount++;
        console.log(`❌ ${check.name}: Error - ${error.message}`);
      }
    }

    console.log(`\n✅ Completed: ${successCount} recorded, ${failureCount} failed`);
  } catch (error) {
    console.error("❌ Worker error:", error);
    process.exit(1);
  }
}

runHealthChecks();
