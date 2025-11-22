import { supabase } from './client';

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
  // Recuperer le profil utilisateur depuis les metadonnees
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

  // Mettre a jour le numero de licence
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

  // Mettre a jour le profil complet
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
