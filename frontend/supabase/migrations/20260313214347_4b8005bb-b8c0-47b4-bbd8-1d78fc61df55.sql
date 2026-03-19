
-- References table for parent references on nanny profiles
CREATE TABLE public.nanny_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nanny_user_id UUID NOT NULL,
  family_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  relationship TEXT,
  service_period TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(nanny_user_id, family_user_id)
);

ALTER TABLE public.nanny_references ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view references
CREATE POLICY "References are viewable by authenticated"
  ON public.nanny_references FOR SELECT
  TO authenticated
  USING (true);

-- Families can create references
CREATE POLICY "Families can create references"
  ON public.nanny_references FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = family_user_id);

-- Families can update their own references
CREATE POLICY "Families can update own references"
  ON public.nanny_references FOR UPDATE
  TO authenticated
  USING (auth.uid() = family_user_id);

-- Families can delete their own references
CREATE POLICY "Families can delete own references"
  ON public.nanny_references FOR DELETE
  TO authenticated
  USING (auth.uid() = family_user_id);
