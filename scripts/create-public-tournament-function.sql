-- Create a function to get tournament by registration_id (bypasses RLS)
-- This allows public access to tournament details via registration link
-- Run this in your Supabase SQL editor

-- Drop function if exists
DROP FUNCTION IF EXISTS public.get_tournament_by_registration_id(text);

-- Create function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_tournament_by_registration_id(reg_id text)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  date date,
  location text,
  club_id uuid,
  organizer_id text,
  public_id text,
  teams_locked boolean,
  format_id text,
  level text,
  start_time time,
  number_of_courts integer,
  number_of_teams integer,
  conditions text,
  type text,
  bracket jsonb,
  format_json jsonb,
  random_assignments jsonb,
  registration_enabled boolean,
  registration_id text,
  registration_selection_mode text,
  registration_waitlist_size integer,
  registration_allow_partner_change boolean,
  registration_deadline date,
  registration_modification_deadline date,
  registration_payment_enabled boolean,
  registration_auto_confirm boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.owner_id,
    t.name,
    t.date,
    t.location,
    t.club_id,
    t.organizer_id,
    t.public_id,
    t.teams_locked,
    t.format_id,
    t.level::text,
    t.start_time,
    t.number_of_courts,
    t.number_of_teams,
    t.conditions::text,
    t.type::text,
    t.bracket,
    t.format_json,
    t.random_assignments,
    t.registration_enabled,
    t.registration_id,
    t.registration_selection_mode,
    t.registration_waitlist_size,
    t.registration_allow_partner_change,
    t.registration_deadline,
    t.registration_modification_deadline,
    t.registration_payment_enabled,
    t.registration_auto_confirm,
    t.created_at,
    t.updated_at
  FROM public.tournaments t
  WHERE t.registration_id = reg_id
    AND t.registration_enabled = true;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_tournament_by_registration_id(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tournament_by_registration_id(text) TO authenticated;

-- Test the function
-- SELECT * FROM public.get_tournament_by_registration_id('dfc2fe4e79a948aa');

