
-- Step 1: Add moderation columns to nanny_references
ALTER TABLE public.nanny_references 
ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified_interaction boolean NOT NULL DEFAULT false;

-- Step 2: Add unique constraint (one review per family per nanny)
ALTER TABLE public.nanny_references 
ADD CONSTRAINT unique_family_nanny_review UNIQUE (nanny_user_id, family_user_id);

-- Step 3: Add aggregated rating columns to nanny_profiles
ALTER TABLE public.nanny_profiles
ADD COLUMN IF NOT EXISTS avg_rating numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_reviews integer NOT NULL DEFAULT 0;

-- Step 4: Create a function to recalculate nanny ratings
CREATE OR REPLACE FUNCTION public.recalculate_nanny_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nanny_profiles
  SET 
    avg_rating = sub.avg_rating,
    total_reviews = sub.total_reviews
  FROM (
    SELECT 
      nanny_user_id,
      ROUND(AVG(rating)::numeric, 1) as avg_rating,
      COUNT(*) as total_reviews
    FROM public.nanny_references
    WHERE is_flagged = false
    GROUP BY nanny_user_id
  ) sub
  WHERE nanny_profiles.user_id = sub.nanny_user_id;

  -- Handle case where all reviews are deleted/flagged
  UPDATE public.nanny_profiles
  SET avg_rating = NULL, total_reviews = 0
  WHERE user_id = COALESCE(NEW.nanny_user_id, OLD.nanny_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.nanny_references 
      WHERE nanny_user_id = COALESCE(NEW.nanny_user_id, OLD.nanny_user_id) 
        AND is_flagged = false
    );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 5: Create trigger to auto-recalculate on reference changes
CREATE TRIGGER trg_recalculate_nanny_rating
AFTER INSERT OR UPDATE OR DELETE ON public.nanny_references
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_nanny_rating();

-- Step 6: Create eligibility check function
CREATE OR REPLACE FUNCTION public.can_review_nanny(_family_id uuid, _nanny_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.messages m ON m.conversation_id = c.id
    WHERE c.family_user_id = _family_id
      AND c.nanny_user_id = _nanny_id
    GROUP BY c.id
    HAVING COUNT(m.id) >= 5
  )
$$;

-- Step 7: Add RLS policy for moderation (admin can update all references)
CREATE POLICY "Admins can update all references"
ON public.nanny_references
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 8: Backfill existing aggregated ratings
UPDATE public.nanny_profiles np
SET 
  avg_rating = sub.avg_rating,
  total_reviews = sub.total_reviews
FROM (
  SELECT 
    nanny_user_id,
    ROUND(AVG(rating)::numeric, 1) as avg_rating,
    COUNT(*) as total_reviews
  FROM public.nanny_references
  WHERE is_flagged = false
  GROUP BY nanny_user_id
) sub
WHERE np.user_id = sub.nanny_user_id;

-- Step 9: Add index for performance
CREATE INDEX IF NOT EXISTS idx_nanny_references_nanny_user_id ON public.nanny_references(nanny_user_id);
CREATE INDEX IF NOT EXISTS idx_nanny_profiles_avg_rating ON public.nanny_profiles(avg_rating) WHERE avg_rating IS NOT NULL;
