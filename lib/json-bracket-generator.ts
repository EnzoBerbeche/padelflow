import { TeamWithPlayers, storage } from './storage';
import { JsonTournamentFormat, JsonMatchDefinition, parseTeamSource } from './tournament-formats-json';

export interface RandomAssignments {
  [key: string]: TeamWithPlayers;
}

export class JsonBracketGenerator {
  private tournament_id: string;
  private teams: TeamWithPlayers[];
  private format: JsonTournamentFormat;
  private randomAssignments: RandomAssignments;

  constructor(
    tournament_id: string, 
    teams: TeamWithPlayers[], 
    format: JsonTournamentFormat,
    randomAssignments: RandomAssignments = {}
  ) {
    this.tournament_id = tournament_id;
    this.teams = teams; // Use teams as-is for 8-team format
    this.format = format;
    this.randomAssignments = randomAssignments;
  }

  private resolveTeamSource(source: string): string | undefined {
    const parsed = parseTeamSource(source);
    
    switch (parsed.type) {
      case 'seed':
        const seedNumber = parsed.value as number;
        const team = this.teams.find(t => t.seed_number === seedNumber);
        return team?.id;
        
      case 'random':
        // Check if we have a random assignment for this source
        const assignedTeam = this.randomAssignments[source];
        return assignedTeam?.id;
        
      case 'winner':
      case 'loser':
        // These will be resolved dynamically as matches are completed
        return undefined;
        
      default:
        return undefined;
    }
  }

  private resolveTeamsForMatch(matchDef: JsonMatchDefinition): { team1_id?: string; team2_id?: string } {
    return {
      team1_id: this.resolveTeamSource(matchDef.team1_source),
      team2_id: this.resolveTeamSource(matchDef.team2_source)
    };
  }

  public generateMatches(): void {
    // Clear existing matches
    storage.matches.deleteByTournament(this.tournament_id);

    // Generate matches based on JSON format
    if (!this.format.matches) {
      console.warn('No matches defined in format');
      return;
    }

    this.format.matches.forEach((matchDef: JsonMatchDefinition) => {
      const { team1_id, team2_id } = this.resolveTeamsForMatch(matchDef);

      // Determine match type based on bracket_location and ranking_game
      const isClassificationMatch = matchDef.bracket_location === 'Classement bracket' || matchDef.ranking_game;
      const match_type = isClassificationMatch ? 'classification' : 'main';
      const bracket_type = isClassificationMatch ? 'ranking' : 'main';

      storage.matches.create({
        tournament_id: this.tournament_id,
        round: this.formatRoundName(matchDef),
        team_1_id: team1_id,
        team_2_id: team2_id,
        order_index: matchDef.order_index,
        match_type,
        bracket_type,
        // Store additional JSON metadata
        json_match_id: matchDef.id,
        rotation_group: matchDef.rotation_group,
        stage: matchDef.stage,
        ranking_game: matchDef.ranking_game,
        ranking_label: matchDef.ranking_label || undefined,
        team1_source: matchDef.team1_source,
        team2_source: matchDef.team2_source,
      });
    });
  }

  private formatRoundName(matchDef: JsonMatchDefinition): string {
    // Use stage as the primary display name
    return matchDef.stage;
  }

  // Dynamic team resolution system
  public static updateDependentMatches(tournament_id: string, completedMatchId: string, winnerId: string): void {
    const allMatches = storage.matches.getByTournament(tournament_id);
    const completedMatch = allMatches.find(m => m.id === completedMatchId);
    
    if (!completedMatch || !completedMatch.json_match_id) return;

    const loserId = completedMatch.team_1_id === winnerId ? completedMatch.team_2_id : completedMatch.team_1_id;
    
    // Find all matches that depend on this completed match
    const dependentMatches = allMatches.filter(match => 
      match.team1_source === `winner_${completedMatch.json_match_id}` ||
      match.team2_source === `winner_${completedMatch.json_match_id}` ||
      match.team1_source === `loser_${completedMatch.json_match_id}` ||
      match.team2_source === `loser_${completedMatch.json_match_id}`
    );

    // Update dependent matches
    dependentMatches.forEach(dependentMatch => {
      const updates: any = {};

      // Update team 1 if it depends on this match
      if (dependentMatch.team1_source === `winner_${completedMatch.json_match_id}`) {
        updates.team_1_id = winnerId;
      } else if (dependentMatch.team1_source === `loser_${completedMatch.json_match_id}`) {
        updates.team_1_id = loserId;
      }

      // Update team 2 if it depends on this match
      if (dependentMatch.team2_source === `winner_${completedMatch.json_match_id}`) {
        updates.team_2_id = winnerId;
      } else if (dependentMatch.team2_source === `loser_${completedMatch.json_match_id}`) {
        updates.team_2_id = loserId;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        storage.matches.update(dependentMatch.id, updates);
      }
    });
  }

  // Static method to generate random assignments for 8-team format
  public static generateRandomAssignments(teams: TeamWithPlayers[]): RandomAssignments {
    const assignments: RandomAssignments = {};

    // Get team groups for 8-team format
    const ts3_4 = teams.filter(t => t.seed_number && t.seed_number >= 3 && t.seed_number <= 4);
    const ts5_8 = teams.filter(t => t.seed_number && t.seed_number >= 5 && t.seed_number <= 8);

    // Shuffle groups
    const shuffled3_4 = JsonBracketGenerator.shuffleArray([...ts3_4]);
    const shuffled5_8 = JsonBracketGenerator.shuffleArray([...ts5_8]);

    // Assign random positions for TS3-4
    for (let i = 0; i < 2; i++) {
      if (shuffled3_4[i]) {
        assignments[`random_TS3_4_${i + 1}`] = shuffled3_4[i];
      }
    }

    // Assign random positions for TS5-8
    for (let i = 0; i < 4; i++) {
      if (shuffled5_8[i]) {
        assignments[`random_TS5_8_${i + 1}`] = shuffled5_8[i];
      }
    }

    return assignments;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Generate an 8-team single elimination bracket tree for react-tournament-bracket
export function generate8TeamBracketTree(teams: TeamWithPlayers[]) {
  if (teams.length < 8) throw new Error('Need 8 teams');
  // Seed order: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6
  const [t1, t2, t3, t4, t5, t6, t7, t8] = teams;
  return {
    id: 'final',
    name: 'Final',
    sides: {
      home: {
        team: { id: 'winner-semi1', name: 'Winner Semi 1' },
        child: {
          id: 'semi1',
          name: '1/2 Finale',
          sides: {
            home: {
              team: { id: t1.id, name: t1.name },
              child: {
                id: 'qf1',
                name: '1/4 Finale',
                sides: {
                  home: { team: { id: t1.id, name: t1.name } },
                  visitor: { team: { id: t8.id, name: t8.name } }
                }
              }
            },
            visitor: {
              team: { id: t4.id, name: t4.name },
              child: {
                id: 'qf2',
                name: '1/4 Finale',
                sides: {
                  home: { team: { id: t4.id, name: t4.name } },
                  visitor: { team: { id: t5.id, name: t5.name } }
                }
              }
            }
          }
        }
      },
      visitor: {
        team: { id: 'winner-semi2', name: 'Winner Semi 2' },
        child: {
          id: 'semi2',
          name: '1/2 Finale',
          sides: {
            home: {
              team: { id: t2.id, name: t2.name },
              child: {
                id: 'qf3',
                name: '1/4 Finale',
                sides: {
                  home: { team: { id: t2.id, name: t2.name } },
                  visitor: { team: { id: t7.id, name: t7.name } }
                }
              }
            },
            visitor: {
              team: { id: t3.id, name: t3.name },
              child: {
                id: 'qf4',
                name: '1/4 Finale',
                sides: {
                  home: { team: { id: t3.id, name: t3.name } },
                  visitor: { team: { id: t6.id, name: t6.name } }
                }
              }
            }
          }
        }
      }
    }
  };
}