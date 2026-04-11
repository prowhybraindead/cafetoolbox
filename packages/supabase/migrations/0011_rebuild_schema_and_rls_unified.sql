-- ============================================
-- CafeToolbox - Unified Rebuild Migration
-- Version: 0011
-- Purpose:
--   Rebuild core schema, triggers, auth-role sync, and RLS in one place.
--   This migration is intended to replace fragmented logic from 0001..0010.
--
-- Notes:
--   - Destructive for public core tables (drops and recreates).
--   - Do NOT run in production without backup + maintenance window.
-- ============================================

BEGIN;

-- --------------------------------------------
-- 0) EXTENSIONS
-- --------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------
-- 0.1) COMPATIBILITY SNAPSHOT (IN-TRANSACTION)
-- --------------------------------------------
-- Keep data in temp backup tables before destructive rebuild.
CREATE TEMP TABLE ctb_backup_profiles (
  id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) ON COMMIT DROP;

CREATE TEMP TABLE ctb_backup_categories (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  icon TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) ON COMMIT DROP;

CREATE TEMP TABLE ctb_backup_tools (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  status TEXT,
  size TEXT,
  path TEXT,
  icon TEXT,
  stack TEXT[],
  category_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) ON COMMIT DROP;

CREATE TEMP TABLE ctb_backup_services (
  id UUID,
  name TEXT,
  status TEXT,
  uptime DECIMAL(5,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) ON COMMIT DROP;

CREATE TEMP TABLE ctb_backup_incidents (
  id UUID,
  title TEXT,
  status TEXT,
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  services_affected TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) ON COMMIT DROP;

CREATE TEMP TABLE ctb_backup_incident_updates (
  id UUID,
  incident_id UUID,
  body TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) ON COMMIT DROP;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    INSERT INTO ctb_backup_profiles
    SELECT
      id,
      email,
      display_name,
      avatar_url,
      coalesce(role, 'user'),
      last_activity,
      created_at,
      updated_at
    FROM public.profiles;
  END IF;

  IF to_regclass('public.categories') IS NOT NULL THEN
    INSERT INTO ctb_backup_categories
    SELECT id, slug, name, description, icon, sort_order, created_at, updated_at
    FROM public.categories;
  END IF;

  IF to_regclass('public.tools') IS NOT NULL THEN
    INSERT INTO ctb_backup_tools
    SELECT
      id,
      slug,
      name,
      description,
      coalesce(status, 'active'),
      coalesce(size, 'small'),
      path,
      icon,
      coalesce(stack, '{}'::text[]),
      category_id,
      created_at,
      updated_at
    FROM public.tools;
  END IF;

  IF to_regclass('public.services') IS NOT NULL THEN
    INSERT INTO ctb_backup_services
    SELECT id, name, status, uptime, created_at, updated_at
    FROM public.services;
  END IF;

  IF to_regclass('public.incidents') IS NOT NULL THEN
    INSERT INTO ctb_backup_incidents
    SELECT id, title, status, started_at, resolved_at, services_affected, created_at, updated_at
    FROM public.incidents;
  END IF;

  IF to_regclass('public.incident_updates') IS NOT NULL THEN
    INSERT INTO ctb_backup_incident_updates
    SELECT id, incident_id, body, status, created_at
    FROM public.incident_updates;
  END IF;
END;
$$;

-- --------------------------------------------
-- 1) CLEANUP OLD TRIGGERS
-- --------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_tools_updated_at ON public.tools;
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;
DROP TRIGGER IF EXISTS sync_profile_role_to_auth_metadata ON public.profiles;

-- --------------------------------------------
-- 2) CLEANUP OLD FUNCTIONS
-- --------------------------------------------
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_role_to_auth_metadata() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_superadmin() CASCADE;
DROP FUNCTION IF EXISTS public.is_superadmin_jwt() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_role(TEXT) CASCADE;

-- --------------------------------------------
-- 3) DROP CORE TABLES (DEPENDENCY ORDER)
-- --------------------------------------------
DROP TABLE IF EXISTS public.incident_updates CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.tools CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- --------------------------------------------
-- 4) HELPERS
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_role(input_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := lower(coalesce(input_role, 'user'));

  IF normalized IN ('superadmin', 'admin') THEN
    RETURN 'superadmin';
  END IF;

  RETURN 'user';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- --------------------------------------------
-- 5) TABLES
-- --------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin', 'user')),
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'lucide:folder',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'beta', 'archived', 'maintenance')),
  size TEXT NOT NULL DEFAULT 'small' CHECK (size IN ('small', 'medium', 'large')),
  path TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'lucide:wrench',
  stack TEXT[] NOT NULL DEFAULT '{}',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage')),
  uptime DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  services_affected TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.incident_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------
-- 6) INDEXES
-- --------------------------------------------
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_last_activity ON public.profiles(last_activity DESC);

CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_sort_order ON public.categories(sort_order);

CREATE INDEX idx_tools_slug ON public.tools(slug);
CREATE INDEX idx_tools_status ON public.tools(status);
CREATE INDEX idx_tools_size ON public.tools(size);
CREATE INDEX idx_tools_category_id ON public.tools(category_id);

CREATE INDEX idx_services_status ON public.services(status);

CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_started_at ON public.incidents(started_at DESC);
CREATE INDEX idx_incidents_services_affected ON public.incidents USING GIN(services_affected);

CREATE INDEX idx_incident_updates_incident_id ON public.incident_updates(incident_id);
CREATE INDEX idx_incident_updates_created_at ON public.incident_updates(created_at DESC);

-- --------------------------------------------
-- 7) TIMESTAMP TRIGGERS
-- --------------------------------------------
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------
-- 8) AUTH -> PROFILE AUTO-CREATE
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  next_role TEXT;
  next_display_name TEXT;
BEGIN
  next_role := public.normalize_role(
    coalesce(NEW.raw_app_meta_data ->> 'role', NEW.raw_user_meta_data ->> 'role')
  );

  next_display_name := coalesce(
    NEW.raw_user_meta_data ->> 'display_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    next_display_name,
    NEW.raw_user_meta_data ->> 'avatar_url',
    next_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = coalesce(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = coalesce(EXCLUDED.avatar_url, public.profiles.avatar_url),
    role = coalesce(EXCLUDED.role, public.profiles.role),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------
-- 9) PROFILE -> AUTH METADATA SYNC
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', NEW.role),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'role', NEW.role,
        'display_name', NEW.display_name,
        'avatar_url', NEW.avatar_url
      )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_role_to_auth_metadata
  AFTER INSERT OR UPDATE OF role, display_name, avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_auth_metadata();

-- --------------------------------------------
-- 10) ROLE HELPERS FOR RLS
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.is_superadmin_jwt()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT public.normalize_role(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    )
  ) = 'superadmin';
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT public.is_superadmin_jwt();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT public.normalize_role(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    )
  );
$$;

-- --------------------------------------------
-- 11) ENABLE RLS
-- --------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- 12) POLICIES (JWT-BASED, NO RECURSIVE SELF-JOIN)
-- --------------------------------------------

-- Profiles
CREATE POLICY "Profiles: Select own or superadmin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_superadmin_jwt());

CREATE POLICY "Profiles: Insert own or superadmin"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_superadmin_jwt());

CREATE POLICY "Profiles: Update own or superadmin"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_superadmin_jwt())
  WITH CHECK (auth.uid() = id OR public.is_superadmin_jwt());

CREATE POLICY "Profiles: Delete superadmin"
  ON public.profiles FOR DELETE
  USING (public.is_superadmin_jwt());

-- Categories
CREATE POLICY "Categories: Public read"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Categories: Superadmin insert"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_superadmin_jwt());

CREATE POLICY "Categories: Superadmin update"
  ON public.categories FOR UPDATE
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

CREATE POLICY "Categories: Superadmin delete"
  ON public.categories FOR DELETE
  USING (public.is_superadmin_jwt());

-- Tools
CREATE POLICY "Tools: Public read"
  ON public.tools FOR SELECT
  USING (status IN ('active', 'beta') OR auth.uid() IS NOT NULL);

CREATE POLICY "Tools: Superadmin insert"
  ON public.tools FOR INSERT
  WITH CHECK (public.is_superadmin_jwt());

CREATE POLICY "Tools: Superadmin update"
  ON public.tools FOR UPDATE
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

CREATE POLICY "Tools: Superadmin delete"
  ON public.tools FOR DELETE
  USING (public.is_superadmin_jwt());

-- Services
CREATE POLICY "Services: Public read"
  ON public.services FOR SELECT
  USING (true);

CREATE POLICY "Services: Superadmin manage"
  ON public.services FOR ALL
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

-- Incidents
CREATE POLICY "Incidents: Public read"
  ON public.incidents FOR SELECT
  USING (true);

CREATE POLICY "Incidents: Superadmin manage"
  ON public.incidents FOR ALL
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

-- Incident updates
CREATE POLICY "Incident Updates: Public read"
  ON public.incident_updates FOR SELECT
  USING (true);

CREATE POLICY "Incident Updates: Superadmin manage"
  ON public.incident_updates FOR ALL
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

-- --------------------------------------------
-- 13) GRANTS
-- --------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- RLS still protects writes for anon/authenticated.
GRANT SELECT ON public.categories, public.tools, public.services, public.incidents, public.incident_updates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tools, public.categories, public.services, public.incidents, public.incident_updates TO authenticated;

-- --------------------------------------------
-- 14) BASE SEEDS
-- --------------------------------------------
INSERT INTO public.categories (slug, name, description, icon, sort_order) VALUES
  ('code', 'Chuyên Code', 'Các công cụ hỗ trợ lập trình', 'lucide:code-2', 1),
  ('design', 'Thiết kế', 'Công cụ dành cho thiết kế', 'lucide:palette', 2),
  ('text', 'Văn bản & Nội dung', 'Công cụ xử lý văn bản', 'lucide:file-text', 3),
  ('network', 'Mạng & API', 'Công cụ cho mạng và API', 'lucide:globe', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (name, status, uptime) VALUES
  ('Dashboard App', 'operational', 99.98),
  ('Status Page', 'operational', 99.99),
  ('API Services', 'operational', 99.95),
  ('Database', 'operational', 99.97)
ON CONFLICT (name) DO NOTHING;

-- --------------------------------------------
-- 15) RESTORE DATA FROM COMPATIBILITY SNAPSHOT
-- --------------------------------------------
INSERT INTO public.categories (id, slug, name, description, icon, sort_order, created_at, updated_at)
SELECT
  id,
  slug,
  name,
  coalesce(description, ''),
  coalesce(icon, 'lucide:folder'),
  coalesce(sort_order, 0),
  coalesce(created_at, NOW()),
  coalesce(updated_at, NOW())
FROM ctb_backup_categories
ON CONFLICT (slug) DO UPDATE
SET
  id = EXCLUDED.id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO public.tools (
  id,
  slug,
  name,
  description,
  status,
  size,
  path,
  icon,
  stack,
  category_id,
  created_at,
  updated_at
)
SELECT
  id,
  slug,
  name,
  coalesce(description, ''),
  CASE
    WHEN lower(coalesce(status, 'active')) IN ('active', 'beta', 'archived', 'maintenance')
      THEN lower(status)
    ELSE 'active'
  END,
  CASE
    WHEN lower(coalesce(size, 'small')) IN ('small', 'medium', 'large')
      THEN lower(size)
    ELSE 'small'
  END,
  path,
  coalesce(icon, 'lucide:wrench'),
  coalesce(stack, '{}'::text[]),
  category_id,
  coalesce(created_at, NOW()),
  coalesce(updated_at, NOW())
FROM ctb_backup_tools
ON CONFLICT (id) DO UPDATE
SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  size = EXCLUDED.size,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  stack = EXCLUDED.stack,
  category_id = EXCLUDED.category_id,
  updated_at = NOW();

INSERT INTO public.services (id, name, status, uptime, created_at, updated_at)
SELECT
  id,
  name,
  CASE
    WHEN lower(coalesce(status, 'operational')) IN ('operational', 'degraded', 'partial_outage', 'major_outage')
      THEN lower(status)
    ELSE 'operational'
  END,
  coalesce(uptime, 100.00),
  coalesce(created_at, NOW()),
  coalesce(updated_at, NOW())
FROM ctb_backup_services
ON CONFLICT (name) DO UPDATE
SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  uptime = EXCLUDED.uptime,
  updated_at = NOW();

INSERT INTO public.incidents (id, title, status, started_at, resolved_at, services_affected, created_at, updated_at)
SELECT
  id,
  title,
  CASE
    WHEN lower(coalesce(status, 'investigating')) IN ('investigating', 'identified', 'monitoring', 'resolved')
      THEN lower(status)
    ELSE 'investigating'
  END,
  coalesce(started_at, NOW()),
  resolved_at,
  coalesce(services_affected, '{}'::text[]),
  coalesce(created_at, NOW()),
  coalesce(updated_at, NOW())
FROM ctb_backup_incidents
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  resolved_at = EXCLUDED.resolved_at,
  services_affected = EXCLUDED.services_affected,
  updated_at = NOW();

INSERT INTO public.incident_updates (id, incident_id, body, status, created_at)
SELECT
  id,
  incident_id,
  body,
  CASE
    WHEN lower(coalesce(status, 'investigating')) IN ('investigating', 'identified', 'monitoring', 'resolved')
      THEN lower(status)
    ELSE 'investigating'
  END,
  coalesce(created_at, NOW())
FROM ctb_backup_incident_updates
ON CONFLICT (id) DO UPDATE
SET
  incident_id = EXCLUDED.incident_id,
  body = EXCLUDED.body,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at;

INSERT INTO public.profiles (
  id,
  email,
  display_name,
  avatar_url,
  role,
  last_activity,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.email,
  p.display_name,
  p.avatar_url,
  public.normalize_role(p.role),
  p.last_activity,
  coalesce(p.created_at, NOW()),
  coalesce(p.updated_at, NOW())
FROM ctb_backup_profiles p
WHERE EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = p.id
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  last_activity = EXCLUDED.last_activity,
  updated_at = NOW();

-- Ensure auth metadata is synchronized after restore.
UPDATE auth.users u
SET
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', p.role),
  raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'role', p.role,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    )
FROM public.profiles p
WHERE p.id = u.id;

COMMIT;
