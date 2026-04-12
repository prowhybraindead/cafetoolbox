# Monitoring Backend Architecture

## Purpose

Production-grade monitoring backend for CafeToolbox status reliability data:

- Continuous health checks
- Raw heartbeat persistence
- Automatic incident lifecycle
- Alert webhooks
- Daily aggregation for 7d/30d chart windows

This backend is worker-based (not a REST API server).

## Runtime Layout

- `apps/monitoring/main.mjs`: unified entrypoint (worker + watchdog, single process)
- `apps/monitoring/worker.mjs`: worker-only entrypoint
- `apps/monitoring/watchdog.mjs`: watchdog-only entrypoint (separate process)
- `apps/monitoring/aggregate-uptime-daily.mjs`: daily rollup entrypoint
- `apps/monitoring/monitor/config.mjs`: environment + runtime configuration
- `apps/monitoring/monitor/health-checker.mjs`: timeout + retry HTTP probes
- `apps/monitoring/monitor/supabase-rest.mjs`: minimal Supabase REST gateway
- `apps/monitoring/monitor/incident-engine.mjs`: incident trigger/escalation/recovery logic
- `apps/monitoring/monitor/notifier.mjs`: Discord + generic webhook delivery
- `apps/monitoring/monitor/aggregation-job.mjs`: per-day uptime aggregate writer
- `apps/monitoring/monitor/chart-data.mjs`: daily uptime history utility (7d / 30d)
- `apps/monitoring/monitor/watchdog.mjs`: watchdog detection logic
- `apps/monitoring/monitor/logger.mjs`: structured logs

## Core Behavior

### Worker loop

- Interval-driven polling (default 30s)
- Concurrency cap (default 6, hard max 10)
- Per-request timeout (default 5000ms)
- Lightweight retry (max 1)
- Graceful handling for failed checks (worker continues)

### Incident engine

- Trigger when consecutive failures reach threshold (`INCIDENT_FAILURE_THRESHOLD`, default 3)
- Escalate incident status based on failure streak:
  - `investigating`
  - `identified`
  - `major_outage` (with compatibility fallback to `identified` if DB enum is not upgraded yet)
- Resolve automatically after consecutive healthy checks (`INCIDENT_RECOVERY_THRESHOLD`, default 2)
- Cooldown after resolve (`INCIDENT_COOLDOWN_SECONDS`, default 180) to reduce flapping noise
- Prevent duplicate open incidents by race-safe double-check and duplicate reconciliation
- Fetch open incidents once per worker cycle and reuse in-memory cache for lower DB load

### Worker Self-Heartbeat

- Worker upserts a row in `worker_heartbeats` **at most once every 60 seconds** (throttled):
  - `worker_name = "monitoring-worker"`
  - `last_seen_at = now()` (UTC ISO string)
  - `status = "healthy"`
- Write is fire-and-forget: failure is logged as a warning but never crashes the loop.
- Throttle is in-memory (`lastHeartbeatAt`): no extra DB reads, safe on restart.

### Watchdog Detection

- Runs as a **separate process** (`watchdog.mjs`) independent from the worker.
- Every `WATCHDOG_CHECK_INTERVAL_SECONDS` (default 60s), reads `worker_heartbeats` and checks freshness.
- Worker is considered DOWN when: `now - last_seen_at > WATCHDOG_THRESHOLD_SECONDS`
- Default threshold: `2 × MONITORING_INTERVAL_SECONDS` (configurable via `WATCHDOG_THRESHOLD_SECONDS`).
- When DOWN:
  - Logs as CRITICAL
  - Fires `worker_down` alert (Discord + webhook) exactly once per outage
- Alert flag resets automatically when the worker recovers (next heartbeat fresh again).

### Chart Data Utility

- `chart-data.mjs` provides `getDailyUptimeHistory(db, serviceId, days)`.
- Returns `[{ date, uptime }, ...]` sorted ASC; `uptime = null` for missing days.
- Reads from `service_uptime_daily` — never from raw heartbeats.
- Convenience wrappers: `getWeeklyUptimeHistory` (7d), `getMonthlyUptimeHistory` (30d).

### Alerts

- Incident lifecycle events:
  - `incident_created`
  - `incident_updated`
  - `incident_resolved`
- System reliability event:
  - `worker_down` — payload: `{ message, last_seen_at, delay_seconds }`
- Non-blocking sends to:
  - Discord webhook (`DISCORD_WEBHOOK_URL`)
  - Generic webhook (`ALERT_WEBHOOK_URL`)

### Aggregation

- Daily UTC window aggregation from `service_heartbeats`
- Upsert into `service_uptime_daily`
- Supports future chart windows without querying raw heartbeat logs
- `total_checks = 0` now writes `uptime_percentage = null` and `avg_response_time = null`
  to represent unknown/no-data instead of false 0% uptime

## Commands

- `pnpm monitoring:start` — start worker + watchdog in a single process (unified mode)
- `pnpm monitoring:worker` — start continuous worker loop (split mode)
- `pnpm monitoring:once` — single cycle then exit
- `pnpm monitoring:watchdog` — start watchdog process only (split mode)
- `pnpm monitoring:watchdog:once` — single watchdog check then exit
- `pnpm monitoring:aggregate-daily` — run daily uptime aggregation

## Database

Migrations required (apply in order):

- `packages/supabase/migrations/0014_add_service_uptime_daily.sql`
- `packages/supabase/migrations/0015_monitoring_correctness_hardening.sql`
- `packages/supabase/migrations/0016_add_worker_heartbeats.sql`

Tables:

- `service_uptime_daily` — daily rollups for chart windows
  - `service_uuid`, `date`, `uptime_percentage` (nullable), `avg_response_time`, `total_checks`, `failed_checks`
- `worker_heartbeats` — worker self-health records
  - `id`, `worker_name`, `last_seen_at`, `status`
  - Unique on `worker_name` (upserted on conflict)
  - RLS: superadmin read/write; service role bypasses RLS

## Environment Variables (Updated)

New standard variable names are preferred. Legacy names are still accepted as a
fallback and will log a deprecation warning at startup.

| Variable | Legacy fallback | Default | Description |
| --- | --- | --- | --- |
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | required | Supabase project URL |
| `SUPABASE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | required | Service role key (bypasses RLS) |
| `MONITORING_INTERVAL_SECONDS` | — | 30 | Worker polling interval |
| `MONITORING_MAX_CONCURRENCY` | — | 6 | Max parallel health checks |
| `MONITORING_REQUEST_TIMEOUT_MS` | — | 5000 | Per-request timeout |
| `MONITORING_MAX_RETRIES` | — | 1 | Retry count per check (max 1) |
| `INCIDENT_FAILURE_THRESHOLD` | — | 3 | Failures before incident is created |
| `INCIDENT_IDENTIFIED_THRESHOLD` | — | 5 | Failures to escalate to `identified` |
| `INCIDENT_MAJOR_THRESHOLD` | — | 8 | Failures to escalate to `major_outage` |
| `INCIDENT_RECOVERY_THRESHOLD` | — | 2 | Healthy checks before auto-resolve |
| `INCIDENT_COOLDOWN_SECONDS` | — | 180 | Anti-flap cooldown after resolve |
| `DISCORD_WEBHOOK_URL` | — | null | Discord webhook URL for alerts |
| `ALERT_WEBHOOK_URL` | — | null | Generic HTTP webhook URL |
| `WATCHDOG_THRESHOLD_SECONDS` | — | 2× interval | Staleness threshold before DOWN alert |
| `WATCHDOG_CHECK_INTERVAL_SECONDS` | — | 60 | How often watchdog polls the DB |

## Operational Notes

- Keep service checks configured in `service_health_config`.
- Run worker in a persistent process manager (systemd, PM2, Docker restart policy).
- Run watchdog as a **separate** persistent process. If the worker and watchdog share a single process and crash together, the watchdog is useless.
- Schedule daily aggregation shortly after UTC midnight.
- Watchdog threshold should be at least 2× worker interval to tolerate one slow/missed cycle without false-positive alerts.
