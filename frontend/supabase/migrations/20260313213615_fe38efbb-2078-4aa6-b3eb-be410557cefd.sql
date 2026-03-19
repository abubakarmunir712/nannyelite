
-- Tighten the INSERT policy - only allow system/trigger inserts by restricting to own user_id
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can receive notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
