# @cafetoolbox/supabase - Database Migration Guide

This guide explains how to run migrations on your Supabase database.

## 📋 Prerequisites

- Completed Supabase project setup (see AI.md)
- `.env.local` file with API keys configured
- Supabase project URL and keys accessible

---

## 🚀 Running Migrations

### Option 1: Via Supabase Dashboard (Recommended for Phase 1)

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

### Option 2: Via Supabase CLI (Advanced)

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

---

## ✅ After Migration

### Test Auto-Create Profile

The RLS policies include an auto-creation trigger. To test:

1. **Sign up a new user** in your app via `/login` (registration is disabled, so you need superadmin to create users via `/dashboard/users`)
2. **Check Database** → Go to `profiles` table in Table Editor
3. **Verify** - A new profile row should have been created automatically with:
   - `role = 'user'` (default)
   - `display_name` from email username part
   - Email from auth.users
   - `last_activity = NOW()` (current timestamp)

### Test Seed Data

After running migration `0003_seed_data.sql`:

1. **Check Tools Table**
   - Should have 8 seed tools (5 active, 2 beta, 1 archived)
   - Categories: color-picker, json-formatter, markdown-preview, etc.

2. **Check Services Table**
   - Should have 4 services: Dashboard App, Status Page, API Services, Database
   - All should have status='operational'

3. **Check Incidents Table**
   - Should have 1 resolved incident: "Minor API Latency"

---

## 👤 Creating Your First Superadmin User

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

5. **Access Users Management**
   - Log out and log back in
   - You now can access `/dashboard/users` to create and manage other users

### Method 2: Via SQL (Direct)

```sql
-- Update any user to superadmin role
UPDATE public.profiles
SET role = 'superadmin'
WHERE email = 'your-email@example.com';
```

### Important Notes

- Only Superadmin users can create new users via `/dashboard/users`
- Public registration is disabled - users cannot self-register
- Regular users have `role = 'user'` by default
- Superadmin can promote/demote users and delete users

---

## 📊 Database Schema Reference

### Tables:

| Table | Description | Public Access |
|-------|-------------|---------------|
| `profiles` | User profiles (extends auth.users) | Read only |
| `tools` | Tool metadata and status | Active/Beta tools public |
| `services` | Service status for status page | Full read |
| `incidents` | Incident reports | Full read |
| `incident_updates` | Incident update logs | Full read |

### RLS Policies:

- **Public**: Can read active/beta tools, services, incidents
- **Authenticated**: Can read all tools, update own profile (email, display_name), update own last_activity
- **Superadmin**: Full CRUD on tools, services, incidents; can update any profile including role; can create/delete users via admin API

---

## 🔄 Reset Database (Development Only)

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

⚠️ **WARNING**: This will delete all data including users!

---

## 🐛 Troubleshooting

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
DROP FUNCTION IF EXISTS is_admin();
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

All should show `rowssecurity = true`.

### Auto-create profile not working

Check the auth trigger:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Should return 1 row.

---

## 📝 Notes

- Migrations are designed to be re-runnable in development where possible
- Triggers auto-update `updated_at` on all tables
- Profile auto-created with default role `user`
- Superadmin role can be granted via UPDATE query on `profiles` table
- Seed data is for development only - production should use admin dashboard
