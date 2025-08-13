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