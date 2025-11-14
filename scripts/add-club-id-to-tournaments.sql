-- Migration: Add club_id to tournaments table
-- This creates a relationship between tournaments and clubs
-- Run this in your Supabase SQL editor

-- Add club_id column (nullable for now to allow existing tournaments)
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS club_id uuid NULL REFERENCES public.clubs(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tournaments_club_id ON public.tournaments(club_id);

-- Add index for location-based searches (if not exists)
CREATE INDEX IF NOT EXISTS idx_tournaments_location ON public.tournaments(location);

-- Optional: Update existing tournaments to link them to clubs by matching address
-- This is a one-time migration for existing data
-- Uncomment and run if you have existing tournaments that should be linked
/*
UPDATE public.tournaments t
SET club_id = c.id
FROM public.clubs c
WHERE t.location = c.address
  AND t.club_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.clubs
    WHERE address = t.location
    LIMIT 1
  );
*/

-- Add comment to document the column
COMMENT ON COLUMN public.tournaments.club_id IS 'Reference to the club where the tournament takes place. Used for club-based searches and geolocation.';

