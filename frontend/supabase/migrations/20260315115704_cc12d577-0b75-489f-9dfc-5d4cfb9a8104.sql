
-- Ensure nanny-documents bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'nanny-documents';

-- Drop any existing policies for nanny-documents to avoid conflicts
DROP POLICY IF EXISTS "Users upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users update own documents" ON storage.objects;

-- Users can upload to their own folder only
CREATE POLICY "Users upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'nanny-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own documents
CREATE POLICY "Users view own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'nanny-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all documents
CREATE POLICY "Admins view all documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'nanny-documents'
  AND public.has_admin_access(auth.uid())
);

-- Users can delete their own documents
CREATE POLICY "Users delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'nanny-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own documents
CREATE POLICY "Users update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'nanny-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
