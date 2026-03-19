
-- Notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'job_alert',
  title TEXT NOT NULL,
  message TEXT,
  related_job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add job_alerts_enabled to nanny_profiles for opt-out
ALTER TABLE public.nanny_profiles ADD COLUMN job_alerts_enabled BOOLEAN DEFAULT true;

-- Function to create notifications for matching nannies when a new job is posted
CREATE OR REPLACE FUNCTION public.notify_nannies_on_new_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, related_job_id)
  SELECT 
    np.user_id,
    'job_alert',
    'New Job: ' || NEW.title,
    COALESCE(NEW.location, '') || ' • ' || COALESCE(NEW.service_type, '') || 
    CASE WHEN NEW.hourly_rate IS NOT NULL THEN ' • €' || NEW.hourly_rate::text || '/hr' ELSE '' END,
    NEW.id
  FROM public.nanny_profiles np
  WHERE np.onboarding_completed = true
    AND np.profile_visible = true
    AND np.job_alerts_enabled = true
    AND np.user_id != NEW.family_user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger on jobs table
CREATE TRIGGER on_job_created_notify_nannies
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_nannies_on_new_job();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
