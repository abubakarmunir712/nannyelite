-- Trust & Verification System Migration
-- Run this in Supabase SQL Editor

-- 1. Create user_certificates table
CREATE TABLE IF NOT EXISTS public.user_certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_certificates_user_id ON public.user_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_status ON public.user_certificates(status);

-- RLS policies
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
DROP POLICY IF EXISTS "Users can view own certificates" ON public.user_certificates;
DROP POLICY IF EXISTS "Nannies can view own certificates" ON public.user_certificates;
CREATE POLICY "Users can view own certificates"
  ON public.user_certificates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own certificates
DROP POLICY IF EXISTS "Users can insert own certificates" ON public.user_certificates;
DROP POLICY IF EXISTS "Nannies can insert own certificates" ON public.user_certificates;
CREATE POLICY "Users can insert own certificates"
  ON public.user_certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all certificates
DROP POLICY IF EXISTS "Admins can view all certificates" ON public.user_certificates;
CREATE POLICY "Admins can view all certificates"
  ON public.user_certificates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can update certificates (approve/reject)
DROP POLICY IF EXISTS "Admins can update certificates" ON public.user_certificates;
CREATE POLICY "Admins can update certificates"
  ON public.user_certificates FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Anyone can read approved certificates (for badge display)
DROP POLICY IF EXISTS "Anyone can read approved certificates" ON public.user_certificates;
CREATE POLICY "Anyone can read approved certificates"
  ON public.user_certificates FOR SELECT
  USING (status = 'approved');

-- 2. Add profile_visibility to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'members', 'private'));

-- 3. Add identity verification fields to nanny_profiles
ALTER TABLE public.nanny_profiles ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false;
ALTER TABLE public.nanny_profiles ADD COLUMN IF NOT EXISTS identity_verification_status TEXT;
ALTER TABLE public.nanny_profiles ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;
ALTER TABLE public.nanny_profiles ADD COLUMN IF NOT EXISTS manual_identity_verified BOOLEAN DEFAULT false;
ALTER TABLE public.nanny_profiles ADD COLUMN IF NOT EXISTS availability_last_updated TIMESTAMPTZ;

-- 4. Add email_verified and phone_verified to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- 5. Index for visibility-based search
CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON public.profiles(profile_visibility);
