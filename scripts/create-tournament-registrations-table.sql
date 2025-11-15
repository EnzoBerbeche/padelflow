-- Migration: Create tournament_registrations table
-- This table stores team registrations for tournaments via public registration links
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  registration_id text NOT NULL, -- The registration_id from tournaments table
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Player 1 (the user who registered)
  player1_first_name text NOT NULL,
  player1_last_name text NOT NULL,
  player1_license_number text NOT NULL,
  player1_ranking integer NULL, -- Optional if mode is 'order', required if 'ranking'
  player1_phone text NULL,
  player1_email text NOT NULL,
  
  -- Player 2 (partner)
  player2_first_name text NOT NULL,
  player2_last_name text NOT NULL,
  player2_license_number text NOT NULL,
  player2_ranking integer NULL, -- Optional if mode is 'order', required if 'ranking'
  player2_phone text NULL,
  player2_email text NOT NULL,
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'waitlist', 'cancelled')),
  confirmed_at timestamptz NULL,
  confirmed_by uuid NULL REFERENCES auth.users(id),
  
  -- Payment (if enabled)
  payment_status text NULL CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_id text NULL,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_registration_id ON public.tournament_registrations(registration_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user_id ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_status ON public.tournament_registrations(status);

-- Create unique constraint: one registration per user per tournament
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_registrations_unique_user_tournament 
ON public.tournament_registrations(tournament_id, user_id);

-- Enable RLS
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own registrations
CREATE POLICY "Users can read their own registrations"
ON public.tournament_registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own registrations (public registration)
CREATE POLICY "Users can insert their own registrations"
ON public.tournament_registrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own registrations (if modification is allowed)
CREATE POLICY "Users can update their own registrations"
ON public.tournament_registrations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Tournament owners can read all registrations for their tournaments
CREATE POLICY "Tournament owners can read registrations"
ON public.tournament_registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = tournament_registrations.tournament_id
    AND tournaments.owner_id = auth.uid()
  )
);

-- Tournament owners can update registrations for their tournaments
CREATE POLICY "Tournament owners can update registrations"
ON public.tournament_registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = tournament_registrations.tournament_id
    AND tournaments.owner_id = auth.uid()
  )
);

-- Add comments
COMMENT ON TABLE public.tournament_registrations IS 'Team registrations for tournaments via public registration links';
COMMENT ON COLUMN public.tournament_registrations.status IS 'Registration status: pending (awaiting confirmation), confirmed, rejected, waitlist, cancelled';
COMMENT ON COLUMN public.tournament_registrations.player1_ranking IS 'Player 1 ranking - optional if selection mode is order, required if ranking';
COMMENT ON COLUMN public.tournament_registrations.player2_ranking IS 'Player 2 ranking - optional if selection mode is order, required if ranking';

