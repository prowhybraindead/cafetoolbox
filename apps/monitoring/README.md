# Monitoring Backend (`apps/monitoring`)

This folder contains the standalone monitoring backend runtime for VPS deployments.

## Node.js

- Required: Node.js 24+
- No extra npm dependencies are required.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in required values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional hardening knobs:
     - `INCIDENT_COOLDOWN_SECONDS` (default 180)
3. Start worker:

```bash
node worker.mjs
```

## Commands

```bash
node worker.mjs --once
node aggregate-uptime-daily.mjs
node aggregate-uptime-daily.mjs --date=2026-04-11
```

## systemd example

```ini
[Unit]
Description=CafeToolbox Monitoring Worker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/cafetoolbox/apps/monitoring
ExecStart=/usr/bin/node worker.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cafetoolbox-monitoring
sudo systemctl start cafetoolbox-monitoring
sudo systemctl status cafetoolbox-monitoring
```

## Daily aggregation via cron

```cron
5 0 * * * cd /opt/cafetoolbox/apps/monitoring && /usr/bin/node aggregate-uptime-daily.mjs >> /var/log/cafetoolbox-aggregate.log 2>&1
```
