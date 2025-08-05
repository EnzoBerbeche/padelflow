import { NationalPlayer } from './storage';

export interface CSVParseOptions {
  encoding?: 'utf-8' | 'latin1';
  delimiter?: string;
  skipEmptyLines?: boolean;
}

export class CSVParser {
  static parseNationalPlayersCSV(
    csvContent: string, 
    gender: 'men' | 'women',
    options: CSVParseOptions = {}
  ): NationalPlayer[] {
    const {
      delimiter = ',',
      skipEmptyLines = true
    } = options;

    const lines = csvContent.split('\n');
    const players: NationalPlayer[] = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (skipEmptyLines && !line) continue;
      
      try {
        const player = this.parsePlayerLine(line, delimiter, gender);
        if (player) {
          players.push(player);
        }
      } catch (error) {
        console.error(`Error parsing line ${i + 1}:`, error);
      }
    }
    
    return players;
  }

  private static parsePlayerLine(
    line: string, 
    delimiter: string, 
    gender: 'men' | 'women'
  ): NationalPlayer | null {
    // Handle quoted fields properly
    const values = this.parseCSVLine(line, delimiter);
    
    if (values.length < 8) {
      console.warn('Skipping line with insufficient data:', line);
      return null;
    }

    try {
      // Parse player name (format: "FIRST LAST")
      const fullName = values[2]?.replace(/"/g, '').trim() || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Parse numeric values safely
      const ranking = this.parseNumber(values[0]);
      const bestRanking = this.parseNumber(values[4]);
      const points = this.parseNumber(values[7]);
      const birthYear = this.parseNumber(values[6]);
      const tournamentsCount = this.parseNumber(values[8]);
      
      const player: NationalPlayer = {
        id: this.generateId(),
        first_name: firstName,
        last_name: lastName,
        license_number: values[3]?.replace(/"/g, '').trim() || '',
        ranking,
        best_ranking: bestRanking,
        points,
        club: values[10]?.replace(/"/g, '').trim() || '',
        league: values[9]?.replace(/"/g, '').trim() || '',
        birth_year: birthYear,
        nationality: values[5]?.replace(/"/g, '').trim() || '',
        gender,
        tournaments_count: tournamentsCount,
        last_updated: new Date().toISOString(),
      };
      
      return player;
    } catch (error) {
      console.error('Error parsing player data:', error, values);
      return null;
    }
  }

  private static parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  }

  private static parseNumber(value: string): number {
    const parsed = parseInt(value?.replace(/"/g, '').trim() || '0');
    return isNaN(parsed) ? 0 : parsed;
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
} 