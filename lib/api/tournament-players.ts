import { supabase } from './client';

// Tournament Players (Supabase)
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

export function mapTournamentPlayerRow(row: SupabaseTournamentPlayerRow): UITournamentPlayer {
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
