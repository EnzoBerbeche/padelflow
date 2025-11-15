-- Migration: Add registration settings to tournaments table
-- This enables tournament registration links with configurable settings
-- Run this in your Supabase SQL editor

-- Check if registration columns already exist and use existing ones if they do
-- If registration_enabled exists, we'll use it; if registration_link_id exists, we'll use it as registration_id

-- Add registration columns (using IF NOT EXISTS to avoid errors if they already exist)
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS registration_enabled boolean NOT NULL DEFAULT false;

-- Handle registration_id: check if registration_link_id exists, if so rename it, otherwise create registration_id
DO $$
BEGIN
  -- Check if registration_link_id exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournaments' 
    AND column_name = 'registration_link_id'
  ) THEN
    -- Rename registration_link_id to registration_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tournaments' 
      AND column_name = 'registration_id'
    ) THEN
      ALTER TABLE public.tournaments RENAME COLUMN registration_link_id TO registration_id;
    END IF;
  ELSE
    -- Create registration_id if neither exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tournaments' 
      AND column_name = 'registration_id'
    ) THEN
      ALTER TABLE public.tournaments ADD COLUMN registration_id text NULL UNIQUE;
    END IF;
  END IF;
END $$;

-- Add remaining registration columns
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS registration_selection_mode text NULL CHECK (registration_selection_mode IN ('order', 'ranking')),
ADD COLUMN IF NOT EXISTS registration_waitlist_size integer NULL,
ADD COLUMN IF NOT EXISTS registration_allow_partner_change boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS registration_deadline date NULL,
ADD COLUMN IF NOT EXISTS registration_modification_deadline date NULL,
ADD COLUMN IF NOT EXISTS registration_payment_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_auto_confirm boolean NOT NULL DEFAULT true;

-- Generate unique registration_id for existing tournaments (if needed)
-- This will be done automatically for new tournaments via trigger or application logic

-- Add index for registration_id lookups
CREATE INDEX IF NOT EXISTS idx_tournaments_registration_id ON public.tournaments(registration_id) WHERE registration_id IS NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN public.tournaments.registration_enabled IS 'Whether the registration link is currently active';
COMMENT ON COLUMN public.tournaments.registration_id IS 'Unique permanent ID for the registration link (generated once, never changes)';
COMMENT ON COLUMN public.tournaments.registration_selection_mode IS 'How to select participants: order (first come first served) or ranking (best ranked teams)';
COMMENT ON COLUMN public.tournaments.registration_waitlist_size IS 'Maximum number of teams on the waitlist (default: half of number_of_teams)';
COMMENT ON COLUMN public.tournaments.registration_allow_partner_change IS 'Whether registered teams can change their partner';
COMMENT ON COLUMN public.tournaments.registration_deadline IS 'Deadline for new registrations';
COMMENT ON COLUMN public.tournaments.registration_modification_deadline IS 'Deadline for modifying existing registrations';
COMMENT ON COLUMN public.tournaments.registration_payment_enabled IS 'Whether payment is required for registration';
COMMENT ON COLUMN public.tournaments.registration_auto_confirm IS 'Whether registrations are automatically confirmed (true) or require manual approval (false)';

-- Add public RLS policy to allow reading tournaments with active registration
-- This allows anyone to view tournament details via registration link
CREATE POLICY "Public can read tournaments with active registration"
ON public.tournaments
FOR SELECT
USING (
  registration_enabled = true 
  AND registration_id IS NOT NULL
);

