
-- Performance indexes for launch readiness

-- nanny_profiles: location-based queries
CREATE INDEX IF NOT EXISTS idx_nanny_profiles_location ON public.nanny_profiles (latitude, longitude) WHERE profile_visible = true AND profile_status = 'approved';

-- nanny_profiles: availability and rate filtering
CREATE INDEX IF NOT EXISTS idx_nanny_profiles_rates ON public.nanny_profiles (hourly_rate_recurring, hourly_rate_spot) WHERE profile_visible = true;

-- nanny_profiles: user lookup
CREATE INDEX IF NOT EXISTS idx_nanny_profiles_user_id ON public.nanny_profiles (user_id);

-- jobs: location and date filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON public.jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs (location) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_jobs_family_user ON public.jobs (family_user_id);

-- messages: conversation lookup (critical for messaging performance)
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages (conversation_id, read, sender_id) WHERE read = false;

-- bookings: user lookups
CREATE INDEX IF NOT EXISTS idx_bookings_nanny ON public.bookings (nanny_user_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_family ON public.bookings (family_user_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status) WHERE status = 'pending';

-- conversations: user lookups
CREATE INDEX IF NOT EXISTS idx_conversations_family ON public.conversations (family_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_nanny ON public.conversations (nanny_user_id, last_message_at DESC);

-- profiles: role and user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_nanny ON public.job_applications (nanny_user_id);

-- nanny_photos: user primary photo lookup
CREATE INDEX IF NOT EXISTS idx_nanny_photos_user_primary ON public.nanny_photos (user_id) WHERE is_primary = true;

-- activity_log: user feed
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log (user_id, created_at DESC);

-- notifications: user feed
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, read, created_at DESC);

-- Default currency to CHF for existing and new nanny profiles
UPDATE public.nanny_profiles SET currency = 'CHF' WHERE currency = 'EUR' OR currency IS NULL;
ALTER TABLE public.nanny_profiles ALTER COLUMN currency SET DEFAULT 'CHF';

-- Default currency to CHF for jobs
UPDATE public.jobs SET currency = 'CHF' WHERE currency = 'EUR' OR currency IS NULL;
ALTER TABLE public.jobs ALTER COLUMN currency SET DEFAULT 'CHF';
