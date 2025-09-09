import { PadelGame, MyPlayer, GamePointAction, CreatePadelGameData, UpdatePadelGameData, PointAction } from '@/lib/types/padel-game';

class PadelGameService {
  private games: Map<string, PadelGame> = new Map();
  private myPlayers: Map<string, MyPlayer> = new Map();
  private gameActions: Map<string, PointAction[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock data for My Players
    const mockPlayers: MyPlayer[] = [
      { id: '1', player_name: 'Enzo Berbeche', tenup_licence: '12345', tenup_player_id: 'player_1' },
      { id: '2', player_name: 'Alex Martin', tenup_licence: '12346', tenup_player_id: 'player_2' },
      { id: '3', player_name: 'Lucas Dubois', tenup_licence: '12347', tenup_player_id: 'player_3' },
      { id: '4', player_name: 'Emma Rousseau', tenup_licence: '12348', tenup_player_id: 'player_4' },
      { id: '5', player_name: 'Thomas Moreau', tenup_licence: '12349', tenup_player_id: 'player_5' }
    ];

    mockPlayers.forEach(player => {
      this.myPlayers.set(player.id, player);
    });

    // Mock data for a sample game
    const sampleGame: PadelGame = {
      id: 'game_1',
      user_id: 'user_1',
      team1_player1: 'Enzo Berbeche',
      team1_player2: 'Alex Martin',
      team2_player1: 'Adversaire 1',
      team2_player2: 'Adversaire 2',
      sets_to_win: 2,
      games_per_set: 6,
      no_advantage: true,
      tie_break_enabled: true,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.games.set(sampleGame.id, sampleGame);

    // Mock data for game actions
    const sampleActions: PointAction[] = [
      {
        id: 'action_1',
        action: 'passing_winner',
        subTag: 'droite',
        player: 'right',
        team: 'team1',
        timestamp: new Date().toISOString()
      },
      {
        id: 'action_2',
        action: 'smash_winner',
        subTag: 'par3',
        player: 'left',
        team: 'team1',
        timestamp: new Date().toISOString()
      }
    ];

    this.gameActions.set(sampleGame.id, sampleActions);
  }

  async getMyPlayers(): Promise<MyPlayer[]> {
    return Array.from(this.myPlayers.values());
  }

  async getPadelGames(userId: string): Promise<PadelGame[]> {
    return Array.from(this.games.values()).filter(game => game.user_id === userId);
  }

  async getPadelGame(gameId: string): Promise<PadelGame | null> {
    return this.games.get(gameId) || null;
  }

  async createPadelGame(userId: string, data: CreatePadelGameData): Promise<PadelGame> {
    const game: PadelGame = {
      id: `game_${Date.now()}`,
      user_id: userId,
      ...data,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.games.set(game.id, game);
    this.gameActions.set(game.id, []);
    return game;
  }

  async updatePadelGame(gameId: string, data: UpdatePadelGameData): Promise<PadelGame | null> {
    const game = this.games.get(gameId);
    if (!game) return null;

    const updatedGame = {
      ...game,
      ...data,
      updated_at: new Date().toISOString()
    };

    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  async addPointAction(gameId: string, action: Omit<PointAction, 'id' | 'timestamp'>): Promise<PointAction> {
    const pointAction: PointAction = {
      ...action,
      id: `action_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    const actions = this.gameActions.get(gameId) || [];
    actions.push(pointAction);
    this.gameActions.set(gameId, actions);

    return pointAction;
  }

  async getGameActions(gameId: string): Promise<PointAction[]> {
    return this.gameActions.get(gameId) || [];
  }

  async deletePadelGame(gameId: string): Promise<boolean> {
    const deleted = this.games.delete(gameId);
    this.gameActions.delete(gameId);
    return deleted;
  }

  async searchPlayers(query: string): Promise<MyPlayer[]> {
    const players = Array.from(this.myPlayers.values());
    return players.filter(player => 
      player.player_name.toLowerCase().includes(query.toLowerCase())
    );
  }

  async addMyPlayer(player: Omit<MyPlayer, 'id'>): Promise<MyPlayer> {
    const newPlayer: MyPlayer = {
      ...player,
      id: `player_${Date.now()}`
    };
    this.myPlayers.set(newPlayer.id, newPlayer);
    return newPlayer;
  }

  async removeMyPlayer(playerId: string): Promise<boolean> {
    return this.myPlayers.delete(playerId);
  }
}

export const padelGameService = new PadelGameService();
