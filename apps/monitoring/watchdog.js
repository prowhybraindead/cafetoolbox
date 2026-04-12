#!/usr/bin/env node
import { runWatchdog } from "./monitor/watchdog.js";

const args = new Set(process.argv.slice(2));

runWatchdog({ once: args.has("--once") }).catch((error) => {
  console.error("[monitoring] watchdog fatal", error);
  process.exit(1);
});
