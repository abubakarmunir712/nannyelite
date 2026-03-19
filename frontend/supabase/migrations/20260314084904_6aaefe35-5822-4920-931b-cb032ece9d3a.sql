ALTER TABLE public.nanny_profiles 
ADD COLUMN IF NOT EXISTS response_rate numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS avg_response_time_hours numeric DEFAULT NULL;