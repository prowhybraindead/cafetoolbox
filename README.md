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

The health check worker script is included but requires manual setup:

#### Option 1: Vercel Cron Jobs (Recommended for Vercel deployment)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/crons/health-check",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Create `apps/dashboard/src/app/api/crons/health-check/route.ts` (calls health-check-worker).

#### Option 2: External Cron Service

Use services like:
- **GitHub Actions**: Free, reliable for scheduled tasks
- **Easy Cron**: Free external Cron service
- **Haraka**: Node.js cron runner

Call health check endpoint periodically:

```bash
curl -X POST https://cafetoolbox.app/api/health-check \
  -H "X-Health-Check-Token: $HEALTH_CHECK_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"service_id": "uuid", "is_healthy": true, "response_time_ms": 145}'
```

#### Option 3: Manual/Local Script

```bash
HEALTH_CHECK_API_SECRET=your_secret DASHBOARD_BASE_URL=https://cafetoolbox.app \
  node scripts/health-check-worker.mjs
```

### Environment Variables

For health checking:

```env
HEALTH_CHECK_API_SECRET=<secret-token-for-health-check-endpoint>
DASHBOARD_BASE_URL=https://cafetoolbox.app (for health check worker)
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
