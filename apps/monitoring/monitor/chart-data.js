import { logger } from "./logger.js";

function utcDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date, n) {
  return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
}

export async function getDailyUptimeHistory(db, serviceId, days = 30) {
  const clampedDays = Math.min(90, Math.max(1, Math.floor(days)));

  const nowUtc = new Date();
  const endDate = new Date(
    Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate())
  );
  const startDate = addUtcDays(endDate, -clampedDays);

  const startStr = utcDateOnly(startDate);
  const endStr = utcDateOnly(endDate);

  let rows;
  try {
    rows = await db.getDailyUptimeRows(serviceId, startStr, endStr);
  } catch (error) {
    logger.error("chart-data: failed to fetch daily uptime rows", {
      serviceId,
      startStr,
      endStr,
      error: error instanceof Error ? error.message : String(error),
    });
    rows = [];
  }

  const byDate = new Map();
  for (const row of rows) {
    byDate.set(row.date, row.uptime_percentage ?? null);
  }

  const result = [];
  for (let d = new Date(startDate); d < endDate; d = addUtcDays(d, 1)) {
    const dateStr = utcDateOnly(d);
    result.push({
      date: dateStr,
      uptime: byDate.has(dateStr) ? byDate.get(dateStr) : null,
    });
  }

  return result;
}

export function getWeeklyUptimeHistory(db, serviceId) {
  return getDailyUptimeHistory(db, serviceId, 7);
}

export function getMonthlyUptimeHistory(db, serviceId) {
  return getDailyUptimeHistory(db, serviceId, 30);
}
