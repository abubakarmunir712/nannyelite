
-- Add new columns to nanny_profiles
ALTER TABLE public.nanny_profiles
  ADD COLUMN IF NOT EXISTS comfortable_with_pets boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoking_status text DEFAULT 'non_smoker',
  ADD COLUMN IF NOT EXISTS has_drivers_license boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

-- Create availability_slots table for Day × Period model
CREATE TABLE public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day text NOT NULL,
  period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, day, period)
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nannies can manage own slots" ON public.availability_slots
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Availability slots viewable by authenticated" ON public.availability_slots
  FOR SELECT TO authenticated USING (true);
