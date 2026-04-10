-- ============================================
-- CafeToolbox - Row Level Security (RLS) Policies
-- Version: 0002
-- Phase: 1 (Auth & Dashboard Core)
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES RLS POLICIES
-- ============================================

-- Public view: Everyone can see basic info (display_name, role)
CREATE POLICY "Profiles: Public view"
  ON public.profiles FOR SELECT
  USING (
    true -- Public access for basic profile info
  );

-- User can update own profile
CREATE POLICY "Profiles: Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
  );

-- Admin can manage all profiles (via service role, not in frontend)
-- For admin operations in frontend, we use a separate trigger/function

-- ============================================
-- TOOLS RLS POLICIES
-- ============================================

-- Public read access for active/beta tools
CREATE POLICY "Tools: Public read"
  ON public.tools FOR SELECT
  USING (
    status IN ('active', 'beta') OR
    auth.uid() IS NOT NULL -- Logged-in users can see all
  );

-- Admin can insert new tools
CREATE POLICY "Tools: Admins can insert"
  ON public.tools FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update tools
CREATE POLICY "Tools: Admins can update"
  ON public.tools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can delete tools
CREATE POLICY "Tools: Admins can delete"
  ON public.tools FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- SERVICES RLS POLICIES
-- ============================================

-- Public read access for status page
CREATE POLICY "Services: Public read"
  ON public.services FOR SELECT
  USING (true);

-- Admin can manage services
CREATE POLICY "Services: Admins can manage"
  ON public.services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- INCIDENTS RLS POLICIES
-- ============================================

-- Public read access for status page
CREATE POLICY "Incidents: Public read"
  ON public.incidents FOR SELECT
  USING (true);

-- Admin can manage incidents
CREATE POLICY "Incidents: Admins can manage"
  ON public.incidents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- INCIDENT UPDATES RLS POLICIES
-- ============================================

-- Public read access for status page
CREATE POLICY "Incident Updates: Public read"
  ON public.incident_updates FOR SELECT
  USING (true);

-- Admin can manage incident updates
CREATE POLICY "Incident Updates: Admins can manage"
  ON public.incident_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================

-- Function to auto-create profile entry when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    'viewer' -- Default role for new users
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- ============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Note: Create first admin user via Supabase Dashboard's SQL Editor
-- Example:
-- INSERT INTO public.profiles (id, email, display_name, role)
-- VALUES (
--   'your-admin-user-uuid-from-auth.users',
--   'admin@cafetoolbox.app',
--   'Admin',
--   'admin'
-- );
-- ============================================
-- CafeToolbox - Row Level Security (RLS) Policies
-- Version: 0002
-- Phase: 1 (Auth & Dashboard Core)
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES RLS POLICIES
-- ============================================

-- Public view: Everyone can see basic info (display_name, role)
CREATE POLICY "Profiles: Public view"
  ON public.profiles FOR SELECT
  USING (
    true -- Public access for basic profile info
  );

-- User can update own profile
CREATE POLICY "Profiles: Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
  );

-- Admin can manage all profiles (via service role, not in frontend)
-- For admin operations in frontend, we use a separate trigger/function

-- ============================================
-- TOOLS RLS POLICIES
-- ============================================

-- Public read access for active/beta tools
CREATE POLICY "Tools: Public read"
  ON public.tools FOR SELECT
  USING (
    status IN ('active', 'beta') OR
    auth.uid() IS NOT NULL -- Logged-in users can see all
  );

-- Admin can insert new tools
CREATE POLICY "Tools: Admins can insert"
  ON public.tools FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update tools
CREATE POLICY "Tools: Admins can update"
  ON public.tools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can delete tools
CREATE POLICY "Tools: Admins can delete"
  ON public.tools FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- SERVICES RLS POLICIES
-- ============================================

-- Public read access for status page
CREATE POLICY "Services: Public read"
  ON public.services FOR SELECT
  USING (true);

-- Admin can manage services
CREATE POLICY "Services: Admins can manage"
  ON public.services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- INCIDENTS RLS POLICIES
-- ============================================

-- Public read access for status page
CREATE POLICY "Incidents: Public read"
  ON public.incidents FOR SELECT
  USING (true);

-- Admin can manage incidents
CREATE POLICY "Incidents: Admins can manage"
  ON public.incidents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- INCIDENT UPDATES RLS POLICIES
-- ============================================

-- Public read access for status page
CREATE POLICY "Incident Updates: Public read"
  ON public.incident_updates FOR SELECT
  USING (true);

-- Admin can manage incident updates
CREATE POLICY "Incident Updates: Admins can manage"
  ON public.incident_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================

-- Function to auto-create profile entry when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    'viewer' -- Default role for new users
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- ============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Note: Create first admin user via Supabase Dashboard's SQL Editor
-- Example:
-- INSERT INTO public.profiles (id, email, display_name, role)
-- VALUES (
--   'your-admin-user-uuid-from-auth.users',
--   'admin@cafetoolbox.app',
--   'Admin',
--   'admin'
-- );
