-- Admin/moderator can update family profiles
CREATE POLICY "Admins can update all family profiles"
ON public.family_profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Admin can delete family profiles
CREATE POLICY "Admins can delete family profiles"
ON public.family_profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin/moderator can update children records
CREATE POLICY "Admins can update all children"
ON public.children
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Admin can delete children records
CREATE POLICY "Admins can delete children"
ON public.children
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin/moderator can insert children (for backfill)
CREATE POLICY "Admins can insert children"
ON public.children
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Admin/moderator can view all job applications
CREATE POLICY "Admins can view all applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Admin can update all job applications
CREATE POLICY "Admins can update all applications"
ON public.job_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));