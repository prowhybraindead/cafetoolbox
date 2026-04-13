# Monitoring Backend (`apps/monitoring`)

Standalone monitoring runtime for CafeToolbox. It runs the health-check worker, incident logic, watchdog, and daily aggregation against Supabase.

## Requirements

- Node.js 18+ (tested with Node.js 24)
- Supabase service role credentials
- `.env.local` in the deployment root or environment variables in the panel

## Quick Start

```bash
cp .env.example .env.local
npm install
node main.js
```

## Pterodactyl Deployment

If the panel lets you customize startup, use:

```bash
cd /home/container && npm install --omit=dev && exec node main.js
```

If startup is locked, set `MAIN_FILE=index.js` and upload the full `apps/monitoring` folder. The root `index.js` wrapper is the safest entrypoint for the locked `ts-node --esm` branch.

## Environment Variables

Required:

- `SUPABASE_URL`
- `SUPABASE_KEY`

Common optional values:

- `MONITORING_INTERVAL_SECONDS`
- `MONITORING_MAX_CONCURRENCY`
- `MONITORING_WORKER_NAME`
- `MONITORING_REQUEST_TIMEOUT_MS`
- `MONITORING_MAX_RETRIES`
- `MONITORING_RETRY_DELAY_MS`
- `INCIDENT_FAILURE_THRESHOLD`
- `INCIDENT_IDENTIFIED_THRESHOLD`
- `INCIDENT_MAJOR_THRESHOLD`
- `INCIDENT_RECOVERY_THRESHOLD`
- `INCIDENT_COOLDOWN_SECONDS`
- `HEARTBEAT_LOOKBACK_LIMIT`
- `AGGREGATION_BATCH_SIZE`
- `WATCHDOG_THRESHOLD_SECONDS`
- `WATCHDOG_CHECK_INTERVAL_SECONDS`
- `LOG_LEVEL`
- `LOG_PRETTY`
- `DISCORD_WEBHOOK_URL`
- `ALERT_WEBHOOK_URL`

## Commands

```bash
node main.js
node worker.js
node worker.js --once
node watchdog.js
node watchdog.js --once
node aggregate-uptime-daily.js
node aggregate-uptime-daily.js --date=2026-04-11
```

## What This Folder Contains

- `main.js` starts the worker and watchdog together
- `worker.js` runs the health-check loop
- `watchdog.js` checks worker heartbeat health
- `aggregate-uptime-daily.js` computes daily uptime rows
- `monitor/` contains the core implementation

## Troubleshooting

- Exit code 128 usually means the provider startup wrapper is still forcing the wrong launch path.
- If Supabase tables are missing, the worker and watchdog now fail softly where possible.
- If `.env.local` is not present, set the same values directly in the panel variables.
