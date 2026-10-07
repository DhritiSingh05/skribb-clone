import { Server } from 'socket.io';
import { Room } from '../models/Room';
import { Player } from '../models/Player';
import { WordManager } from './WordManager';
import { RoomSettings, RoomPublicInfo } from '../types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server;
  private wordManager: WordManager;

  constructor(io: Server, wordManager: WordManager) {
    this.io = io;
    this.wordManager = wordManager;

    // Periodic cleanup of empty rooms every 60s
    setInterval(() => {
      this.cleanupEmptyRooms();
    }, 60000);
  }

  public createRoom(
    hostPlayer: Player,
    name: string,
    settings: RoomSettings,
    isPrivate: boolean
  ): Room {
    const roomId = this.generateRoomId();
    const roomName = name.trim() || `${hostPlayer.name}'s Room`;

    const room = new Room(
      roomId,
      roomName,
      hostPlayer,
      settings,
      isPrivate,
      this.io,
      this.wordManager
    );

    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public findRoomBySocketId(socketId: string): { room: Room; player: Player } | null {
    for (const room of this.rooms.values()) {
      const player = room.getPlayerBySocketId(socketId);
      if (player) {
        return { room, player };
      }
    }
    return null;
  }

  public getPublicRooms(): RoomPublicInfo[] {
    const list: RoomPublicInfo[] = [];
    for (const room of this.rooms.values()) {
      if (!room.isPrivate && room.players.size > 0) {
        list.push(room.getPublicInfo());
      }
    }
    return list;
  }

  public removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.game.clearTimer();
      this.rooms.delete(roomId);
    }
  }

  private cleanupEmptyRooms(): void {
    for (const [id, room] of this.rooms.entries()) {
      if (room.players.size === 0) {
        room.game.clearTimer();
        this.rooms.delete(id);
      }
    }
  }

  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));

    return code;
  }
}
