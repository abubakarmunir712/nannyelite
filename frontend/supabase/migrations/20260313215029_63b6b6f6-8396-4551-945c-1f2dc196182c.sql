
-- Add police_certificate_passed to nanny_profiles
ALTER TABLE public.nanny_profiles ADD COLUMN police_certificate_passed BOOLEAN DEFAULT false;

-- Add course_links to nanny_profiles for linking to training courses
ALTER TABLE public.nanny_profiles ADD COLUMN course_links JSONB DEFAULT '[]'::jsonb;
