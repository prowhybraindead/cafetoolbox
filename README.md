# CafeToolbox

CafeToolbox is a monorepo platform with a private admin dashboard, a public status app, and shared internal packages for auth, data, and UI consistency.

[![Monorepo](https://img.shields.io/badge/monorepo-cafetoolbox-111827?style=for-the-badge)](README.md)
[![License](https://img.shields.io/badge/license-MIT-0f766e?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/next.js-16-000000?style=for-the-badge)](README.md)

## Current Scope (Canonical)

- Dashboard app is operational for:
  - admin user management (create, edit, role update, delete)
  - tool and category administration
  - profile management and user password change
  - **New**: Health check configuration & monitoring (admin dashboard for service endpoints)
- Status app is operational with:
  - **Real-time health monitoring**: Uptime % calculated from 24h heartbeat data
  - All timestamps normalised to UTC with explicit suffix
  - Multi-timezone clock wall (Vercel EST/EDT, UTC+0, VN UTC+7) updating in real time
  - Service response times and last check timestamps displayed
- Supabase database/RLS is consolidated under unified migration `0011`.
- Health monitoring infrastructure ready:
  - Heartbeat tables, RLS policies, and RPC functions deployed
  - Health check worker script included (manual or Cron-based execution)
  - Public and internal health check APIs configured
- Password reset flow routes now exist:
  - `/forgot-password`
  - `/auth/callback`
  - `/auth/reset-password`

## Repository Layout

```text
CafeToolbox/
   apps/
      dashboard/
      status/
   packages/
      eslint-config/
      prettier-config/
      shared/
      supabase/
      tailwind-config/
      tsconfig/
      ui/
   scripts/
```

## Stack

- Next.js 16 App Router
- Turborepo + pnpm workspaces
- Supabase Auth + Postgres + RLS
- TypeScript strict
- Tailwind CSS

## Environment

Use `.env.local` at workspace root and app level as needed.

Required keys for dashboard auth/data flow:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AUTH_COOKIE_DOMAIN=localhost
```

Production cookie domain target:

```env
AUTH_COOKIE_DOMAIN=.cafetoolbox.app
```

## Local Development

Install:

```bash
pnpm install
```

Run workspace:

```bash
npm run dev
```

Useful commands:

- `pnpm run build`
- `pnpm run lint`
- `pnpm run format`
- `pnpm run type-check`

## Dashboard Routes

Public/auth routes:

- `/`
- `/login`
- `/register` (policy info page)
- `/forgot-password`
- `/auth/callback`
- `/auth/reset-password`

Protected routes:

- `/dashboard`
- `/dashboard/tools`
- `/dashboard/settings`
- `/admin`
- `/admin/users`
- `/admin/tools`
- `/admin/categories`

## Database And Migration Workflow

Use unified path + new monitoring migrations.

Primary migrations (apply in order):

1. `packages/supabase/migrations/0011_rebuild_schema_and_rls_unified.sql` - Core schema
2. `packages/supabase/migrations/0012_add_heartbeat_monitoring.sql` - Health monitoring tables
3. `packages/supabase/migrations/0013_seed_health_check_config.sql` - Default configs

Runbook:

- `packages/supabase/UNIFIED_MIGRATION_RUNBOOK.md`

Mandatory preflight gate command:

```bash
node scripts/supabase-phase1-preflight.mjs
```

If preflight passes, apply migrations in Supabase SQL Editor.

## Health Monitoring

### Overview

CafeToolbox includes real-time health monitoring:

- **Heartbeat logs**: Each service check is logged with status, response time, and any errors
- **Uptime calculation**: Status page shows uptime % calculated from 24h heartbeat data
- **Public APIs**: Health endpoints can be called by external monitors (e.g., Uptime Robot, Pingdom)

### Running Health Checks

CafeToolbox now ships a standalone monitoring backend that runs as a worker loop and writes directly to Supabase.

#### Monitoring worker (continuous)

```bash
pnpm monitoring:worker
```

#### Single monitoring cycle (manual validation)

```bash
pnpm monitoring:once
```

#### Daily uptime aggregation (for 7d / 30d charts)

```bash
pnpm monitoring:aggregate-daily
```

Optional explicit date (UTC day boundary):

```bash
node apps/monitoring/aggregate-uptime-daily.mjs --date=2026-04-11
```

#### Scheduling recommendations

- Run `pnpm monitoring:worker` on a small always-on server (1 CPU / 1GB RAM is sufficient).
- Run `pnpm monitoring:aggregate-daily` once per day shortly after UTC midnight.
- Existing `/api/health-check` and `/api/crons/health-check` routes remain compatible for fallback/manual ingestion.

### Environment Variables

For health monitoring backend:

```env
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>

# Worker controls
MONITORING_INTERVAL_SECONDS=30
MONITORING_MAX_CONCURRENCY=6
MONITORING_REQUEST_TIMEOUT_MS=5000
MONITORING_MAX_RETRIES=1

# Incident thresholds
INCIDENT_FAILURE_THRESHOLD=3
INCIDENT_IDENTIFIED_THRESHOLD=5
INCIDENT_MAJOR_THRESHOLD=8
INCIDENT_RECOVERY_THRESHOLD=2
INCIDENT_COOLDOWN_SECONDS=180

# Optional alert integrations
DISCORD_WEBHOOK_URL=<discord-webhook-url>
ALERT_WEBHOOK_URL=<generic-http-webhook-url>
```

### Health Endpoints

- `GET /api/health` - Quick health check (returns JSON status)
- `POST /api/health-check` - Record heartbeat (internal, requires token)
- `GET /api/services/health` - Real-time service health with uptime % (public)

### Configuring Health Checks

Admin users can configure health check endpoints in the database:

- **Table**: `service_health_config`
- **Fields**: `health_check_url`, `method`, `expected_status_code`, `timeout_ms`, `check_interval_seconds`, `enabled`
- **View**: Will be added to admin dashboard in Phase 3

### Daily Aggregation Table

For historical charts, worker aggregation writes to `service_uptime_daily` (migrations: `packages/supabase/migrations/0014_add_service_uptime_daily.sql`, `packages/supabase/migrations/0015_monitoring_correctness_hardening.sql`):

- `service_uuid`
- `date` (UTC)
- `uptime_percentage`
- `avg_response_time`
- `total_checks`
- `failed_checks`

## Authentication And Password Flows

### Admin-managed user lifecycle

Admin UI (`/admin/users`) supports:

- create user
- edit user profile data
- admin password reset for a specific user
- role changes (`superadmin` / `user`)
- delete user

### User self-service password flow

- In settings page (`/dashboard/settings`), authenticated users can change password directly.
- Forgot password flow uses `/forgot-password` to send reset email.
- Callback exchange and recovery routing happen on `/auth/callback`.
- New password is set on `/auth/reset-password`.

## Deployment Notes

For Vercel-like deployment:

- Dashboard root directory: `apps/dashboard`
- Status root directory: `apps/status`
- Turbo build env passthrough in `turbo.json` must include:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTH_COOKIE_DOMAIN`

Configure Supabase Auth redirect URLs to your hosted dashboard origin, not localhost, before validating forgot-password end-to-end.

## Documentation Map

- Internal detailed state: `AI.md`
- Release history: `CHANGELOG.md`
- Engineering rules: `RULES.md`
- Supabase migration guide: `packages/supabase/README.md`
- Unified migration runbook: `packages/supabase/UNIFIED_MIGRATION_RUNBOOK.md`

## License

MIT. See [LICENSE](LICENSE).
