CREATE POLICY "Admins can insert platform jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND job_source IN ('platform', 'partner')
);