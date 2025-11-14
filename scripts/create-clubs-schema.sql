-- Schema for Clubs Management
-- Run this in your Supabase SQL editor

-- Table: clubs
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  website text NULL,
  instagram text NULL,
  facebook text NULL,
  manager text NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: club_courts (terrains)
CREATE TABLE IF NOT EXISTS public.club_courts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  court_number integer NOT NULL,
  court_name text NULL,
  court_type text NOT NULL CHECK (court_type IN ('inside', 'outside', 'covered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (club_id, court_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clubs_owner_id ON public.clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_club_courts_club_id ON public.club_courts(club_id);

-- Enable RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_courts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clubs
-- Users can view their own clubs
CREATE POLICY "Users can view their own clubs"
  ON public.clubs
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can insert their own clubs
CREATE POLICY "Users can insert their own clubs"
  ON public.clubs
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own clubs
CREATE POLICY "Users can update their own clubs"
  ON public.clubs
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own clubs
CREATE POLICY "Users can delete their own clubs"
  ON public.clubs
  FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for club_courts
-- Users can view courts of their own clubs
CREATE POLICY "Users can view courts of their own clubs"
  ON public.club_courts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_courts.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- Users can insert courts for their own clubs
CREATE POLICY "Users can insert courts for their own clubs"
  ON public.club_courts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_courts.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- Users can update courts of their own clubs
CREATE POLICY "Users can update courts of their own clubs"
  ON public.club_courts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_courts.club_id
      AND clubs.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_courts.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- Users can delete courts of their own clubs
CREATE POLICY "Users can delete courts of their own clubs"
  ON public.club_courts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_courts.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_courts_updated_at BEFORE UPDATE ON public.club_courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

