-- National Players table for CSV imports
CREATE TABLE IF NOT EXISTS national_players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  license_number text NOT NULL,
  ranking integer NOT NULL,
  best_ranking integer NOT NULL,
  points integer NOT NULL,
  club text NOT NULL,
  league text NOT NULL,
  birth_year integer NOT NULL,
  nationality text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('men', 'women')),
  tournaments_count integer NOT NULL,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_national_players_gender ON national_players(gender);
CREATE INDEX IF NOT EXISTS idx_national_players_ranking ON national_players(ranking);
CREATE INDEX IF NOT EXISTS idx_national_players_license ON national_players(license_number);
CREATE INDEX IF NOT EXISTS idx_national_players_name ON national_players(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_national_players_club ON national_players(club);

-- Row Level Security (RLS) for national_players
ALTER TABLE national_players ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read national players (public data)
CREATE POLICY "Allow read access to national players" ON national_players
  FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert/update/delete (for admin operations)
CREATE POLICY "Allow authenticated users to manage national players" ON national_players
  FOR ALL USING (auth.role() = 'authenticated'); 