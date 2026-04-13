import { logger } from "./logger.js";

function utcDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function computeDailyMetrics(heartbeats) {
  const totalChecks = heartbeats.length;

  if (totalChecks === 0) {
    return {
      uptimePercentage: null,
      avgResponseTime: null,
      totalChecks: 0,
      failedChecks: 0,
    };
  }

  const failedChecks = heartbeats.filter((row) => !row.is_healthy).length;
  const healthyChecks = totalChecks - failedChecks;
  const uptimePercentage = Number(((healthyChecks / totalChecks) * 100).toFixed(4));

  const responseTimes = heartbeats
    .map((row) => row.response_time_ms)
    .filter((value) => typeof value === "number");
  const avgResponseTime =
    responseTimes.length > 0
      ? Number((responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length).toFixed(2))
      : null;

  return {
    uptimePercentage,
    avgResponseTime,
    totalChecks,
    failedChecks,
  };
}

export async function runDailyAggregation({ db, runDate }) {
  const end = startOfUtcDay(runDate || new Date());
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const reportDate = utcDateOnly(start);

  logger.info("Starting daily uptime aggregation", {
    date: reportDate,
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const services = await db.getServices();
  let processed = 0;

  for (const service of services) {
    try {
      const heartbeats = await db.getHeartbeatsForWindow(service.id, start.toISOString(), end.toISOString());
      const metrics = computeDailyMetrics(heartbeats);

      await db.upsertDailyAggregate({
        service_uuid: service.id,
        date: reportDate,
        uptime_percentage: metrics.uptimePercentage,
        avg_response_time: metrics.avgResponseTime,
        total_checks: metrics.totalChecks,
        failed_checks: metrics.failedChecks,
      });

      processed += 1;
    } catch (error) {
      logger.error("Failed daily aggregation for service", {
        serviceId: service.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Daily uptime aggregation completed", {
    date: reportDate,
    servicesProcessed: processed,
    servicesTotal: services.length,
  });
}
