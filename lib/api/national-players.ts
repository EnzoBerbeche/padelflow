import { supabase, sanitizeForLike } from './client';

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

// Internal TenUp row type
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

// Shared utility to split full name into first/last name
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: '', lastName: parts[0] };
  }
  const lastName = parts.pop() as string;
  return { firstName: parts.join(' '), lastName };
}

// Shared utility to format ranking date
function formatRankingDate(year: number, month: number): string {
  return new Date(Date.UTC(year, (month || 1) - 1, 1)).toISOString();
}

// Legacy mapping function - kept for backward compatibility
export function mapRankingRowToNationalPlayer(row: {
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
  const { firstName, lastName } = splitFullName(row.nom || '');

  return {
    id: row.id_unique,
    first_name: firstName,
    last_name: lastName,
    license_number: row.licence,
    ranking: row.rang,
    best_ranking: row.meilleur_classement ?? row.rang,
    points: row.points ?? 0,
    league: row.ligue ?? '',
    birth_year: row.annee_naissance ?? 0,
    nationality: row.nationalite ?? '',
    gender: row.genre === 'Homme' ? 'men' : 'women',
    tournaments_count: row.nb_tournois ?? 0,
    last_updated: formatRankingDate(row.ranking_year, row.ranking_month),
  };
}

// Main mapping function for TenUp data
export function mapTenupRowToNationalPlayer(row: TenupRow): SupabaseNationalPlayer {
  const fullName = row.nom_complet || `${row.prenom || ''} ${row.nom || ''}`;
  const { firstName, lastName } = splitFullName(fullName);

  return {
    id: row.idcrm.toString(),
    first_name: firstName,
    last_name: lastName,
    license_number: row.idcrm.toString(),
    ranking: row.classement,
    best_ranking: row.meilleur_classement ?? row.classement,
    points: row.points ?? 0,
    league: row.ligue ?? '',
    birth_year: row.age_sportif ?? 0,
    nationality: row.nationalite ?? '',
    gender: row.sexe === 'H' ? 'men' : 'women',
    tournaments_count: row.nombre_tournois ?? 0,
    last_updated: formatRankingDate(row.ranking_year, row.ranking_month),
  };
}

// Flag for checking configuration status
const isConfigured = true;

// National Players API
export const nationalPlayersAPI = {
  // Get all players
  getAll: async (): Promise<SupabaseNationalPlayer[]> => {
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
        const sanitized = sanitizeForLike(t);
        const isNumber = !isNaN(Number(t));
        if (isNumber) {
          // For numeric tokens, search in both name and idcrm
          orConditions.push(`nom_complet.ilike.*${sanitized}*`);
          orConditions.push(`idcrm.eq.${t}`);
        } else {
          // For text tokens, search only in name
          orConditions.push(`nom_complet.ilike.*${sanitized}*`);
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
