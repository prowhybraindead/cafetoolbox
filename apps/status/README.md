# CafeToolbox Status

Public status page for CafeToolbox. This app is intentionally open for everyone to read without logging in, so teammates and users can check uptime, service health, and incident history at a glance.

## What it shows

- Overall platform state
- Uptime for each service
- Service-level status badges
- Recent incidents
- Incident updates and progress notes
- Last refresh timestamp

## Data model

The current page reads directly from Supabase tables:

- `services`
- `incidents`
- `incident_updates`

Each service stores a current status and uptime value. Incidents track ongoing or resolved issues, and incident updates provide a short timeline of what changed.

## Current behavior

- No authentication is required.
- The page is rendered server-side.
- Data is read from Supabase on request.
- If there are no services or incidents seeded yet, the page will still render cleanly and show empty-state messages.

## Local setup

Install dependencies from the repository root first:

```bash
pnpm install
```

Then create `apps/status/.env.local` with the values your local Supabase project needs:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STATUS_URL=http://localhost:3001
```

If the shared Supabase helpers require extra variables in your setup, mirror them from the root documentation.

## Run locally

```bash
npm run dev
```

This app is configured to run on port `3001`.

## Deploying

For Vercel or any similar platform, deploy this app from the same monorepo with:

- Branch: `main`
- Root directory: `apps/status`

That keeps the deployment isolated while still sharing packages and database helpers from the root repo.

## Notes on uptime tracking

The current implementation displays the latest uptime values per service. If you want true historical uptime tracking, the next step is to add a heartbeat or snapshot table so the app can store check results over time instead of only reading the current status.

## Related docs

- [Root README](../../README.md)
