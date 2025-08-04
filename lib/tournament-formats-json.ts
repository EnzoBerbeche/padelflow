import fs from 'fs';
import path from 'path';

export interface JsonMatchDefinition {
  id: number;
  rotation_group: string;
  order_index: number;
  stage: string;
  bracket_location: string;
  ranking_game: boolean;
  ranking_label?: string | null;
  team1_source: string;
  team2_source: string;
}

// Interface for the actual JSON format structure used in the files
export interface JsonMatch {
  id: number;
  ordre_match: number;
  source_team_1: string;
  team_1: string;
  score_team_1: number | null;
  source_team_2: string;
  team_2: string;
  score_team_2: number | null;
  terrain: string;
  winner: string;
  looser: string;
}

export interface JsonPhase {
  name: string;
  ordre_phase: number;
  matches: JsonMatch[];
}

export interface JsonRotation {
  name: string;
  phases: JsonPhase[];
}

export interface JsonTournamentFormat {
  format_name: string;
  description: string;
  max_players?: number;
  min_players?: number;
  matches?: JsonMatchDefinition[];
  bracket?: any; // Allow for tree-based bracket
  features?: string[];
  rotations?: JsonRotation[]; // Add the rotations property
}

export interface TournamentFormatConfig {
  name: string;
  description: string;
  min_teams: number;
  max_teams: number;
  total_matches: number;
  format_data: JsonTournamentFormat;
  format_key: string;
}

// Dynamic format loading system
const formatCache: Record<string, TournamentFormatConfig> = {};

// Function to dynamically load and register a format
export async function loadTournamentFormat(formatKey: string): Promise<TournamentFormatConfig | null> {
  try {
    // Dynamic import of the JSON file
    const formatData = await import(`./format_${formatKey}.json`);
    const jsonFormat = formatData.default as JsonTournamentFormat;
    
    const config: TournamentFormatConfig = {
      name: jsonFormat.format_name,
      description: jsonFormat.description,
      min_teams: jsonFormat.min_players || 0,
      max_teams: jsonFormat.max_players || 999,
      total_matches: jsonFormat.matches ? jsonFormat.matches.length : 0,
      format_data: jsonFormat,
      format_key: formatKey
    };
    
    formatCache[formatKey] = config;
    return config;
  } catch (error) {
    console.error(`Failed to load format ${formatKey}:`, error);
    return null;
  }
}

// Function to get all available format keys (you can extend this list)
export const AVAILABLE_FORMAT_KEYS = [
  '8_teams_flat'
  // Add more format keys here as you create them
  // Format: 'format_name' (corresponds to format_format_name.json file)
];

/**
 * HOW TO ADD NEW TOURNAMENT FORMATS:
 * 
 * 1. Create a new JSON file in the lib/ directory with the naming convention:
 *    format_[format_key].json (e.g., format_32_teams_flat.json)
 * 
 * 2. Follow the JSON structure:
 *    {
 *      "format_name": "Display Name",
 *      "description": "Description of the format",
 *      "min_players": 16,
 *      "max_players": 32,
 *      "matches": [
 *        {
 *          "id": 1,
 *          "rotation_group": "Rotation 1",
 *          "order_index": 1,
 *          "stage": "1/8 Finale",
 *          "bracket_location": "Main bracket",
 *          "ranking_game": false,
 *          "team1_source": "TS1",
 *          "team2_source": "random_9_16_1"
 *        }
 *        // ... more matches
 *      ]
 *    }
 * 
 * 3. Add the format key to the AVAILABLE_FORMAT_KEYS array above
 * 
 * 4. The system will automatically load and register your new format!
 * 
 * TEAM SOURCE FORMATS:
 * - TS1, TS2, etc.: Seeded teams (TS = Team Seed)
 * - winner_1, winner_2, etc.: Winners of previous matches
 * - loser_1, loser_2, etc.: Losers of previous matches  
 * - random_9_16_1, random_5_8_2, etc.: Random assignments for specific seed ranges
 */

const FORMATS_DIR = path.resolve(__dirname, 'formats');

// Function to get all available formats
export async function getAllAvailableFormats(): Promise<TournamentFormatConfig[]> {
  // Côté client : fetch sur l'API Next.js
  const res = await fetch('/api/formats');
  if (!res.ok) throw new Error('Failed to fetch formats');
  return await res.json();
}

// Helper function to get available formats for a team count
export async function getAvailableJsonFormats(teamCount: number): Promise<TournamentFormatConfig[]> {
  const allFormats = await getAllAvailableFormats();
  return allFormats.filter(
    format => teamCount >= format.min_teams && teamCount <= format.max_teams
  );
}

// Helper function to get a specific format by key
export async function getFormatByKey(formatKey: string): Promise<TournamentFormatConfig | null> {
  const formats = await getAllAvailableFormats();
  return formats.find(f => f.format_key === formatKey) || null;
}

// Helper function to group matches by rotation
export function groupMatchesByRotation(matches: JsonMatchDefinition[]): Record<string, JsonMatchDefinition[]> {
  return matches.reduce((acc, match) => {
    if (!acc[match.rotation_group]) {
      acc[match.rotation_group] = [];
    }
    acc[match.rotation_group].push(match);
    return acc;
  }, {} as Record<string, JsonMatchDefinition[]>);
}

// Helper function to group matches by stage
export function groupMatchesByStage(matches: JsonMatchDefinition[]): Record<string, JsonMatchDefinition[]> {
  return matches.reduce((acc, match) => {
    if (!acc[match.stage]) {
      acc[match.stage] = [];
    }
    acc[match.stage].push(match);
    return acc;
  }, {} as Record<string, JsonMatchDefinition[]>);
}

// Helper function to group matches by bracket location
export function groupMatchesByBracketLocation(matches: JsonMatchDefinition[]): Record<string, JsonMatchDefinition[]> {
  return matches.reduce((acc, match) => {
    if (!acc[match.bracket_location]) {
      acc[match.bracket_location] = [];
    }
    acc[match.bracket_location].push(match);
    return acc;
  }, {} as Record<string, JsonMatchDefinition[]>);
}

// Helper function to get ranking matches
export function getRankingMatches(matches: JsonMatchDefinition[]): JsonMatchDefinition[] {
  return matches.filter(match => match.ranking_game);
}

// Helper function to parse team sources
export function parseTeamSource(source: string): { type: 'seed' | 'winner' | 'loser' | 'random', value: string | number } {
  if (source.startsWith('TS')) {
    return { type: 'seed', value: parseInt(source.substring(2)) };
  }
  
  if (source.startsWith('winner_')) {
    return { type: 'winner', value: parseInt(source.substring(7)) };
  }
  
  if (source.startsWith('loser_')) {
    return { type: 'loser', value: parseInt(source.substring(6)) };
  }
  
  if (source.startsWith('random_')) {
    return { type: 'random', value: source };
  }
  
  return { type: 'seed', value: source };
}