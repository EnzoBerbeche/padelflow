import { supabase } from './client';

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
