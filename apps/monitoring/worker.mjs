#!/usr/bin/env node

/**
 * Monitoring worker entrypoint.
 *
 * Usage:
 *   node worker.mjs         # continuous loop
 *   node worker.mjs --once  # single cycle
 */

import { runMonitoringWorker } from "./monitoring/worker.mjs";

const args = new Set(process.argv.slice(2));

async function main() {
  const once = args.has("--once");
  await runMonitoringWorker({ once });
}

main().catch((error) => {
  console.error("[monitoring] worker failed to start", error);
  process.exit(1);
});
