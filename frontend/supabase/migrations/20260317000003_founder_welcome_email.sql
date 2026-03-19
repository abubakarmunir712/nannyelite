-- Migration: Add founder welcome email on signup
-- Date: 2026-03-17
-- Purpose: Send welcome email to new users introducing the platform

-- ============================================================================
-- Create function to queue welcome email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  user_role text;
BEGIN
  -- Get user details
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'there');
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'family');
  
  -- Queue welcome email using pgmq (if available)
  -- The email will be processed by the process-email-queue edge function
  BEGIN
    PERFORM pgmq.send(
      'transactional_emails',
      jsonb_build_object(
        'to', NEW.email,
        'from', 'NannyElite <hello@nannyelite.ch>',
        'subject', 'Welcome to NannyElite – Your Swiss Childcare Partner',
        'html', format(
          '<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e; margin-bottom: 20px;">Welcome to NannyElite, %s!</h1>
            
            <p style="color: #444; line-height: 1.6;">
              Thank you for joining Switzerland''s trusted childcare marketplace. We''re excited to have you!
            </p>
            
            <p style="color: #444; line-height: 1.6;">
              %s
            </p>
            
            <p style="color: #444; line-height: 1.6;">
              <strong>Need help getting started?</strong><br>
              I personally review every profile and match. If you have questions or need assistance finding the perfect fit, 
              just reply to this email – I''d love to help.
            </p>
            
            <p style="color: #444; line-height: 1.6; margin-top: 30px;">
              Warm regards,<br>
              <strong>The NannyElite Team</strong><br>
              <span style="color: #666; font-size: 14px;">Founder & Matchmaker</span>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px;">
              NannyElite – Premium Childcare in Switzerland<br>
              <a href="https://nannyelite.ch" style="color: #666;">nannyelite.ch</a>
            </p>
          </div>',
          user_name,
          CASE 
            WHEN user_role = 'nanny' THEN 
              'As a nanny, you can now:<br>
              • Complete your profile to get discovered by families<br>
              • Browse and apply to job opportunities<br>
              • Showcase your experience and certifications'
            ELSE 
              'As a family, you can now:<br>
              • Browse verified nanny profiles<br>
              • Post job listings for your childcare needs<br>
              • Connect with trusted professionals'
          END
        ),
        'text', format(
          'Welcome to NannyElite, %s!\n\n' ||
          'Thank you for joining Switzerland''s trusted childcare marketplace.\n\n' ||
          'Need help? Just reply to this email – I''d love to assist.\n\n' ||
          'Warm regards,\nThe NannyElite Team',
          user_name
        ),
        'purpose', 'transactional',
        'label', 'welcome_email',
        'run_id', gen_random_uuid()::text,
        'message_id', gen_random_uuid()::text,
        'queued_at', now()::text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- If pgmq is not available, log and continue (don't fail signup)
    RAISE WARNING 'Could not queue welcome email: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Create trigger for welcome email (runs after profile creation)
-- ============================================================================

DROP TRIGGER IF EXISTS send_welcome_email ON auth.users;
CREATE TRIGGER send_welcome_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_welcome_email();

-- ============================================================================
-- Note: The welcome email is queued to the 'transactional_emails' pgmq queue
-- and will be processed by the existing process-email-queue edge function.
-- 
-- If pgmq is not set up, the trigger will silently skip email sending.
-- ============================================================================
