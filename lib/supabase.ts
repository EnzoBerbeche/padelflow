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