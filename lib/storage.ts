import { v4 as uuidv4 } from 'uuid';

// Types
export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  organizer_id: string;
  owner_id?: string; // Clerk user ID who created the tournament
  public_id: string;
  teams_locked: boolean;
  format_id?: string;
  // New fields
  level: 'P25' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P1500' | 'P2000';
  start_time: string;
  number_of_courts: number;
  number_of_teams: number; // Number of teams that can participate
  conditions: 'inside' | 'outside' | 'both';
  type: 'All' | 'Men' | 'Women' | 'Mixed';
  bracket?: any; // Add bracket property for tree-based bracket structure
  created_at: string;
  updated_at: string;
  // Champs dynamiques pour le format JSON et les randoms
  format_json?: any;
  random_assignments?: Record<string, any>;

}



export interface Player {
  id: string;
  license_number: string;
  first_name: string;
  last_name: string;
  ranking: number;
  email?: string;
  phone?: string;
  club: string;
  year_of_birth: number; // NEW: Year of birth as integer
  date_of_birth: string; // OLD: Will be removed after migration
  gender: 'Mr' | 'Mme';
  organizer_id: string;
  owner_id?: string; // Clerk user ID who created the player
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  weight: number;
  seed_number?: number;
  is_wo?: boolean; // New field for WO teams
  created_at: string;
  updated_at: string;
}

export interface TournamentFormat {
  id: string;
  name: string;
  description?: string;
  min_teams: number;
  max_teams: number;
  is_public: boolean;
  bracket_structure?: any;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: string;
  team_1_id?: string;
  team_2_id?: string;
  winner_team_id?: string;
  score?: string;
  order_index: number;
  terrain_number?: number;
  match_type: string;
  bracket_type?: 'main' | 'ranking'; // New field for double entry
  // New JSON format fields
  json_match_id?: number;
  rotation_group?: string;
  stage?: string;
  bracket_location?: string; // Add bracket_location for dynamic grouping
  ranking_game?: boolean;
  ranking_label?: string;
  team1_source?: string;
  team2_source?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamWithPlayers extends Team {
  players: Player[];
}

export interface MatchWithTeams extends Match {
  team_1?: Team;
  team_2?: Team;
  winner_team?: Team;
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  team_id: string;
  created_at: string;
}

export interface TeamPlayer {
  id: string;
  team_id: string;
  player_id: string;
  created_at: string;
}

export interface NationalPlayer {
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
}

// Storage keys
const STORAGE_KEYS = {
  tournaments: 'padelflow_tournaments',
  players: 'padelflow_players',
  teams: 'padelflow_teams',
  matches: 'padelflow_matches',
  tournament_teams: 'padelflow_tournament_teams',
  team_players: 'padelflow_team_players',
  tournament_formats: 'padelflow_tournament_formats',
  national_players: 'padelflow_national_players',
};

// Utility functions
const generateId = () => uuidv4();
const generatePublicId = () => Math.random().toString(36).substring(2, 10);
const now = () => new Date().toISOString();

// Storage utilities
const getFromStorage = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

const saveToStorage = <T>(key: string, data: T[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, clearing old data and retrying...');
      // Clear all storage and retry
      localStorage.clear();
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (retryError) {
        console.error('Failed to save data even after clearing storage:', retryError);
        // Show user-friendly error
        alert('Storage limit reached. Please clear some data or use a smaller file.');
      }
    } else {
      console.error('Error writing to localStorage:', error);
    }
  }
};

// Initialize default formats
const initializeData = () => {
  // Initialize formats - REMOVED ALL DEFAULT FORMATS
  const formats = getFromStorage<TournamentFormat>(STORAGE_KEYS.tournament_formats);
  // No default formats will be created
};

// Clear all formats from storage
const clearAllFormats = () => {
  if (typeof window !== 'undefined') {
    saveToStorage(STORAGE_KEYS.tournament_formats, []);
  }
};

// Migration function to update existing players
const migratePlayers = () => {
  const players = getFromStorage<Player>(STORAGE_KEYS.players);
  let hasChanges = false;
  
  const updatedPlayers = players.map(player => {
    const updatedPlayer = { ...player };
    
    // Add year_of_birth if missing
    if (!player.year_of_birth && player.date_of_birth) {
      const birthYear = new Date(player.date_of_birth).getFullYear();
      updatedPlayer.year_of_birth = birthYear;
      hasChanges = true;
    }
    
    // Update license numbers to 7-8 characters if needed
    if (player.license_number.length < 7 || player.license_number.length > 8) {
      updatedPlayer.license_number = player.license_number.padEnd(7, '0').substring(0, 7);
      hasChanges = true;
    }
    
    return updatedPlayer;
  });
  
  if (hasChanges) {
    saveToStorage(STORAGE_KEYS.players, updatedPlayers);
    console.log('🔧 Migrated existing players to new format');
  }
};

// Initialize storage on first load
if (typeof window !== 'undefined') {
  clearAllFormats(); // Clear formats first
  initializeData();
  migratePlayers(); // Migrate existing players
}

// API functions
export const storage = {
  // Tournaments
  tournaments: {
    getAll: (owner_id: string): Tournament[] => {
      return getFromStorage<Tournament>(STORAGE_KEYS.tournaments)
        .filter(t => t.owner_id === owner_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    getById: (id: string): Tournament | null => {
      const tournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
      return tournaments.find(t => t.id === id) || null;
    },

    create: (data: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>): Tournament => {
      const tournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
      const tournament: Tournament = {
        ...data,
        id: generateId(),
        created_at: now(),
        updated_at: now(),
      };
      
      tournaments.push(tournament);
      saveToStorage(STORAGE_KEYS.tournaments, tournaments);
      return tournament;
    },

    update: (id: string, data: Partial<Tournament>): Tournament | null => {
      const tournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
      const tournament = tournaments.find(t => t.id === id);
      if (!tournament) return null;
      
      Object.assign(tournament, data, { updated_at: now() });
      saveToStorage(STORAGE_KEYS.tournaments, tournaments);
      return tournament;
    },

    delete: (tournament_id: string): void => {
      const tournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
      const filtered = tournaments.filter(t => t.id !== tournament_id);
      saveToStorage(STORAGE_KEYS.tournaments, filtered);
      
      // Clean up related data
      const teams = getFromStorage<TournamentTeam>(STORAGE_KEYS.tournament_teams);
      saveToStorage(STORAGE_KEYS.tournament_teams, 
        teams.filter(t => t.tournament_id !== tournament_id));
      
      const matches = getFromStorage<Match>(STORAGE_KEYS.matches);
      saveToStorage(STORAGE_KEYS.matches, 
        matches.filter(m => m.tournament_id !== tournament_id));
    },
  },

  // Players
  players: {
    getAll: (organizer_id: string): Player[] => {
      return getFromStorage<Player>(STORAGE_KEYS.players)
        .filter(p => p.organizer_id === organizer_id);
    },
    
    getCurrentUserPlayers: (currentUserId: string): Player[] => {
      const allPlayers = getFromStorage<Player>(STORAGE_KEYS.players);
      return allPlayers.filter(p => {
        // Show players owned by current user
        if (p.owner_id === currentUserId) return true;
        // Show legacy players (without owner_id) to everyone
        if (!p.owner_id) return true;
        // Hide players owned by other users
        return false;
      });
    },
    
    create: (data: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Player => {
      const players = getFromStorage<Player>(STORAGE_KEYS.players);
      
      // Validate license number uniqueness
      const existingPlayer = players.find(p => p.license_number === data.license_number);
      if (existingPlayer) {
        throw new Error(`Player with license number ${data.license_number} already exists`);
      }
      
      // Validate license number length (7-8 characters)
      if (data.license_number.length < 7 || data.license_number.length > 8) {
        throw new Error('License number must be between 7 and 8 characters');
      }
      
      // Validate year of birth (current year - 100 to current year - 1)
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - 100;
      const maxYear = currentYear - 1;
      if (data.year_of_birth < minYear || data.year_of_birth > maxYear) {
        throw new Error(`Year of birth must be between ${minYear} and ${maxYear}`);
      }
      
      const player: Player = {
        ...data,
        id: generateId(),
        created_at: now(),
        updated_at: now(),
      };
      players.push(player);
      saveToStorage(STORAGE_KEYS.players, players);
      return player;
    },
    
    update: (id: string, data: Partial<Player>): Player | null => {
      const players = getFromStorage<Player>(STORAGE_KEYS.players);
      const index = players.findIndex(p => p.id === id);
      if (index === -1) return null;
      
      // Validate license number uniqueness (if being updated)
      if (data.license_number) {
        const existingPlayer = players.find(p => p.license_number === data.license_number && p.id !== id);
        if (existingPlayer) {
          throw new Error(`Player with license number ${data.license_number} already exists`);
        }
        
        // Validate license number length (7-8 characters)
        if (data.license_number.length < 7 || data.license_number.length > 8) {
          throw new Error('License number must be between 7 and 8 characters');
        }
      }
      
      // Validate year of birth (if being updated)
      if (data.year_of_birth) {
        const currentYear = new Date().getFullYear();
        const minYear = currentYear - 100;
        const maxYear = currentYear - 1;
        if (data.year_of_birth < minYear || data.year_of_birth > maxYear) {
          throw new Error(`Year of birth must be between ${minYear} and ${maxYear}`);
        }
      }
      
      players[index] = {
        ...players[index],
        ...data,
        updated_at: now(),
      };
      saveToStorage(STORAGE_KEYS.players, players);
      return players[index];
    },
    
    delete: (id: string): boolean => {
      const players = getFromStorage<Player>(STORAGE_KEYS.players);
      const index = players.findIndex(p => p.id === id);
      if (index === -1) return false;
      
      players.splice(index, 1);
      saveToStorage(STORAGE_KEYS.players, players);
      
      // Also delete related records
      const teamPlayers = getFromStorage<TeamPlayer>(STORAGE_KEYS.team_players);
      saveToStorage(STORAGE_KEYS.team_players, 
        teamPlayers.filter(tp => tp.player_id !== id));
      
      return true;
    },
  },

  // Teams
  teams: {
    getById: (id: string): Team | null => {
      return getFromStorage<Team>(STORAGE_KEYS.teams)
        .find(t => t.id === id) || null;
    },
    
    create: (data: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Team => {
      const teams = getFromStorage<Team>(STORAGE_KEYS.teams);
      const team: Team = {
        ...data,
        id: generateId(),
        created_at: now(),
        updated_at: now(),
      };
      teams.push(team);
      saveToStorage(STORAGE_KEYS.teams, teams);
      return team;
    },
    
    update: (id: string, data: Partial<Team>): Team | null => {
      const teams = getFromStorage<Team>(STORAGE_KEYS.teams);
      const index = teams.findIndex(t => t.id === id);
      if (index === -1) return null;
      
      teams[index] = {
        ...teams[index],
        ...data,
        updated_at: now(),
      };
      saveToStorage(STORAGE_KEYS.teams, teams);
      return teams[index];
    },
    
    delete: (id: string): boolean => {
      const teams = getFromStorage<Team>(STORAGE_KEYS.teams);
      const index = teams.findIndex(t => t.id === id);
      if (index === -1) return false;
      
      teams.splice(index, 1);
      saveToStorage(STORAGE_KEYS.teams, teams);
      
      // Also delete related records
      const tournamentTeams = getFromStorage<TournamentTeam>(STORAGE_KEYS.tournament_teams);
      const teamPlayers = getFromStorage<TeamPlayer>(STORAGE_KEYS.team_players);
      
      saveToStorage(STORAGE_KEYS.tournament_teams, 
        tournamentTeams.filter(tt => tt.team_id !== id));
      saveToStorage(STORAGE_KEYS.team_players, 
        teamPlayers.filter(tp => tp.team_id !== id));
      
      return true;
    },
  },

  // Tournament Teams
  tournamentTeams: {
    getByTournament: (tournament_id: string): TournamentTeam[] => {
      return getFromStorage<TournamentTeam>(STORAGE_KEYS.tournament_teams)
        .filter(tt => tt.tournament_id === tournament_id);
    },
    
    create: (tournament_id: string, team_id: string): TournamentTeam => {
      const tournamentTeams = getFromStorage<TournamentTeam>(STORAGE_KEYS.tournament_teams);
      const tournamentTeam: TournamentTeam = {
        id: generateId(),
        tournament_id,
        team_id,
        created_at: now(),
      };
      tournamentTeams.push(tournamentTeam);
      saveToStorage(STORAGE_KEYS.tournament_teams, tournamentTeams);
      return tournamentTeam;
    },
  },

  // Team Players
  teamPlayers: {
    getByTeam: (team_id: string): TeamPlayer[] => {
      return getFromStorage<TeamPlayer>(STORAGE_KEYS.team_players)
        .filter(tp => tp.team_id === team_id);
    },
    
    create: (team_id: string, player_id: string): TeamPlayer => {
      const teamPlayers = getFromStorage<TeamPlayer>(STORAGE_KEYS.team_players);
      const teamPlayer: TeamPlayer = {
        id: generateId(),
        team_id,
        player_id,
        created_at: now(),
      };
      teamPlayers.push(teamPlayer);
      saveToStorage(STORAGE_KEYS.team_players, teamPlayers);
      return teamPlayer;
    },
  },

  // Formats
  formats: {
    getPublic: (min_teams: number, max_teams: number): TournamentFormat[] => {
      return getFromStorage<TournamentFormat>(STORAGE_KEYS.tournament_formats)
        .filter(f => f.is_public && f.min_teams <= max_teams && f.max_teams >= min_teams);
    },
  },

  // Matches
  matches: {
    getByTournament: (tournament_id: string): Match[] => {
      return getFromStorage<Match>(STORAGE_KEYS.matches)
        .filter(m => m.tournament_id === tournament_id)
        .sort((a, b) => a.order_index - b.order_index);
    },
    
    create: (data: Omit<Match, 'id' | 'created_at' | 'updated_at'>): Match => {
      const matches = getFromStorage<Match>(STORAGE_KEYS.matches);
      const match: Match = {
        ...data,
        id: generateId(),
        created_at: now(),
        updated_at: now(),
      };
      matches.push(match);
      saveToStorage(STORAGE_KEYS.matches, matches);
      return match;
    },
    
    update: (id: string, data: Partial<Match>): Match | null => {
      const matches = getFromStorage<Match>(STORAGE_KEYS.matches);
      const index = matches.findIndex(m => m.id === id);
      if (index === -1) return null;
      
      matches[index] = {
        ...matches[index],
        ...data,
        updated_at: now(),
      };
      saveToStorage(STORAGE_KEYS.matches, matches);
      return matches[index];
    },
    
    deleteByTournament: (tournament_id: string): void => {
      const matches = getFromStorage<Match>(STORAGE_KEYS.matches);
      saveToStorage(STORAGE_KEYS.matches, 
        matches.filter(m => m.tournament_id !== tournament_id));
    },
  },

  // National Players
  nationalPlayers: {
    getAll: (): NationalPlayer[] => {
      return getFromStorage<NationalPlayer>(STORAGE_KEYS.national_players);
    },
    
    search: (query: string, filters?: {
      gender?: 'men' | 'women';
      rankingMin?: number;
      rankingMax?: number;
      league?: string;
    }): NationalPlayer[] => {
      const players = getFromStorage<NationalPlayer>(STORAGE_KEYS.national_players);
      const queryLower = query.toLowerCase();
      
      return players.filter(player => {
        // Text search
        const matchesQuery = 
          player.first_name.toLowerCase().includes(queryLower) ||
          player.last_name.toLowerCase().includes(queryLower) ||
          player.license_number.toLowerCase().includes(queryLower) ||
          player.club.toLowerCase().includes(queryLower);
        
        if (!matchesQuery) return false;
        
        // Apply filters
        if (filters?.gender && player.gender !== filters.gender) return false;
        if (filters?.rankingMin && player.ranking < filters.rankingMin) return false;
        if (filters?.rankingMax && player.ranking > filters.rankingMax) return false;
        if (filters?.league && player.league !== filters.league) return false;
        
        return true;
      });
    },
    
    clear: (): void => {
      saveToStorage(STORAGE_KEYS.national_players, []);
    },
  },

  // Helper functions for complex queries
  getTeamsWithPlayers: (tournament_id: string): TeamWithPlayers[] => {
    const tournamentTeams = storage.tournamentTeams.getByTournament(tournament_id);
    const teams = getFromStorage<Team>(STORAGE_KEYS.teams);
    const players = getFromStorage<Player>(STORAGE_KEYS.players);
    const teamPlayers = getFromStorage<TeamPlayer>(STORAGE_KEYS.team_players);
    
    return tournamentTeams.map(tt => {
      const team = teams.find(t => t.id === tt.team_id);
      if (!team) return null;
      
      const teamPlayerRecords = teamPlayers.filter(tp => tp.team_id === team.id);
      const teamPlayersData = teamPlayerRecords.map(tp => 
        players.find(p => p.id === tp.player_id)
      ).filter(Boolean) as Player[];
      
      return {
        ...team,
        players: teamPlayersData,
      };
    }).filter(Boolean) as TeamWithPlayers[];
  },
  
  getMatchesWithTeams: (tournament_id: string): MatchWithTeams[] => {
    const matches = storage.matches.getByTournament(tournament_id);
    const teams = getFromStorage<Team>(STORAGE_KEYS.teams);
    
    return matches.map(match => ({
      ...match,
      team_1: match.team_1_id ? teams.find(t => t.id === match.team_1_id) : undefined,
      team_2: match.team_2_id ? teams.find(t => t.id === match.team_2_id) : undefined,
      winner_team: match.winner_team_id ? teams.find(t => t.id === match.winner_team_id) : undefined,
    }));
  },
};