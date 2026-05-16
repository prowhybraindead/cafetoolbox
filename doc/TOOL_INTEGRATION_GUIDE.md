# Dashboard Tool Integration Guide

This guide defines the standard way to integrate tools into CafeToolbox dashboard.

## Goals

- Every tool is opened through dashboard registry (`public.tools`).
- Users must be logged in to use tools.
- Superadmin manages tool records; normal users consume `active` or `beta` tools.
- Both local and external tools follow one launch model.

## Tool Types

Use `path` in `public.tools` as the source of truth.

- Local tool:
  - `path` starts with `/tools/`
  - Example: `/tools/colorsense`
  - Tool UI lives inside `apps/dashboard/src/app/tools/<slug>/page.tsx`
- External tool:
  - `path` is absolute `http://` or `https://` URL
  - Example: `https://convertube.cafetoolbox.app`
  - Dashboard launches via `/api/tools/launch?toolId=...`

## Auth and Access Rules

- `/tools/*` routes require dashboard login.
- `/api/tools/launch` requires dashboard login and checks tool status.
- Only `active` and `beta` tools are launchable.
- `archived` and `maintenance` are not launchable.

## Local Tool Onboarding

1. Create route file: `apps/dashboard/src/app/tools/<slug>/page.tsx`.
2. Register tool in admin at `/admin/tools`:
   - `slug`: `<slug>`
   - `path`: `/tools/<slug>`
   - `status`: `active` or `beta`
3. Open from dashboard tools list and verify login protection.

## External Tool Onboarding

1. Register tool in admin at `/admin/tools`:
   - `path`: absolute URL `https://...`
   - `status`: `active` or `beta`
2. Configure handoff endpoint mapping in dashboard env:
   - `DASHBOARD_TOOL_HANDOFF_PATHS=convertube=/auth/launch,tool2=/auth/launch`
3. Keep legacy query-token fallback disabled:
   - `DASHBOARD_TOOL_ALLOW_LEGACY_QUERY_TOKEN=false`
4. Verify launch uses POST handoff and URL does not include `access_token`.

## Environment Variables (Dashboard)

- `DASHBOARD_TOOL_SHARED_SECRET`
- `DASHBOARD_TOOL_TOKEN_TTL_SECONDS`
- `DASHBOARD_TOOL_HANDOFF_PATHS`
- `DASHBOARD_TOOL_DEFAULT_HANDOFF_PATH` (optional)
- `DASHBOARD_TOOL_ALLOW_LEGACY_QUERY_TOKEN` (must be `false` in production)

## Security Checklist

- Tool is `active` or `beta` only when ready for use.
- External launch does not pass token via URL query.
- Proxy routes use `Authorization: Bearer`.
- Dashboard and external tool secrets are rotated and synchronized.
