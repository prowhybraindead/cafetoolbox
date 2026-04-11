-- ============================================
-- CafeToolbox - Sync Profile Role to Auth Metadata
-- Version: 0008
-- Purpose: Keep profiles.role and auth.users metadata in sync
-- ============================================

-- Sync role changes from public.profiles into auth.users metadata.
-- This lets direct table edits and admin UI updates reflect in /api/me.
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role) THEN
    UPDATE auth.users
    SET
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_role_to_auth_metadata ON public.profiles;

CREATE TRIGGER sync_profile_role_to_auth_metadata
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_auth_metadata();
