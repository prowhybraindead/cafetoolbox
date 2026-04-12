#!/usr/bin/env node
import { runMonitoringWorker } from "./monitor/worker.js";

const args = new Set(process.argv.slice(2));

async function main() {
  await runMonitoringWorker({ once: args.has("--once") });
}

main().catch((error) => {
  console.error("[monitoring] worker fatal", error);
  process.exit(1);
});
