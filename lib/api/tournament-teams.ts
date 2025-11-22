import { supabase } from './client';
import {
  SupabaseTournamentPlayerRow,
  UITournamentPlayer,
  mapTournamentPlayerRow,
  tournamentPlayersAPI
} from './tournament-players';

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

export function mapTournamentTeamRow(row: SupabaseTournamentTeamRow): UITeam {
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
