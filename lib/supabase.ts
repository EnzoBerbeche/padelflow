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
    type TenupRow = {
      id: number;
      idcrm: number;
      nom: string | null;
      prenom: string | null;
      nom_complet: string | null;
      classement: number;
      points: number | null;
      evolution: number | null;
      meilleur_classement: number | null;
      nationalite: string | null;
      age_sportif: number | null;
      nombre_tournois: number | null;
      ligue: string | null;
      sexe: string | null;
      date_classement: string;
      ranking_year: number;
      ranking_month: number;
    };

    const { data, error } = await supabase
      .from('tenup_latest')
      .select(
        'id, idcrm, nom, prenom, nom_complet, classement, points, evolution, meilleur_classement, nationalite, age_sportif, nombre_tournois, ligue, sexe, date_classement, ranking_year, ranking_month'
      );

    if (error) {
      console.error('Error fetching tenup:', error);
      return [];
    }

    const rows: TenupRow[] = (data as any[]) || [];

    const mapped: SupabaseNationalPlayer[] = rows
      .map(mapTenupRowToNationalPlayer)
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
    }
  ): Promise<SupabaseNationalPlayer[]> => {
    type TenupRow = {
      id: number;
      idcrm: number;
      nom: string | null;
      prenom: string | null;
      nom_complet: string | null;
      classement: number;
      points: number | null;
      evolution: number | null;
      meilleur_classement: number | null;
      nationalite: string | null;
      age_sportif: number | null;
      nombre_tournois: number | null;
      ligue: string | null;
      sexe: string | null;
      date_classement: string;
      ranking_year: number;
      ranking_month: number;
    };

    const trimmed = (query || '').trim();
    const tokens = trimmed.split(/\s+/).filter(Boolean);

    let supabaseQuery = supabase
      .from('tenup_latest')
      .select(
        'id, idcrm, nom, prenom, nom_complet, classement, points, evolution, meilleur_classement, nationalite, age_sportif, nombre_tournois, ligue, sexe, date_classement, ranking_year, ranking_month'
      );

    if (trimmed) {
      // Build OR conditions for search
      const orConditions = [];
      
      for (const t of tokens) {
        const isNumber = !isNaN(Number(t));
        if (isNumber) {
          // For numeric tokens, search in both name and idcrm
          orConditions.push(`nom_complet.ilike.*${t}*`);
          orConditions.push(`idcrm.eq.${t}`);
        } else {
          // For text tokens, search only in name
          orConditions.push(`nom_complet.ilike.*${t}*`);
        }
      }
      
      if (orConditions.length > 0) {
        supabaseQuery = supabaseQuery.or(orConditions.join(','));
      }
    }

    // Apply filters at DB level where possible
    if (filters?.gender) {
      const mappedGender = filters.gender === 'men' ? 'H' : 'F';
      supabaseQuery = supabaseQuery.eq('sexe', mappedGender);
    }
    if (typeof filters?.rankingMin === 'number') {
      supabaseQuery = supabaseQuery.gte('classement', filters.rankingMin as number);
    }
    if (typeof filters?.rankingMax === 'number') {
      supabaseQuery = supabaseQuery.lte('classement', filters.rankingMax as number);
    }
    if (filters?.league) {
      supabaseQuery = supabaseQuery.eq('ligue', filters.league);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error searching tenup:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }

    let rows: TenupRow[] = (data as any[]) || [];

    // For multi-token queries, also enforce AND semantics on the client side as a safety net across name/idcrm
    if (tokens.length > 1) {
      const lowerTokens = tokens.map(t => t.toLowerCase());
      rows = rows.filter(r => {
        const haystack = `${r.nom_complet || ''} ${r.idcrm || ''}`.toLowerCase();
        return lowerTokens.every(t => haystack.includes(t));
      });
    }

    const mapped: SupabaseNationalPlayer[] = rows
      .map(mapTenupRowToNationalPlayer)
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
        .from('tenup')
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
    // Deprecated for tenup pipeline. Kept to satisfy existing callers if any.
    console.warn('importFromCSV is deprecated for the tenup schema.');
    return false;
  },

  // Clear all players
  clear: async (): Promise<boolean> => {
    // Dangerous against the tenup table; leave as noop for safety
    console.warn('clear() is disabled for the tenup schema.');
    return false;
  },

  // Get unique leagues for filtering
  getLeagues: async (): Promise<string[]> => {
    type Row = { idcrm: number; ligue: string | null; date_classement: string };
    const { data, error } = await supabase
      .from('tenup')
      .select('idcrm, ligue, date_classement')
      .not('ligue', 'is', null);

    if (error) {
      console.error('Error fetching leagues from tenup:', error);
      return [];
    }

    const rows: Row[] = (data as any[]) || [];

    // Since we're using tenup_latest, we don't need to filter by latest per idcrm
    const uniqueLeagues = Array.from(new Set(rows.map(r => r.ligue).filter(Boolean) as string[]));
    return uniqueLeagues.sort();
  },
};

// Players (user-scoped) API
export interface SupabasePlayerRow {
  id: string;
  user_id: string;
  licence: string;
  created_at: string;
}

// Enriched player data combining players table with tenup_latest view
export interface SupabasePlayersEnrichedRow {
  player_id: string;
  user_id: string;
  licence: string;
  created_at: string;
  nom: string | null;
  nom_complet: string | null;
  prenom: string | null;
  genre: 'Homme' | 'Femme';
  sexe: string | null;
  classement: number | null;
  evolution: number | null;
  meilleur_classement: number | null;
  nationalite: string | null;
  age_sportif: number | null;
  points: number | null;
  nombre_tournois: number | null;
  ligue: string | null;
  date_classement: string | null;
}

export const playersAPI = {
  // Fetch current user's players with latest tenup data via direct join
  getMyPlayersEnriched: async (): Promise<SupabasePlayersEnrichedRow[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    // First get the user's license numbers
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id, user_id, licence, created_at')
      .eq('user_id', userId);

    if (playerError) {
      console.error('Error fetching player licenses:', playerError);
      return [];
    }

    if (!playerData || playerData.length === 0) {
      return [];
    }

    // Get the license numbers
    const licenses = playerData.map(p => p.licence);

    // Fetch tenup data for these licenses
    const { data: rankingData, error: rankingError } = await supabase
      .from('tenup_latest')
      .select('*')
      .in('idcrm', licenses.map(l => parseInt(l)));

    if (rankingError) {
      console.error('Error fetching tenup data:', rankingError);
      return [];
    }

    // Combine the data
    const enriched = playerData.map(player => {
      const ranking = rankingData?.find(r => r.idcrm === parseInt(player.licence));
      return {
        player_id: player.id,
        user_id: player.user_id,
        licence: player.licence,
        created_at: player.created_at,
        ...ranking
      };
    });

    return enriched;
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

// Player Statistics API
export interface PlayerStatistics {
  licence: string;
  nom: string | null;
  genre: 'Homme' | 'Femme';
  current_ranking: number | null;
  ranking_evolution: number | null;
  best_ranking: number | null;
  nationality: string | null;
  birth_year: number | null;
  current_points: number | null;
  current_tournaments_count: number | null;
  ligue: string | null;
  date_classement: string | null;
  ranking_month: number | null;
  ranking_year: number | null;
  ranking_history: {
    year: number;
    month: number;
    ranking: number | null;
    points: number | null;
    tournaments_count: number | null;
  }[];
  // New performance metrics
  average_progression: number | null;
  participation_rate: number | null;
  most_active_month: { year: number; month: number; tournaments: number } | null;
  league_position: number | null;
}

export const playerStatisticsAPI = {
  // Get detailed statistics for a specific player by licence
  getPlayerStatistics: async (licence: string): Promise<PlayerStatistics | null> => {
    // Get all ranking data for this player
    const { data, error } = await supabase
      .from('tenup')
      .select('*')
      .eq('idcrm', parseInt(licence))
      .order('date_classement', { ascending: false });

    if (error) {
      console.error('Error fetching player statistics:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Get the latest ranking (first row due to ordering)
    const latest = data[0];
    
    // Build ranking history
    const rankingHistory = data.map(row => ({
      year: new Date(row.date_classement).getFullYear(),
      month: new Date(row.date_classement).getMonth() + 1,
      ranking: row.classement,
      points: row.points,
      tournaments_count: row.nombre_tournois,
    }));

    // Calculate ranking evolution (current month vs previous month)
    let rankingEvolution = null;
    if (rankingHistory.length > 1) {
      const currentRanking = rankingHistory[0].ranking;
      const previousRanking = rankingHistory[1].ranking;
      if (currentRanking !== null && previousRanking !== null) {
        // In padel: higher number = worse ranking
        // So positive evolution = worse ranking, negative evolution = better ranking
        rankingEvolution = currentRanking - previousRanking;
      }
    }

    // Calculate new performance metrics
    const last12Months = rankingHistory.slice(0, 12);
    
    // Average progression (average variation in ranking over last 12 months)
    let averageProgression = null;
    if (last12Months.length > 1) {
      const progressions = [];
      for (let i = 1; i < last12Months.length; i++) {
        const current = last12Months[i - 1].ranking;
        const previous = last12Months[i].ranking;
        if (current !== null && previous !== null) {
          progressions.push(previous - current); // Positive = improvement
        }
      }
      if (progressions.length > 0) {
        averageProgression = progressions.reduce((sum, val) => sum + val, 0) / progressions.length;
      }
    }
    
    // Participation rate (% of months with at least 1 tournament)
    let participationRate = null;
    if (last12Months.length > 0) {
      const monthsWithTournaments = last12Months.filter(month => 
        month.tournaments_count !== null && month.tournaments_count > 0
      ).length;
      participationRate = (monthsWithTournaments / last12Months.length) * 100;
    }
    
          // Most active month (calculate monthly tournament difference)
      let mostActiveMonth = null;
      if (last12Months.length > 1) {
        let maxMonthlyTournaments = 0;
        let maxMonth = null;
        
        for (let i = 0; i < last12Months.length - 1; i++) {
          const current = last12Months[i].tournaments_count;
          const next = last12Months[i + 1].tournaments_count;
          
          if (current !== null && next !== null) {
            const monthlyTournaments = current - next;
            if (monthlyTournaments > maxMonthlyTournaments) {
              maxMonthlyTournaments = monthlyTournaments;
              maxMonth = {
                year: last12Months[i].year,
                month: last12Months[i].month,
                tournaments: monthlyTournaments
              };
            }
          }
        }
        
        if (maxMonth && maxMonthlyTournaments > 0) {
          mostActiveMonth = maxMonth;
        }
      }

    // Calculate league position
    let leaguePosition = null;
    if (latest.ligue && latest.classement) {
      try {
        // Count how many players in the same league have a better ranking (lower number)
        const { count, error: countError } = await supabase
          .from('tenup_latest')
          .select('*', { count: 'exact', head: true })
          .eq('ligue', latest.ligue)
          .lt('classement', latest.classement); // Better ranking = lower number
        
        if (!countError && count !== null) {
          leaguePosition = count + 1; // Position is count + 1 (1st place = 0 players better + 1)
        }
      } catch (err) {
        console.error('Error calculating league position:', err);
      }
    }
    
    return {
      licence: latest.idcrm.toString(),
      nom: latest.nom_complet || latest.nom,
      genre: latest.sexe === 'H' ? 'Homme' : 'Femme',
      current_ranking: latest.classement,
      ranking_evolution: rankingEvolution,
      best_ranking: latest.meilleur_classement,
      nationality: latest.nationalite,
      birth_year: latest.age_sportif,
      current_points: latest.points,
      current_tournaments_count: latest.nombre_tournois,
      ligue: latest.ligue,
      date_classement: latest.date_classement,
      ranking_month: latest.ranking_month,
      ranking_year: latest.ranking_year,
      ranking_history: rankingHistory,
      average_progression: averageProgression,
      participation_rate: participationRate,
      most_active_month: mostActiveMonth,
      league_position: leaguePosition,
    };
  },

  // Get all players with basic info (for search/listing)
  getAllPlayersBasic: async (): Promise<{
    licence: string;
    nom: string | null;
    genre: 'Homme' | 'Femme';
    current_ranking: number | null;
    ligue: string | null;
  }[]> => {
    const { data, error } = await supabase
      .from('tenup_latest')
      .select('idcrm, nom_complet, sexe, classement, ligue')
      .order('classement', { ascending: true });

    if (error) {
      console.error('Error fetching all players basic info:', error);
      return [];
    }

    return (data || []).map(row => ({
      licence: row.idcrm.toString(),
      nom: row.nom_complet,
      genre: row.sexe === 'H' ? 'Homme' : 'Femme',
      current_ranking: row.classement,
      ligue: row.ligue,
    }));
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
    league: row.ligue ?? '',
    birth_year: row.annee_naissance ?? 0,
    nationality: row.nationalite ?? '',
    gender: row.genre === 'Homme' ? 'men' : 'women',
    tournaments_count: row.nb_tournois ?? 0,
    last_updated: lastUpdated,
  };
}

function mapTenupRowToNationalPlayer(row: {
  id: number;
  idcrm: number;
  nom: string | null;
  prenom: string | null;
  nom_complet: string | null;
  classement: number;
  points: number | null;
  evolution: number | null;
  meilleur_classement: number | null;
  nationalite: string | null;
  age_sportif: number | null;
  nombre_tournois: number | null;
  ligue: string | null;
  sexe: string | null;
  date_classement: string;
  ranking_year: number;
  ranking_month: number;
}): SupabaseNationalPlayer {
  // Utiliser nom_complet s'il existe, sinon combiner nom + prenom
  const fullName = (row.nom_complet || `${row.prenom || ''} ${row.nom || ''}`).trim();
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
    id: row.idcrm.toString(), // Convertir idcrm en string pour l'id
    first_name: firstName || '',
    last_name: lastName || '',
    license_number: row.idcrm.toString(), // idcrm remplace licence
    ranking: row.classement,
    best_ranking: row.meilleur_classement ?? row.classement,
    points: row.points ?? 0,
    league: row.ligue ?? '',
    birth_year: row.age_sportif ?? 0, // age_sportif remplace annee_naissance
    nationality: row.nationalite ?? '',
    gender: row.sexe === 'H' ? 'men' : 'women', // H -> men, F -> women
    tournaments_count: row.nombre_tournois ?? 0, // nombre_tournois remplace nb_tournois
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
  club_id: string | null;
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

  created_at: string;
  updated_at: string;
}

// Return shape compatible with the app's existing Tournament interface used in pages
export type AppTournament = {
  id: string;
  name: string;
  date: string;
  location: string;
  club_id?: string;
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

};

function mapTournamentRow(row: SupabaseTournamentRow): AppTournament {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location,
    club_id: row.club_id ?? undefined,
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
      club_id: input.club_id || null,
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
    const payload: Record<string, any> = {};
    const assign = (k: string, v: any) => { if (typeof v !== 'undefined') payload[k] = v; };
    assign('name', patch.name);
    assign('date', patch.date);
    assign('location', patch.location);
    assign('club_id', patch.club_id ?? null);
    assign('organizer_id', patch.organizer_id);
    assign('teams_locked', patch.teams_locked);
    assign('format_id', patch.format_id as any);
    assign('level', patch.level);
    assign('start_time', patch.start_time);
    assign('number_of_courts', patch.number_of_courts);
    assign('number_of_teams', patch.number_of_teams);
    assign('conditions', patch.conditions);
    assign('type', patch.type);
    assign('bracket', patch.bracket ?? null);
    assign('format_json', patch.format_json ?? null);
    assign('random_assignments', patch.random_assignments ?? null);


    const { data, error } = await supabase
      .from('tournaments')
      .update(payload as Partial<SupabaseTournamentRow>)
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
  license_number: string;
  first_name: string;
  last_name: string;
  ranking: number;
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
    playerA: { id: string; license_number: string; first_name: string; last_name: string; ranking: number; gender: 'Mr' | 'Mme'; year_of_birth?: number },
    playerB: { id: string; license_number: string; first_name: string; last_name: string; ranking: number; gender: 'Mr' | 'Mme'; year_of_birth?: number }
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
      gender: playerA.gender,
      birth_year: playerA.year_of_birth,
    });
    const snapB = await tournamentPlayersAPI.ensureSnapshot(tournamentId, {
      license_number: playerB.license_number,
      first_name: playerB.first_name,
      last_name: playerB.last_name,
      ranking: playerB.ranking,
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

// Tournament Matches API (minimal; extend as needed)
export interface SupabaseTournamentMatchRow {
  id: string;
  owner_id: string;
  tournament_id: string;
  round: string;
  team_1_id: string | null;
  team_2_id: string | null;
  winner_team_id: string | null;
  score: string | null;
  order_index: number;
  terrain_number: number | null;
  match_type: string;
  bracket_type: string | null;
  json_match_id: number | null;
  rotation_group: string | null;
  stage: string | null;
  bracket_location: string | null;
  ranking_game: boolean | null;
  ranking_label: string | null;
  team1_source: string | null;
  team2_source: string | null;
  created_at: string;
  updated_at: string;
}

export const tournamentMatchesAPI = {
  listByTournament: async (tournamentId: string): Promise<SupabaseTournamentMatchRow[]> => {
    const { data, error } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('order_index', { ascending: true });
    if (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
    return (data as unknown as SupabaseTournamentMatchRow[]) || [];
  },
  // Update dependents in DB using W_X / L_X references only from DB state
  updateDependentMatches: async (
    tournamentId: string,
    jsonMatchId: number | string
  ): Promise<void> => {
    const idNum = typeof jsonMatchId === 'number' ? jsonMatchId : Number(jsonMatchId);
    if (!Number.isFinite(idNum)) return;
    const rows = await tournamentMatchesAPI.listByTournament(tournamentId);
    const src = rows.find(r => (r.json_match_id as any) === idNum);
    if (!src) return;
    const winnerId = src.winner_team_id || null;
    let loserId: string | null = null;
    if (src.team_1_id && src.team_2_id && winnerId) {
      loserId = src.team_1_id === winnerId ? src.team_2_id : src.team_1_id;
    }
    const wKey1 = `winner_${idNum}`;
    const wKey2 = `W_${idNum}`;
    const lKey1 = `loser_${idNum}`;
    const lKey2 = `L_${idNum}`;
    const dependents = rows.filter(m => {
      const s1 = m.team1_source || '';
      const s2 = m.team2_source || '';
      return s1 === wKey1 || s2 === wKey1 || s1 === wKey2 || s2 === wKey2 || s1 === lKey1 || s2 === lKey1 || s1 === lKey2 || s2 === lKey2;
    });
    for (const dep of dependents) {
      const patch: Partial<SupabaseTournamentMatchRow> = {};
      if ((dep.team1_source === wKey1 || dep.team1_source === wKey2) && winnerId) patch.team_1_id = winnerId;
      if ((dep.team2_source === wKey1 || dep.team2_source === wKey2) && winnerId) patch.team_2_id = winnerId;
      if ((dep.team1_source === lKey1 || dep.team1_source === lKey2) && loserId) patch.team_1_id = loserId;
      if ((dep.team2_source === lKey1 || dep.team2_source === lKey2) && loserId) patch.team_2_id = loserId;
      if (Object.keys(patch).length > 0) {
        await supabase.from('tournament_matches').update(patch as any).eq('id', dep.id);
      }
    }
  },
  updateByJsonMatch: async (
    tournamentId: string,
    jsonMatchId: number | string,
    patch: Partial<Pick<SupabaseTournamentMatchRow, 'score' | 'winner_team_id' | 'terrain_number' | 'team_1_id' | 'team_2_id'>>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('tournament_matches')
      .update(patch as any)
      .eq('tournament_id', tournamentId)
      .eq('json_match_id', typeof jsonMatchId === 'number' ? jsonMatchId : Number(jsonMatchId))
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('Error updating match:', error);
      return false;
    }
    return true;
  },
  deleteByTournament: async (tournamentId: string): Promise<void> => {
    await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId);
  },

  createMany: async (
    rows: Array<Omit<SupabaseTournamentMatchRow,
      'id' | 'owner_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    if (!rows.length) return true;
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;
    const payload = rows.map(r => ({ ...r, owner_id: ownerId }));
    const { error } = await supabase.from('tournament_matches').insert(payload as any[]);
    if (error) {
      console.error('Error creating matches:', error);
      return false;
    }
    return true;
  },
};





// Tournament Formats API
export interface SupabaseTournamentFormat {
  id: string;
  name: string;
  description: string | null;
  min_players: number;
  max_players: number;
  features: string[];
  format_json: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const tournamentFormatsAPI = {
  // Get all available formats
  getAll: async (): Promise<SupabaseTournamentFormat[]> => {
    const { data, error } = await supabase
      .from('tournament_formats')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tournament formats:', error);
      return [];
    }
    return (data || []) as SupabaseTournamentFormat[];
  },

  // Get format by ID
  getById: async (id: string): Promise<SupabaseTournamentFormat | null> => {
    const { data, error } = await supabase
      .from('tournament_formats')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tournament format:', error);
      return null;
    }
    return data as SupabaseTournamentFormat;
  },

  // Create new format
  create: async (format: Omit<SupabaseTournamentFormat, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseTournamentFormat | null> => {
    const { data, error } = await supabase
      .from('tournament_formats')
      .insert(format)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating tournament format:', error);
      return null;
    }
    return data as SupabaseTournamentFormat;
  },

  // Update format
  update: async (id: string, updates: Partial<SupabaseTournamentFormat>): Promise<SupabaseTournamentFormat | null> => {
    const { data, error } = await supabase
      .from('tournament_formats')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating tournament format:', error);
      return null;
    }
    return data as SupabaseTournamentFormat;
  },

  // Delete format
  delete: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('tournament_formats')
      .delete()
      .eq('id', id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  // Get formats by player count
  getByPlayerCount: async (playerCount: number): Promise<SupabaseTournamentFormat[]> => {
    const { data, error } = await supabase
      .from('tournament_formats')
      .select('*')
      .gte('min_players', playerCount)
      .lte('max_players', playerCount)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching formats by player count:', error);
      return [];
    }
    return (data || []) as SupabaseTournamentFormat[];
  }
};

// User Player Link API
export interface UserPlayerLink {
  id: string;
  user_id: string;
  licence: string;
  created_at: string;
  updated_at: string;
}

export interface UserPlayerLinkWithRanking extends UserPlayerLink {
  // Fields from tenup_latest view
  nom_complet: string | null;
  sexe: string | null;
  classement: number | null;
  evolution: number | null;
  meilleur_classement: number | null;
  nationalite: string | null;
  age_sportif: number | null;
  points: number | null;
  nombre_tournois: number | null;
  ligue: string | null;
  ranking_year: number | null;
  ranking_month: number | null;
}

export const userPlayerLinkAPI = {
  // Get current user's player link with ranking data
  getMyPlayerLink: async (): Promise<UserPlayerLinkWithRanking | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_player_links')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user player link:', error);
      return null;
    }

    if (!data) return null;

    // Get ranking data for this licence
    const { data: rankingData, error: rankingError } = await supabase
      .from('tenup_latest')
      .select('nom_complet, sexe, classement, evolution, meilleur_classement, nationalite, age_sportif, points, nombre_tournois, ligue, ranking_year, ranking_month')
      .eq('idcrm', parseInt(data.licence))
      .maybeSingle();

    if (rankingError) {
      console.error('Error fetching ranking data:', rankingError);
      return null;
    }

    return {
      ...data,
      ...(rankingData || {})
    };
  },

  // Create or update current user's player link
  linkToPlayer: async (licence: string): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = (licence || '').trim();
    if (!trimmed) return { ok: false, error: 'Licence is required' };

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: false, error: 'Not signed in' };

    // Check if licence exists in tenup
    const { data: rankingData, error: rankingError } = await supabase
      .from('tenup_latest')
      .select('idcrm')
      .eq('idcrm', parseInt(trimmed))
      .maybeSingle();

    if (rankingError) {
      console.error('Error checking licence:', rankingError);
      return { ok: false, error: 'Error checking licence' };
    }

    if (!rankingData) {
      return { ok: false, error: 'Licence not found in tenup' };
    }

    // Check if user already has a link
    const { data: existingLink } = await supabase
      .from('user_player_links')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLink) {
      // Update existing link
      const { error } = await supabase
        .from('user_player_links')
        .update({ licence: trimmed, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) return { ok: false, error: error.message };
    } else {
      // Create new link
      const { error } = await supabase
        .from('user_player_links')
        .insert({ user_id: userId, licence: trimmed });

      if (error) return { ok: false, error: error.message };
    }

    return { ok: true };
  },

  // Remove current user's player link
  unlinkPlayer: async (): Promise<{ ok: boolean; error?: string }> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: false, error: 'Not signed in' };

    const { error } = await supabase
      .from('user_player_links')
      .delete()
      .eq('user_id', userId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
};

// User Profile API
export const userProfileAPI = {
  // Récupérer le profil utilisateur depuis les métadonnées
  async getMyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      phone: user.user_metadata?.phone || '',
      licence_number: user.user_metadata?.licence_number || '',
      display_name: user.user_metadata?.display_name || '',
      created_at: user.created_at,
    };
  },

  // Mettre à jour le numéro de licence
  async updateLicenceNumber(licenceNumber: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'User not authenticated' };

    const { error } = await supabase.auth.updateUser({
      data: { 
        ...user.user_metadata,
        licence_number: licenceNumber 
      }
    });

    if (error) {
      console.error('Error updating licence number:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  },

  // Mettre à jour le profil complet
  async updateProfile(updates: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    licence_number?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'User not authenticated' };

    const { error } = await supabase.auth.updateUser({
      data: { 
        ...user.user_metadata,
        ...updates
      }
    });

    if (error) {
      console.error('Error updating profile:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }
};

// Clubs API
export interface SupabaseClubRow {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  country_code: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  manager: string | null;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseClubCourtRow {
  id: string;
  club_id: string;
  court_number: number;
  court_name: string | null;
  court_type: 'inside' | 'outside' | 'covered';
  created_at: string;
  updated_at: string;
}

export type AppClub = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  manager?: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
};

export type AppClubCourt = {
  id: string;
  club_id: string;
  court_number: number;
  court_name?: string;
  court_type: 'inside' | 'outside' | 'covered';
  created_at: string;
  updated_at: string;
};

function mapClubRow(row: SupabaseClubRow): AppClub {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    address: row.address,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    city: row.city ?? undefined,
    postal_code: row.postal_code ?? undefined,
    country: row.country ?? undefined,
    country_code: row.country_code ?? undefined,
    website: row.website ?? undefined,
    instagram: row.instagram ?? undefined,
    facebook: row.facebook ?? undefined,
    manager: row.manager ?? undefined,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapClubCourtRow(row: SupabaseClubCourtRow): AppClubCourt {
  return {
    id: row.id,
    club_id: row.club_id,
    court_number: row.court_number,
    court_name: row.court_name ?? undefined,
    court_type: row.court_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const clubsAPI = {
  // List current user's clubs
  listMy: async (): Promise<AppClub[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clubs:', error);
      return [];
    }
    return ((data as unknown as SupabaseClubRow[]) || []).map(mapClubRow);
  },

  // Get by id (owner-only via RLS)
  getById: async (id: string): Promise<AppClub | null> => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching club by id:', error);
      return null;
    }
    return mapClubRow(data as unknown as SupabaseClubRow);
  },

  // Create new club
  create: async (club: Omit<AppClub, 'id' | 'owner_id' | 'created_at' | 'updated_at'>): Promise<AppClub | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      console.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('clubs')
      .insert({
        owner_id: userId,
        name: club.name,
        address: club.address,
        latitude: club.latitude || null,
        longitude: club.longitude || null,
        city: club.city || null,
        postal_code: club.postal_code || null,
        country: club.country || null,
        country_code: club.country_code || null,
        website: club.website || null,
        instagram: club.instagram || null,
        facebook: club.facebook || null,
        manager: club.manager || null,
        contact_email: club.contact_email,
        contact_phone: club.contact_phone,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating club:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('Table "clubs" does not exist. Please run the SQL schema script in Supabase.');
      }
      return null;
    }
    return mapClubRow(data as unknown as SupabaseClubRow);
  },

  // Update club
  update: async (id: string, updates: Partial<Omit<AppClub, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>): Promise<AppClub | null> => {
    const { data, error } = await supabase
      .from('clubs')
      .update({
        name: updates.name,
        address: updates.address,
        latitude: updates.latitude || null,
        longitude: updates.longitude || null,
        city: updates.city || null,
        postal_code: updates.postal_code || null,
        country: updates.country || null,
        country_code: updates.country_code || null,
        website: updates.website || null,
        instagram: updates.instagram || null,
        facebook: updates.facebook || null,
        manager: updates.manager || null,
        contact_email: updates.contact_email,
        contact_phone: updates.contact_phone,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating club:', error);
      return null;
    }
    return mapClubRow(data as unknown as SupabaseClubRow);
  },

  // Delete club
  delete: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('clubs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting club:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
};

export const clubCourtsAPI = {
  // List courts for a club
  listByClub: async (clubId: string): Promise<AppClubCourt[]> => {
    const { data, error } = await supabase
      .from('club_courts')
      .select('*')
      .eq('club_id', clubId)
      .order('court_number', { ascending: true });

    if (error) {
      console.error('Error fetching club courts:', error);
      return [];
    }
    return ((data as unknown as SupabaseClubCourtRow[]) || []).map(mapClubCourtRow);
  },

  // Create new court
  create: async (court: Omit<AppClubCourt, 'id' | 'created_at' | 'updated_at'>): Promise<AppClubCourt | null> => {
    const { data, error } = await supabase
      .from('club_courts')
      .insert({
        club_id: court.club_id,
        court_number: court.court_number,
        court_name: court.court_name || null,
        court_type: court.court_type,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating club court:', error);
      return null;
    }
    return mapClubCourtRow(data as unknown as SupabaseClubCourtRow);
  },

  // Update court
  update: async (id: string, updates: Partial<Omit<AppClubCourt, 'id' | 'club_id' | 'created_at' | 'updated_at'>>): Promise<AppClubCourt | null> => {
    const { data, error } = await supabase
      .from('club_courts')
      .update({
        court_number: updates.court_number,
        court_name: updates.court_name || null,
        court_type: updates.court_type,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating club court:', error);
      return null;
    }
    return mapClubCourtRow(data as unknown as SupabaseClubCourtRow);
  },

  // Delete court
  delete: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('club_courts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting club court:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
};