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

- `scripts/health-check-worker.mjs`: worker entrypoint
- `scripts/aggregate-uptime-daily.mjs`: daily rollup entrypoint
- `scripts/monitoring/config.mjs`: environment + runtime configuration
- `scripts/monitoring/health-checker.mjs`: timeout + retry HTTP probes
- `scripts/monitoring/supabase-rest.mjs`: minimal Supabase REST gateway
- `scripts/monitoring/incident-engine.mjs`: incident trigger/escalation/recovery logic
- `scripts/monitoring/notifier.mjs`: Discord + generic webhook delivery
- `scripts/monitoring/aggregation-job.mjs`: per-day uptime aggregate writer
- `scripts/monitoring/logger.mjs`: structured logs

## Core Behavior

### Worker loop

- Interval-driven polling (default 30s)
- Concurrency cap (default 6, hard max 10)
- Per-request timeout (default 5000ms)
- Lightweight retry (max 1)
- Graceful handling for failed checks (worker continues)

### Incident engine

- Trigger when consecutive failures reach threshold (`INCIDENT_FAILURE_THRESHOLD`, default 3)
- Escalate incident status to `identified` on deeper failure streak
- Resolve automatically after consecutive healthy checks (`INCIDENT_RECOVERY_THRESHOLD`, default 2)
- Prevent duplicate open incidents by service association

### Alerts

- Incident lifecycle events:
  - `incident_created`
  - `incident_updated`
  - `incident_resolved`
- Non-blocking sends to:
  - Discord webhook (`DISCORD_WEBHOOK_URL`)
  - Generic webhook (`ALERT_WEBHOOK_URL`)

### Aggregation

- Daily UTC window aggregation from `service_heartbeats`
- Upsert into `service_uptime_daily`
- Supports future chart windows without querying raw heartbeat logs

## Commands

- `pnpm monitoring:worker`
- `pnpm monitoring:once`
- `pnpm monitoring:aggregate-daily`

## Database

Migration required:

- `packages/supabase/migrations/0014_add_service_uptime_daily.sql`

Table added:

- `service_uptime_daily`
  - `service_uuid`
  - `date`
  - `uptime_percentage`
  - `avg_response_time`
  - `total_checks`
  - `failed_checks`

## Operational Notes

- Keep service checks configured in `service_health_config`.
- Run worker in a persistent process manager (systemd, PM2, Docker restart policy).
- Schedule daily aggregation shortly after UTC midnight.
