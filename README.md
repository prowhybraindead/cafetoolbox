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
- Status app is operational with:
  - live Supabase-backed service uptime and incident tracking
  - all timestamps normalised to UTC with explicit suffix
  - multi-timezone clock wall (Vercel EST/EDT, UTC+0, VN UTC+7) updating in real time
- Supabase database/RLS is consolidated under unified migration `0011`.
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

Use unified path only.

Primary migration:

- `packages/supabase/migrations/0011_rebuild_schema_and_rls_unified.sql`

Runbook:

- `packages/supabase/UNIFIED_MIGRATION_RUNBOOK.md`

Mandatory preflight gate command:

```bash
node scripts/supabase-phase1-preflight.mjs
```

If preflight passes, apply `0011` in Supabase SQL Editor as one full script.

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
