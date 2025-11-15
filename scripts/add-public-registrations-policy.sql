-- Allow public read access to tournament registrations for tournaments with active registration
-- This policy allows anyone to read registrations for tournaments where registration_enabled = true

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Public can read registrations for tournaments with active registration" ON public.tournament_registrations;

-- Create the policy
CREATE POLICY "Public can read registrations for tournaments with active registration"
ON public.tournament_registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tournaments
    WHERE tournaments.id = tournament_registrations.tournament_id
    AND tournaments.registration_enabled = true
    AND tournaments.registration_id IS NOT NULL
  )
);

