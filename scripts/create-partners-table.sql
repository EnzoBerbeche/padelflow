-- Migration: Create partners table
-- This table stores saved partners for users to reuse in tournament registrations
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Partner information
  first_name text NOT NULL,
  last_name text NOT NULL,
  license_number text NOT NULL,
  phone text NULL,
  email text NOT NULL,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);

-- Create unique constraint: one partner per user per license number
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_unique_user_license 
ON public.partners(user_id, license_number);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own partners
CREATE POLICY "Users can read their own partners"
ON public.partners
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own partners
CREATE POLICY "Users can insert their own partners"
ON public.partners
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own partners
CREATE POLICY "Users can update their own partners"
ON public.partners
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own partners
CREATE POLICY "Users can delete their own partners"
ON public.partners
FOR DELETE
USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.partners IS 'Saved partners for users to reuse in tournament registrations';
COMMENT ON COLUMN public.partners.license_number IS 'Partner license number (unique per user)';

