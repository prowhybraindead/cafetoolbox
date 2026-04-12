/**
 * Watchdog detection module.
 *
 * Detects if the monitoring worker is DOWN by comparing the worker's last
 * heartbeat timestamp against a configurable staleness threshold.
 *
 * Design:
 *   - Threshold = 2x workerIntervalSeconds by default (configurable).
 *   - Alert is sent exactly ONCE per outage (in-memory flag prevents spam).
 *   - Flag resets automatically when the worker recovers.
 *   - All operations are failure-safe; watchdog errors never crash the caller.
 */

import { loadMonitoringConfig } from "./config.js";
import { SupabaseRestClient } from "./supabase-rest.js";
import { IncidentNotifier } from "./notifier.js";
import { createLogger } from "./logger.js";

const logger = createLogger("watchdog");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the watchdog loop. Mirrors the pattern of runMonitoringWorker.
 * Safe to call from main.js (alongside runMonitoringWorker) or as a
 * standalone process via watchdog.js entrypoint.
 *
 * @param {{ once?: boolean }} [opts]
 */
export async function runWatchdog({ once = false } = {}) {
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
  const watchdog = new Watchdog({
    db,
    notifier,
    workerName,
    thresholdSeconds: config.watchdogThresholdSeconds,
  });

  let keepRunning = true;

  const stopHandler = () => {
    logger.warn("Watchdog received shutdown signal, stopping gracefully");
    keepRunning = false;
  };

  process.once("SIGINT", stopHandler);
  process.once("SIGTERM", stopHandler);

  logger.info("Monitoring watchdog started", {
    workerName,
    thresholdSeconds: config.watchdogThresholdSeconds,
    checkIntervalSeconds: config.watchdogCheckIntervalSeconds,
  });

  while (keepRunning) {
    await watchdog.check();
    if (once) break;
    await sleep(config.watchdogCheckIntervalSeconds * 1000);
  }

  process.removeListener("SIGINT", stopHandler);
  process.removeListener("SIGTERM", stopHandler);
  logger.info("Monitoring watchdog stopped");
}

export class Watchdog {
  /**
   * @param {object} opts
   * @param {import('./supabase-rest.js').SupabaseRestClient} opts.db
   * @param {import('./notifier.js').IncidentNotifier} opts.notifier
   * @param {string} [opts.workerName="monitoring-worker"]
   * @param {number} opts.thresholdSeconds - Staleness threshold in seconds.
   */
  constructor({ db, notifier, workerName = "monitoring-worker", thresholdSeconds }) {
    this.db = db;
    this.notifier = notifier;
    this.workerName = workerName;
    this.thresholdSeconds = thresholdSeconds;
    this.startedAt = Date.now();
    this.startupGraceMs = Math.max(120_000, thresholdSeconds * 1000);

    // In-memory outage state — prevents duplicate alerts per outage.
    this._outageAlerted = false;
  }

  /**
   * Run a single watchdog check.
   * Safe to call in a loop; all errors are caught and logged.
   */
  async check() {
    try {
      const heartbeat = await this.db.getWorkerHeartbeat(this.workerName);

      if (!heartbeat) {
        logger.warn("Watchdog: no heartbeat record found for worker", {
          workerName: this.workerName,
        });
        return;
      }

      const lastSeenMs = new Date(heartbeat.last_seen_at).getTime();
      if (!Number.isFinite(lastSeenMs)) {
        logger.warn("Watchdog: invalid last_seen_at value in heartbeat", {
          workerName: this.workerName,
          lastSeenAt: heartbeat.last_seen_at,
        });
        return;
      }

      const delaySeconds = (Date.now() - lastSeenMs) / 1000;

      if (delaySeconds > this.thresholdSeconds) {
        if (Date.now() - this.startedAt < this.startupGraceMs) {
          logger.warn("Watchdog startup grace active; suppressing stale heartbeat alert", {
            workerName: this.workerName,
            lastSeenAt: heartbeat.last_seen_at,
            delaySeconds: Math.round(delaySeconds),
            startupGraceSeconds: Math.round(this.startupGraceMs / 1000),
          });
          return;
        }

        this._handleDown(heartbeat.last_seen_at, delaySeconds);
      } else {
        this._handleUp();
      }
    } catch (error) {
      logger.error("Watchdog: check error (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  _handleDown(lastSeenAt, delaySeconds) {
    logger.critical("Watchdog: monitoring worker appears DOWN", {
      workerName: this.workerName,
      lastSeenAt,
      delaySeconds: Math.round(delaySeconds),
      thresholdSeconds: this.thresholdSeconds,
    });

    if (this._outageAlerted) return;
    this._outageAlerted = true;

    this.notifier
      .notify("worker_down", {
        message: "Monitoring worker is DOWN",
        last_seen_at: lastSeenAt,
        delay_seconds: Math.round(delaySeconds),
      })
      .catch((err) => {
        logger.error("Watchdog: failed to deliver worker_down notification", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  _handleUp() {
    if (this._outageAlerted) {
      logger.info("Watchdog: monitoring worker has recovered", {
        workerName: this.workerName,
      });
      this._outageAlerted = false;
    }
  }
}
