# Changelog

All notable changes to this project are documented in this file.

This project follows Keep a Changelog and Semantic Versioning.

## Versioning Format Notes

This project uses a **dual-layer versioning system**:

- **Root / Platform Version** (e.g., `0.4.6-beta`): Platform infrastructure, auth, dashboard, architecture changes
- **App Version** (e.g., `status 0.1.0`): Individual app lifecycle (status, tools, etc.)

**Format for platform-level changes:**
```markdown
## [0.4.6-beta] - 2026-04-12
- Platform changes...
```

**Format for app-related changes:**
```markdown
## [0.4.7-beta] - (status 0.1.0)
- App-specific changes...
```

See [RULES.md](RULES.md#5-versioning-rules) for complete versioning rules.

---

## [0.4.8-beta] - 2026-04-12

- Built production-focused monitoring backend worker system (non-API architecture):
  - Added resilient worker loop at `scripts/health-check-worker.mjs` with interval scheduling, concurrency limits, per-request timeout, and lightweight retry.
  - Added modular monitoring engine under `scripts/monitoring/*`:
    - `health-checker.mjs`
    - `incident-engine.mjs`
    - `notifier.mjs`
    - `aggregation-job.mjs`
    - `supabase-rest.mjs`
    - `config.mjs`
    - `logger.mjs`
- Implemented incident lifecycle automation:
  - Auto-create incidents on consecutive failures.
  - Auto-escalate incident status when failures continue.
  - Auto-resolve incidents after consecutive recovery checks.
  - Service status updates are synchronized (`operational` / `degraded` / `partial_outage` / `major_outage`).
- Implemented notification delivery:
  - Discord webhook support (`DISCORD_WEBHOOK_URL`).
  - Generic HTTP webhook support (`ALERT_WEBHOOK_URL`).
  - Non-blocking and failure-safe dispatch.
- Implemented historical aggregation path for chart windows:
  - Added `scripts/aggregate-uptime-daily.mjs`.
  - Added migration `packages/supabase/migrations/0014_add_service_uptime_daily.sql` for `service_uptime_daily`.
  - Daily rollups now persist `uptime_percentage`, `avg_response_time`, `total_checks`, and `failed_checks` per service/day.
- Added root scripts:
  - `pnpm monitoring:worker`
  - `pnpm monitoring:once`
  - `pnpm monitoring:aggregate-daily`
- Added architecture documentation:
  - `doc/MONITORING_BACKEND.md`

## [0.4.7-beta] - (status 0.1.0) - 2026-04-12

- **Introduced Public Status System as independent product surface.**
- Created `apps/status` with server-side rendering (SSR) for public health monitoring:
  - Real-time system health summary with priority cascade status calculation
  - 24-hour average uptime calculated from actual heartbeat data via RPC
  - Per-service health monitoring with graceful degradation on RPC failure
  - Incident communication system displaying 6 most recent incidents with update timelines
  - Multi-timezone clocks (US Eastern, UTC, Vietnam) with SSR-safe hydration
- Integrated with heartbeat monitoring system:
  - Uses RPC `get_service_health_status()` for real uptime calculations
  - Fallback to cached `services.uptime` and `services.status` on RPC errors
  - Displays response time, last check timestamp, and consecutive failures
- Production-ready deployment configuration:
  - Independent Vercel deployment on port 3001
  - Public read access to Supabase via anon key (no auth required)
  - Serverless functions for SSR rendering with CDN edge caching
- Comprehensive system documentation:
  - Full architecture overview with SSR flow diagrams
  - Reliability strategy and fault tolerance mechanisms
  - Scalability considerations and evolution roadmap
  - Observability context and monitoring system integration
  - Current limitations and phased improvement roadmap

## [0.4.6-beta] - 2026-04-12

- **Created safe cleanup script for bloated raw_user_meta_data + enforced minimal metadata replacement to prevent future JWT bloat.**
- Added `scripts/clean-bloated-auth-metadata.mjs`:
  - Connects via SUPABASE_SERVICE_ROLE_KEY to find users with oversized metadata.
  - Dry-run mode by default (read-only, shows current vs proposed metadata).
  - `--force --email <email>` to clean a single user.
  - `--force --all` to clean all bloated users.
  - `--threshold <bytes>` to customize the detection threshold (default 1500).
  - Replaces metadata entirely (not merge) — only keeps `display_name` and valid `avatar_url`.
- Rewrote `auth-metadata.ts` helpers for full replacement semantics:
  - `buildUserMetadataReplacement()`: returns only allowlisted fields (display_name, avatar_url).
  - `buildCleanUserMetadata()`: additionally null-outs unknown keys in existing metadata so GoTrue's deep-merge effectively deletes them.
  - Role is never stored in user_metadata — only in app_metadata.
- Updated all metadata write paths to use `buildCleanUserMetadata()`:
  - `/api/me` (PUT): self-profile update now strips stale keys on every save.
  - `/api/admin/users/[userId]` (PATCH): admin update now strips stale keys.
  - `/api/create-user` (POST): new users created with `buildUserMetadataReplacement()` (already minimal).

## [0.4.5-beta] - 2026-04-12

- **Fixed JWT bloat and chunked cookie explosion by sanitizing metadata and adding stale chunk cleanup. Production login should now work without 431/494 errors.**
- Phase A JWT size reduction:
  - `apps/dashboard/src/app/api/me/route.ts`: `supabase.auth.updateUser()` now writes allowlisted metadata only, with `display_name` capped at 80 chars and `avatar_url` restricted to http/https URLs up to 1024 chars.
  - `apps/dashboard/src/app/api/admin/users/[userId]/route.ts`: admin profile updates now merge only allowlisted auth metadata and stop spreading arbitrary auth user metadata.
  - `apps/dashboard/src/app/api/create-user/route.ts`: new users are created with minimal auth metadata only.
- Phase B stale chunk cleanup:
  - `packages/supabase/src/client.ts`: production-only cleanup removes stale `sb-*-auth-token.*` chunks that are absent from the fresh cookie set.
  - `packages/supabase/src/server.ts`: same production-only cleanup for server-side responses.
- Phase C auth churn reduction:
  - `apps/dashboard/src/app/dashboard/layout.tsx`: passes minimal user data to the dashboard navbar so it does not need an immediate `/api/me` fetch on first render.
  - `apps/dashboard/src/app/dashboard/page.tsx`: removed redundant `getUser()` call.
- Production cookie strategy remains aligned to `.cafetoolbox.app` with `secure`, `path=/`, `sameSite=lax`, and a 7-day max age fallback when Supabase does not provide one.

## [0.4.4-beta] - 2026-04-12

- **Critical audit completed**: Root-cause analysis for persistent `sb-*-auth-token.0..16` chunk explosion and HTTP 431/494 in production.
- Findings:
  - JWT/session payload is likely far above 4KB when serialized by Supabase SSR, forcing heavy cookie chunking.
  - Metadata write paths allow unbounded profile fields (especially `avatar_url`) into `user_metadata`, which is embedded in auth user payload and can bloat session cookies.
  - Current simplified cookie handlers set fresh cookies but do not proactively clear stale high-index chunk remnants when payload shape shrinks.
  - Multiple auth reads per navigation path (middleware + server page + `/api/me`) increase cookie churn frequency.
- Audit documents updated:
  - `AI.md`: Added full structured audit (client inventory, cookie config matrix, JWT-size analysis, per-request flow, root cause, production-first fix plan).
- No production code fix applied in this audit entry; this release records investigation results and fix direction only.

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
