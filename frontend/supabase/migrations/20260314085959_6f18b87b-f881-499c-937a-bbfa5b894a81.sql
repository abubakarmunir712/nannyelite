-- Add dual pricing columns
ALTER TABLE public.nanny_profiles
ADD COLUMN IF NOT EXISTS babysitting_rate_chf NUMERIC,
ADD COLUMN IF NOT EXISTS part_time_childcare_rate_chf NUMERIC;

-- Migrate existing data: copy hourly_rate_spot to babysitting_rate_chf
UPDATE public.nanny_profiles
SET babysitting_rate_chf = hourly_rate_spot
WHERE hourly_rate_spot IS NOT NULL AND babysitting_rate_chf IS NULL;

-- Copy hourly_rate_recurring to part_time_childcare_rate_chf
UPDATE public.nanny_profiles
SET part_time_childcare_rate_chf = hourly_rate_recurring
WHERE hourly_rate_recurring IS NOT NULL AND part_time_childcare_rate_chf IS NULL;