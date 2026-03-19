-- Migration: Add is_seeded field and admin delete permissions
-- Date: 2026-03-17
-- Purpose: 
--   1. Add explicit is_seeded field to profiles table
--   2. Allow admins to delete profiles, nanny_profiles, family_profiles

-- ============================================================================
-- PART 1: Add is_seeded field to profiles table
-- ============================================================================

-- Add is_seeded column (defaults to true for safety - new users manually created are seeded)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_seeded boolean DEFAULT false;

-- Mark existing demo/test users as seeded based on email patterns
-- (This is a one-time migration, future users will be explicitly set)
UPDATE public.profiles 
SET is_seeded = true
WHERE email LIKE '%@demo.nannyelite.ch'
   OR email LIKE '%@test.com'
   OR email LIKE '%@example.com'
   OR email LIKE '%@email.ch'
   OR email LIKE '%temp.admin%';

-- Mark known real users as NOT seeded
UPDATE public.profiles 
SET is_seeded = false
WHERE email LIKE '%@gmail.com'
   OR email LIKE '%@proton.me'
   OR email LIKE '%@hotmail.com'
   OR email LIKE '%@outlook.com'
   OR email LIKE '%@yahoo.com'
   OR email LIKE '%@icloud.com';

-- ============================================================================
-- PART 2: Add is_seeded to nanny_profiles table
-- ============================================================================

ALTER TABLE public.nanny_profiles 
ADD COLUMN IF NOT EXISTS is_seeded boolean DEFAULT false;

-- Sync is_seeded from profiles to nanny_profiles
UPDATE public.nanny_profiles np
SET is_seeded = p.is_seeded
FROM public.profiles p
WHERE np.user_id = p.user_id;

-- ============================================================================
-- PART 3: Add is_seeded to family_profiles table
-- ============================================================================

ALTER TABLE public.family_profiles 
ADD COLUMN IF NOT EXISTS is_seeded boolean DEFAULT false;

-- Sync is_seeded from profiles to family_profiles
UPDATE public.family_profiles fp
SET is_seeded = p.is_seeded
FROM public.profiles p
WHERE fp.user_id = p.user_id;

-- ============================================================================
-- PART 4: Add is_seeded to jobs table
-- ============================================================================

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS is_seeded boolean DEFAULT false;

-- Mark jobs as seeded if job_source is 'platform' or 'partner'
UPDATE public.jobs 
SET is_seeded = true
WHERE job_source IN ('platform', 'partner');

-- ============================================================================
-- PART 5: RLS Policies for Admin Delete Access
-- ============================================================================

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = user_uuid 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow admins to delete from profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to delete from nanny_profiles
DROP POLICY IF EXISTS "Admins can delete nanny_profiles" ON public.nanny_profiles;
CREATE POLICY "Admins can delete nanny_profiles" ON public.nanny_profiles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to delete from family_profiles
DROP POLICY IF EXISTS "Admins can delete family_profiles" ON public.family_profiles;
CREATE POLICY "Admins can delete family_profiles" ON public.family_profiles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to read admin_roles (needed for role checking)
DROP POLICY IF EXISTS "Admins can read admin_roles" ON public.admin_roles;
CREATE POLICY "Admins can read admin_roles" ON public.admin_roles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

-- Allow admins to update profiles (for is_seeded field)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

-- Allow admins to update nanny_profiles
DROP POLICY IF EXISTS "Admins can update nanny_profiles" ON public.nanny_profiles;
CREATE POLICY "Admins can update nanny_profiles" ON public.nanny_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

-- Allow admins to update family_profiles
DROP POLICY IF EXISTS "Admins can update family_profiles" ON public.family_profiles;
CREATE POLICY "Admins can update family_profiles" ON public.family_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
-- 
-- is_seeded field values:
--   true  = Seeded/Demo data (S badge in admin)
--   false = Real user data (R badge in admin)
--
-- Admin can now:
--   - Delete profiles, nanny_profiles, family_profiles
--   - Update is_seeded field on any profile
--   - Read admin_roles table
--
-- To mark a user as seeded:
--   UPDATE profiles SET is_seeded = true WHERE user_id = 'xxx';
--
-- To mark a user as real:
--   UPDATE profiles SET is_seeded = false WHERE user_id = 'xxx';
-- ============================================================================
