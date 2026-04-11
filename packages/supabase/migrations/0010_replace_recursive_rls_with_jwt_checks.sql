-- ============================================
-- CafeToolbox - Replace Recursive RLS With JWT Checks
-- Version: 0010
-- Purpose: Remove profiles self-reference from admin policies
-- ============================================

CREATE OR REPLACE FUNCTION public.is_superadmin_jwt()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (auth.jwt() -> 'user_metadata' ->> 'role')
  ) IN ('superadmin', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT public.is_superadmin_jwt();
$$;

-- PROFILES
DROP POLICY IF EXISTS "Profiles: Public view" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Superadmins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Superadmins can update all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Superadmins can delete" ON public.profiles;

CREATE POLICY "Profiles: Public view"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_superadmin_jwt());

CREATE POLICY "Profiles: Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_superadmin_jwt())
  WITH CHECK (auth.uid() = id OR public.is_superadmin_jwt());

CREATE POLICY "Profiles: Superadmins can delete"
  ON public.profiles FOR DELETE
  USING (public.is_superadmin_jwt());

-- CATEGORIES
DROP POLICY IF EXISTS "Categories: Public read" ON public.categories;
DROP POLICY IF EXISTS "Categories: Superadmins can insert" ON public.categories;
DROP POLICY IF EXISTS "Categories: Superadmins can update" ON public.categories;
DROP POLICY IF EXISTS "Categories: Superadmins can delete" ON public.categories;

CREATE POLICY "Categories: Public read"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Categories: Superadmins can insert"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_superadmin_jwt());

CREATE POLICY "Categories: Superadmins can update"
  ON public.categories FOR UPDATE
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

CREATE POLICY "Categories: Superadmins can delete"
  ON public.categories FOR DELETE
  USING (public.is_superadmin_jwt());

-- TOOLS
DROP POLICY IF EXISTS "Tools: Public read" ON public.tools;
DROP POLICY IF EXISTS "Tools: Superadmins can insert" ON public.tools;
DROP POLICY IF EXISTS "Tools: Superadmins can update" ON public.tools;
DROP POLICY IF EXISTS "Tools: Superadmins can delete" ON public.tools;

CREATE POLICY "Tools: Public read"
  ON public.tools FOR SELECT
  USING (status IN ('active', 'beta') OR auth.uid() IS NOT NULL);

CREATE POLICY "Tools: Superadmins can insert"
  ON public.tools FOR INSERT
  WITH CHECK (public.is_superadmin_jwt());

CREATE POLICY "Tools: Superadmins can update"
  ON public.tools FOR UPDATE
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

CREATE POLICY "Tools: Superadmins can delete"
  ON public.tools FOR DELETE
  USING (public.is_superadmin_jwt());

-- SERVICES
DROP POLICY IF EXISTS "Services: Public read" ON public.services;
DROP POLICY IF EXISTS "Services: Superadmins can manage" ON public.services;

CREATE POLICY "Services: Public read"
  ON public.services FOR SELECT
  USING (true);

CREATE POLICY "Services: Superadmins can manage"
  ON public.services FOR ALL
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

-- INCIDENTS
DROP POLICY IF EXISTS "Incidents: Public read" ON public.incidents;
DROP POLICY IF EXISTS "Incidents: Superadmins can manage" ON public.incidents;

CREATE POLICY "Incidents: Public read"
  ON public.incidents FOR SELECT
  USING (true);

CREATE POLICY "Incidents: Superadmins can manage"
  ON public.incidents FOR ALL
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

-- INCIDENT UPDATES
DROP POLICY IF EXISTS "Incident Updates: Public read" ON public.incident_updates;
DROP POLICY IF EXISTS "Incident Updates: Superadmins can manage" ON public.incident_updates;

CREATE POLICY "Incident Updates: Public read"
  ON public.incident_updates FOR SELECT
  USING (true);

CREATE POLICY "Incident Updates: Superadmins can manage"
  ON public.incident_updates FOR ALL
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());
