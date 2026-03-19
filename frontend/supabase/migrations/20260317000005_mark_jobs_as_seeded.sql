-- Migration: Mark all existing jobs as seeded (platform)
-- Date: 2026-03-17
-- Purpose: All current jobs are demo/seeded data, not real family postings

-- Update all existing jobs to have job_source = 'platform'
UPDATE public.jobs 
SET job_source = 'platform'
WHERE job_source = 'family' OR job_source IS NULL;

-- Verify the update
-- SELECT job_source, COUNT(*) FROM public.jobs GROUP BY job_source;
