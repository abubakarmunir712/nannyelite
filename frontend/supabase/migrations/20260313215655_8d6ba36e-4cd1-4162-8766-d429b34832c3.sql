
-- Earnings/payments tracking table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  family_user_id UUID NOT NULL,
  nanny_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CHF',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_type TEXT NOT NULL DEFAULT 'service',
  description TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Families can view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = family_user_id);

CREATE POLICY "Nannies can view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = nanny_user_id);

CREATE POLICY "Families can create payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = family_user_id);

CREATE POLICY "Families can update own payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (auth.uid() = family_user_id);
