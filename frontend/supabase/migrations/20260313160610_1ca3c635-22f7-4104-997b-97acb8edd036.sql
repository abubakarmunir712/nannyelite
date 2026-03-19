
-- Bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nanny_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  booking_date date NOT NULL,
  start_time time,
  end_time time,
  number_of_children integer DEFAULT 1,
  children_ages text,
  special_instructions text,
  service_type text, -- date_night, overnight, after_school, weekend_holiday, full_time, part_time
  hourly_rate numeric(8,2),
  total_amount numeric(8,2),
  cancelled_by uuid,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Families can view own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = family_user_id);

CREATE POLICY "Nannies can view their bookings" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = nanny_user_id);

CREATE POLICY "Families can create bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_user_id);

CREATE POLICY "Families can update own bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (auth.uid() = family_user_id);

CREATE POLICY "Nannies can update their bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (auth.uid() = nanny_user_id);

-- Favorite nannies table
CREATE TABLE public.favorite_nannies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nanny_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_user_id, nanny_user_id)
);

ALTER TABLE public.favorite_nannies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Families can view own favorites" ON public.favorite_nannies
  FOR SELECT TO authenticated USING (auth.uid() = family_user_id);

CREATE POLICY "Families can add favorites" ON public.favorite_nannies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_user_id);

CREATE POLICY "Families can remove favorites" ON public.favorite_nannies
  FOR DELETE TO authenticated USING (auth.uid() = family_user_id);

-- Activity log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- booking_created, booking_confirmed, booking_cancelled, favorite_added, profile_updated
  title text NOT NULL,
  description text,
  related_user_id uuid,
  related_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON public.activity_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-log booking creation
CREATE OR REPLACE FUNCTION public.log_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, activity_type, title, description, related_booking_id, related_user_id)
  VALUES (
    NEW.family_user_id,
    'booking_created',
    'New booking request',
    'You requested a booking for ' || NEW.booking_date::text,
    NEW.id,
    NEW.nanny_user_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_created();

-- Auto-log favorite added
CREATE OR REPLACE FUNCTION public.log_favorite_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, activity_type, title, description, related_user_id)
  VALUES (
    NEW.family_user_id,
    'favorite_added',
    'Added a nanny to favorites',
    'You saved a nanny to your favorites list',
    NEW.nanny_user_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_favorite_added
  AFTER INSERT ON public.favorite_nannies
  FOR EACH ROW EXECUTE FUNCTION public.log_favorite_added();
