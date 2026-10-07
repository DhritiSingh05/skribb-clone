import { Server } from 'socket.io';
import { Player } from './Player';
import { DrawingBoard } from './DrawingBoard';
import { Game } from './Game';
import { WordManager } from '../services/WordManager';
import {
  RoomSettings,
  ChatMessage,
  StrokeAction,
  RoomPublicInfo,
} from '../types';

export class Room {
  public readonly id: string;
  public name: string;
  public isPrivate: boolean;
  public hostId: string;
  public players: Map<string, Player> = new Map();
  public drawingBoard: DrawingBoard;
  public game: Game;
  public chatMessages: ChatMessage[] = [];
  public kickVotes: Map<string, Set<string>> = new Map();

  private io: Server;
  private wordManager: WordManager;

  constructor(
    id: string,
    name: string,
    hostPlayer: Player,
    settings: RoomSettings,
    isPrivate: boolean,
    io: Server,
    wordManager: WordManager
  ) {
    this.id = id;
    this.name = name;
    this.isPrivate = isPrivate;
    this.hostId = hostPlayer.id;
    this.io = io;
    this.wordManager = wordManager;

    this.drawingBoard = new DrawingBoard();

    this.players.set(hostPlayer.id, hostPlayer);

    this.game = new Game(
      settings,
      wordManager,
      () => Array.from(this.players.values()),
      {
        onPhaseChange: (phase, state) => {
          this.io.to(this.id).emit('game_state', state);
          this.broadcastPlayers();
        },
        onTimerTick: (timeLeft) => {
          this.io.to(this.id).emit('timer_tick', { timeLeft });
        },
        onHintUpdate: (hint, revealedCount) => {
          this.io.to(this.id).emit('hint_update', { hint, revealedCount });
        },
        onWordOptions: (drawer, options) => {
          this.io.to(drawer.socketId).emit('word_options', { options });
        },
        onWordChosen: (drawer, wordLength, hint) => {
          this.drawingBoard.clear();
          this.io.to(this.id).emit('canvas_clear');

          // Send actual word to drawer only
          this.io.to(drawer.socketId).emit('drawer_word', {
            word: this.game.currentWord,
            category: this.game.currentCategory,
          });

          // Send system announcement
          this.addSystemMessage(`${drawer.name} is now drawing!`);
        },
        onRoundEnd: (data) => {
          this.io.to(this.id).emit('round_end', data);
          this.addSystemMessage(`The word was "${data.word}"!`);
        },
        onGameOver: (leaderboard) => {
          this.io.to(this.id).emit('game_over', {
            leaderboard: leaderboard.map(p => p.toJSON()),
            winner: leaderboard[0] ? leaderboard[0].toJSON() : null,
          });
          this.addSystemMessage(`Game over! Congratulations to ${leaderboard[0]?.name || 'the winner'}!`);
        },
        onAllGuessedEarly: () => {
          this.addSystemMessage('Everyone guessed the word!');
        },
      }
    );
  }

  public addPlayer(player: Player): boolean {
    const settings = this.game.getSettings();
    if (this.players.size >= settings.maxPlayers) {
      return false;
    }

    this.players.set(player.id, player);
    this.broadcastPlayers();
    this.addSystemMessage(`${player.name} joined the room.`);
    return true;
  }

  public removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    this.players.delete(playerId);
    this.kickVotes.delete(playerId);

    // Remove any votes cast by this player
    for (const [, voters] of this.kickVotes.entries()) {
      voters.delete(playerId);
    }

    // If host left, elect next host
    if (this.hostId === playerId) {
      const remaining = Array.from(this.players.values());
      if (remaining.length > 0) {
        remaining[0].isHost = true;
        this.hostId = remaining[0].id;
        this.addSystemMessage(`${remaining[0].name} is now the host.`);
      }
    }

    this.game.handlePlayerLeave(playerId);
    this.broadcastPlayers();
    this.addSystemMessage(`${player.name} left the room.`);

    // If no players left, clean up game timer
    if (this.players.size === 0) {
      this.game.clearTimer();
    }
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  public getPlayerBySocketId(socketId: string): Player | undefined {
    return Array.from(this.players.values()).find(p => p.socketId === socketId);
  }

  public broadcastPlayers(): void {
    const playerList = Array.from(this.players.values())
      .map(p => p.toJSON())
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    this.io.to(this.id).emit('players_list', { players: playerList });
  }

  public handleStroke(action: StrokeAction): void {
    this.drawingBoard.addAction(action);
    // Broadcast to all clients in room
    this.io.to(this.id).emit('draw_data', action);
  }

  public handleUndo(): void {
    const undone = this.drawingBoard.undo();
    if (undone) {
      this.io.to(this.id).emit('draw_undo', { undoneActionId: undone.id });
    }
  }

  public handleClear(): void {
    this.drawingBoard.clear();
    this.io.to(this.id).emit('canvas_clear');
  }

  public handleChat(player: Player, text: string): void {
    const sanitized = text.trim();
    if (!sanitized) return;

    // Check if game is in DRAWING phase
    if (this.game.phase === 'DRAWING') {
      // Drawer cannot chat the secret word
      if (player.isDrawing) {
        if (sanitized.toLowerCase().includes(this.game.currentWord.toLowerCase())) {
          this.io.to(player.socketId).emit('chat_blocked', {
            message: "Don't spoil the secret word!",
          });
          return;
        }

        // Regular chat from drawer
        this.broadcastChatMessage({
          id: Math.random().toString(36).substring(2, 9),
          playerId: player.id,
          playerName: player.name,
          avatar: player.avatar,
          text: sanitized,
          type: 'chat',
          timestamp: Date.now(),
        });
        return;
      }

      // If player has already guessed
      if (player.hasGuessed) {
        // Send as secret chat visible only to drawer and players who have guessed
        const secretMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          playerId: player.id,
          playerName: player.name,
          avatar: player.avatar,
          text: sanitized,
          type: 'secret',
          timestamp: Date.now(),
        };

        for (const p of this.players.values()) {
          if (p.hasGuessed || p.isDrawing) {
            this.io.to(p.socketId).emit('chat_message', secretMsg);
          }
        }
        return;
      }

      // Guesser is typing a guess
      const check = this.wordManager.checkGuess(sanitized, this.game.currentWord);

      if (check.isCorrect) {
        const points = this.game.handleCorrectGuess(player);
        this.broadcastPlayers();

        // Broadcast correct guess banner
        const correctMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          playerId: player.id,
          playerName: player.name,
          avatar: player.avatar,
          text: `${player.name} guessed the word! (+${points} pts)`,
          type: 'correct',
          timestamp: Date.now(),
        };
        this.broadcastChatMessage(correctMsg);

        // Notify the player with confirmation
        this.io.to(player.socketId).emit('guess_result', {
          correct: true,
          points,
          word: this.game.currentWord,
        });
        return;
      }

      if (check.isClose) {
        // Notify only this player that they are close!
        this.io.to(player.socketId).emit('chat_message', {
          id: Math.random().toString(36).substring(2, 9),
          playerName: 'System',
          text: `"${sanitized}" is very close!`,
          type: 'close',
          timestamp: Date.now(),
        });

        // Also show regular guess to room so other players see it
        this.broadcastChatMessage({
          id: Math.random().toString(36).substring(2, 9),
          playerId: player.id,
          playerName: player.name,
          avatar: player.avatar,
          text: sanitized,
          type: 'guess',
          timestamp: Date.now(),
        });
        return;
      }
    }

    // Standard chat message
    this.broadcastChatMessage({
      id: Math.random().toString(36).substring(2, 9),
      playerId: player.id,
      playerName: player.name,
      avatar: player.avatar,
      text: sanitized,
      type: 'chat',
      timestamp: Date.now(),
    });
  }

  public addSystemMessage(text: string): void {
    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      playerName: 'System',
      text,
      type: 'system',
      timestamp: Date.now(),
    };
    this.broadcastChatMessage(msg);
  }

  private broadcastChatMessage(msg: ChatMessage): void {
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
    this.io.to(this.id).emit('chat_message', msg);
  }

  public voteKick(voterId: string, targetId: string): boolean {
    if (voterId === targetId) return false;
    if (!this.players.has(targetId)) return false;

    if (!this.kickVotes.has(targetId)) {
      this.kickVotes.set(targetId, new Set());
    }

    const voters = this.kickVotes.get(targetId)!;
    voters.add(voterId);

    const neededVotes = Math.ceil(this.players.size / 2);
    const target = this.players.get(targetId)!;

    this.addSystemMessage(`Vote to kick ${target.name}: ${voters.size}/${neededVotes} votes.`);

    if (voters.size >= neededVotes) {
      this.kickPlayer(targetId, 'Vote-kicked by players');
      return true;
    }
    return false;
  }

  public kickPlayer(targetId: string, reason: string = 'Kicked by host'): void {
    const target = this.players.get(targetId);
    if (!target) return;

    this.io.to(target.socketId).emit('kicked', { reason });
    this.removePlayer(targetId);
    this.addSystemMessage(`${target.name} was kicked (${reason}).`);
  }

  public getPublicInfo(): RoomPublicInfo {
    return {
      id: this.id,
      name: this.name,
      isPrivate: this.isPrivate,
      playerCount: this.players.size,
      maxPlayers: this.game.getSettings().maxPlayers,
      phase: this.game.phase,
      round: this.game.currentRound,
      totalRounds: this.game.getSettings().rounds,
    };
  }
}
