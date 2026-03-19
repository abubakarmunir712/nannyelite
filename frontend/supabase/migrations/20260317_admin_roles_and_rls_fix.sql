-- Migration: Add temp admin to admin_roles and fix RLS for admin delete
-- Date: 2026-03-17
-- Purpose: Properly configure admin access and delete permissions

-- ============================================================================
-- PART 1: Insert temp admin user into admin_roles
-- ============================================================================

-- The temp admin user ID: aa18e6f6-2249-415a-ae95-9fc1e43acf23
-- Email: temp.admin.1773708390929@nannyelite.ch

INSERT INTO public.admin_roles (user_id, role)
VALUES ('aa18e6f6-2249-415a-ae95-9fc1e43acf23', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ============================================================================
-- PART 2: Create is_admin() function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = check_user_id 
    AND role IN ('admin', 'moderator')
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- ============================================================================
-- PART 3: RLS Policies for admin_roles table (allow admins to read)
-- ============================================================================

-- Enable RLS on admin_roles if not already
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to check their own admin status
DROP POLICY IF EXISTS "Users can read own admin role" ON public.admin_roles;
CREATE POLICY "Users can read own admin role" ON public.admin_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow admins to read all admin roles
DROP POLICY IF EXISTS "Admins can read all admin roles" ON public.admin_roles;
CREATE POLICY "Admins can read all admin roles" ON public.admin_roles
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- PART 4: RLS Policies for profiles table (allow admin delete)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- PART 5: RLS Policies for nanny_profiles table (allow admin delete)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete any nanny profile" ON public.nanny_profiles;
CREATE POLICY "Admins can delete any nanny profile" ON public.nanny_profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any nanny profile" ON public.nanny_profiles;
CREATE POLICY "Admins can update any nanny profile" ON public.nanny_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- PART 6: RLS Policies for family_profiles table (allow admin delete)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete any family profile" ON public.family_profiles;
CREATE POLICY "Admins can delete any family profile" ON public.family_profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any family profile" ON public.family_profiles;
CREATE POLICY "Admins can update any family profile" ON public.family_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- PART 7: RLS Policies for related tables (allow admin delete)
-- ============================================================================

-- nanny_photos
DROP POLICY IF EXISTS "Admins can delete any nanny photo" ON public.nanny_photos;
CREATE POLICY "Admins can delete any nanny photo" ON public.nanny_photos
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- nanny_documents
DROP POLICY IF EXISTS "Admins can delete any nanny document" ON public.nanny_documents;
CREATE POLICY "Admins can delete any nanny document" ON public.nanny_documents
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- nanny_certificates
DROP POLICY IF EXISTS "Admins can delete any nanny certificate" ON public.nanny_certificates;
CREATE POLICY "Admins can delete any nanny certificate" ON public.nanny_certificates
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- job_applications
DROP POLICY IF EXISTS "Admins can delete any job application" ON public.job_applications;
CREATE POLICY "Admins can delete any job application" ON public.job_applications
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- jobs
DROP POLICY IF EXISTS "Admins can delete any job" ON public.jobs;
CREATE POLICY "Admins can delete any job" ON public.jobs
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- user_roles
DROP POLICY IF EXISTS "Admins can delete any user role" ON public.user_roles;
CREATE POLICY "Admins can delete any user role" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- VERIFICATION QUERY (run after migration to verify)
-- ============================================================================
-- 
-- SELECT public.is_admin('aa18e6f6-2249-415a-ae95-9fc1e43acf23');
-- Should return: true
--
-- SELECT * FROM admin_roles WHERE user_id = 'aa18e6f6-2249-415a-ae95-9fc1e43acf23';
-- Should return: 1 row with role = 'admin'
-- ============================================================================
