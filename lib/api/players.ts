import { supabase } from './client';

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
