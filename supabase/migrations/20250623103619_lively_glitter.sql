/*
  # PadelFlow Database Schema

  ## Overview
  This migration creates the complete database schema for PadelFlow, a padel tournament management system.

  ## Tables Created
  1. **tournaments** - Main tournament information
  2. **players** - Player database with license numbers and rankings  
  3. **teams** - Teams with calculated weights
  4. **tournament_teams** - Junction table linking teams to tournaments
  5. **team_players** - Junction table linking players to teams
  6. **formats** - Tournament formats (admin-managed)
  7. **matches** - Generated matches with scores and scheduling

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies for authenticated users to manage their own data
  - Public read access for tournament viewing
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  date date NOT NULL,
  location text NOT NULL,
  organizer_id text NOT NULL, -- Clerk user ID
  public_id text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  teams_locked boolean DEFAULT false,
  format_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_number text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  ranking integer NOT NULL DEFAULT 0,
  email text,
  phone text,
  organizer_id text NOT NULL, -- Clerk user ID who created this player
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  weight integer DEFAULT 0, -- Sum of players' rankings
  seed_number integer, -- TS1, TS2, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tournament teams junction table
CREATE TABLE IF NOT EXISTS tournament_teams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

-- Team players junction table
CREATE TABLE IF NOT EXISTS team_players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, player_id)
);

-- Formats table (admin-managed)
CREATE TABLE IF NOT EXISTS formats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  min_teams integer NOT NULL,
  max_teams integer NOT NULL,
  is_public boolean DEFAULT true,
  bracket_structure jsonb, -- Stores the bracket logic
  created_at timestamptz DEFAULT now()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  round text NOT NULL, -- "1/4", "Final", "5th place", etc.
  team_1_id uuid REFERENCES teams(id),
  team_2_id uuid REFERENCES teams(id),
  winner_team_id uuid REFERENCES teams(id),
  score text, -- "6-4, 6-2" format
  order_index integer NOT NULL DEFAULT 0,
  terrain_number integer,
  match_type text DEFAULT 'main', -- 'main' or 'classification'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert sample formats
INSERT INTO formats (name, description, min_teams, max_teams, is_public, bracket_structure) VALUES
('8 Teams Tournament', 'Standard 8-team bracket with classification matches', 8, 8, true, '{"type": "single_elimination", "classification": true}'),
('16 Teams Tournament', 'Standard 16-team bracket with classification matches', 16, 16, true, '{"type": "single_elimination", "classification": true}'),
('12 Teams Tournament', 'Modified 12-team format with byes', 12, 12, true, '{"type": "single_elimination_with_byes", "classification": true}');

-- Enable RLS on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Tournaments policies
CREATE POLICY "Organizers can manage their tournaments"
  ON tournaments
  FOR ALL
  TO authenticated
  USING (organizer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Public can view tournaments"
  ON tournaments
  FOR SELECT
  TO anon
  USING (true);

-- Players policies
CREATE POLICY "Organizers can manage their players"
  ON players
  FOR ALL
  TO authenticated
  USING (organizer_id = auth.jwt() ->> 'sub');

-- Teams policies
CREATE POLICY "Authenticated users can manage teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Public can view teams"
  ON teams
  FOR SELECT
  TO anon
  USING (true);

-- Tournament teams policies
CREATE POLICY "Authenticated users can manage tournament teams"
  ON tournament_teams
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Public can view tournament teams"
  ON tournament_teams
  FOR SELECT
  TO anon
  USING (true);

-- Team players policies
CREATE POLICY "Authenticated users can manage team players"
  ON team_players
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Public can view team players"
  ON team_players
  FOR SELECT
  TO anon
  USING (true);

-- Formats policies
CREATE POLICY "Anyone can view public formats"
  ON formats
  FOR SELECT
  USING (is_public = true);

-- Matches policies
CREATE POLICY "Authenticated users can manage matches"
  ON matches
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Public can view matches"
  ON matches
  FOR SELECT
  TO anon
  USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_public_id ON tournaments(public_id);
CREATE INDEX IF NOT EXISTS idx_players_organizer ON players(organizer_id);
CREATE INDEX IF NOT EXISTS idx_players_license ON players(license_number);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_order ON matches(order_index);