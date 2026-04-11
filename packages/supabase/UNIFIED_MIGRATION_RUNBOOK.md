# Unified Migration Runbook (0011)

This runbook documents the safe workflow for the unified rebuild migration:

- `packages/supabase/migrations/0011_rebuild_schema_and_rls_unified.sql`

## Goal

Run one consolidated migration that:

- Rebuilds schema and RLS to match current app behavior.
- Uses JWT-based superadmin checks (no recursive policy on `profiles`).
- Preserves existing data using in-transaction compatibility snapshot + restore.

## Scope

Affected core tables:

- `public.profiles`
- `public.categories`
- `public.tools`
- `public.services`
- `public.incidents`
- `public.incident_updates`

Affected behaviors:

- `superadmin` / `user` role model
- tool status enum includes `maintenance`
- tool size enum includes `medium`
- sync profile role/display/avatar -> auth metadata

## Phase 0: Gate (Before Any SQL Apply)

This phase must pass before running preflight/apply.

Operational gate:

- Confirm maintenance window and owner-on-call.
- Confirm database backup/snapshot is recent and restorable.
- Freeze manual policy/table edits in Supabase Dashboard.
- Confirm migration target file is exactly:
  - `packages/supabase/migrations/0011_rebuild_schema_and_rls_unified.sql`

Environment gate:

- `.env.local` has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

Repeatable command gate:

```bash
node scripts/supabase-phase1-preflight.mjs
```

Expected end line:

- `Result: PASS (Phase 1 preflight checks succeeded)`

## Phase 1: Preflight (Mandatory)

Run these checks in SQL Editor before running migration.

```sql
-- 1) Snapshot counts
SELECT 'profiles' t, count(*) c FROM public.profiles
UNION ALL SELECT 'categories', count(*) FROM public.categories
UNION ALL SELECT 'tools', count(*) FROM public.tools
UNION ALL SELECT 'services', count(*) FROM public.services
UNION ALL SELECT 'incidents', count(*) FROM public.incidents
UNION ALL SELECT 'incident_updates', count(*) FROM public.incident_updates;

-- 2) Check role quality
SELECT role, count(*)
FROM public.profiles
GROUP BY role
ORDER BY role;

-- 3) Detect role null or unexpected values
SELECT id, email, role
FROM public.profiles
WHERE role IS NULL OR lower(role) NOT IN ('superadmin', 'admin', 'user');

-- 4) Detect tool status/size drift
SELECT id, slug, status, size
FROM public.tools
WHERE lower(status) NOT IN ('active', 'beta', 'archived', 'maintenance')
   OR lower(size) NOT IN ('small', 'medium', 'large');
```

Operational preflight:

- Ensure maintenance window (read-only preferred).
- Ensure one operator executes migration end-to-end.
- Notify team not to modify DB policies manually during run.

## Phase 2: Apply Migration

Execute:

- `packages/supabase/migrations/0011_rebuild_schema_and_rls_unified.sql`

Expected behavior:

- Migration creates temp backup tables inside transaction.
- Drops and recreates schema objects.
- Restores sanitized data from backup.
- Re-syncs auth metadata from restored profiles.

If the script fails:

- Transaction rolls back automatically.
- No partial commit should remain.

## Phase 3: Post-Apply Verification (Mandatory)

### 3.1 Structural verification

```sql
-- tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles','categories','tools','services','incidents','incident_updates')
ORDER BY tablename;

-- RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles','categories','tools','services','incidents','incident_updates')
ORDER BY tablename;
```

### 3.2 Policy verification

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','categories','tools','services','incidents','incident_updates')
ORDER BY tablename, policyname;
```

### 3.3 Data verification

```sql
-- counts after apply
SELECT 'profiles' t, count(*) c FROM public.profiles
UNION ALL SELECT 'categories', count(*) FROM public.categories
UNION ALL SELECT 'tools', count(*) FROM public.tools
UNION ALL SELECT 'services', count(*) FROM public.services
UNION ALL SELECT 'incidents', count(*) FROM public.incidents
UNION ALL SELECT 'incident_updates', count(*) FROM public.incident_updates;

-- invalid tool enum values should be 0
SELECT count(*) AS invalid_tools
FROM public.tools
WHERE lower(status) NOT IN ('active', 'beta', 'archived', 'maintenance')
   OR lower(size) NOT IN ('small', 'medium', 'large');
```

### 3.4 Auth metadata sync verification

```sql
SELECT p.id, p.email, p.role,
       u.raw_app_meta_data ->> 'role' AS app_role,
       u.raw_user_meta_data ->> 'role' AS user_role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE coalesce(u.raw_app_meta_data ->> 'role', '') <> p.role
   OR coalesce(u.raw_user_meta_data ->> 'role', '') <> p.role
LIMIT 20;
```

Expected: 0 rows.

## Phase 4: Runtime Verification (App)

Manual smoke tests:

- `/dashboard`
- `/dashboard/settings`
- `/admin`
- `/admin/tools` CRUD
- `/admin/categories` CRUD
- `/admin/users` create/edit/role/password-reset/delete
- `/api/me` GET/PUT
- `/api/me/password` PUT
- `/api/admin/users` GET
- `/api/admin/users/[userId]` PATCH

Expected:

- No infinite recursion policy errors.
- No 500 from admin endpoints due to role checks.
- Role displays consistent in navbar/settings/admin.

## Rollback Strategy

If migration fails before commit:

- No action needed (transaction rollback).

If migration succeeds but runtime fails:

1. Capture error logs and failing SQL/API endpoint.
2. Apply targeted hotfix migration (do not manually patch policies in dashboard).
3. If critical, restore from database backup/snapshot (platform-level restore).

## Team Rules To Avoid Information Blindness

- Keep all DB changes as versioned SQL files only.
- No ad-hoc policy edits in dashboard.
- Every migration must include:
  - Purpose
  - Safety notes
  - Verification queries
- Keep role model single-source: `superadmin`/`user` with metadata sync.
