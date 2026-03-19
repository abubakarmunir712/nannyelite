
ALTER TABLE public.nanny_profiles 
  ADD COLUMN IF NOT EXISTS caregiver_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_school_holidays boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_cleaning_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Switzerland',
  ADD COLUMN IF NOT EXISTS phone_number text;
