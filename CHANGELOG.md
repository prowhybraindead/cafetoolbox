# Changelog

All notable changes to this project are documented in this file.

This project follows Keep a Changelog and Semantic Versioning.

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
