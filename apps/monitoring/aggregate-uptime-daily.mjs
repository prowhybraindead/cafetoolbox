#!/usr/bin/env node

/**
 * Daily uptime aggregation entrypoint.
 *
 * Usage:
 *   node aggregate-uptime-daily.mjs
 *   node aggregate-uptime-daily.mjs --date=2026-04-11
 */

import { loadMonitoringConfig } from "./monitoring/config.mjs";
import { SupabaseRestClient } from "./monitoring/supabase-rest.mjs";
import { runDailyAggregation } from "./monitoring/aggregation-job.mjs";

function parseDateArg(args) {
  const raw = args.find((arg) => arg.startsWith("--date="));
  if (!raw) return null;

  const value = raw.slice("--date=".length);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --date value: ${value}`);
  }

  return parsed;
}

async function main() {
  const config = loadMonitoringConfig();
  const db = new SupabaseRestClient({
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey,
  });

  const runDate = parseDateArg(process.argv.slice(2));
  await runDailyAggregation({ db, runDate });
}

main().catch((error) => {
  console.error("[monitoring] daily aggregation failed", error);
  process.exit(1);
});
