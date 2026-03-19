
-- Drop the security-definer view and recreate with security_invoker
DROP VIEW IF EXISTS public.nanny_profiles_public;

-- Create as security invoker view
CREATE VIEW public.nanny_profiles_public
WITH (security_invoker = on) AS
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

GRANT SELECT ON public.nanny_profiles_public TO anon;
GRANT SELECT ON public.nanny_profiles_public TO authenticated;
