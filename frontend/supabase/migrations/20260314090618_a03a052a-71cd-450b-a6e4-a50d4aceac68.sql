-- Add media intro fields to nanny_profiles
ALTER TABLE public.nanny_profiles
ADD COLUMN IF NOT EXISTS video_intro_url TEXT,
ADD COLUMN IF NOT EXISTS voice_intro_url TEXT;

-- Create storage bucket for nanny media intros
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('nanny-media', 'nanny-media', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS: Allow authenticated users to view media
CREATE POLICY "Anyone can view nanny media"
ON storage.objects FOR SELECT
USING (bucket_id = 'nanny-media');

-- RLS: Nannies can upload their own media
CREATE POLICY "Nannies can upload own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'nanny-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Nannies can delete their own media
CREATE POLICY "Nannies can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'nanny-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Nannies can update their own media
CREATE POLICY "Nannies can update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'nanny-media' AND (storage.foldername(name))[1] = auth.uid()::text);