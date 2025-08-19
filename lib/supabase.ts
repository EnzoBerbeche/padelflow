import { createClient } from '@supabase/supabase-js';

// Read Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Check if environment variables are set
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.error('Supabase not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  console.error('Please create a .env.local file with your Supabase credentials');
}

// Create client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// National Players table interface
export interface SupabaseNationalPlayer {
  id: string;
  first_name: string;
  last_name: string;
  license_number: string;
  ranking: number;
  best_ranking: number;
  points: number;
  club: string;
  league: string;
  birth_year: number;
  nationality: string;
  gender: 'men' | 'women';
  tournaments_count: number;
  last_updated: string;
  created_at?: string;
}

// National Players API
export const nationalPlayersAPI = {
  // Get all players
  getAll: async (): Promise<SupabaseNationalPlayer[]> => {
    type RankingRow = {
      id_unique: string;
      licence: string;
      nom: string | null;
      genre: 'Homme' | 'Femme';
      rang: number;
      evolution: number | null;
      meilleur_classement: number | null;
      nationalite: string | null;
      annee_naissance: number | null;
      points: number | null;
      nb_tournois: number | null;
      ligue: string | null;
      club: string | null;
      ranking_year: number;
      ranking_month: number;
    };

    const { data, error } = await supabase
      .from('rankings')
      .select(
        'id_unique, licence, nom, genre, rang, evolution, meilleur_classement, nationalite, annee_naissance, points, nb_tournois, ligue, club, ranking_year, ranking_month'
      );

    if (error) {
      console.error('Error fetching rankings:', error);
      return [];
    }

    const rows: RankingRow[] = (data as any[]) || [];

    // Keep only the latest row per licence (by year, then month)
    const latestByLicence = new Map<string, RankingRow>();
    for (const row of rows) {
      const existing = latestByLicence.get(row.licence);
      if (!existing) {
        latestByLicence.set(row.licence, row);
        continue;
      }
      const existingKey = existing.ranking_year * 100 + existing.ranking_month;
      const currentKey = row.ranking_year * 100 + row.ranking_month;
      if (currentKey > existingKey) {
        latestByLicence.set(row.licence, row);
      }
    }

    const mapped: SupabaseNationalPlayer[] = Array.from(latestByLicence.values())
      .map(mapRankingRowToNationalPlayer)
      .sort((a, b) => a.ranking - b.ranking);

    return mapped;
  },

  // Search players
  search: async (
    query: string, 
    filters?: {
      gender?: 'men' | 'women';
      rankingMin?: number;
      rankingMax?: number;
      league?: string;
      clubs?: string[];
    }
  ): Promise<SupabaseNationalPlayer[]> => {
    type RankingRow = {
      id_unique: string;
      licence: string;
      nom: string | null;
      genre: 'Homme' | 'Femme';
      rang: number;
      evolution: number | null;
      meilleur_classement: number | null;
      nationalite: string | null;
      annee_naissance: number | null;
      points: number | null;
      nb_tournois: number | null;
      ligue: string | null;
      club: string | null;
      ranking_year: number;
      ranking_month: number;
    };

    const trimmed = (query || '').trim();
    const tokens = trimmed.split(/\s+/).filter(Boolean);

    let supabaseQuery = supabase
      .from('rankings')
      .select(
        'id_unique, licence, nom, genre, rang, evolution, meilleur_classement, nationalite, annee_naissance, points, nb_tournois, ligue, club, ranking_year, ranking_month'
      );

    if (trimmed) {
      if (tokens.length > 1) {
        // Require ALL tokens to match in ANY of the key fields (name, licence, club)
        for (const t of tokens) {
          supabaseQuery = supabaseQuery.or(`nom.ilike.*${t}*,licence.ilike.*${t}*,club.ilike.*${t}*`);
        }
      } else {
        // Single-token broad match across key fields
        const t = trimmed;
        supabaseQuery = supabaseQuery.or(`nom.ilike.*${t}*,licence.ilike.*${t}*,club.ilike.*${t}*`);
      }
    }

    // Apply filters at DB level where possible
    if (filters?.gender) {
      const mappedGender = filters.gender === 'men' ? 'Homme' : 'Femme';
      supabaseQuery = supabaseQuery.eq('genre', mappedGender);
    }
    if (typeof filters?.rankingMin === 'number') {
      supabaseQuery = supabaseQuery.gte('rang', filters.rankingMin as number);
    }
    if (typeof filters?.rankingMax === 'number') {
      supabaseQuery = supabaseQuery.lte('rang', filters.rankingMax as number);
    }
    if (filters?.league) {
      supabaseQuery = supabaseQuery.eq('ligue', filters.league);
    }
    if (filters?.clubs && Array.isArray(filters.clubs) && (filters.clubs as string[]).length > 0) {
      supabaseQuery = supabaseQuery.in('club', filters.clubs as string[]);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error searching rankings:', error);
      return [];
    }

    let rows: RankingRow[] = (data as any[]) || [];

    // For multi-token queries, also enforce AND semantics on the client side as a safety net across name/licence/club
    if (tokens.length > 1) {
      const lowerTokens = tokens.map(t => t.toLowerCase());
      rows = rows.filter(r => {
        const haystack = `${r.nom || ''} ${r.licence || ''} ${r.club || ''}`.toLowerCase();
        return lowerTokens.every(t => haystack.includes(t));
      });
    }

    // Keep only latest per licence
    const latestByLicence = new Map<string, RankingRow>();
    for (const row of rows) {
      const existing = latestByLicence.get(row.licence);
      if (!existing) {
        latestByLicence.set(row.licence, row);
        continue;
      }
      const existingKey = existing.ranking_year * 100 + existing.ranking_month;
      const currentKey = row.ranking_year * 100 + row.ranking_month;
      if (currentKey > existingKey) {
        latestByLicence.set(row.licence, row);
      }
    }

    const mapped: SupabaseNationalPlayer[] = Array.from(latestByLicence.values())
      .map(mapRankingRowToNationalPlayer)
      .sort((a, b) => a.ranking - b.ranking);

    return mapped;
  },

  // Test connection and table existence
  testConnection: async (): Promise<boolean> => {
    if (!isConfigured) {
      console.error('Supabase not configured. Please set up environment variables.');
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('rankings')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Connection test failed:', error);
        return false;
      }
      
      console.log('Supabase connection successful');
      return true;
    } catch (error) {
      console.error('Connection test error:', error);
      return false;
    }
  },

  // Import players from CSV (batch insert)
  importFromCSV: async (
    _players: SupabaseNationalPlayer[], 
    _gender: 'men' | 'women'
  ): Promise<boolean> => {
    // Deprecated for rankings pipeline. Kept to satisfy existing callers if any.
    console.warn('importFromCSV is deprecated for the rankings schema.');
    return false;
  },

  // Clear all players
  clear: async (): Promise<boolean> => {
    // Dangerous against the rankings table; leave as noop for safety
    console.warn('clear() is disabled for the rankings schema.');
    return false;
  },

  // Get unique leagues for filtering
  getLeagues: async (): Promise<string[]> => {
    type Row = { licence: string; ligue: string | null; ranking_year: number; ranking_month: number };
    const { data, error } = await supabase
      .from('rankings')
      .select('licence, ligue, ranking_year, ranking_month')
      .not('ligue', 'is', null);

    if (error) {
      console.error('Error fetching leagues from rankings:', error);
      return [];
    }

    const rows: Row[] = (data as any[]) || [];

    // Latest per licence, then collect leagues
    const latestByLicence = new Map<string, Row>();
    for (const row of rows) {
      const existing = latestByLicence.get(row.licence);
      if (!existing) {
        latestByLicence.set(row.licence, row);
        continue;
      }
      const existingKey = existing.ranking_year * 100 + existing.ranking_month;
      const currentKey = row.ranking_year * 100 + row.ranking_month;
      if (currentKey > existingKey) {
        latestByLicence.set(row.licence, row);
      }
    }

    const uniqueLeagues = Array.from(new Set(Array.from(latestByLicence.values()).map(r => r.ligue).filter(Boolean) as string[]));
    return uniqueLeagues.sort();
  },

  // Get unique clubs for filtering
  getClubs: async (): Promise<string[]> => {
    type Row = { licence: string; club: string | null; ranking_year: number; ranking_month: number };
    const { data, error } = await supabase
      .from('rankings')
      .select('licence, club, ranking_year, ranking_month')
      .not('club', 'is', null);

    if (error) {
      console.error('Error fetching clubs from rankings:', error);
      return [];
    }

    const rows: Row[] = (data as any[]) || [];

    const latestByLicence = new Map<string, Row>();
    for (const row of rows) {
      const existing = latestByLicence.get(row.licence);
      if (!existing) {
        latestByLicence.set(row.licence, row);
        continue;
      }
      const existingKey = existing.ranking_year * 100 + existing.ranking_month;
      const currentKey = row.ranking_year * 100 + row.ranking_month;
      if (currentKey > existingKey) {
        latestByLicence.set(row.licence, row);
      }
    }

    const uniqueClubs = Array.from(new Set(Array.from(latestByLicence.values()).map(r => r.club).filter(Boolean) as string[]));
    return uniqueClubs.sort();
  },
};

// Players (user-scoped) API
export interface SupabasePlayerRow {
  id: string;
  user_id: string;
  licence: string;
  created_at: string;
}

export interface SupabasePlayersEnrichedRow {
  player_id: string;
  user_id: string;
  licence: string;
  created_at: string;
  id_unique: string | null;
  nom: string | null;
  genre: string | null; // 'Homme' | 'Femme'
  rang: number | null;
  evolution: number | null;
  meilleur_classement: number | null;
  nationalite: string | null;
  annee_naissance: number | null;
  points: number | null;
  nb_tournois: number | null;
  ligue: string | null;
  club: string | null;
  ranking_year: number | null;
  ranking_month: number | null;
}

export const playersAPI = {
  // Fetch current user's players enriched with latest rankings
  getMyPlayersEnriched: async (): Promise<SupabasePlayersEnrichedRow[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('players_enriched')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching players_enriched:', error);
      return [];
    }
    return (data as unknown as SupabasePlayersEnrichedRow[]) || [];
  },

  // Fetch just the licences for the current user's players
  getMyLicences: async (): Promise<string[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('players')
      .select('licence')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching player licences:', error);
      return [];
    }
    return ((data as Array<{ licence: string }>).map(r => r.licence) as string[]) || [];
  },

  // Insert a player by licence for the current user
  addLicenceForCurrentUser: async (licence: string): Promise<{ ok: boolean; error?: string; id?: string }> => {
    const trimmed = (licence || '').trim();
    if (!trimmed) return { ok: false, error: 'Licence is required' };

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: false, error: 'Not signed in' };

    const { data, error } = await supabase
      .from('players')
      .insert({ user_id: userId, licence: trimmed })
      .select('id')
      .single();

    if (error) {
      // 23505 unique_violation
      if ((error as any).code === '23505') {
        return { ok: false, error: 'This licence is already in your list' };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true, id: (data as any).id as string };
  },

  deleteById: async (playerId: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  deleteByLicenceForCurrentUser: async (licence: string): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = (licence || '').trim();
    if (!trimmed) return { ok: false, error: 'Licence is required' };

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: false, error: 'Not signed in' };

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('user_id', userId)
      .eq('licence', trimmed);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};

function mapRankingRowToNationalPlayer(row: {
  id_unique: string;
  licence: string;
  nom: string | null;
  genre: 'Homme' | 'Femme';
  rang: number;
  evolution: number | null;
  meilleur_classement: number | null;
  nationalite: string | null;
  annee_naissance: number | null;
  points: number | null;
  nb_tournois: number | null;
  ligue: string | null;
  club: string | null;
  ranking_year: number;
  ranking_month: number;
}): SupabaseNationalPlayer {
  const fullName = (row.nom || '').trim();
  let firstName = '';
  let lastName = '';
  if (fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length === 1) {
      lastName = parts[0];
    } else {
      lastName = parts.pop() as string;
      firstName = parts.join(' ');
    }
  }

  const lastUpdated = new Date(Date.UTC(row.ranking_year, (row.ranking_month || 1) - 1, 1)).toISOString();

  return {
    id: row.id_unique,
    first_name: firstName || '',
    last_name: lastName || '',
    license_number: row.licence,
    ranking: row.rang,
    best_ranking: row.meilleur_classement ?? row.rang,
    points: row.points ?? 0,
    club: row.club ?? '',
    league: row.ligue ?? '',
    birth_year: row.annee_naissance ?? 0,
    nationality: row.nationalite ?? '',
    gender: row.genre === 'Homme' ? 'men' : 'women',
    tournaments_count: row.nb_tournois ?? 0,
    last_updated: lastUpdated,
  };
}

// Tournaments API
export interface SupabaseTournamentRow {
  id: string;
  owner_id: string;
  name: string;
  date: string; // ISO date (yyyy-mm-dd)
  location: string;
  organizer_id: string | null;
  public_id: string;
  teams_locked: boolean;
  format_id: string | null;
  level: 'P25' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P1500' | 'P2000';
  start_time: string; // HH:MM:SS or HH:MM
  number_of_courts: number;
  number_of_teams: number;
  conditions: 'inside' | 'outside' | 'both';
  type: 'All' | 'Men' | 'Women' | 'Mixed';
  bracket: any | null;
  format_json: any | null;
  random_assignments: Record<string, any> | null;
  registration_enabled: boolean;
  registration_link_id: string | null;
  created_at: string;
  updated_at: string;
}

// Return shape compatible with the app's existing Tournament interface used in pages
export type AppTournament = {
  id: string;
  name: string;
  date: string;
  location: string;
  organizer_id: string;
  owner_id?: string;
  public_id: string;
  teams_locked: boolean;
  format_id?: string;
  level: 'P25' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P1500' | 'P2000';
  start_time: string;
  number_of_courts: number;
  number_of_teams: number;
  conditions: 'inside' | 'outside' | 'both';
  type: 'All' | 'Men' | 'Women' | 'Mixed';
  bracket?: any;
  created_at: string;
  updated_at: string;
  format_json?: any;
  random_assignments?: Record<string, any>;
  registration_enabled: boolean;
  registration_link_id?: string;
};

function mapTournamentRow(row: SupabaseTournamentRow): AppTournament {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location,
    organizer_id: row.organizer_id || '',
    owner_id: row.owner_id,
    public_id: row.public_id,
    teams_locked: row.teams_locked,
    format_id: row.format_id || undefined,
    level: row.level,
    start_time: (row.start_time || '').slice(0, 5),
    number_of_courts: row.number_of_courts,
    number_of_teams: row.number_of_teams,
    conditions: row.conditions,
    type: row.type,
    bracket: row.bracket ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    format_json: row.format_json ?? undefined,
    random_assignments: row.random_assignments ?? undefined,
    registration_enabled: row.registration_enabled,
    registration_link_id: row.registration_link_id ?? undefined,
  };
}

export const tournamentsAPI = {
  // List current user's tournaments
  listMy: async (): Promise<AppTournament[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
    return ((data as unknown as SupabaseTournamentRow[]) || []).map(mapTournamentRow);
  },

  // Get by id (owner-only via RLS)
  getById: async (id: string): Promise<AppTournament | null> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tournament by id:', error);
      return null;
    }
    return mapTournamentRow(data as unknown as SupabaseTournamentRow);
  },

  // Get by public_id (requires future public policy; will work only for owner until then)
  getByPublicId: async (publicId: string): Promise<AppTournament | null> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('public_id', publicId)
      .single();

    if (error) {
      console.error('Error fetching tournament by public_id:', error);
      return null;
    }
    return mapTournamentRow(data as unknown as SupabaseTournamentRow);
  },

  // Create a tournament (owner enforced by RLS/default)
  create: async (input: Omit<AppTournament, 'id' | 'public_id' | 'created_at' | 'updated_at'>): Promise<AppTournament | null> => {
    const payload: Partial<SupabaseTournamentRow> = {
      name: input.name,
      date: input.date,
      location: input.location,
      organizer_id: input.organizer_id || null,
      teams_locked: input.teams_locked,
      format_id: input.format_id ?? null,
      level: input.level,
      start_time: input.start_time,
      number_of_courts: input.number_of_courts,
      number_of_teams: input.number_of_teams,
      conditions: input.conditions,
      type: input.type,
      bracket: input.bracket ?? null,
      format_json: input.format_json ?? null,
      random_assignments: input.random_assignments ?? null,
      registration_enabled: input.registration_enabled,
      registration_link_id: input.registration_link_id ?? null,
    } as Partial<SupabaseTournamentRow>;

    const { data, error } = await supabase
      .from('tournaments')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating tournament:', error);
      return null;
    }
    return mapTournamentRow(data as unknown as SupabaseTournamentRow);
  },

  // Update tournament (RLS owner-only)
  update: async (id: string, patch: Partial<AppTournament>): Promise<AppTournament | null> => {
    const payload: Partial<SupabaseTournamentRow> = {
      name: patch.name,
      date: patch.date,
      location: patch.location,
      organizer_id: patch.organizer_id ?? undefined,
      teams_locked: patch.teams_locked,
      format_id: patch.format_id ?? undefined,
      level: patch.level,
      start_time: patch.start_time,
      number_of_courts: patch.number_of_courts,
      number_of_teams: patch.number_of_teams,
      conditions: patch.conditions,
      type: patch.type,
      bracket: patch.bracket,
      format_json: patch.format_json,
      random_assignments: patch.random_assignments,
      registration_enabled: patch.registration_enabled,
      registration_link_id: patch.registration_link_id,
    } as Partial<SupabaseTournamentRow>;

    const { data, error } = await supabase
      .from('tournaments')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating tournament:', error);
      return null;
    }
    return mapTournamentRow(data as unknown as SupabaseTournamentRow);
  },

  // Delete tournament (RLS owner-only)
  delete: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};

// Tournament Players & Teams (Supabase)
export interface SupabaseTournamentPlayerRow {
  id: string;
  tournament_id: string;
  owner_id: string;
  license_number: string;
  first_name: string;
  last_name: string;
  ranking: number;
  club: string | null;
  gender: 'Mr' | 'Mme' | string;
  birth_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTournamentTeamRow {
  id: string;
  tournament_id: string;
  owner_id: string;
  name: string;
  weight: number;
  seed_number: number | null;
  is_wo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTeamPlayerRow {
  id: string;
  team_id: string;
  player_id: string;
  created_at: string;
}

// Local UI types reused by components
export type UITournamentPlayer = {
  id: string;
  license_number: string;
  first_name: string;
  last_name: string;
  ranking: number;
  email?: string;
  phone?: string;
  club: string;
  year_of_birth?: number;
  date_of_birth?: string;
  gender: 'Mr' | 'Mme';
  organizer_id?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
};

export type UITeam = {
  id: string;
  name: string;
  weight: number;
  seed_number?: number;
  is_wo?: boolean;
  created_at: string;
  updated_at: string;
};

export type UITeamWithPlayers = UITeam & { players: UITournamentPlayer[] };

function mapTournamentPlayerRow(row: SupabaseTournamentPlayerRow): UITournamentPlayer {
  return {
    id: row.id,
    license_number: row.license_number,
    first_name: row.first_name,
    last_name: row.last_name,
    ranking: row.ranking,
    club: row.club ?? '',
    year_of_birth: row.birth_year ?? undefined,
    date_of_birth: undefined,
    gender: (row.gender === 'Mr' || row.gender === 'Mme') ? row.gender : 'Mr',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapTournamentTeamRow(row: SupabaseTournamentTeamRow): UITeam {
  return {
    id: row.id,
    name: row.name,
    weight: row.weight,
    seed_number: row.seed_number ?? undefined,
    is_wo: row.is_wo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const tournamentPlayersAPI = {
  listByTournament: async (tournamentId: string): Promise<UITournamentPlayer[]> => {
    const { data, error } = await supabase
      .from('tournament_players')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error listing tournament players:', error);
      return [];
    }
    return ((data as unknown as SupabaseTournamentPlayerRow[]) || []).map(mapTournamentPlayerRow);
  },

  // Idempotent create by licence within a tournament
  ensureSnapshot: async (
    tournamentId: string,
    snapshot: {
      license_number: string;
      first_name: string;
      last_name: string;
      ranking: number;
      club?: string;
      gender: 'Mr' | 'Mme';
      birth_year?: number;
    }
  ): Promise<UITournamentPlayer | null> => {
    // Try to find existing
    const { data: existing, error: findError } = await supabase
      .from('tournament_players')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('license_number', snapshot.license_number)
      .maybeSingle();

    if (!findError && existing) {
      return mapTournamentPlayerRow(existing as unknown as SupabaseTournamentPlayerRow);
    }

    const { data, error } = await supabase
      .from('tournament_players')
      .insert({
        tournament_id: tournamentId,
        license_number: snapshot.license_number,
        first_name: snapshot.first_name,
        last_name: snapshot.last_name,
        ranking: snapshot.ranking,
        club: snapshot.club ?? null,
        gender: snapshot.gender,
        birth_year: typeof snapshot.birth_year === 'number' ? snapshot.birth_year : null,
      })
      .select('*')
      .single();
    if (error) {
      console.error('Error creating tournament player snapshot:', error);
      return null;
    }
    return mapTournamentPlayerRow(data as unknown as SupabaseTournamentPlayerRow);
  },
};

export const tournamentTeamsAPI = {
  listWithPlayers: async (tournamentId: string): Promise<UITeamWithPlayers[]> => {
    // Fetch teams
    const { data: teamRows, error: teamErr } = await supabase
      .from('tournament_teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('weight', { ascending: true });
    if (teamErr) {
      console.error('Error fetching teams:', teamErr);
      return [];
    }
    const teams = ((teamRows as unknown as SupabaseTournamentTeamRow[]) || []).map(mapTournamentTeamRow);

    // Fetch join rows
    const { data: joinRows, error: joinErr } = await supabase
      .from('team_players')
      .select('id, team_id, player_id')
      .in('team_id', teams.map(t => t.id));
    if (joinErr) {
      console.error('Error fetching team_players:', joinErr);
      return teams.map(t => ({ ...t, players: [] }));
    }

    const playerIds = Array.from(new Set(((joinRows as unknown as SupabaseTeamPlayerRow[]) || []).map(j => j.player_id)));
    const { data: playerRows, error: plErr } = await supabase
      .from('tournament_players')
      .select('*')
      .in('id', playerIds);
    if (plErr) {
      console.error('Error fetching tournament_players:', plErr);
      return teams.map(t => ({ ...t, players: [] }));
    }
    const playerById = new Map(
      ((playerRows as unknown as SupabaseTournamentPlayerRow[]) || []).map(r => [r.id, mapTournamentPlayerRow(r)])
    );

    const joins = (joinRows as unknown as SupabaseTeamPlayerRow[]) || [];
    const teamIdToPlayers = new Map<string, UITournamentPlayer[]>();
    for (const j of joins) {
      const arr = teamIdToPlayers.get(j.team_id) ?? [];
      const pl = playerById.get(j.player_id);
      if (pl) arr.push(pl);
      teamIdToPlayers.set(j.team_id, arr);
    }

    return teams.map(t => ({ ...t, players: (teamIdToPlayers.get(t.id) ?? []).slice(0, 2) }));
  },

  createWithTwoPlayersFromLocal: async (
    tournamentId: string,
    playerA: { id: string; license_number: string; first_name: string; last_name: string; ranking: number; club: string; gender: 'Mr' | 'Mme'; year_of_birth?: number },
    playerB: { id: string; license_number: string; first_name: string; last_name: string; ranking: number; club: string; gender: 'Mr' | 'Mme'; year_of_birth?: number }
  ): Promise<UITeamWithPlayers | null> => {
    // Guard: prevent same player duplicated across teams in the same tournament
    const { data: existingJoins, error: existingErr } = await supabase
      .from('team_players')
      .select('team_id, player_id, tournament_players!inner(license_number, tournament_id)')
      .eq('tournament_players.tournament_id', tournamentId);
    if (!existingErr && existingJoins) {
      const usedLicences = new Set<string>(
        (existingJoins as any[]).map((r: any) => r.tournament_players.license_number)
      );
      if (usedLicences.has(playerA.license_number) || usedLicences.has(playerB.license_number)) {
        console.error('Player already assigned in this tournament');
        return null;
      }
    }
    // Ensure snapshots
    const snapA = await tournamentPlayersAPI.ensureSnapshot(tournamentId, {
      license_number: playerA.license_number,
      first_name: playerA.first_name,
      last_name: playerA.last_name,
      ranking: playerA.ranking,
      club: playerA.club,
      gender: playerA.gender,
      birth_year: playerA.year_of_birth,
    });
    const snapB = await tournamentPlayersAPI.ensureSnapshot(tournamentId, {
      license_number: playerB.license_number,
      first_name: playerB.first_name,
      last_name: playerB.last_name,
      ranking: playerB.ranking,
      club: playerB.club,
      gender: playerB.gender,
      birth_year: playerB.year_of_birth,
    });
    if (!snapA || !snapB) return null;

    const weight = playerA.ranking + playerB.ranking;
    const teamName = `${playerA.last_name} - ${playerB.last_name}`;

    const { data: teamRow, error: teamErr } = await supabase
      .from('tournament_teams')
      .insert({ tournament_id: tournamentId, name: teamName, weight, is_wo: false })
      .select('*')
      .single();
    if (teamErr) {
      console.error('Error creating team:', teamErr);
      return null;
    }
    const team = mapTournamentTeamRow(teamRow as unknown as SupabaseTournamentTeamRow);

    const { error: joinErr } = await supabase.from('team_players').insert([
      { team_id: team.id, player_id: snapA.id },
      { team_id: team.id, player_id: snapB.id },
    ]);
    if (joinErr) {
      console.error('Error linking players to team:', joinErr);
      return null;
    }

    return { ...team, players: [snapA, snapB] };
  },

  deleteTeam: async (teamId: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.from('tournament_teams').delete().eq('id', teamId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  updateTeam: async (teamId: string, patch: Partial<{ name: string; seed_number?: number | null; is_wo?: boolean }>): Promise<UITeam | null> => {
    const { data, error } = await supabase
      .from('tournament_teams')
      .update({
        name: patch.name,
        seed_number: typeof patch.seed_number === 'undefined' ? undefined : patch.seed_number,
        is_wo: patch.is_wo,
      })
      .eq('id', teamId)
      .select('*')
      .single();
    if (error) {
      console.error('Error updating team:', error);
      return null;
    }
    return mapTournamentTeamRow(data as unknown as SupabaseTournamentTeamRow);
  },
};