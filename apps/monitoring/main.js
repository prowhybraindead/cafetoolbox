#!/usr/bin/env node
import { runMonitoringWorker } from "./monitor/worker.js";
import { runWatchdog } from "./monitor/watchdog.js";
import { createLogger } from "./monitor/logger.js";

const logger = createLogger("main");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supervise(name, fn, restartDelayMs) {
  while (true) {
    try {
      await fn();
    } catch (err) {
      logger.critical(`[${name}] crashed: ${err?.message ?? err}`);
      logger.warn(`[${name}] restarting in ${Math.floor(restartDelayMs / 1000)}s`);
      await delay(restartDelayMs);
    }
  }
}

process.on("unhandledRejection", (reason) => {
  logger.critical(`Unhandled rejection: ${reason?.message ?? reason}`);
});

process.on("uncaughtException", (err) => {
  logger.critical(`Uncaught exception: ${err?.message ?? err}`);
});

const restartDelayMs = Number.parseInt(process.env.MONITOR_RESTART_DELAY_MS || "4000", 10) || 4000;
logger.info("Monitoring supervisor started", { restartDelayMs });

void supervise("worker", () => runMonitoringWorker({ once: false }), restartDelayMs);
void supervise("watchdog", () => runWatchdog({ once: false }), restartDelayMs);
