-- Allow registered users to read tournaments they are registered for
-- This policy allows users who have a registration for a tournament to read that tournament

CREATE POLICY IF NOT EXISTS "Registered users can read tournaments they are registered for"
ON public.tournaments
FOR SELECT
USING (
  -- Owner can always read
  owner_id = auth.uid()
  OR
  -- Registered users can read
  EXISTS (
    SELECT 1
    FROM public.tournament_registrations
    WHERE tournament_registrations.tournament_id = tournaments.id
    AND tournament_registrations.user_id = auth.uid()
  )
);

