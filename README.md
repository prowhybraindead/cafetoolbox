# CafeToolbox

Monorepo for CafeToolbox dashboard + status system.

## Stack

- Next.js 16 (App Router + Turbopack)
- Turborepo
- pnpm workspaces
- Supabase Auth + Postgres (RLS)
- TypeScript + Tailwind CSS

## Workspace Structure

- `apps/dashboard` - Main dashboard app (port 3000)
- `apps/status` - Status page app (port 3001)
- `packages/supabase` - Supabase clients/helpers
- `packages/shared` - Shared types/constants/utils
- `packages/ui` - Shared UI primitives

## Quick Start

1. Install Node.js 20+.
2. Install pnpm globally:
   - `npm install -g pnpm`
3. Install dependencies at repo root:
   - `pnpm install`
4. Create env files:
   - `apps/dashboard/.env.local`
   - `apps/status/.env.local`
5. Run development server:
   - `npm run dev`

## Required Env Variables

Put these in both `apps/dashboard/.env.local` and `apps/status/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=... (dashboard app server-side only)
AUTH_COOKIE_DOMAIN=localhost
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STATUS_URL=http://localhost:3001
```

## Database Setup

Run migrations in Supabase SQL Editor (in order):

1. `packages/supabase/migrations/0001_initial_schema.sql`
2. `packages/supabase/migrations/0002_rls_policies.sql`
3. `packages/supabase/migrations/0003_seed_data.sql`
4. `packages/supabase/migrations/0004_fix_profile_schema.sql`
5. `packages/supabase/migrations/0005_update_rls_for_superadmin.sql`
6. `packages/supabase/migrations/0006_update_trigger_default_role.sql`

Then create first superadmin:

```sql
UPDATE public.profiles
SET role = 'superadmin'
WHERE email = 'your-email@example.com';
```

## Resume On Another PC

1. Copy project folder to new machine.
2. Verify Node.js + pnpm are installed.
3. Run `pnpm install` at root.
4. Recreate `.env.local` files for both apps.
5. Start with `npm run dev`.
6. Verify routes:
   - `http://localhost:3000/login`
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/dashboard/tools`
   - `http://localhost:3000/dashboard/settings`
   - `http://localhost:3000/dashboard/users`

## Troubleshooting

- Port already in use:
  - Stop old process on 3000/3001, then rerun dev server.
- Turbopack cache errors:
  - Delete `apps/dashboard/.next` and restart.
- Login loops to `/login`:
  - Clear cookies for `localhost:3000` and login again.

## Notes

- Public registration is disabled.
- User creation is managed by superadmin through `/dashboard/users`.
