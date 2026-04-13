#!/usr/bin/env node
import { loadMonitoringConfig } from "./monitor/config.js";
import { SupabaseRestClient } from "./monitor/supabase-rest.js";
import { runDailyAggregation } from "./monitor/aggregation-job.js";

function parseDateArg(args) {
  const raw = args.find((arg) => arg.startsWith("--date="));
  if (!raw) return null;

  const value = raw.slice("--date=".length);
  const parsed = new Date(`${value}T00:00:00Z`);
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
  console.error("[monitoring] aggregation fatal", error);
  process.exit(1);
});
