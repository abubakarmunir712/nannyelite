-- Migration: Profile approval system - add to family_profiles and fix RLS
-- Date: 2026-03-17
-- Purpose: Ensure only approved profiles appear in marketplace

-- ============================================================================
-- PART 1: Add profile_status to family_profiles (for consistency)
-- ============================================================================

ALTER TABLE public.family_profiles 
ADD COLUMN IF NOT EXISTS profile_status text DEFAULT 'pending';

-- Set existing completed families to approved (they were allowed before)
UPDATE public.family_profiles 
SET profile_status = 'approved' 
WHERE onboarding_completed = true AND profile_status = 'pending';

-- ============================================================================
-- PART 2: RLS - Prevent non-admins from changing profile_status
-- ============================================================================

-- Create helper function to check if user is updating profile_status
CREATE OR REPLACE FUNCTION public.check_profile_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If profile_status is being changed
  IF OLD.profile_status IS DISTINCT FROM NEW.profile_status THEN
    -- Only admins can change profile_status
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change profile_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to nanny_profiles
DROP TRIGGER IF EXISTS check_profile_status_nanny ON public.nanny_profiles;
CREATE TRIGGER check_profile_status_nanny
  BEFORE UPDATE ON public.nanny_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_status_update();

-- Apply trigger to family_profiles
DROP TRIGGER IF EXISTS check_profile_status_family ON public.family_profiles;
CREATE TRIGGER check_profile_status_family
  BEFORE UPDATE ON public.family_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_status_update();

-- ============================================================================
-- PART 3: RLS - Allow admins full access to change profile_status
-- ============================================================================

-- Admin can update any nanny_profiles (including profile_status)
DROP POLICY IF EXISTS "Admins can update any nanny profile" ON public.nanny_profiles;
CREATE POLICY "Admins can update any nanny profile" ON public.nanny_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- Admin can update any family_profiles (including profile_status)
DROP POLICY IF EXISTS "Admins can update any family profile" ON public.family_profiles;
CREATE POLICY "Admins can update any family profile" ON public.family_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- 
-- Test 1: Check nanny_profiles has profile_status
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'nanny_profiles' AND column_name = 'profile_status';
--
-- Test 2: Check family_profiles has profile_status  
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'family_profiles' AND column_name = 'profile_status';
--
-- Test 3: Try to update profile_status as non-admin (should fail)
-- UPDATE nanny_profiles SET profile_status = 'approved' WHERE user_id = 'xxx';
--
-- Test 4: Try to update profile_status as admin (should work)
-- Logged in as admin: UPDATE nanny_profiles SET profile_status = 'approved' WHERE user_id = 'xxx';
-- ============================================================================
