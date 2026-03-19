
-- Helper: check if two users share a booking (family <-> nanny)
CREATE OR REPLACE FUNCTION public.has_booking_with(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE (family_user_id = _user_a AND nanny_user_id = _user_b)
       OR (family_user_id = _user_b AND nanny_user_id = _user_a)
  )
$$;

-- Helper: check if user has any admin-level role
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator', 'support')
  )
$$;

-- ============================================================
-- 1. PROFILES TABLE: Remove anon access, keep authenticated
-- ============================================================
DROP POLICY IF EXISTS "Profiles viewable by anyone" ON public.profiles;

-- ============================================================
-- 2. NANNY_PROFILES: Restrict so hidden/rejected not readable
-- ============================================================
DROP POLICY IF EXISTS "Nanny profiles viewable by anyone" ON public.nanny_profiles;
DROP POLICY IF EXISTS "Nanny profiles viewable by authenticated" ON public.nanny_profiles;

-- Anon can only see visible + approved
CREATE POLICY "Anon can view visible approved nanny profiles"
  ON public.nanny_profiles FOR SELECT TO anon
  USING (profile_visible = true AND profile_status = 'approved');

-- Authenticated: see visible+approved, own profile, or admin access
CREATE POLICY "Auth can view nanny profiles with restrictions"
  ON public.nanny_profiles FOR SELECT TO authenticated
  USING (
    (profile_visible = true AND profile_status = 'approved')
    OR auth.uid() = user_id
    OR public.has_admin_access(auth.uid())
  );

-- ============================================================
-- 3. CHILDREN: Only owning family, booked nanny, or admin
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view children" ON public.children;

CREATE POLICY "Restricted children read access"
  ON public.children FOR SELECT TO authenticated
  USING (
    auth.uid() = family_user_id
    OR public.has_booking_with(auth.uid(), family_user_id)
    OR public.has_admin_access(auth.uid())
  );

-- ============================================================
-- 4. FAMILY_PROFILES: Only owner, booked nanny, or admin
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view family profiles" ON public.family_profiles;

CREATE POLICY "Restricted family_profiles read access"
  ON public.family_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_booking_with(auth.uid(), user_id)
    OR public.has_admin_access(auth.uid())
  );

-- ============================================================
-- 5. PUBLIC VIEW for anon nanny browsing (no email/phone/address)
-- ============================================================
CREATE OR REPLACE VIEW public.nanny_profiles_public AS
SELECT 
  np.user_id,
  p.full_name,
  p.avatar_url,
  p.languages,
  np.city,
  np.country,
  np.state,
  np.years_of_experience,
  np.hourly_rate_spot,
  np.hourly_rate_recurring,
  np.babysitting_rate_chf,
  np.part_time_childcare_rate_chf,
  np.avg_rating,
  np.total_reviews,
  np.bio,
  np.ai_generated_description,
  np.offers_date_night,
  np.offers_overnight,
  np.offers_after_school,
  np.offers_weekend_holiday,
  np.offers_full_time,
  np.offers_part_time,
  np.caregiver_types,
  np.has_first_aid,
  np.has_cpr,
  np.id_verified,
  np.background_check_passed,
  np.experience_infants,
  np.experience_toddlers,
  np.experience_preschool,
  np.experience_school_age,
  np.experience_teenagers,
  np.experience_special_needs,
  np.activities_offered,
  np.latitude,
  np.longitude,
  np.work_radius_km,
  np.gender,
  np.nationality,
  np.smoking_status,
  np.can_drive,
  np.has_drivers_license,
  np.has_car,
  np.comfortable_with_pets,
  np.can_cook,
  np.can_help_homework,
  np.can_do_light_housekeeping,
  np.has_early_childhood_cert,
  np.has_child_psychology,
  np.has_nutrition_cert,
  np.has_montessori_cert,
  np.education,
  np.video_intro_url,
  np.voice_intro_url,
  np.profile_status,
  np.currency
FROM public.nanny_profiles np
JOIN public.profiles p ON p.user_id = np.user_id
WHERE np.profile_visible = true
  AND np.profile_status = 'approved';

-- Grant access to the view
GRANT SELECT ON public.nanny_profiles_public TO anon;
GRANT SELECT ON public.nanny_profiles_public TO authenticated;

-- ============================================================
-- 6. AVAILABILITY_SLOTS: Also allow anon read (for public profiles)
-- ============================================================
-- Already has anon-safe data (just day/period), keep as is
