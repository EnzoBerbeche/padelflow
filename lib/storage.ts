import { v4 as uuidv4 } from 'uuid';
import { CSVParser } from './csv-parser';

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
  conditions: 'inside' | 'outside' | 'both';
  type: 'All' | 'Men' | 'Women' | 'Mixed';
  bracket?: any; // Add bracket property for tree-based bracket structure
  created_at: string;
  updated_at: string;
  // Champs dynamiques pour le format JSON et les randoms
  format_json?: any;
  random_assignments?: Record<string, any>;
  // Registration link functionality
  registration_enabled: boolean;
  registration_link_id?: string;
}

export interface RegistrationLink {
  id: string;
  tournament_id: string;
  link_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  formats: 'padelflow_formats',
  matches: 'padelflow_matches',
  tournament_teams: 'padelflow_tournament_teams',
  team_players: 'padelflow_team_players',
  registration_links: 'padelflow_registration_links',
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

// Initialize default formats and demo data
const initializeData = () => {
  // Initialize formats - REMOVED ALL DEFAULT FORMATS
  const formats = getFromStorage<TournamentFormat>(STORAGE_KEYS.formats);
  // No default formats will be created

  // Initialize comprehensive player database
  const players = getFromStorage<Player>(STORAGE_KEYS.players);
  
  if (players.length < 48) {
    // Create 48 diverse fake players with realistic data
    const fakePlayersData = [
      // Spanish players
      { first: 'Carlos', last: 'Rodriguez', ranking: 150, license: 'ESP001' },
      { first: 'Maria', last: 'Garcia', ranking: 180, license: 'ESP002' },
      { first: 'Juan', last: 'Martinez', ranking: 200, license: 'ESP003' },
      { first: 'Ana', last: 'Lopez', ranking: 170, license: 'ESP004' },
      { first: 'Diego', last: 'Sanchez', ranking: 220, license: 'ESP005' },
      { first: 'Carmen', last: 'Fernandez', ranking: 160, license: 'ESP006' },
      { first: 'Pablo', last: 'Gonzalez', ranking: 190, license: 'ESP007' },
      { first: 'Sofia', last: 'Ruiz', ranking: 175, license: 'ESP008' },
      { first: 'Miguel', last: 'Jimenez', ranking: 210, license: 'ESP009' },
      { first: 'Elena', last: 'Moreno', ranking: 185, license: 'ESP010' },
      { first: 'Alejandro', last: 'Alvarez', ranking: 195, license: 'ESP011' },
      { first: 'Lucia', last: 'Romero', ranking: 165, license: 'ESP012' },
      
      // French players
      { first: 'Pierre', last: 'Dubois', ranking: 140, license: 'FRA001' },
      { first: 'Marie', last: 'Martin', ranking: 155, license: 'FRA002' },
      { first: 'Antoine', last: 'Bernard', ranking: 225, license: 'FRA003' },
      { first: 'Camille', last: 'Petit', ranking: 145, license: 'FRA004' },
      { first: 'Nicolas', last: 'Robert', ranking: 205, license: 'FRA005' },
      { first: 'Julie', last: 'Richard', ranking: 175, license: 'FRA006' },
      { first: 'Thomas', last: 'Durand', ranking: 180, license: 'FRA007' },
      { first: 'Sarah', last: 'Leroy', ranking: 190, license: 'FRA008' },
      { first: 'Maxime', last: 'Moreau', ranking: 215, license: 'FRA009' },
      { first: 'Chloe', last: 'Simon', ranking: 160, license: 'FRA010' },
      { first: 'Julien', last: 'Laurent', ranking: 170, license: 'FRA011' },
      { first: 'Emma', last: 'Lefebvre', ranking: 185, license: 'FRA012' },
      
      // Italian players
      { first: 'Marco', last: 'Rossi', ranking: 135, license: 'ITA001' },
      { first: 'Giulia', last: 'Bianchi', ranking: 165, license: 'ITA002' },
      { first: 'Andrea', last: 'Ferrari', ranking: 195, license: 'ITA003' },
      { first: 'Francesca', last: 'Romano', ranking: 150, license: 'ITA004' },
      { first: 'Matteo', last: 'Esposito', ranking: 210, license: 'ITA005' },
      { first: 'Chiara', last: 'Bruno', ranking: 175, license: 'ITA006' },
      { first: 'Luca', last: 'Gallo', ranking: 185, license: 'ITA007' },
      { first: 'Valentina', last: 'Conti', ranking: 155, license: 'ITA008' },
      { first: 'Alessandro', last: 'De Luca', ranking: 200, license: 'ITA009' },
      { first: 'Martina', last: 'Mancini', ranking: 170, license: 'ITA010' },
      { first: 'Davide', last: 'Costa', ranking: 190, license: 'ITA011' },
      { first: 'Silvia', last: 'Ricci', ranking: 180, license: 'ITA012' },
      
      // Portuguese players
      { first: 'João', last: 'Silva', ranking: 145, license: 'POR001' },
      { first: 'Ana', last: 'Santos', ranking: 160, license: 'POR002' },
      { first: 'Pedro', last: 'Oliveira', ranking: 220, license: 'POR003' },
      { first: 'Catarina', last: 'Pereira', ranking: 175, license: 'POR004' },
      { first: 'Miguel', last: 'Costa', ranking: 195, license: 'POR005' },
      { first: 'Sofia', last: 'Rodrigues', ranking: 165, license: 'POR006' },
      { first: 'Tiago', last: 'Fernandes', ranking: 185, license: 'POR007' },
      { first: 'Mariana', last: 'Gomes', ranking: 155, license: 'POR008' },
      { first: 'Ricardo', last: 'Alves', ranking: 205, license: 'POR009' },
      { first: 'Beatriz', last: 'Martins', ranking: 170, license: 'POR010' },
      { first: 'Bruno', last: 'Carvalho', ranking: 180, license: 'POR011' },
      { first: 'Inês', last: 'Sousa', ranking: 190, license: 'POR012' },
    ];

    const newPlayers: Player[] = fakePlayersData.map((playerData, index) => {
      // Generate 7-8 character license number
      const licenseNumber = playerData.license.padEnd(7, '0').substring(0, 7 + (index % 2)); // 7 or 8 characters
      
      // Generate year of birth (1980-2000)
      const yearOfBirth = 1980 + (index % 20);
      
      return {
        id: generateId(),
        license_number: licenseNumber,
        first_name: playerData.first,
        last_name: playerData.last,
        ranking: playerData.ranking,
        email: `${playerData.first.toLowerCase()}.${playerData.last.toLowerCase()}@email.com`,
        phone: `+33 6 ${String(Math.floor(Math.random() * 90000000) + 10000000).slice(0, 2)} ${String(Math.floor(Math.random() * 90000000) + 10000000).slice(2, 4)} ${String(Math.floor(Math.random() * 90000000) + 10000000).slice(4, 6)} ${String(Math.floor(Math.random() * 90000000) + 10000000).slice(6, 8)}`,
        club: `Club Padel ${String.fromCharCode(65 + (index % 5))}`, // Club A, B, C, D, E
        year_of_birth: yearOfBirth, // NEW: Year of birth as integer
        date_of_birth: new Date(yearOfBirth, (index % 12), 1 + (index % 28)).toISOString().split('T')[0], // OLD: Keep for migration
        gender: index % 2 === 0 ? 'Mr' : 'Mme', // Alternating Mr/Mme
        organizer_id: 'demo-user-123',
        owner_id: 'demo-user-123', // Legacy demo players - visible to everyone
        created_at: now(),
        updated_at: now(),
      };
    });

    // Merge with existing players and save
    const allPlayers = [...players, ...newPlayers];
    saveToStorage(STORAGE_KEYS.players, allPlayers);
  }

  // Initialize demo tournament if none exists
  const tournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
  if (tournaments.length === 0) {
    const demoTournament: Tournament = {
      id: generateId(),
      name: 'Spring Championship 2024',
      date: '2024-04-15',
      location: 'Madrid Sports Center',
      organizer_id: 'demo-user-123',
      owner_id: 'demo-user-123', // Legacy demo tournament - visible to everyone
      public_id: 'demo123',
      teams_locked: false,
      level: 'P500',
      start_time: '09:00',
      number_of_courts: 4,
      conditions: 'outside',
      type: 'Mixed',
      created_at: now(),
      updated_at: now(),
      registration_enabled: false, // Default to false
    };
    saveToStorage(STORAGE_KEYS.tournaments, [demoTournament]);
  }
};

// Clear all formats from storage
const clearAllFormats = () => {
  if (typeof window !== 'undefined') {
    saveToStorage(STORAGE_KEYS.formats, []);
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
    getAll: (organizer_id: string): Tournament[] => {
      return getFromStorage<Tournament>(STORAGE_KEYS.tournaments)
        .filter(t => t.organizer_id === organizer_id);
    },
    
    getCurrentUserTournaments: (currentUserId: string): Tournament[] => {
      const allTournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
      return allTournaments.filter(t => {
        // Show tournaments owned by current user
        if (t.owner_id === currentUserId) return true;
        // Show legacy tournaments (without owner_id) to everyone
        if (!t.owner_id) return true;
        // Hide tournaments owned by other users
        return false;
      });
    },
    
    getById: (id: string): Tournament | null => {
      return getFromStorage<Tournament>(STORAGE_KEYS.tournaments)
        .find(t => t.id === id) || null;
    },
    
    getByPublicId: (public_id: string): Tournament | null => {
      return getFromStorage<Tournament>(STORAGE_KEYS.tournaments)
        .find(t => t.public_id === public_id) || null;
    },
    
    create: (data: Omit<Tournament, 'id' | 'public_id' | 'created_at' | 'updated_at'>): Tournament => {
      const tournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
      const tournament: Tournament = {
        ...data,
        id: generateId(),
        public_id: generatePublicId(),
        registration_enabled: false, // Default to false
        created_at: now(),
        updated_at: now(),
      };
      tournaments.push(tournament);
      saveToStorage(STORAGE_KEYS.tournaments, tournaments);
      return tournament;
    },
    
    update: (id: string, data: Partial<Tournament>): Tournament | null => {
      const tournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
      const index = tournaments.findIndex(t => t.id === id);
      if (index === -1) return null;
      
      tournaments[index] = {
        ...tournaments[index],
        ...data,
        updated_at: now(),
      };
      saveToStorage(STORAGE_KEYS.tournaments, tournaments);
      return tournaments[index];
    },
    
    delete: (id: string): boolean => {
      const tournaments = getFromStorage<Tournament>(STORAGE_KEYS.tournaments);
      const index = tournaments.findIndex(t => t.id === id);
      if (index === -1) return false;
      
      tournaments.splice(index, 1);
      saveToStorage(STORAGE_KEYS.tournaments, tournaments);
      
      // Also delete related records
      const matches = getFromStorage<Match>(STORAGE_KEYS.matches);
      const tournamentTeams = getFromStorage<TournamentTeam>(STORAGE_KEYS.tournament_teams);
      
      saveToStorage(STORAGE_KEYS.matches, 
        matches.filter(m => m.tournament_id !== id));
      saveToStorage(STORAGE_KEYS.tournament_teams, 
        tournamentTeams.filter(tt => tt.tournament_id !== id));
      
      return true;
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
      return getFromStorage<TournamentFormat>(STORAGE_KEYS.formats)
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

  // Registration Links
  registrationLinks: {
    getByTournament: (tournament_id: string): RegistrationLink | null => {
      const links = getFromStorage<RegistrationLink>(STORAGE_KEYS.registration_links);
      return links.find(link => link.tournament_id === tournament_id) || null;
    },
    
    getByLinkId: (link_id: string): RegistrationLink | null => {
      const links = getFromStorage<RegistrationLink>(STORAGE_KEYS.registration_links);
      return links.find(link => link.link_id === link_id && link.is_active) || null;
    },
    
    create: (tournament_id: string): RegistrationLink => {
      const links = getFromStorage<RegistrationLink>(STORAGE_KEYS.registration_links);
      
      // Deactivate any existing links for this tournament
      links.forEach(link => {
        if (link.tournament_id === tournament_id) {
          link.is_active = false;
          link.updated_at = now();
        }
      });
      
      const link_id = generatePublicId();
      const registrationLink: RegistrationLink = {
        id: generateId(),
        tournament_id,
        link_id,
        is_active: true,
        created_at: now(),
        updated_at: now(),
      };
      
      links.push(registrationLink);
      saveToStorage(STORAGE_KEYS.registration_links, links);
      return registrationLink;
    },
    
    deactivate: (tournament_id: string): boolean => {
      const links = getFromStorage<RegistrationLink>(STORAGE_KEYS.registration_links);
      const link = links.find(l => l.tournament_id === tournament_id && l.is_active);
      if (!link) return false;
      
      link.is_active = false;
      link.updated_at = now();
      saveToStorage(STORAGE_KEYS.registration_links, links);
      return true;
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
    
    importFromCSV: (csvContent: string, gender: 'men' | 'women'): void => {
      const players = CSVParser.parseNationalPlayersCSV(csvContent, gender, {
        delimiter: ',',
        skipEmptyLines: true
      });
      
      // For large datasets, we'll store only essential fields to save space
      const compressedPlayers = players.map(player => ({
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        license_number: player.license_number,
        ranking: player.ranking,
        club: player.club,
        gender: player.gender,
        // Store other fields only if needed for search
        best_ranking: player.best_ranking,
        points: player.points,
        league: player.league,
        birth_year: player.birth_year,
        nationality: player.nationality,
        tournaments_count: player.tournaments_count,
        last_updated: player.last_updated,
      }));
      
      // Replace existing data for this gender
      const existingPlayers = getFromStorage<NationalPlayer>(STORAGE_KEYS.national_players);
      const otherGenderPlayers = existingPlayers.filter(p => p.gender !== gender);
      const allPlayers = [...otherGenderPlayers, ...compressedPlayers];
      
      saveToStorage(STORAGE_KEYS.national_players, allPlayers);
    },
    
    clear: (): void => {
      saveToStorage(STORAGE_KEYS.national_players, []);
    },
  },
};