-- ============================================
-- CafeToolbox - Backfill Profile Roles to Auth Metadata
-- Version: 0009
-- Purpose: Sync existing profiles.role values into auth.users metadata
-- ============================================

UPDATE auth.users u
SET
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE p.id = u.id
  AND p.role IS NOT NULL;
