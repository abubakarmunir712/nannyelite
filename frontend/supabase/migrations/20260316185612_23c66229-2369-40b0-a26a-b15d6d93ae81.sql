
-- Create user_certificates table for the new certificate system
CREATE TABLE IF NOT EXISTS public.user_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  certificate_type text NOT NULL,
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- Nannies can insert their own certificates
DROP POLICY IF EXISTS "Nannies can insert own certificates" ON public.user_certificates;
CREATE POLICY "Nannies can insert own certificates"
  ON public.user_certificates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Nannies can view their own certificates
DROP POLICY IF EXISTS "Nannies can view own certificates" ON public.user_certificates;
CREATE POLICY "Nannies can view own certificates"
  ON public.user_certificates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all certificates
DROP POLICY IF EXISTS "Admins can view all certificates" ON public.user_certificates;
CREATE POLICY "Admins can view all certificates"
  ON public.user_certificates FOR SELECT
  TO authenticated
  USING (has_admin_access(auth.uid()));

-- Admins can update certificates (approve/reject)
DROP POLICY IF EXISTS "Admins can update certificates" ON public.user_certificates;
CREATE POLICY "Admins can update certificates"
  ON public.user_certificates FOR UPDATE
  TO authenticated
  USING (has_admin_access(auth.uid()));

-- Add identity verification columns to nanny_profiles
ALTER TABLE public.nanny_profiles
  ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_identity_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verification_status text DEFAULT 'not_started';
