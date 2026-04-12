# Changelog

All notable changes to this project are documented in this file.

This project follows Keep a Changelog and Semantic Versioning.

## [0.4.3-beta] - 2026-04-12

- **Fixed cookie chunking for production domain .cafetoolbox.app**
- Complete rewrite of cookie handling — back to official Supabase SSR pattern:
  - `packages/supabase/src/client.ts`: Simplified `setAll()` to just set cookies with correct domain. No Phase 1/2 clearing, no `LEGACY_CLEAR_DOMAINS`. Let Supabase manage its own cookies.
  - `packages/supabase/src/server.ts`: Simplified `makeCookieHandlers()` — only sets cookies with correct domain. No pre-clearing.
  - `packages/supabase/src/middleware.ts`: Removed `deduplicateAuthCookies()` and `clearStaleAuthCookies()`. Middleware ONLY refreshes sessions and sets fresh cookies. No cookie clearing on every request.
- Simplified auth helpers:
  - `packages/supabase/src/auth.ts`: Removed `clearDuplicateAuthCookies()`. Kept `clearAllAuthCookies()` for logout only. `login()` no longer touches cookies after `signInWithPassword()`.
  - `apps/dashboard/src/app/logout/page.tsx`: Simplified — `logout()` handles all cookie cleanup.
  - `apps/dashboard/src/app/(auth)/login/page.tsx`: No cookie manipulation after login.
- Cookie config:
  - Production: `domain=.cafetoolbox.app`, `secure=true`, `sameSite=lax`, `path=/`
  - Development: no domain (host-only), `secure=false`, `sameSite=lax`, `path=/`
- Debug logging only in production middleware.

## [0.4.2-beta] - 2026-04-12

- **Critical fix**: Login regression introduced in 0.4.1-beta — login succeeded but redirected back to `/login`:
  - Root cause 1: `clearDuplicateAuthCookies()` was called inside `login()` immediately after Supabase set fresh cookies, destroying the new session
  - Root cause 2: Same function was called again in the login page component — double nuke
  - Root cause 3: `.env.local` contained duplicate `AUTH_COOKIE_DOMAIN` keys (localhost + .cafetoolbox.app), the latter overriding the former, causing middleware to use `.cafetoolbox.app` domain in dev
- Rewrote cookie cleanup functions in `packages/supabase/src/auth.ts`:
  - `clearDuplicateAuthCookies()`: Now environment-aware — only clears the OPPOSITE domain variant (dev clears .cafetoolbox.app, prod clears host-only). Safe to call after login.
  - `clearAllAuthCookies()`: New function for logout — nukes ALL cookies across ALL domains
  - Removed `clearDuplicateAuthCookies()` call from `login()` (Supabase's `setAll()` handles dedup)
  - `logout()` now uses `clearAllAuthCookies()` instead
- Updated login flow:
  - Removed `clearDuplicateAuthCookies()` from login page (no longer needed)
  - `client.ts setAll()` already handles dedup by clearing opposite domain variants
- Updated logout flow:
  - Now uses `clearAllAuthCookies()` to nuke all cookie variants on sign out
- Added debug logging:
  - Middleware logs cookie domain resolution and user detection per request
  - Login/logout flow logs cookie operations
- Fixed `.env.local`: Commented out production `AUTH_COOKIE_DOMAIN=.cafetoolbox.app` that was overriding localhost

## [0.4.1-beta] - 2026-04-12

- **Critical fix**: Resolved cookie duplication causing 494 REQUEST_HEADER_TOO_LARGE errors:
  - Browser accumulated ~17 duplicate `sb-*` auth cookies (host-only + domain-scoped variants)
  - Root cause: inconsistent cookie domain handling across client.ts, server.ts, and middleware.ts
- Rewrote cookie management in all three Supabase client files:
  - `packages/supabase/src/client.ts`: Standardized to single `resolveCookieDomain()`, phase-based `setAll()` (clear stale → set fresh)
  - `packages/supabase/src/server.ts`: Extracted shared `makeCookieHandlers()`, eliminated code duplication between `createClient` and `createAdminClient`
  - `packages/supabase/src/middleware.ts`: Added pre-emptive `deduplicateAuthCookies()` that removes host-only variants before session refresh
- Added `clearDuplicateAuthCookies()` in `packages/supabase/src/auth.ts`:
  - Nukes ALL auth cookie variants (host-only + .cafetoolbox.app) to prevent accumulation
  - Called automatically after `login()` and `logout()` success
  - Exported for manual call from login page
- Updated auth flow cleanup:
  - `/login` page calls `clearDuplicateAuthCookies()` after successful login
  - `/logout` page calls `clearDuplicateAuthCookies()` after sign out
- Updated `apps/dashboard/src/proxy.ts`: Removed redundant public route check, now thin wrapper to `updateSession()`
- Updated `.env.example` with clearer documentation for `AUTH_COOKIE_DOMAIN` dev vs prod values
- All three cookie handlers now use consistent:
  - `SB_AUTH_COOKIE_RE` regex for identifying auth cookies
  - `resolveCookieDomain()` for domain resolution
  - Phase-based approach: clear stale → clear host-only variant → set with single domain

## [0.4.0-beta] - 2026-04-11

- **Major feature**: Real-time service health monitoring via heartbeat logs:
  - Added `service_heartbeats` table to track health check results (status, response_time, errors)
  - Added `service_health_config` table for admin-configurable health check endpoints
  - Status page uptime % now calculated from 24h heartbeat data (actual monitoring, not static)
- New API endpoints:
  - `POST /api/health-check` - Internal endpoint for worker scripts to record heartbeats
  - `GET /api/health` - Quick health check for external monitors
  - `GET /api/services/health` - Public real-time service health with uptime % and response times
- Created health-check-worker Node.js script for periodic health checks
- New RPC functions: `get_service_health_status()`, `calculate_service_uptime()` for real uptime calculation
- Status page now shows:
  - Real uptime % calculated from heartbeats (not seed values)
  - Response time (ms) for each service
  - Last checked timestamp for each service
- Added migrations:
  - `0012_add_heartbeat_monitoring.sql` - Schema, RLS, and helper functions
  - `0013_seed_health_check_config.sql` - Default health check configuration
- Implemented Vercel Cron automation:
  - `vercel.json` - Cron job schedule (once per day, Hobby-compatible): `/api/crons/health-check`
  - `apps/dashboard/src/app/api/crons/health-check/route.ts` - Cron handler with parallel health checks
  - Auto-fetches health check configs from database
  - Records heartbeats to `service_heartbeats` table
  - Requires environment variables: `HEALTH_CHECK_API_SECRET`, `CRON_SECRET`

## [0.3.2-beta] - 2026-04-11

- Normalised all status page timestamps to UTC with explicit `(UTC)` suffix for clarity.
- Added live multi-timezone clock section with three real-time clocks:
  - Vercel Server (America/New_York, EST/EDT)
  - UTC+0
  - Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
- Clocks update every second with hydration-safe fallback for SSR.
- Updated footer to indicate all page times are displayed in UTC.

## [0.3.1-beta] - 2026-04-11

- Fixed Vercel dashboard build typecheck failure in admin API routes.
- Standardized `assertSuperadmin()` error return shape to improve TypeScript narrowing.
- Applied auth helper fix across admin categories, tools, and users route handlers.
- Added Turbo build environment passthrough for:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `AUTH_COOKIE_DOMAIN`
- Verified `pnpm turbo run build --filter=@cafetoolbox/dashboard` succeeds after patch.

## [0.3.0-beta] - 2026-04-11

- Added unified Supabase migration path centered on 0011.
- Added migration runbook and live preflight script:
  - packages/supabase/UNIFIED_MIGRATION_RUNBOOK.md
  - scripts/supabase-phase1-preflight.mjs
- Fixed migration restore conflict strategy for categories and services.
- Completed admin user management flow in /admin/users:
  - create user
  - edit user
  - admin reset password
  - role change
  - delete user
- Added user password lifecycle support:
  - /dashboard/settings password change
  - /forgot-password
  - /auth/callback
  - /auth/reset-password
  - /api/me/password
- Updated route allowlist and auth guard behavior for recovery flow.
- Fixed nested-form hydration issue in dashboard settings.
- Refreshed root documentation set:
  - README.md
  - RULES.md
  - AI.md

## [0.2.7-beta] - 2026-04-10

- Replaced static status page with live Supabase-backed status data.
- Added service-level uptime bars and incident timeline details.
- Verified apps/status type-check remains clean.

## [0.2.6-beta] - 2026-04-10

- Migrated dashboard interception path from middleware.ts to proxy.ts for Next.js 16 compatibility.
- Removed startup warning related to middleware deprecation.

## [0.2.5-beta] - 2026-04-10

- Removed hardcoded dashboard quality metrics and now derive status/uptime from services table.
- Enforced registration policy by replacing /register form with disabled informational page.
- Aligned shared role model and route constants.
- Fixed TypeScript and compile-time drift across shared and supabase packages.

## [0.2.4-beta] - 2026-04-10

- Synced middleware comments and route notes with canonical /dashboard/* path behavior.
- Confirmed no active UI links still target deprecated /tools or /settings URLs directly.

## [0.2.3-beta] - 2026-04-10

- Updated dashboard navigation links to /dashboard/tools and /dashboard/settings.
- Added compatibility redirects from /tools and /settings.

## [0.2.2-beta] - 2026-04-10

- Fixed localhost auth redirect loop related to cookie domain handling.
- Fixed dashboard parser/build error caused by duplicated JSX block.
- Corrected Supabase import boundaries for auth and client usage.
- Added missing dashboard settings and users route pages.
- Removed remaining public registration calls to action.

## [0.2.1-beta] - 2026-04-10

- Migrated role system from admin/member/viewer to superadmin/user.
- Added migrations:
  - 0004_fix_profile_schema.sql
  - 0005_update_rls_for_superadmin.sql
  - 0006_update_trigger_default_role.sql
- Implemented idle timeout support in packages/supabase/src/idle-timeout.ts.
- Added superadmin-only user management APIs and pages.
- Added createAdminClient support for service-role server operations.

## [0.2.0-beta] - 2026-04-10

- Completed initial Phase 1 auth and dashboard baseline integration.
- Added core auth pages and protected dashboard route structure.
- Added initial admin and user profile data flows.

## [0.1.0-beta] - 2026-04-10

- Initial monorepo foundation established with Turborepo and pnpm workspaces.
- Added apps/dashboard and apps/status scaffolds.
- Added shared packages for ui, shared, supabase, tsconfig, eslint-config, prettier-config, and tailwind-config.
- Added baseline project rules and engineering documentation.
