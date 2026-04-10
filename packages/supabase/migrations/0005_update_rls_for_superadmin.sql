-- ============================================
-- CafeToolbox - Update RLS Policies for Superadmin
-- Version: 0005
-- Purpose: Update all RLS policies to use 'superadmin' instead of 'admin'
-- ============================================

-- Drop existing policies so this migration can be re-run safely.
DROP POLICY IF EXISTS "Profiles: Public view" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Superadmins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Superadmins can update all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Superadmins can delete" ON public.profiles;

DROP POLICY IF EXISTS "Tools: Public read" ON public.tools;
DROP POLICY IF EXISTS "Tools: Admins can insert" ON public.tools;
DROP POLICY IF EXISTS "Tools: Admins can update" ON public.tools;
DROP POLICY IF EXISTS "Tools: Admins can delete" ON public.tools;
DROP POLICY IF EXISTS "Tools: Superadmins can insert" ON public.tools;
DROP POLICY IF EXISTS "Tools: Superadmins can update" ON public.tools;
DROP POLICY IF EXISTS "Tools: Superadmins can delete" ON public.tools;

DROP POLICY IF EXISTS "Services: Public read" ON public.services;
DROP POLICY IF EXISTS "Services: Admins can manage" ON public.services;
DROP POLICY IF EXISTS "Services: Superadmins can manage" ON public.services;

DROP POLICY IF EXISTS "Incidents: Public read" ON public.incidents;
DROP POLICY IF EXISTS "Incidents: Admins can manage" ON public.incidents;
DROP POLICY IF EXISTS "Incidents: Superadmins can manage" ON public.incidents;

DROP POLICY IF EXISTS "Incident Updates: Public read" ON public.incident_updates;
DROP POLICY IF EXISTS "Incident Updates: Admins can manage" ON public.incident_updates;
DROP POLICY IF EXISTS "Incident Updates: Superadmins can manage" ON public.incident_updates;

-- ============================================
-- PROFILES RLS POLICIES (Updated)
-- ============================================

-- Public view: Limited basic info
CREATE POLICY "Profiles: Public view"
  ON public.profiles FOR SELECT
  USING (
    role = 'user' -- Only user profiles are publicly visible (limited info)
  );

-- User can view own profile
CREATE POLICY "Profiles: Users view own profile"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
  );

-- User can update own profile
CREATE POLICY "Profiles: Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
  );

-- Superadmin can view all profiles
CREATE POLICY "Profiles: Superadmins can view all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can update all profiles
CREATE POLICY "Profiles: Superadmins can update all"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can delete users
CREATE POLICY "Profiles: Superadmins can delete"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- ============================================
-- TOOLS RLS POLICIES (Updated)
-- ============================================

-- Public read access for active/beta tools
CREATE POLICY "Tools: Public read"
  ON public.tools FOR SELECT
  USING (
    status IN ('active', 'beta') OR
    auth.uid() IS NOT NULL -- Logged-in users can see all
  );

-- Superadmin can insert new tools
CREATE POLICY "Tools: Superadmins can insert"
  ON public.tools FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can update tools
CREATE POLICY "Tools: Superadmins can update"
  ON public.tools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can delete tools
CREATE POLICY "Tools: Superadmins can delete"
  ON public.tools FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- ============================================
-- SERVICES RLS POLICIES (Updated)
-- ============================================

-- Public read access for status page
CREATE POLICY "Services: Public read"
  ON public.services FOR SELECT
  USING (true);

-- Superadmin can manage services
CREATE POLICY "Services: Superadmins can manage"
  ON public.services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- ============================================
-- INCIDENTS RLS POLICIES (Updated)
-- ============================================

-- Public read access for status page
CREATE POLICY "Incidents: Public read"
  ON public.incidents FOR SELECT
  USING (true);

-- Superadmin can manage incidents
CREATE POLICY "Incidents: Superadmins can manage"
  ON public.incidents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- ============================================
-- INCIDENT UPDATES RLS POLICIES (Updated)
-- ============================================

-- Public read access for status page
CREATE POLICY "Incident Updates: Public read"
  ON public.incident_updates FOR SELECT
  USING (true);

-- Superadmin can manage incident updates
CREATE POLICY "Incident Updates: Superadmins can manage"
  ON public.incident_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- ============================================
-- HELPER FUNCTIONS (Updated for Superadmin)
-- ============================================

-- Drop old functions
DROP FUNCTION IF EXISTS public.is_admin();

-- Check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'superadmin'
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- Get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid();
$$;
