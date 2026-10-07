export type GamePhase = 'LOBBY' | 'CHOOSING_WORD' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export type WordMode = 'normal' | 'hidden' | 'combination';

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hintsCount: number;
  wordMode: WordMode;
  customWords: string[];
  customWordsOnly: boolean;
}

export interface AvatarConfig {
  color: string;
  eyes: number;   // 0 - 9
  mouth: number;  // 0 - 9
}

export interface PlayerData {
  id: string;
  socketId: string;
  name: string;
  avatar: AvatarConfig;
  score: number;
  roundScore: number;
  isHost: boolean;
  isDrawing: boolean;
  hasGuessed: boolean;
  isReady: boolean;
  rank?: number;
}

export interface DrawPoint {
  x: number; // 0 - 1
  y: number; // 0 - 1
}

export type DrawTool = 'brush' | 'eraser' | 'fill';

export interface DrawStrokeData {
  type: 'stroke';
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: DrawPoint[];
}

export interface ClearStrokeData {
  type: 'clear';
  id: string;
}

export interface FillStrokeData {
  type: 'fill';
  id: string;
  x: number;
  y: number;
  color: string;
}

export type StrokeAction = DrawStrokeData | ClearStrokeData | FillStrokeData;

export interface ChatMessage {
  id: string;
  playerId?: string;
  playerName: string;
  avatar?: AvatarConfig;
  text: string;
  type: 'chat' | 'guess' | 'correct' | 'close' | 'system' | 'secret';
  timestamp: number;
}

export interface GameStatePayload {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  drawerName: string | null;
  timeLeft: number;
  hint: string;
  wordLength: number;
  category?: string;
  revealedLettersCount: number;
}

export interface WordOption {
  word: string;
  category: string;
}

export interface RoomPublicInfo {
  id: string;
  name: string;
  isPrivate: boolean;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  round: number;
  totalRounds: number;
}
