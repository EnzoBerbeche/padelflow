import { createClient } from '@supabase/supabase-js';

// Temporary hardcoded values for testing
const supabaseUrl = 'https://mzffqutucazwexapfyig.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16ZmZxdXR1Y2F6d2V4YXBmeWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4ODk2ODQsImV4cCI6MjA2OTQ2NTY4NH0.orgmjqFM0yIzIHSo44FCLmEyRnSiAujuxp5_QYqRLm0';

// Check if environment variables are set
const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'SET' : 'MISSING',
    key: supabaseAnonKey ? 'SET' : 'MISSING'
  });
  console.error('Please create a .env.local file with your Supabase credentials');
}

// Create client with hardcoded values for now
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// National Players table interface
export interface SupabaseNationalPlayer {
  id: string;
  first_name: string;
  last_name: string;
  license_number: string;
  ranking: number;
  best_ranking: number;
  points: number;
  club: string;
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
    const { data, error } = await supabase
      .from('national_players')
      .select('*')
      .order('ranking', { ascending: true });
    
    if (error) {
      console.error('Error fetching national players:', error);
      return [];
    }
    
    return data || [];
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
    let supabaseQuery = supabase
      .from('national_players')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,license_number.ilike.%${query}%,club.ilike.%${query}%`)
      .order('ranking', { ascending: true });

    // Apply filters
    if (filters?.gender) {
      supabaseQuery = supabaseQuery.eq('gender', filters.gender);
    }
    if (filters?.rankingMin) {
      supabaseQuery = supabaseQuery.gte('ranking', filters.rankingMin);
    }
    if (filters?.rankingMax) {
      supabaseQuery = supabaseQuery.lte('ranking', filters.rankingMax);
    }
    if (filters?.league) {
      supabaseQuery = supabaseQuery.eq('league', filters.league);
    }

    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('Error searching national players:', error);
      return [];
    }
    
    return data || [];
  },

  // Test connection and table existence
  testConnection: async (): Promise<boolean> => {
    if (!isConfigured) {
      console.error('Supabase not configured. Please set up environment variables.');
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('national_players')
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
    players: SupabaseNationalPlayer[], 
    gender: 'men' | 'women'
  ): Promise<boolean> => {
    try {
      console.log(`Starting import of ${players.length} ${gender} players...`);
      
      // Test connection first
      const isConnected = await nationalPlayersAPI.testConnection();
      if (!isConnected) {
        console.error('Cannot connect to Supabase. Check environment variables and table existence.');
        return false;
      }
      
      // First, delete existing players of this gender
      const { error: deleteError } = await supabase
        .from('national_players')
        .delete()
        .eq('gender', gender);
      
      if (deleteError) {
        console.error('Error deleting existing players:', deleteError);
        return false;
      }
      
      console.log(`Deleted existing ${gender} players`);

      // Then insert new players in batches
      const batchSize = 50; // Even smaller batch size for debugging
      let totalInserted = 0;
      
      for (let i = 0; i < players.length; i += batchSize) {
        const batch = players.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(players.length/batchSize)} (${batch.length} players)`);
        
        // Remove id field from batch (let Supabase generate it)
        const batchWithoutId = batch.map(player => {
          const { id, ...playerWithoutId } = player;
          return playerWithoutId;
        });
        
        const { error: insertError } = await supabase
          .from('national_players')
          .insert(batchWithoutId);
        
        if (insertError) {
          console.error('Error inserting batch:', insertError);
          console.error('Batch data sample:', batchWithoutId.slice(0, 2));
          console.error('Supabase URL:', supabaseUrl);
          return false;
        }
        
        totalInserted += batch.length;
      }
      
      console.log(`Successfully imported ${totalInserted} players`);
      return true;
    } catch (error) {
      console.error('Error importing players:', error);
      return false;
    }
  },

  // Clear all players
  clear: async (): Promise<boolean> => {
    const { error } = await supabase
      .from('national_players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (error) {
      console.error('Error clearing players:', error);
      return false;
    }
    
    return true;
  },

  // Get unique leagues for filtering
  getLeagues: async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('national_players')
      .select('league')
      .not('league', 'is', null);
    
    if (error) {
      console.error('Error fetching leagues:', error);
      return [];
    }
    
    const uniqueLeagues = Array.from(new Set(data?.map(p => p.league) || []));
    return uniqueLeagues.sort();
  },
};