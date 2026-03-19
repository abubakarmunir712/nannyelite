-- Migration: Update job_applications status field
-- Date: 2026-03-17
-- Purpose: Update default status and add CHECK constraint for application workflow

-- ============================================================================
-- PART 1: Update default status from 'pending' to 'pending_review'
-- ============================================================================

ALTER TABLE public.job_applications 
ALTER COLUMN status SET DEFAULT 'pending_review';

-- Update any existing 'pending' status records to 'pending_review'
UPDATE public.job_applications 
SET status = 'pending_review' 
WHERE status = 'pending';

-- ============================================================================
-- PART 2: Add CHECK constraint for allowed status values
-- ============================================================================
-- 
-- Allowed statuses:
--   - pending_review: Initial status when nanny applies (awaiting admin action)
--   - sent_to_family: Application approved and sent to registered family user
--   - sent_to_external_family: Application approved, notification sent to info@nannyelite.ch
--                              (for jobs with source = 'platform' or 'partner')
--   - redirected: Application redirected, nanny notified of potential other opportunities
--   - rejected: Application not suitable
--
-- Using CHECK constraint instead of ENUM for flexibility to add new statuses later
-- ============================================================================

ALTER TABLE public.job_applications 
ADD CONSTRAINT job_applications_status_check 
CHECK (status IN (
  'pending_review',
  'sent_to_family', 
  'sent_to_external_family',
  'redirected',
  'rejected'
));

-- ============================================================================
-- DOCUMENTATION: Application Routing Logic (handled in application code)
-- ============================================================================
--
-- When admin approves an application:
--
-- IF job.job_source = 'family':
--   → Send application to the registered family user
--   → Set status = 'sent_to_family'
--
-- IF job.job_source = 'platform' OR job.job_source = 'partner':
--   → Send notification email to info@nannyelite.ch
--   → Admin manually introduces nanny to external family
--   → Set status = 'sent_to_external_family'
--
-- Redirect action:
--   → Send message to nanny about potential other opportunities
--   → Set status = 'redirected'
--
-- Reject action:
--   → Application not suitable
--   → Set status = 'rejected'
--
-- NOTE: This routing logic is implemented in the frontend/application layer,
-- NOT via database triggers. The database only stores the status value.
-- ============================================================================
