# @cafetoolbox/supabase - Migration and Operations Guide

This guide documents the canonical Supabase migration and auth operations flow for CafeToolbox.

## Prerequisites

- Supabase project is provisioned and reachable.
- Root `.env.local` is present with required keys.
- You can access Supabase SQL Editor for controlled migration apply.

Required environment variables:

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

## Running Migrations

### Current Repository Migration Set

The current repository tracks monitoring-focused incremental migrations:

```bash
1. /packages/supabase/migrations/0014_add_service_uptime_daily.sql
2. /packages/supabase/migrations/0015_monitoring_correctness_hardening.sql
3. /packages/supabase/migrations/0016_add_worker_heartbeats.sql
4. /packages/supabase/migrations/0017_seed_convertube_service.sql
5. /packages/supabase/migrations/0018_fix_convertube_tool_path.sql
```

Recommended flow:

1. Open `packages/supabase/UNIFIED_MIGRATION_RUNBOOK.md` for full verification checklist.
2. Run preflight gate command:
   - `node scripts/supabase-phase1-preflight.mjs`
3. Apply the migration files above in SQL Editor (in order).
4. Execute post-apply verification queries from the runbook.

Note:

- Baseline schema and RLS must already exist in your Supabase project before applying `0014+`.
- This repository does not currently include the historical baseline SQL files.

### Optional: Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not already)
# Windows: scoop install supabase
# Or via npm: npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Run migrations
supabase db push
```

## Post-Apply Checks

### Runtime smoke checklist

After migration verification queries pass, smoke-test these routes and APIs:

- `/dashboard`
- `/dashboard/settings`
- `/admin`
- `/admin/tools`
- `/admin/categories`
- `/admin/users`
- `/api/me`
- `/api/me/password`
- `/api/admin/users`

Expected:

- No RLS recursion errors.
- No 500 errors due to authz/role checks.
- Role behavior is consistent in navbar/settings/admin pages.

## Creating Your First Superadmin User

### Method 1: Via Supabase Dashboard (Easiest)

1. **Create a user** in Supabase Dashboard
   - Go to `Authentication` → `Users` → `Add user`
   - Input email/password and create user
2. **Get User Email**
   - Go to Supabase Dashboard → `Authentication` → `Users`
   - Copy the email of your user

3. **Grant Superadmin Role**
   - Go to `Database` → `SQL Editor`
   - Run:

   ```sql
   UPDATE public.profiles
   SET role = 'superadmin'
   WHERE email = 'your-email@example.com';
   ```

4. **Verify**
   - Check `profiles` table in Table Editor
   - Your user should have `role = 'superadmin'`

5. **Access Admin User Management**
   - Log out and log back in
   - You now can access `/admin/users` to create and manage other users

### Method 2: Via SQL (Direct)

```sql
-- Update any user to superadmin role
UPDATE public.profiles
SET role = 'superadmin'
WHERE email = 'your-email@example.com';
```

### Important Notes

- Only Superadmin users can create new users via `/admin/users`
- Public registration is disabled - users cannot self-register
- Regular users have `role = 'user'` by default
- Superadmin can promote/demote users and delete users

## Password Recovery Flow

Current recovery flow routes:

- `/forgot-password`
- `/auth/callback`
- `/auth/reset-password`

Important:

- Validate this flow on hosted domain after Supabase redirect URLs are updated from localhost.
- Keep callback URL and site URL in Supabase Auth settings synchronized with deployment domain.

## Database Schema Reference

### Tables

| Table | Description | Public Access |
| ----- | ----------- | ------------- |
| `profiles` | User profiles (extends auth.users) | Read only |
| `tools` | Tool metadata and status | Active/Beta tools public |
| `services` | Service status for status page | Full read |
| `incidents` | Incident reports | Full read |
| `incident_updates` | Incident update logs | Full read |

### RLS Policies

- **Public**: Can read active/beta tools, services, incidents
- **Authenticated**: Can read all tools, update own profile metadata, update own password via auth flow
- **Superadmin**: Full CRUD on admin-managed entities; can manage users via admin APIs

## Reset Database (Development Only)

If you need to reset everything:

```sql
-- Drop all tables cascade
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Re-run available migrations from this repository
-- (Paste contents of 0014_add_service_uptime_daily.sql)
-- (Paste contents of 0015_monitoring_correctness_hardening.sql)
-- (Paste contents of 0016_add_worker_heartbeats.sql)
-- (Paste contents of 0017_seed_convertube_service.sql)
-- (Paste contents of 0018_fix_convertube_tool_path.sql)
```

Warning: This will delete all data including users.

## Troubleshooting

### migration fails with "function already exists"

Run:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_tools_updated_at ON public.tools;
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS is_superadmin();
DROP FUNCTION IF EXISTS get_current_user_role();
```

### RLS policies not working

Check if RLS is enabled:

```sql
-- Check each table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All should show `rowsecurity = true`.

### Auto-create profile not working

Check the auth trigger:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Should return 1 row.

## Notes

- Migrations are designed to be re-runnable in development where possible
- Triggers auto-update `updated_at` on all tables
- Profile auto-created with default role `user`
- Superadmin role can be granted via UPDATE query on `profiles` table
- This repository currently tracks incremental migrations `0014` to `0018`
- Seed data is for development only - production should use admin dashboard
