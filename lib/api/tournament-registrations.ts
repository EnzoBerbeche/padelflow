import { supabase } from './client';
import { SupabaseTournamentRow, AppTournament, mapTournamentRow } from './tournaments';

// Tournament Registrations API
export interface TournamentRegistrationRow {
  id: string;
  tournament_id: string;
  registration_id: string;
  user_id: string;
  player1_first_name: string;
  player1_last_name: string;
  player1_license_number: string;
  player1_ranking: number | null;
  player1_phone: string | null;
  player1_email: string;
  player2_first_name: string;
  player2_last_name: string;
  player2_license_number: string;
  player2_ranking: number | null;
  player2_phone: string | null;
  player2_email: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'waitlist' | 'cancelled';
  confirmed_at: string | null;
  confirmed_by: string | null;
  payment_status: 'pending' | 'paid' | 'refunded' | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export type AppTournamentRegistration = {
  id: string;
  tournament_id: string;
  registration_id: string;
  user_id: string;
  player1_first_name: string;
  player1_last_name: string;
  player1_license_number: string;
  player1_ranking?: number;
  player1_phone?: string;
  player1_email: string;
  player2_first_name: string;
  player2_last_name: string;
  player2_license_number: string;
  player2_ranking?: number;
  player2_phone?: string;
  player2_email: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'waitlist' | 'cancelled';
  confirmed_at?: string;
  confirmed_by?: string;
  payment_status?: 'pending' | 'paid' | 'refunded';
  payment_id?: string;
  created_at: string;
  updated_at: string;
};

export const tournamentRegistrationsAPI = {
  // Get tournament by registration_id (public access)
  getTournamentByRegistrationId: async (registrationId: string): Promise<AppTournament | null> => {
    console.log('Fetching tournament with registration_id:', registrationId);

    // Try using the SQL function first (bypasses RLS)
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_tournament_by_registration_id', { reg_id: registrationId });

    if (!functionError && functionData && functionData.length > 0) {
      console.log('Tournament found via function:', functionData[0].name);
      return mapTournamentRow(functionData[0] as unknown as SupabaseTournamentRow);
    }

    // Fallback to direct query (uses RLS policy)
    console.log('Trying direct query as fallback...');
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('registration_id', registrationId)
      .eq('registration_enabled', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tournament by registration_id:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return null;
    }

    if (!data) {
      console.log('No tournament found with registration_id:', registrationId);
      // Try to find if tournament exists but registration is disabled
      const { data: tournamentWithoutCheck } = await supabase
        .from('tournaments')
        .select('id, name, registration_id, registration_enabled')
        .eq('registration_id', registrationId)
        .maybeSingle();

      if (tournamentWithoutCheck) {
        console.log('Tournament found but registration disabled:', tournamentWithoutCheck);
      } else {
        console.log('No tournament found with this registration_id at all');
      }
      return null;
    }

    console.log('Tournament found:', data.name);
    return mapTournamentRow(data as unknown as SupabaseTournamentRow);
  },

  // Get current user's registration for a tournament
  getMyRegistration: async (tournamentId: string): Promise<AppTournamentRegistration | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching registration:', error);
      return null;
    }

    if (!data) return null;

    const row = data as unknown as TournamentRegistrationRow;
    return {
      id: row.id,
      tournament_id: row.tournament_id,
      registration_id: row.registration_id,
      user_id: row.user_id,
      player1_first_name: row.player1_first_name,
      player1_last_name: row.player1_last_name,
      player1_license_number: row.player1_license_number,
      player1_ranking: row.player1_ranking ?? undefined,
      player1_phone: row.player1_phone ?? undefined,
      player1_email: row.player1_email,
      player2_first_name: row.player2_first_name,
      player2_last_name: row.player2_last_name,
      player2_license_number: row.player2_license_number,
      player2_ranking: row.player2_ranking ?? undefined,
      player2_phone: row.player2_phone ?? undefined,
      player2_email: row.player2_email,
      status: row.status,
      confirmed_at: row.confirmed_at ?? undefined,
      confirmed_by: row.confirmed_by ?? undefined,
      payment_status: row.payment_status ?? undefined,
      payment_id: row.payment_id ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  // Create registration
  create: async (input: {
    tournament_id: string;
    registration_id: string;
    player1_first_name: string;
    player1_last_name: string;
    player1_license_number: string;
    player1_ranking?: number;
    player1_phone?: string;
    player1_email: string;
    player2_first_name: string;
    player2_last_name: string;
    player2_license_number: string;
    player2_ranking?: number;
    player2_phone?: string;
    player2_email: string;
  }): Promise<AppTournamentRegistration | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      console.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('tournament_registrations')
      .insert({
        tournament_id: input.tournament_id,
        registration_id: input.registration_id,
        user_id: userId,
        player1_first_name: input.player1_first_name,
        player1_last_name: input.player1_last_name,
        player1_license_number: input.player1_license_number,
        player1_ranking: input.player1_ranking ?? null,
        player1_phone: input.player1_phone ?? null,
        player1_email: input.player1_email,
        player2_first_name: input.player2_first_name,
        player2_last_name: input.player2_last_name,
        player2_license_number: input.player2_license_number,
        player2_ranking: input.player2_ranking ?? null,
        player2_phone: input.player2_phone ?? null,
        player2_email: input.player2_email,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating registration:', error);
      return null;
    }

    const row = data as unknown as TournamentRegistrationRow;
    return {
      id: row.id,
      tournament_id: row.tournament_id,
      registration_id: row.registration_id,
      user_id: row.user_id,
      player1_first_name: row.player1_first_name,
      player1_last_name: row.player1_last_name,
      player1_license_number: row.player1_license_number,
      player1_ranking: row.player1_ranking ?? undefined,
      player1_phone: row.player1_phone ?? undefined,
      player1_email: row.player1_email,
      player2_first_name: row.player2_first_name,
      player2_last_name: row.player2_last_name,
      player2_license_number: row.player2_license_number,
      player2_ranking: row.player2_ranking ?? undefined,
      player2_phone: row.player2_phone ?? undefined,
      player2_email: row.player2_email,
      status: row.status,
      confirmed_at: row.confirmed_at ?? undefined,
      confirmed_by: row.confirmed_by ?? undefined,
      payment_status: row.payment_status ?? undefined,
      payment_id: row.payment_id ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  // Get all registrations for a tournament (owner-only via RLS)
  listByTournament: async (tournamentId: string): Promise<AppTournamentRegistration[]> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching registrations:', error);
      return [];
    }

    return ((data || []) as unknown as TournamentRegistrationRow[]).map(row => ({
      id: row.id,
      tournament_id: row.tournament_id,
      registration_id: row.registration_id,
      user_id: row.user_id,
      player1_first_name: row.player1_first_name,
      player1_last_name: row.player1_last_name,
      player1_license_number: row.player1_license_number,
      player1_ranking: row.player1_ranking ?? undefined,
      player1_phone: row.player1_phone ?? undefined,
      player1_email: row.player1_email,
      player2_first_name: row.player2_first_name,
      player2_last_name: row.player2_last_name,
      player2_license_number: row.player2_license_number,
      player2_ranking: row.player2_ranking ?? undefined,
      player2_phone: row.player2_phone ?? undefined,
      player2_email: row.player2_email,
      status: row.status,
      confirmed_at: row.confirmed_at ?? undefined,
      confirmed_by: row.confirmed_by ?? undefined,
      payment_status: row.payment_status ?? undefined,
      payment_id: row.payment_id ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  // Get all registrations for a tournament by registration_id (public access)
  listByRegistrationId: async (registrationId: string): Promise<AppTournamentRegistration[]> => {
    // First get the tournament to get the tournament_id
    const tournament = await tournamentRegistrationsAPI.getTournamentByRegistrationId(registrationId);
    if (!tournament) {
      return [];
    }

    // Then get all registrations for this tournament
    // This uses the same RLS policy, but since we got the tournament via public access,
    // we can use the tournament_id to get registrations
    // However, we need a public policy for registrations too
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching registrations by registration_id:', error);
      return [];
    }

    return ((data || []) as unknown as TournamentRegistrationRow[]).map(row => ({
      id: row.id,
      tournament_id: row.tournament_id,
      registration_id: row.registration_id,
      user_id: row.user_id,
      player1_first_name: row.player1_first_name,
      player1_last_name: row.player1_last_name,
      player1_license_number: row.player1_license_number,
      player1_ranking: row.player1_ranking ?? undefined,
      player1_phone: row.player1_phone ?? undefined,
      player1_email: row.player1_email,
      player2_first_name: row.player2_first_name,
      player2_last_name: row.player2_last_name,
      player2_license_number: row.player2_license_number,
      player2_ranking: row.player2_ranking ?? undefined,
      player2_phone: row.player2_phone ?? undefined,
      player2_email: row.player2_email,
      status: row.status,
      confirmed_at: row.confirmed_at ?? undefined,
      confirmed_by: row.confirmed_by ?? undefined,
      payment_status: row.payment_status ?? undefined,
      payment_id: row.payment_id ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  // Delete registration
  delete: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      return { ok: false, error: 'Utilisateur non authentifie' };
    }

    console.log('Deleting registration:', id, 'for user:', userId);

    // First verify the registration exists and belongs to the user
    const { data: registrationData, error: checkError } = await supabase
      .from('tournament_registrations')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking registration:', checkError);
      return { ok: false, error: 'Erreur lors de la verification de l\'inscription' };
    }

    if (!registrationData) {
      console.warn('Registration not found or user not authorized');
      return { ok: false, error: 'Inscription introuvable ou vous n\'etes pas autorise a la supprimer' };
    }

    // Delete the registration (RLS policy will enforce user_id check)
    const { error } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting registration:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      // Check if it's an RLS policy error
      if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
        return { ok: false, error: 'Vous n\'etes pas autorise a supprimer cette inscription. Verifiez que la politique RLS "Users can delete their own registrations" est creee dans Supabase.' };
      }

      return { ok: false, error: error.message || 'Erreur lors de la suppression' };
    }

    console.log('Registration deleted successfully');
    return { ok: true };
  },

  // Update registration (for modifications)
  update: async (id: string, updates: Partial<AppTournamentRegistration>): Promise<AppTournamentRegistration | null> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .update({
        player1_first_name: updates.player1_first_name,
        player1_last_name: updates.player1_last_name,
        player1_license_number: updates.player1_license_number,
        player1_ranking: updates.player1_ranking ?? null,
        player1_phone: updates.player1_phone ?? null,
        player1_email: updates.player1_email,
        player2_first_name: updates.player2_first_name,
        player2_last_name: updates.player2_last_name,
        player2_license_number: updates.player2_license_number,
        player2_ranking: updates.player2_ranking ?? null,
        player2_phone: updates.player2_phone ?? null,
        player2_email: updates.player2_email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating registration:', error);
      return null;
    }

    const row = data as unknown as TournamentRegistrationRow;
    return {
      id: row.id,
      tournament_id: row.tournament_id,
      registration_id: row.registration_id,
      user_id: row.user_id,
      player1_first_name: row.player1_first_name,
      player1_last_name: row.player1_last_name,
      player1_license_number: row.player1_license_number,
      player1_ranking: row.player1_ranking ?? undefined,
      player1_phone: row.player1_phone ?? undefined,
      player1_email: row.player1_email,
      player2_first_name: row.player2_first_name,
      player2_last_name: row.player2_last_name,
      player2_license_number: row.player2_license_number,
      player2_ranking: row.player2_ranking ?? undefined,
      player2_phone: row.player2_phone ?? undefined,
      player2_email: row.player2_email,
      status: row.status,
      confirmed_at: row.confirmed_at ?? undefined,
      confirmed_by: row.confirmed_by ?? undefined,
      payment_status: row.payment_status ?? undefined,
      payment_id: row.payment_id ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },
};
