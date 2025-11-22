import { supabase } from './client';

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
