import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULTS = {
  workerIntervalSeconds: 30,
  maxConcurrency: 6,
  requestTimeoutMs: 5000,
  maxRetries: 1,
  retryDelayMs: 300,
  incidentCooldownSeconds: 180,
  incidentFailureThreshold: 3,
  incidentIdentifiedThreshold: 5,
  incidentMajorThreshold: 8,
  incidentRecoveryThreshold: 2,
  heartbeatLookback: 20,
  aggregationBatchSize: 25,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let envLoaded = false;

function loadDotEnvOnce() {
  if (envLoaded) return;

  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(__dirname, "..", ".env"),
  ];

  for (const envPath of candidates) {
    try {
      const content = readFileSync(envPath, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const separator = line.indexOf("=");
        if (separator <= 0) continue;

        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();

        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // No .env in this location; continue to next candidate.
    }
  }

  envLoaded = true;
}

function getInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function loadMonitoringConfig() {
  loadDotEnvOnce();

  return {
    supabaseUrl: getRequired("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: getRequired("SUPABASE_SERVICE_ROLE_KEY"),
    workerIntervalSeconds: getInt("MONITORING_INTERVAL_SECONDS", DEFAULTS.workerIntervalSeconds),
    maxConcurrency: Math.min(10, Math.max(1, getInt("MONITORING_MAX_CONCURRENCY", DEFAULTS.maxConcurrency))),
    requestTimeoutMs: Math.max(1000, getInt("MONITORING_REQUEST_TIMEOUT_MS", DEFAULTS.requestTimeoutMs)),
    maxRetries: Math.min(1, Math.max(0, getInt("MONITORING_MAX_RETRIES", DEFAULTS.maxRetries))),
    retryDelayMs: Math.max(100, getInt("MONITORING_RETRY_DELAY_MS", DEFAULTS.retryDelayMs)),
    incidentCooldownSeconds: Math.max(60, getInt("INCIDENT_COOLDOWN_SECONDS", DEFAULTS.incidentCooldownSeconds)),
    incidentFailureThreshold: Math.max(2, getInt("INCIDENT_FAILURE_THRESHOLD", DEFAULTS.incidentFailureThreshold)),
    incidentIdentifiedThreshold: Math.max(3, getInt("INCIDENT_IDENTIFIED_THRESHOLD", DEFAULTS.incidentIdentifiedThreshold)),
    incidentMajorThreshold: Math.max(4, getInt("INCIDENT_MAJOR_THRESHOLD", DEFAULTS.incidentMajorThreshold)),
    incidentRecoveryThreshold: Math.max(1, getInt("INCIDENT_RECOVERY_THRESHOLD", DEFAULTS.incidentRecoveryThreshold)),
    heartbeatLookback: Math.max(10, getInt("HEARTBEAT_LOOKBACK_LIMIT", DEFAULTS.heartbeatLookback)),
    aggregationBatchSize: Math.max(10, getInt("AGGREGATION_BATCH_SIZE", DEFAULTS.aggregationBatchSize)),
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null,
    genericWebhookUrl: process.env.ALERT_WEBHOOK_URL || null,
  };
}
