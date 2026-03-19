CREATE POLICY "Anonymous can view open jobs"
ON public.jobs
FOR SELECT
TO anon
USING (status = 'open');