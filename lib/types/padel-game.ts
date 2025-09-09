export interface PadelGame {
  id: string;
  user_id: string;
  team1_player1: string;
  team1_player2: string;
  team2_player1: string;
  team2_player2: string;
  sets_to_win: number;
  games_per_set: number;
  no_advantage: boolean;
  tie_break_enabled: boolean;
  status: 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface GamePlayer {
  id: string;
  player_name: string;
  tenup_licence?: string;
  tenup_player_id?: string;
}

export interface MyPlayer {
  id: string;
  player_name: string;
  tenup_licence?: string;
  tenup_player_id?: string;
}

export interface GamePointAction {
  id: string;
  game_id: string;
  action: string;
  sub_tag?: string;
  player?: 'right' | 'left';
  team: 'team1' | 'team2';
  created_at: string;
}

export interface PointAction {
  id: string;
  action: string;
  subTag?: string;
  player?: 'right' | 'left';
  team: 'team1' | 'team2';
  timestamp: string;
}

export interface PadelScore {
  sets: number[];
  current_set: number;
  current_game: number[];
  game_points: (number | string)[];
  tie_break: boolean;
  tie_break_score?: number[];
  match_winner?: 'team1' | 'team2';
}

export interface CreatePadelGameData {
  team1_player1: string;
  team1_player2: string;
  team2_player1: string;
  team2_player2: string;
  sets_to_win: number;
  games_per_set: number;
  no_advantage: boolean;
  tie_break_enabled: boolean;
}

export interface UpdatePadelGameData {
  status?: 'in_progress' | 'completed';
  updated_at?: string;
}

export interface PlayerSelection {
  source: 'manual' | 'myplayers';
  player_name: string;
  tenup_licence?: string;
  tenup_player_id?: string;
}

export interface GameFormData {
  player_right: PlayerSelection;
  player_left: PlayerSelection;
  opponent_right: PlayerSelection;
  opponent_left: PlayerSelection;
  sets_to_win: number;
  games_per_set: number;
  no_advantage: boolean;
  tie_break_enabled: boolean;
}
