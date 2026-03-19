-- 1. Add admin read policy for nanny-documents storage bucket
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'nanny-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2. Add moderator read policy for nanny-documents storage bucket
CREATE POLICY "Moderators can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'nanny-documents'
  AND public.has_role(auth.uid(), 'moderator'::public.app_role)
);

-- 3. Fix notify_nannies_on_new_job function - replace € with CHF
CREATE OR REPLACE FUNCTION public.notify_nannies_on_new_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, related_job_id)
  SELECT 
    np.user_id,
    'job_alert',
    'New Job: ' || NEW.title,
    COALESCE(NEW.location, '') || ' • ' || COALESCE(NEW.service_type, '') || 
    CASE WHEN NEW.hourly_rate IS NOT NULL THEN ' • CHF ' || NEW.hourly_rate::text || '/hr' ELSE '' END,
    NEW.id
  FROM public.nanny_profiles np
  WHERE np.onboarding_completed = true
    AND np.profile_visible = true
    AND np.job_alerts_enabled = true
    AND np.user_id != NEW.family_user_id;
  
  RETURN NEW;
END;
$function$;