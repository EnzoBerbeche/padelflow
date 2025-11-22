import { supabase } from './client';
import { AppTournamentRegistration } from './tournament-registrations';

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
  registration_enabled: boolean;
  registration_id: string | null;
  registration_selection_mode: 'order' | 'ranking' | null;
  registration_waitlist_size: number | null;
  registration_allow_partner_change: boolean;
  registration_deadline: string | null; // ISO date
  registration_modification_deadline: string | null; // ISO date
  registration_payment_enabled: boolean;
  registration_auto_confirm: boolean;

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
  registration_enabled?: boolean;
  registration_id?: string;
  registration_selection_mode?: 'order' | 'ranking';
  registration_waitlist_size?: number;
  registration_allow_partner_change?: boolean;
  registration_deadline?: string;
  registration_modification_deadline?: string;
  registration_payment_enabled?: boolean;
  registration_auto_confirm?: boolean;
};

export function mapTournamentRow(row: SupabaseTournamentRow): AppTournament {
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
    registration_enabled: row.registration_enabled ?? undefined,
    registration_id: row.registration_id ?? undefined,
    registration_selection_mode: row.registration_selection_mode ?? undefined,
    registration_waitlist_size: row.registration_waitlist_size ?? undefined,
    registration_allow_partner_change: row.registration_allow_partner_change ?? undefined,
    registration_deadline: row.registration_deadline ?? undefined,
    registration_modification_deadline: row.registration_modification_deadline ?? undefined,
    registration_payment_enabled: row.registration_payment_enabled ?? undefined,
    registration_auto_confirm: row.registration_auto_confirm ?? undefined,
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

  // Get tournament by id, allowing access if user is registered
  getByIdOrRegistered: async (id: string): Promise<AppTournament | null> => {
    // First try as owner
    let tournamentData = await tournamentsAPI.getById(id);
    if (tournamentData) {
      return tournamentData;
    }

    // If not found, check if user is registered
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    // Check if user has a registration for this tournament
    const { data: registrationData, error: regError } = await supabase
      .from('tournament_registrations')
      .select('tournament_id')
      .eq('tournament_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (regError || !registrationData) {
      return null;
    }

    // User is registered, try to get tournament (may need RLS policy update)
    // For now, we'll use a workaround: get via public_id if available
    // Or we need to add an RLS policy that allows registered users to read tournaments
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tournament by id (registered user):', error);
      return null;
    }

    return mapTournamentRow(data as unknown as SupabaseTournamentRow);
  },

  // List all tournaments (for search - all users can see all tournaments)
  listAll: async (): Promise<(AppTournament & { club_name?: string })[]> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        club:clubs (
          name
        )
      `)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching all tournaments:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      // If RLS policy error, suggest running the SQL script
      if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
        console.error('This might be an RLS policy issue. Make sure you have run scripts/add-public-read-tournaments-policy.sql in Supabase.');
      }
      return [];
    }
    return ((data || []) as any[]).map((row: any) => ({
      ...mapTournamentRow(row as unknown as SupabaseTournamentRow),
      club_name: Array.isArray(row.club) && row.club.length > 0 ? row.club[0].name : (row.club?.name || null),
    }));
  },

  // List tournaments for clubs managed by the current user (club role)
  listForManagedClubs: async (): Promise<(AppTournament & { club_name?: string })[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    // fetch club_ids the user manages
    const { data: managerRows, error: managersError } = await supabase
      .from('club_managers')
      .select('club_id')
      .eq('user_id', userId);

    if (managersError) {
      console.error('Error fetching club managers for user:', managersError);
      return [];
    }

    if (!managerRows || managerRows.length === 0) {
      return [];
    }

    const clubIds = managerRows.map((row: any) => row.club_id);

    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        club:clubs (
          name
        )
      `)
      .in('club_id', clubIds)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching tournaments for managed clubs:', error);
      return [];
    }

    return ((data || []) as any[]).map((row: any) => ({
      ...mapTournamentRow(row as unknown as SupabaseTournamentRow),
      club_name: Array.isArray(row.club) && row.club.length > 0 ? row.club[0].name : (row.club?.name || null),
    }));
  },

  // List tournaments where current user is registered
  listMyRegistrations: async (): Promise<(AppTournament & { registration: AppTournamentRegistration; club_name?: string })[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    // Get all registrations for current user
    const { data: registrations, error: regError } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('user_id', userId);

    if (regError) {
      console.error('Error fetching registrations:', regError);
      return [];
    }

    if (!registrations || registrations.length === 0) {
      return [];
    }

    // Get tournament IDs
    const tournamentIds = registrations.map(r => r.tournament_id);

    // Fetch tournaments with club information
    const { data: tournaments, error: tournamentError } = await supabase
      .from('tournaments')
      .select(`
        *,
        club:clubs (
          name
        )
      `)
      .in('id', tournamentIds)
      .order('date', { ascending: true });

    if (tournamentError) {
      console.error('Error fetching tournaments:', tournamentError);
      return [];
    }

    // Combine tournaments with their registrations
    return (tournaments || []).map((tournament: any) => {
      const registration = registrations.find(r => r.tournament_id === tournament.id);
      return {
        ...mapTournamentRow(tournament as unknown as SupabaseTournamentRow),
        club_name: Array.isArray(tournament.club) && tournament.club.length > 0 ? tournament.club[0].name : (tournament.club?.name || null),
        registration: {
          id: registration!.id,
          tournament_id: registration!.tournament_id,
          registration_id: registration!.registration_id,
          user_id: registration!.user_id,
          player1_first_name: registration!.player1_first_name,
          player1_last_name: registration!.player1_last_name,
          player1_license_number: registration!.player1_license_number,
          player1_ranking: registration!.player1_ranking ?? undefined,
          player1_phone: registration!.player1_phone ?? undefined,
          player1_email: registration!.player1_email,
          player2_first_name: registration!.player2_first_name,
          player2_last_name: registration!.player2_last_name,
          player2_license_number: registration!.player2_license_number,
          player2_ranking: registration!.player2_ranking ?? undefined,
          player2_phone: registration!.player2_phone ?? undefined,
          player2_email: registration!.player2_email,
          status: registration!.status,
          confirmed_at: registration!.confirmed_at ?? undefined,
          confirmed_by: registration!.confirmed_by ?? undefined,
          payment_status: registration!.payment_status ?? undefined,
          payment_id: registration!.payment_id ?? undefined,
          created_at: registration!.created_at,
          updated_at: registration!.updated_at,
        } as AppTournamentRegistration,
      };
    });
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
    // Special handling for club_id: only update if explicitly provided (not undefined)
    // This prevents accidentally clearing club_id when it's not in the patch
    if (typeof patch.club_id !== 'undefined') {
      payload['club_id'] = patch.club_id ?? null;
    }
    assign('name', patch.name);
    assign('date', patch.date);
    assign('location', patch.location);
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
    assign('registration_enabled', patch.registration_enabled ?? false);
    assign('registration_id', patch.registration_id ?? null);
    assign('registration_selection_mode', patch.registration_selection_mode ?? null);
    assign('registration_waitlist_size', patch.registration_waitlist_size ?? null);
    assign('registration_allow_partner_change', patch.registration_allow_partner_change ?? true);
    assign('registration_deadline', patch.registration_deadline ?? null);
    assign('registration_modification_deadline', patch.registration_modification_deadline ?? null);
    assign('registration_payment_enabled', patch.registration_payment_enabled ?? false);
    assign('registration_auto_confirm', patch.registration_auto_confirm ?? true);

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
