import { AvatarConfig, PlayerData } from '../types';

export class Player {
  public readonly id: string;
  public socketId: string;
  public name: string;
  public avatar: AvatarConfig;
  public score: number = 0;
  public roundScore: number = 0;
  public isHost: boolean = false;
  public isDrawing: boolean = false;
  public hasGuessed: boolean = false;
  public guessTimestamp: number = 0;
  public isReady: boolean = false;
  public isDisconnected: boolean = false;

  constructor(id: string, socketId: string, name: string, avatar?: AvatarConfig, isHost: boolean = false) {
    this.id = id;
    this.socketId = socketId;
    this.name = name.trim().slice(0, 20) || 'Player';
    this.isHost = isHost;
    this.avatar = avatar || {
      color: '#4a90e2',
      eyes: 0,
      mouth: 0,
    };
  }

  public resetRound(): void {
    this.isDrawing = false;
    this.hasGuessed = false;
    this.roundScore = 0;
    this.guessTimestamp = 0;
  }

  public addScore(points: number): void {
    this.roundScore += points;
    this.score += points;
  }

  public toJSON(): PlayerData {
    return {
      id: this.id,
      socketId: this.socketId,
      name: this.name,
      avatar: this.avatar,
      score: this.score,
      roundScore: this.roundScore,
      isHost: this.isHost,
      isDrawing: this.isDrawing,
      hasGuessed: this.hasGuessed,
      isReady: this.isReady,
    };
  }
}
