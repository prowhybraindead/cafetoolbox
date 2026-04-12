import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  watchdogCheckIntervalSeconds: 60,
};

let envLoaded = false;

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const at = line.indexOf("=");
    if (at <= 0) continue;

    const key = line.slice(0, at).trim();
    const value = unquote(line.slice(at + 1));
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadDotEnvOnce() {
  if (envLoaded) return;
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(__dirname, "..", ".env.local"),
    resolve(__dirname, "..", ".env"),
  ];

  for (const envPath of candidates) {
    loadEnvFile(envPath);
  }
  envLoaded = true;
}

function getInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE configuration: set SUPABASE_URL and SUPABASE_KEY");
  }

  return {
    url,
    key,
  };
}

export function loadMonitoringConfig() {
  loadDotEnvOnce();

  const { url: supabaseUrl, key: serviceRoleKey } = resolveSupabaseEnv();
  const workerIntervalSeconds = Math.max(
    5,
    getInt("MONITORING_INTERVAL_SECONDS", DEFAULTS.workerIntervalSeconds)
  );

  return {
    supabaseUrl,
    serviceRoleKey,
    workerIntervalSeconds,
    maxConcurrency: Math.min(20, Math.max(1, getInt("MONITORING_MAX_CONCURRENCY", DEFAULTS.maxConcurrency))),
    requestTimeoutMs: Math.max(1000, getInt("MONITORING_REQUEST_TIMEOUT_MS", DEFAULTS.requestTimeoutMs)),
    maxRetries: Math.min(3, Math.max(0, getInt("MONITORING_MAX_RETRIES", DEFAULTS.maxRetries))),
    retryDelayMs: Math.max(100, getInt("MONITORING_RETRY_DELAY_MS", DEFAULTS.retryDelayMs)),
    incidentCooldownSeconds: Math.max(30, getInt("INCIDENT_COOLDOWN_SECONDS", DEFAULTS.incidentCooldownSeconds)),
    incidentFailureThreshold: Math.max(1, getInt("INCIDENT_FAILURE_THRESHOLD", DEFAULTS.incidentFailureThreshold)),
    incidentIdentifiedThreshold: Math.max(2, getInt("INCIDENT_IDENTIFIED_THRESHOLD", DEFAULTS.incidentIdentifiedThreshold)),
    incidentMajorThreshold: Math.max(3, getInt("INCIDENT_MAJOR_THRESHOLD", DEFAULTS.incidentMajorThreshold)),
    incidentRecoveryThreshold: Math.max(1, getInt("INCIDENT_RECOVERY_THRESHOLD", DEFAULTS.incidentRecoveryThreshold)),
    heartbeatLookback: Math.max(5, getInt("HEARTBEAT_LOOKBACK_LIMIT", DEFAULTS.heartbeatLookback)),
    aggregationBatchSize: Math.max(10, getInt("AGGREGATION_BATCH_SIZE", DEFAULTS.aggregationBatchSize)),
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null,
    genericWebhookUrl: process.env.ALERT_WEBHOOK_URL || null,
    watchdogThresholdSeconds: Math.max(
      workerIntervalSeconds,
      getInt("WATCHDOG_THRESHOLD_SECONDS", workerIntervalSeconds * 2)
    ),
    watchdogCheckIntervalSeconds: Math.max(
      15,
      getInt("WATCHDOG_CHECK_INTERVAL_SECONDS", DEFAULTS.watchdogCheckIntervalSeconds)
    ),
  };
}
