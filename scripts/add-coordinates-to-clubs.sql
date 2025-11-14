-- Migration script: Add latitude and longitude columns to clubs table
-- Run this in your Supabase SQL editor if the clubs table already exists

-- Add latitude and longitude columns
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS latitude numeric(10, 8) NULL,
ADD COLUMN IF NOT EXISTS longitude numeric(11, 8) NULL;

-- Create index for geospatial queries (useful for distance searches)
CREATE INDEX IF NOT EXISTS idx_clubs_location ON public.clubs USING GIST (
  point(longitude, latitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

