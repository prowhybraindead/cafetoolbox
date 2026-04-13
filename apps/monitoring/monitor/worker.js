import { loadMonitoringConfig } from "./config.js";
import { runHealthCheck } from "./health-checker.js";
import { SupabaseRestClient } from "./supabase-rest.js";
import { IncidentNotifier } from "./notifier.js";
import { IncidentEngine } from "./incident-engine.js";
import { createLogger } from "./logger.js";

const logger = createLogger("worker");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithConcurrency(items, maxConcurrency, handler) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(maxConcurrency, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      await handler(item);
    }
  });

  await Promise.all(workers);
}

function normalizeConfigRow(row, fallbackTimeoutMs) {
  return {
    serviceId: row.service_id,
    url: row.health_check_url,
    method: (row.method || "GET").toUpperCase(),
    expectedStatusCode:
      typeof row.expected_status_code === "number" ? row.expected_status_code : null,
    timeoutMs: typeof row.timeout_ms === "number" ? row.timeout_ms : fallbackTimeoutMs,
    intervalSeconds:
      typeof row.check_interval_seconds === "number" && row.check_interval_seconds > 0
        ? row.check_interval_seconds
        : null,
  };
}

function isDue(lastCheckedAt, nowMs, intervalSeconds, globalIntervalSeconds) {
  const effectiveInterval = intervalSeconds || globalIntervalSeconds;
  if (!lastCheckedAt) return true;
  return nowMs - lastCheckedAt >= effectiveInterval * 1000;
}

export async function runMonitoringWorker({ once = false } = {}) {
  const config = loadMonitoringConfig();
  const workerName = process.env.MONITORING_WORKER_NAME || "monitoring-worker";
  const db = new SupabaseRestClient({
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey,
  });
  const notifier = new IncidentNotifier({
    discordWebhookUrl: config.discordWebhookUrl,
    genericWebhookUrl: config.genericWebhookUrl,
  });
  const incidentEngine = new IncidentEngine({
    db,
    notifier,
    thresholds: {
      incidentCooldownSeconds: config.incidentCooldownSeconds,
      incidentFailureThreshold: config.incidentFailureThreshold,
      incidentIdentifiedThreshold: config.incidentIdentifiedThreshold,
      incidentMajorThreshold: config.incidentMajorThreshold,
      incidentRecoveryThreshold: config.incidentRecoveryThreshold,
    },
  });

  const lastCheckedMap = new Map();
  let keepRunning = true;
  const HEARTBEAT_INTERVAL_MS = 60_000;
  let lastHeartbeatAt = 0;

  const stopHandler = () => {
    logger.warn("Received shutdown signal, stopping worker loop gracefully");
    keepRunning = false;
  };

  process.once("SIGINT", stopHandler);
  process.once("SIGTERM", stopHandler);

  logger.info("Monitoring worker started", {
    workerName,
    intervalSeconds: config.workerIntervalSeconds,
    maxConcurrency: config.maxConcurrency,
    timeoutMs: config.requestTimeoutMs,
    maxRetries: config.maxRetries,
  });

  while (keepRunning) {
    const cycleStartedAt = Date.now();

    // Self-heartbeat: throttled to at most once per 60 s (fire-and-forget).
    if (cycleStartedAt - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatAt = cycleStartedAt;
      db.upsertWorkerHeartbeat(workerName, new Date(cycleStartedAt).toISOString()).catch((err) => {
        logger.warn("Worker heartbeat write failed (non-critical)", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    try {
      const rawConfigs = await db.getEnabledServiceConfigs();
      const serviceConfigs = rawConfigs.map((row) => normalizeConfigRow(row, config.requestTimeoutMs));
      const services = await db.getServices();
      const serviceById = new Map(services.map((service) => [service.id, service]));
      const openIncidents = await db.getOpenIncidents();
      const openIncidentByService = new Map();

      for (const incident of openIncidents) {
        if (!Array.isArray(incident.services_affected)) continue;

        for (const affectedServiceId of incident.services_affected) {
          if (!openIncidentByService.has(affectedServiceId)) {
            openIncidentByService.set(affectedServiceId, incident);
          }
        }
      }

      const nowMs = Date.now();
      const dueChecks = serviceConfigs.filter((service) =>
        isDue(
          lastCheckedMap.get(service.serviceId),
          nowMs,
          service.intervalSeconds,
          config.workerIntervalSeconds
        )
      );

      logger.info("Running monitoring cycle", {
        configuredServices: serviceConfigs.length,
        dueServices: dueChecks.length,
      });

      let okCount = 0;
      let failedCount = 0;

      await runWithConcurrency(dueChecks, config.maxConcurrency, async (serviceConfig) => {
        const health = await runHealthCheck(serviceConfig, {
          maxRetries: config.maxRetries,
          retryDelayMs: config.retryDelayMs,
        });

        const heartbeat = {
          service_id: serviceConfig.serviceId,
          is_healthy: health.isHealthy,
          response_time_ms: health.responseTimeMs,
          http_status: health.httpStatus,
          error_message: health.errorMessage,
          checked_at: new Date().toISOString(),
        };

        try {
          await db.insertHeartbeat(heartbeat);
          lastCheckedMap.set(serviceConfig.serviceId, Date.now());

          const recentHeartbeats = await db.getRecentHeartbeats(
            serviceConfig.serviceId,
            config.heartbeatLookback
          );
          const service = serviceById.get(serviceConfig.serviceId) || {
            id: serviceConfig.serviceId,
            name: serviceConfig.serviceId,
          };

          await incidentEngine.processHeartbeat(service, recentHeartbeats, {
            openIncidentByService,
          });

          if (health.isHealthy) {
            okCount += 1;
          } else {
            failedCount += 1;
            logger.warn("Health check not healthy", {
              serviceId: serviceConfig.serviceId,
              error: health.errorMessage,
              httpStatus: health.httpStatus,
              responseTimeMs: health.responseTimeMs,
            });
          }
        } catch (error) {
          failedCount += 1;
          logger.error("Failed processing heartbeat", {
            serviceId: serviceConfig.serviceId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      logger.info("Monitoring cycle complete", {
        okCount,
        failedCount,
        cycleDurationMs: Date.now() - cycleStartedAt,
      });
    } catch (error) {
      logger.error("Monitoring cycle crashed but worker will continue", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (once) {
      break;
    }

    const elapsedMs = Date.now() - cycleStartedAt;
    const sleepMs = Math.max(1000, config.workerIntervalSeconds * 1000 - elapsedMs);
    await sleep(sleepMs);
  }

  process.removeListener("SIGINT", stopHandler);
  process.removeListener("SIGTERM", stopHandler);
  logger.info("Monitoring worker stopped");
}
