-- Migration: Fix profile visibility fields and logic
-- Date: 2026-03-19

-- Ensure profile_visible exists in nanny_profiles (should already exist, but for safety)
ALTER TABLE public.nanny_profiles 
ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN DEFAULT false;

-- Ensure profile_visible exists in family_profiles
ALTER TABLE public.family_profiles 
ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN DEFAULT false;

-- Ensure profile_visibility exists in profiles (for general privacy preference)
-- This was supposedly added in 20260316000000_trust_verification_system.sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'members', 'private'));

-- Ensure profile_status exists in both (for admin approval)
ALTER TABLE public.nanny_profiles 
ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'pending' CHECK (profile_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.family_profiles 
ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'pending' CHECK (profile_status IN ('pending', 'approved', 'rejected'));

-- Update RLS for nanny_profiles to respect profile_visible AND profile_status
-- Only approved and visible profiles should be seen by others
DROP POLICY IF EXISTS "Nanny profiles viewable by authenticated" ON public.nanny_profiles;
CREATE POLICY "Nanny profiles viewable by authenticated" ON public.nanny_profiles
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() 
    OR (profile_visible = true AND profile_status = 'approved')
    OR (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );

-- Update RLS for family_profiles to respect profile_visible AND profile_status
DROP POLICY IF EXISTS "Authenticated users can view family profiles" ON public.family_profiles;
CREATE POLICY "Authenticated users can view family profiles" ON public.family_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR (profile_visible = true AND profile_status = 'approved')
    OR (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );

-- Update RLS for profiles to respect profile_visibility
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid()
    OR profile_visibility = 'public'
    OR (profile_visibility = 'members' AND auth.role() = 'authenticated')
    OR (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );
