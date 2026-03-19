
-- Nanny detailed profiles
CREATE TABLE public.nanny_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Basic info
  date_of_birth date,
  nationality text,
  gender text,
  
  -- Professional
  years_of_experience integer DEFAULT 0,
  bio text,
  ai_generated_description text,
  
  -- Experience specializations
  experience_infants boolean DEFAULT false,
  experience_toddlers boolean DEFAULT false,
  experience_preschool boolean DEFAULT false,
  experience_school_age boolean DEFAULT false,
  experience_teenagers boolean DEFAULT false,
  experience_special_needs boolean DEFAULT false,
  special_needs_details text,
  
  -- Certifications
  has_first_aid boolean DEFAULT false,
  has_cpr boolean DEFAULT false,
  has_early_childhood_cert boolean DEFAULT false,
  has_child_psychology boolean DEFAULT false,
  has_nutrition_cert boolean DEFAULT false,
  has_montessori_cert boolean DEFAULT false,
  other_certifications text[] DEFAULT '{}',
  
  -- Services offered (matches site service types)
  offers_date_night boolean DEFAULT false,
  offers_overnight boolean DEFAULT false,
  offers_after_school boolean DEFAULT false,
  offers_weekend_holiday boolean DEFAULT false,
  offers_full_time boolean DEFAULT false,
  offers_part_time boolean DEFAULT false,
  
  -- Rates
  hourly_rate_spot numeric(8,2),
  hourly_rate_recurring numeric(8,2),
  currency text DEFAULT 'EUR',
  
  -- Availability
  available_monday boolean DEFAULT false,
  available_tuesday boolean DEFAULT false,
  available_wednesday boolean DEFAULT false,
  available_thursday boolean DEFAULT false,
  available_friday boolean DEFAULT false,
  available_saturday boolean DEFAULT false,
  available_sunday boolean DEFAULT false,
  availability_notes text,
  
  -- Additional skills
  can_cook boolean DEFAULT false,
  can_drive boolean DEFAULT false,
  has_car boolean DEFAULT false,
  can_help_homework boolean DEFAULT false,
  can_do_light_housekeeping boolean DEFAULT false,
  activities_offered text[] DEFAULT '{}',
  
  -- Verification status
  id_verified boolean DEFAULT false,
  background_check_passed boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  email_verified boolean DEFAULT false,
  
  -- Onboarding
  onboarding_completed boolean DEFAULT false,
  profile_visible boolean DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_nanny_profiles_updated_at
  BEFORE UPDATE ON public.nanny_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.nanny_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nanny profiles viewable by authenticated" ON public.nanny_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Nannies can insert own profile" ON public.nanny_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nannies can update own profile" ON public.nanny_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Nanny photos table
CREATE TABLE public.nanny_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nanny_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nanny photos viewable by authenticated" ON public.nanny_photos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Nannies can insert own photos" ON public.nanny_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nannies can update own photos" ON public.nanny_photos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Nannies can delete own photos" ON public.nanny_photos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Nanny documents table (for verification)
CREATE TABLE public.nanny_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'government_id', 'certification', 'background_check', 'reference_letter', 'selfie_verification'
  document_url text NOT NULL,
  document_name text,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nanny_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nannies can view own documents" ON public.nanny_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Nannies can insert own documents" ON public.nanny_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nannies can delete own documents" ON public.nanny_documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage buckets for nanny photos and documents
INSERT INTO storage.buckets (id, name, public) VALUES ('nanny-photos', 'nanny-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('nanny-documents', 'nanny-documents', false);

-- Storage policies for nanny-photos
CREATE POLICY "Anyone can view nanny photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'nanny-photos');

CREATE POLICY "Authenticated users can upload nanny photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nanny-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own nanny photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'nanny-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own nanny photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'nanny-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for nanny-documents (private)
CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'nanny-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nanny-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'nanny-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
