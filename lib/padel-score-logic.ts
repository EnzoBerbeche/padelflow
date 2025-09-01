// Logique pour gérer le score de padel
export interface PadelScore {
  sets: number[];
  current_set: number;
  current_game: number[];
  tie_break: boolean;
  tie_break_score?: number[];
  game_points: (number | string)[]; // [0, 15, 30, 40, 'AD'] pour chaque équipe
}

export interface GameConfig {
  sets_to_win: number;
  games_per_set: number;
  no_advantage: boolean;
  tie_break_enabled: boolean;
}

export class PadelScoreManager {
  private config: GameConfig;
  private score: PadelScore;

  constructor(config: GameConfig) {
    this.config = config;
    this.score = {
      sets: [],
      current_set: 1,
      current_game: [0, 0],
      tie_break: false,
      tie_break_score: [0, 0],
      game_points: [0, 0],
    };
  }

  // Ajouter un point à une équipe
  addPoint(team: 'team1' | 'team2'): { gameWon?: 'team1' | 'team2'; setWon?: 'team1' | 'team2'; matchWon?: 'team1' | 'team2' } {
    const teamIndex = team === 'team1' ? 0 : 1;
    const opponentIndex = team === 'team1' ? 1 : 0;

    if (this.score.tie_break) {
      return this.handleTieBreakPoint(team);
    }

    // Gérer les points du jeu
    const result = this.handleGamePoint(team);
    if (result.gameWon) {
      // Un jeu a été gagné
      const gameResult = this.handleGameWon(team);
      if (gameResult.setWon) {
        // Un set a été gagné
        const setResult = this.handleSetWon(team);
        if (setResult.matchWon) {
          return { gameWon: result.gameWon, setWon: gameResult.setWon, matchWon: setResult.matchWon };
        }
        return { gameWon: result.gameWon, setWon: gameResult.setWon };
      }
      return { gameWon: result.gameWon };
    }

    return {};
  }

  private handleGamePoint(team: 'team1' | 'team2'): { gameWon?: 'team1' | 'team2' } {
    const teamIndex = team === 'team1' ? 0 : 1;
    const opponentIndex = team === 'team1' ? 1 : 0;

    const currentPoints = this.score.game_points[teamIndex];
    const opponentPoints = this.score.game_points[opponentIndex];

    if (this.config.no_advantage) {
      // Logique No Ad
      if (currentPoints === 0) {
        this.score.game_points[teamIndex] = 15;
      } else if (currentPoints === 15) {
        this.score.game_points[teamIndex] = 30;
      } else if (currentPoints === 30) {
        this.score.game_points[teamIndex] = 40;
      } else if (currentPoints === 40) {
        // Gagner le jeu
        this.score.game_points = [0, 0];
        return { gameWon: team };
      }
    } else {
      // Logique avec avantage
      if (currentPoints === 0) {
        this.score.game_points[teamIndex] = 15;
      } else if (currentPoints === 15) {
        this.score.game_points[teamIndex] = 30;
      } else if (currentPoints === 30) {
        this.score.game_points[teamIndex] = 40;
      } else if (currentPoints === 40) {
        if (opponentPoints === 40) {
          // Avantage
          this.score.game_points[teamIndex] = 'AD' as any;
        } else if (opponentPoints === 'AD') {
          // Retour à 40-40
          this.score.game_points[opponentIndex] = 40;
        } else {
          // Gagner le jeu
          this.score.game_points = [0, 0];
          return { gameWon: team };
        }
      } else if (currentPoints === 'AD') {
        // Gagner le jeu
        this.score.game_points = [0, 0];
        return { gameWon: team };
      }
    }

    return {};
  }

  private handleGameWon(team: 'team1' | 'team2'): { setWon?: 'team1' | 'team2' } {
    const teamIndex = team === 'team1' ? 0 : 1;
    const opponentIndex = team === 'team1' ? 1 : 0;

    this.score.current_game[teamIndex]++;

    // Vérifier si le set est gagné
    const gamesToWin = this.config.games_per_set;
    const currentGames = this.score.current_game[teamIndex];
    const opponentGames = this.score.current_game[opponentIndex];

    if (currentGames >= gamesToWin && currentGames - opponentGames >= 2) {
      // Gagner le set
      return { setWon: team };
    }

    // Vérifier le tie-break
    if (currentGames === gamesToWin - 1 && opponentGames === gamesToWin - 1) {
      if (this.config.tie_break_enabled) {
        this.score.tie_break = true;
        this.score.tie_break_score = [0, 0];
      }
    }

    // Cas spécial pour le format 9 jeux : tie-break à 8-8
    if (this.config.games_per_set === 9 && currentGames === 8 && opponentGames === 8) {
      if (this.config.tie_break_enabled) {
        this.score.tie_break = true;
        this.score.tie_break_score = [0, 0];
      }
    }

    return {};
  }

  private handleSetWon(team: 'team1' | 'team2'): { matchWon?: 'team1' | 'team2' } {
    const teamIndex = team === 'team1' ? 0 : 1;

    // Ajouter le set gagné
    this.score.sets[teamIndex] = (this.score.sets[teamIndex] || 0) + 1;

    // Réinitialiser le jeu actuel
    this.score.current_game = [0, 0];
    this.score.game_points = [0, 0];
    this.score.tie_break = false;
    this.score.tie_break_score = [0, 0];

    // Passer au set suivant
    this.score.current_set++;

    // Vérifier si le match est gagné
    const setsToWin = this.config.sets_to_win;
    const currentSets = this.score.sets[teamIndex];
    const opponentSets = this.score.sets[team === 'team1' ? 1 : 0] || 0;

    if (currentSets >= setsToWin) {
      return { matchWon: team };
    }

    return {};
  }

  private handleTieBreakPoint(team: 'team1' | 'team2'): { gameWon?: 'team1' | 'team2' } {
    const teamIndex = team === 'team1' ? 0 : 1;
    const opponentIndex = team === 'team1' ? 1 : 0;

    if (!this.score.tie_break_score) {
      this.score.tie_break_score = [0, 0];
    }

    this.score.tie_break_score[teamIndex]++;

    // Vérifier si le tie-break est gagné (7 points avec 2 points d'écart)
    const currentPoints = this.score.tie_break_score[teamIndex];
    const opponentPoints = this.score.tie_break_score[opponentIndex];

    if (currentPoints >= 7 && currentPoints - opponentPoints >= 2) {
      // Gagner le tie-break (et le set)
      this.score.tie_break = false;
      this.score.tie_break_score = [0, 0];
      this.score.current_game[teamIndex]++;
      
      // Vérifier si le set est gagné
      const setResult = this.handleSetWon(team);
      return { gameWon: team, ...setResult };
    }

    return {};
  }

  // Obtenir le score actuel
  getScore(): PadelScore {
    return { ...this.score };
  }

  // Obtenir le score formaté pour l'affichage
  getFormattedScore(): string {
    let display = this.score.sets.map((set, index) => {
      if (index === this.score.current_set - 1) {
        if (this.score.tie_break) {
          return `${set}-${this.score.current_game[0]}-${this.score.current_game[1]}`;
        }
        return `${set}-${this.score.current_game[0]}`;
      }
      return set.toString();
    }).join(' | ');

    if (this.score.tie_break) {
      display += ` (TB: ${this.score.tie_break_score?.[0] || 0}-${this.score.tie_break_score?.[1] || 0})`;
    }

    return display;
  }

  // Obtenir le score du jeu actuel
  getCurrentGameScore(): string {
    if (this.score.tie_break) {
      return `Tie-break: ${this.score.tie_break_score?.[0] || 0}-${this.score.tie_break_score?.[1] || 0}`;
    }

    const team1Points = this.score.game_points[0];
    const team2Points = this.score.game_points[1];

    const formatPoints = (points: number | string) => {
      if (points === 0) return '0';
      if (points === 15) return '15';
      if (points === 30) return '30';
      if (points === 40) return '40';
      if (points === 'AD') return 'AD';
      return '0';
    };

    return `${formatPoints(team1Points)} - ${formatPoints(team2Points)}`;
  }

  // Annuler le dernier point
  undoLastPoint(): void {
    // TODO: Implémenter la logique d'annulation
    // Cela nécessite de garder un historique des actions
  }

  // Vérifier si le match est terminé
  isMatchFinished(): boolean {
    const setsToWin = this.config.sets_to_win;
    return this.score.sets.some(set => set >= setsToWin);
  }

  // Obtenir le gagnant du match
  getMatchWinner(): 'team1' | 'team2' | null {
    if (!this.isMatchFinished()) return null;
    
    const setsToWin = this.config.sets_to_win;
    if (this.score.sets[0] >= setsToWin) return 'team1';
    if (this.score.sets[1] >= setsToWin) return 'team2';
    return null;
  }

  // Restaurer un score existant
  restoreScore(existingScore: {
    sets: number[];
    current_set: number;
    current_game: number[];
    tie_break: boolean;
    tie_break_score?: number[];
  }): void {
    this.score.sets = [...existingScore.sets];
    this.score.current_set = existingScore.current_set;
    this.score.current_game = [...existingScore.current_game];
    this.score.tie_break = existingScore.tie_break;
    this.score.tie_break_score = existingScore.tie_break_score ? [...existingScore.tie_break_score] : [0, 0];
    
    // Réinitialiser les points du jeu actuel
    this.score.game_points = [0, 0];
  }
}
