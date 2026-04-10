# CafeToolbox Dashboard

Private admin dashboard for CafeToolbox. This app is where operators manage users, tools, settings, and the internal workflows that support the rest of the platform.

## What it does

- Presents the main dashboard landing page
- Provides nested dashboard routes under `/dashboard`
- Links to tools, settings, and user administration
- Serves as the private entry point for authenticated workflows

## Current routes

- `/login`
- `/dashboard`
- `/dashboard/tools`
- `/dashboard/settings`
- `/dashboard/users`
- `/logout`

The dashboard routes are intentionally nested. Public pages should not live at the top level unless they are meant to be accessible without authentication.

## Current UI direction

The current landing page uses a bold product-style layout with:

- a top navigation bar
- a strong hero section
- feature cards
- a status/product preview panel
- a footer with external links

This makes the app feel more like a real product shell than a bare admin page.

## Local setup

Install dependencies from the repository root:

```bash
pnpm install
```

Create `apps/dashboard/.env.local` and include the variables required by your Supabase setup:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AUTH_COOKIE_DOMAIN=localhost
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STATUS_URL=http://localhost:3001
```

## Run locally

```bash
npm run dev
```

The dashboard runs on port `3000`.

## Deploying

For Vercel or a similar host, deploy from the same monorepo with:

- Branch: `main`
- Root directory: `apps/dashboard`

That keeps the dashboard isolated while still sharing packages and infra code from the root repo.

## Shared dependencies

This app uses packages from the monorepo instead of duplicating logic:

- `@cafetoolbox/shared`
- `@cafetoolbox/supabase`
- `@cafetoolbox/ui`

## Notes

- Public registration is not enabled.
- User creation is managed through the dashboard.
- If a route returns 404, confirm it is nested under `/dashboard` and not exposed at the top level.
- If login behaves unexpectedly, check the cookie domain and the auth middleware setup.

## Related docs

- [Root README](../../README.md)
- [Status README](../status/README.md)