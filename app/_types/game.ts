export type GameStatus = 'waiting' | 'playing' | 'finished';
export type GameMode = 'classic' | 'speed' | 'relay';

export interface RoomSettings {
    max_players: number;       // 2-16
    draw_time: number;         // seconds (30, 60, 80, 90, 120)
    rounds: number;            // 1-10
    word_count: number;        // words to choose from (2, 3, 4)
    game_mode: GameMode;       // classic, speed, relay
    hints_enabled: boolean;    // Enable progressive letter hints
}

export const DEFAULT_SETTINGS: RoomSettings = {
    max_players: 8,
    draw_time: 120,
    rounds: 3,
    word_count: 3,
    game_mode: 'classic',
    hints_enabled: false
};

export interface Room {
    id: string;
    room_code: string;
    host_player_id: string | null;
    status: GameStatus;
    current_round: number;
    max_rounds: number;
    current_drawer_index: number;
    current_word: string | null;
    word_selected_at: string | null;
    turn_ends_at: string | null;
    created_at: string;
    settings: RoomSettings;
}

// DiceBear avatar config stored as JSON
export interface DiceBearAvatarConfig {
    style: string;
    seed: string;
}

export interface Player {
    id: string;
    room_id: string;
    display_name: string;
    score: number;
    is_host: boolean;
    is_connected: boolean;
    is_spectator?: boolean;    // Late joiners watch as spectators
    turn_order: number | null;
    joined_at: string;
    avatar?: DiceBearAvatarConfig;    // DiceBear avatar config
}

export interface StrokePoint {
    x: number;
    y: number;
}

export interface DrawingStroke {
    id?: string;
    player_id: string;
    tool: 'pen' | 'eraser' | 'fill';
    color: string;
    thickness: number;
    points: StrokePoint[];
}

export interface Guess {
    id: string;
    player_id: string;
    guess_text: string;
    is_correct: boolean;
    points_awarded: number;
    guessed_at: string;
}

export interface GameState {
    room: Room | null;
    players: Player[];
    strokes: DrawingStroke[];
    guesses: Guess[];
}

