# CafeToolbox

CafeToolbox is a monorepo for a small internal platform: a private dashboard for administration, a public status page for uptime visibility, and shared packages that keep the whole system coherent. One repo, multiple deployable apps, one shared source of truth.

[![Monorepo](https://img.shields.io/badge/monorepo-cafetoolbox-111827?style=for-the-badge)](README.md)
[![License](https://img.shields.io/badge/license-MIT-0f766e?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/next.js-16-000000?style=for-the-badge)](README.md)

## What is inside

- `apps/dashboard` - private admin dashboard for users, tools, settings, and operational workflows.
- `apps/status` - public status page with no login requirement, intended for uptime and component health visibility.
- `packages/supabase` - shared Supabase client helpers, auth utilities, middleware, and SQL migrations.
- `packages/shared` - shared types, constants, and general utilities.
- `packages/ui` - shared UI primitives.
- `packages/tailwind-config` - shared design tokens and Tailwind configuration.

## Tech Stack

- Next.js 16 App Router
- Turborepo
- pnpm workspaces
- Supabase Auth, Postgres, and RLS policies
- TypeScript
- Tailwind CSS
- Vercel for app-by-app deployment

## Why this structure works

This repository follows a monorepo model:

- One root repo contains every app and shared package.
- The dashboard and status page can be developed in the same codebase.
- Each app can be deployed separately by choosing a different root directory.
- Shared logic lives in packages instead of being copied between apps.

That means you can keep the product cohesive without forcing every app to share the same runtime or deployment surface.

## How the pieces connect

```text
CafeToolbox repo
├─ apps/dashboard  -> private admin portal
├─ apps/status     -> public uptime page
├─ packages/shared -> shared constants + utilities
├─ packages/supabase -> auth, middleware, SQL, clients
└─ packages/ui     -> shared UI primitives
```

The dashboard handles privileged workflows, while the status app stays public. Shared packages keep auth, UI, and types consistent without copy-pasting logic across apps.

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

## Getting Started

### Requirements

- Node.js 20 or newer
- pnpm 10.x
- A Supabase project if you want to run the full auth + database flow

### Install

```bash
pnpm install
```

### Environment files

Create `.env.local` files for the apps you want to run:

- `apps/dashboard/.env.local`
- `apps/status/.env.local`

Shared example values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
AUTH_COOKIE_DOMAIN=localhost
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STATUS_URL=http://localhost:3001
```

Dashboard-only server environment:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Run Locally

```bash
npm run dev
```

Useful root scripts:

- `npm run dev` - start the workspace in development mode.
- `npm run build` - build all packages and apps.
- `npm run lint` - run linting across the workspace.
- `npm run format` - format the workspace.
- `npm run type-check` - run TypeScript checks.

## App Routes

Dashboard routes are nested under `/dashboard`:

- `/login`
- `/dashboard`
- `/dashboard/tools`
- `/dashboard/settings`
- `/dashboard/users`

Status is intended to remain public and accessible without authentication.

## Deploying Apps Separately

For Vercel or any similar platform, deploy each app from the same repo but with a different root directory:

- Dashboard deployment: branch `main`, root directory `apps/dashboard`
- Status deployment: branch `main`, root directory `apps/status`

This is the key monorepo workflow: the branch gives you the repo snapshot, and the root directory tells the platform which app to build.

## Dashboard vs Status

- Dashboard is the operator-facing app.
- Status is the public-facing app.
- Both live in the same repo.
- Both can be deployed independently.
- Shared packages reduce duplication and make future tools easier to add.

## Database Setup

Run the SQL migrations in Supabase in order:

1. `packages/supabase/migrations/0001_initial_schema.sql`
2. `packages/supabase/migrations/0002_rls_policies.sql`
3. `packages/supabase/migrations/0003_seed_data.sql`
4. `packages/supabase/migrations/0004_fix_profile_schema.sql`
5. `packages/supabase/migrations/0005_update_rls_for_superadmin.sql`
6. `packages/supabase/migrations/0006_update_trigger_default_role.sql`

Then promote the first superadmin account:

```sql
UPDATE public.profiles
SET role = 'superadmin'
WHERE email = 'your-email@example.com';
```

## First-Time Resume Checklist

If you clone the project on a new machine:

1. Install Node.js 20+ and pnpm.
2. Run `pnpm install` from the repo root.
3. Recreate the `.env.local` files.
4. Start the workspace with `npm run dev`.
5. Verify the dashboard routes and the public status page.

## Troubleshooting

- Port already in use: stop the process on 3000 or 3001 and rerun the dev server.
- Turbopack cache issues: remove `.next` inside the affected app and restart.
- Login redirects looping: clear the browser cookies for the local host and try again.
- Unexpected route 404s: confirm the app is being served from the correct root directory and that the dashboard routes stay nested under `/dashboard`.

## Contributing Notes

- Keep app-specific code inside the matching `apps/<name>` folder.
- Put reusable logic in `packages/`.
- Avoid duplicating auth, types, or UI across apps when a shared package makes sense.
- Treat the status page as public by design and keep dashboard-only logic behind auth.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
