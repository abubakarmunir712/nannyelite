
-- Table for nanny-provided professional references (not parent reviews)
CREATE TABLE public.nanny_self_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_name TEXT NOT NULL,
  relationship TEXT,
  service_period TEXT,
  testimonial TEXT,
  reference_letter_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nanny_self_references ENABLE ROW LEVEL SECURITY;

-- Nannies can manage their own references
CREATE POLICY "Nannies can insert own references"
  ON public.nanny_self_references FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nannies can update own references"
  ON public.nanny_self_references FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Nannies can delete own references"
  ON public.nanny_self_references FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Nannies can view own references"
  ON public.nanny_self_references FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view references"
  ON public.nanny_self_references FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view references"
  ON public.nanny_self_references FOR SELECT TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_nanny_self_references_updated_at
  BEFORE UPDATE ON public.nanny_self_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
