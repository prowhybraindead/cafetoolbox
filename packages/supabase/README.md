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

### Unified Path (Canonical)

Use the consolidated migration and runbook instead of piecemeal SQL execution:

1. Review runbook:
   - `packages/supabase/UNIFIED_MIGRATION_RUNBOOK.md`
2. Run preflight gate command:
   - `node scripts/supabase-phase1-preflight.mjs`
3. Apply migration:
   - `packages/supabase/migrations/0011_rebuild_schema_and_rls_unified.sql`
4. Execute all post-apply verification queries from the runbook.

Why this path:

- Prevents policy drift and recursive-RLS regressions.
- Preserves data during rebuild using in-transaction compatibility snapshot/restore.
- Keeps one source of truth for schema + RLS aligned with current API architecture.

### Legacy Sequence (Reference Only)

This sequence is kept for historical reference only. Prefer the unified path above.

1. **Open SQL Editor**
   - Go to your Supabase Dashboard
   - Left menu: `Database` → `SQL Editor`

2. **Upload and Run Migrations**

   You need to run these files in order:

   ```bash
   1. /packages/supabase/migrations/0001_initial_schema.sql
   2. /packages/supabase/migrations/0002_rls_policies.sql
   3. /packages/supabase/migrations/0003_seed_data.sql
   4. /packages/supabase/migrations/0004_fix_profile_schema.sql
   5. /packages/supabase/migrations/0005_update_rls_for_superadmin.sql
   6. /packages/supabase/migrations/0006_update_trigger_default_role.sql
   ```

   Click "New Query" for each file, paste the SQL content, and click "Run".

3. **Verify Tables Created**
   - Go to `Database` → `Table Editor`
   - You should see: `profiles`, `tools`, `services`, `incidents`, `incident_updates`

4. **Verify RLS Enabled**
   - Go to `Database` → `Tables` → Select a table
   - Click "Authentication" icon (shield icon)
   - Should show "Row Level Security: ON"

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

-- Re-run all migrations
-- (Paste contents of 0001_initial_schema.sql)
-- (Paste contents of 0002_rls_policies.sql)
-- (Paste contents of 0003_seed_data.sql)
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
- Canonical migration baseline is `0011_rebuild_schema_and_rls_unified.sql`
- Seed data is for development only - production should use admin dashboard
