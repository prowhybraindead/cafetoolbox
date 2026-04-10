-- ============================================
-- CafeToolbox - Fix Profile Schema
-- Version: 0004
-- Purpose: Update profiles table to match requirements
-- Changes:
--   1. Change role options: ('superadmin', 'user')
--   2. Add last_activity timestamp
-- ============================================

-- Drop the existing role constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- Add new role constraint with correct options
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('superadmin', 'user'));

-- Add last_activity column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

-- Add index on last_activity
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON public.profiles(last_activity DESC);
