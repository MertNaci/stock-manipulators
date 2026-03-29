/* ===== API & Game Types ===== */

export interface PlayerInfo {
  player_id: string;
  player_name: string;
  is_connected: boolean;
}

export interface RoomInfo {
  room_code: string;
  host_id: string;
  players: PlayerInfo[];
  player_count: number;
  max_players: number;
  game_started: boolean;
  created_at: string;
}

export interface CreateRoomResponse {
  success: boolean;
  room_code: string;
  player_id: string;
  room: RoomInfo;
}

export interface JoinRoomResponse {
  success: boolean;
  room_code: string;
  player_id: string;
  room: RoomInfo;
}

export interface StockInfo {
  stock_id: string;
  name: string;
  emoji: string;
  base_price: number;
  current_price: number;
  price_change_percent: number;
  is_locked: boolean;
  lock_ticks_remaining: number;
  active_effects: string[];
  price_history: number[];
}

export interface CardInfo {
  card_id: string;
  name: string;
  emoji: string;
  description: string;
  card_type: string;
  price_multiplier: number;
  effect_duration: number;
  lock_duration: number;
}

export interface PlayerGameState {
  player_id: string;
  player_name: string;
  cash: number;
  portfolio: Record<string, number>;
  hand: CardInfo[];
  hand_count: number;
  agenda?: {
    type: string;
    target_stock: string;
    target_stock_name: string;
    description: string;
  };
  agenda_completed?: boolean;
  final_score?: number;
}

export interface PublicPlayerState {
  player_id: string;
  player_name: string;
  cash: number;
  portfolio: Record<string, number>;
  hand_count: number;
}

export interface GameEvent {
  emoji: string;
  message: string;
  tick: number;
}

export interface GameState {
  current_tick: number;
  max_ticks: number;
  time_remaining: number;
  stocks: Record<string, StockInfo>;
  players: Record<string, PublicPlayerState>;
  event_log: GameEvent[];
  is_active: boolean;
  is_finished: boolean;
}

export interface GameResults {
  rankings: {
    rank: number;
    player_name: string;
    net_worth: number;
    agenda_completed: boolean;
    agenda_bonus: number;
    final_score: number;
  }[];
  stocks_final: Record<string, StockInfo>;
}

// WebSocket message types
export type WSMessage =
  | { type: 'player_joined'; player_name: string; room: RoomInfo }
  | { type: 'player_left'; player_name: string; room: RoomInfo }
  | { type: 'chat'; player_name: string; message: string }
  | { type: 'game_started'; room: RoomInfo; message: string }
  | { type: 'game_state'; state: GameState }
  | { type: 'player_state'; player: PlayerGameState }
  | { type: 'card_played'; card: CardInfo; target_stock: string; anonymous_message: string }
  | { type: 'game_ended'; results: GameResults; event_log: GameEvent[] }
  | { type: 'your_results'; player: PlayerGameState; agenda: PlayerGameState['agenda']; agenda_completed: boolean; final_score: number }
  | { type: 'trade_result'; action: string; success: boolean; error?: string; [key: string]: unknown }
  | { type: 'card_result'; success: boolean; error?: string; [key: string]: unknown }
  | { type: 'error'; message: string }
  | { type: 'pong' };
