import { TeamWithPlayers } from './storage';

export type MatchResult = {
  id: number;
  winner_team_id?: string;
  looser_team_id?: string;
};

export type RandomAssignments = Record<string, string>; // ex: { 'random_5_8': 'teamId' }

/**
 * Résout la team à partir de la source (random, W_X, L_X, numéro, etc.)
 * @param source ex: '1', 'random_5_8', 'W_5', 'L_3'
 * @param teams liste des équipes
 * @param matchResults liste des résultats de matchs (id, winner, looser)
 * @param randomAssignments mapping random_5_8 => teamId (tirage déjà effectué)
 */
export function resolveTeamSource(
  source: string,
  teams: TeamWithPlayers[],
  matchResults: MatchResult[],
  randomAssignments: RandomAssignments = {}
): TeamWithPlayers | null {
  if (!source) return null;

  // Cas: numéro de paire (ex: '1')
  if (/^\d+$/.test(source)) {
    const num = parseInt(source, 10);
    return teams.find(t => t.seed_number === num) || null;
  }

  // Cas: random (ex: 'random_5_8' ou 'random_5_8_1')
  if (source.startsWith('random_')) {
    // Cherche d'abord une version indexée (random_5_8_1)
    if (randomAssignments[source]) {
      const teamId = randomAssignments[source];
      return teams.find(t => t.id === teamId) || null;
    }
    // Sinon, fallback sur la version simple (random_5_8)
    // (pour compatibilité descendante)
    const base = source.replace(/_\d+$/, '');
    if (randomAssignments[base]) {
      const teamId = randomAssignments[base];
      return teams.find(t => t.id === teamId) || null;
    }
    return null;
  }

  // Cas: Winner ou Looser d'un match (ex: 'W_5', 'L_3')
  if (/^[WL]_\d+$/.test(source)) {
    const type = source[0];
    const matchId = parseInt(source.slice(2), 10);
    const match = matchResults.find(m => m.id === matchId) as any;
    if (!match) return null;
    // Si on a stocké l'objet équipe gagnante/perdante, on le retourne
    if (type === 'W' && match.winner_team) {
      return match.winner_team;
    } else if (type === 'L' && match.looser_team) {
      return match.looser_team;
    }
    // Fallback sur l'ancienne logique
    if (type === 'W') {
      return teams.find(t => t.id === match.winner_team_id) || null;
    } else {
      return teams.find(t => t.id === match.looser_team_id) || null;
    }
  }

  // Cas: seed explicite (ex: 'TS3')
  if (/^TS\d+$/.test(source)) {
    const seed = parseInt(source.slice(2), 10);
    return teams.find(t => t.seed_number === seed) || null;
  }

  // Si rien n'est trouvé, retourne un objet factice avec le nom = source
  return {
    id: source,
    name: source,
    weight: 0,
    players: [],
    created_at: '',
    updated_at: ''
  } as TeamWithPlayers;
}

/**
 * Affiche pour chaque random_X_Y du template les équipes candidates (TSX à TSY)
 */
export function debugRandomGroupsFromTemplate(template: any, teams: TeamWithPlayers[]): Record<string, TeamWithPlayers[]> {
  const result: Record<string, TeamWithPlayers[]> = {};
  if (!template.rotations) return result;
  const randomSources = new Set<string>();
  // Parcours toutes les sources random du template
  template.rotations.forEach((rotation: any) => {
    rotation.phases.forEach((phase: any) => {
      phase.matches.forEach((match: any) => {
        [match.source_team_1, match.source_team_2].forEach((source: string) => {
          if (typeof source === 'string' && source.startsWith('random_')) {
            randomSources.add(source);
          }
        });
      });
    });
  });
  randomSources.forEach((source) => {
    // Ex: random_5_8
    const match = source.match(/^random_(\d+)_(\d+)$/);
    if (match) {
      const min = parseInt(match[1], 10);
      const max = parseInt(match[2], 10);
      result[source] = teams.filter(t => t.seed_number && t.seed_number >= min && t.seed_number <= max);
    }
  });
  return result;
} 