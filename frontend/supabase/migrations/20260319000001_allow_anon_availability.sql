-- Migration: Allow anon access to availability_slots
-- Date: 2026-03-19

-- Allow anyone (including anonymous users) to view availability slots
-- This is necessary for public nanny profiles to show their schedule to guests
DROP POLICY IF EXISTS "Availability slots viewable by authenticated" ON public.availability_slots;

CREATE POLICY "Availability slots viewable by everyone" 
  ON public.availability_slots 
  FOR SELECT 
  TO public
  USING (true);
