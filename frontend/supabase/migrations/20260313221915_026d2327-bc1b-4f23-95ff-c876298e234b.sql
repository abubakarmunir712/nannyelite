
-- Allow public (anon) to view nanny profiles
CREATE POLICY "Nanny profiles viewable by anyone"
ON public.nanny_profiles
FOR SELECT
TO anon
USING (profile_visible = true);

-- Allow public (anon) to view profiles
CREATE POLICY "Profiles viewable by anyone"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Allow public (anon) to view nanny photos
CREATE POLICY "Nanny photos viewable by anyone"
ON public.nanny_photos
FOR SELECT
TO anon
USING (true);

-- Allow public (anon) to view nanny references
CREATE POLICY "References viewable by anyone"
ON public.nanny_references
FOR SELECT
TO anon
USING (true);
