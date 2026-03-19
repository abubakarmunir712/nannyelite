
-- Jobs table for family job postings
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  service_type text NOT NULL,
  location text,
  schedule text,
  hourly_rate numeric,
  currency text DEFAULT 'EUR',
  number_of_children integer DEFAULT 1,
  children_ages text,
  requirements text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Job applications table
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  nanny_user_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, nanny_user_id)
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Jobs RLS policies
CREATE POLICY "Anyone authenticated can view open jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Families can create jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_user_id);

CREATE POLICY "Families can update own jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (auth.uid() = family_user_id);

CREATE POLICY "Families can delete own jobs" ON public.jobs
  FOR DELETE TO authenticated USING (auth.uid() = family_user_id);

-- Job applications RLS policies
CREATE POLICY "Job poster can view applications" ON public.job_applications
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_applications.job_id AND jobs.family_user_id = auth.uid())
    OR auth.uid() = nanny_user_id
  );

CREATE POLICY "Nannies can apply to jobs" ON public.job_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = nanny_user_id);

CREATE POLICY "Application owner or job poster can update" ON public.job_applications
  FOR UPDATE TO authenticated USING (
    auth.uid() = nanny_user_id
    OR EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_applications.job_id AND jobs.family_user_id = auth.uid())
  );

-- Updated_at trigger for jobs
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for job_applications
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for job applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;
