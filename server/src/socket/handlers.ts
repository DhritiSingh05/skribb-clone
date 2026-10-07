import { Server, Socket } from 'socket.io';
import { RoomManager } from '../services/RoomManager';
import { Player } from '../models/Player';
import { RoomSettings, StrokeAction } from '../types';

export function setupSocketHandlers(io: Server, roomManager: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    // 1. Create Room
    socket.on('create_room', (data: {
      hostName: string;
      avatar?: any;
      roomName?: string;
      settings?: Partial<RoomSettings>;
      isPrivate?: boolean;
    }) => {
      try {
        const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        const host = new Player(
          playerId,
          socket.id,
          data.hostName || 'Host',
          data.avatar,
          true
        );

        const defaultSettings: RoomSettings = {
          maxPlayers: 8,
          rounds: 3,
          drawTime: 80,
          wordCount: 3,
          hintsCount: 2,
          wordMode: 'normal',
          customWords: [],
          customWordsOnly: false,
          ...data.settings,
        };

        const room = roomManager.createRoom(
          host,
          data.roomName || `${host.name}'s Room`,
          defaultSettings,
          data.isPrivate ?? false
        );

        socket.join(room.id);

        // Send confirmation to host
        socket.emit('room_created', {
          roomId: room.id,
          player: host.toJSON(),
          settings: room.game.getSettings(),
          isPrivate: room.isPrivate,
        });

        room.broadcastPlayers();
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to create room' });
      }
    });

    // 2. Join Room
    socket.on('join_room', (data: {
      roomId: string;
      playerName: string;
      avatar?: any;
    }) => {
      try {
        const room = roomManager.getRoom(data.roomId);
        if (!room) {
          socket.emit('error_message', { message: 'Room not found. Check the code and try again.' });
          return;
        }

        const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        const player = new Player(
          playerId,
          socket.id,
          data.playerName || 'Player',
          data.avatar,
          false
        );

        const joined = room.addPlayer(player);
        if (!joined) {
          socket.emit('error_message', { message: 'Room is full!' });
          return;
        }

        socket.join(room.id);

        // Send room initialization data to joining client
        socket.emit('room_joined', {
          roomId: room.id,
          player: player.toJSON(),
          settings: room.game.getSettings(),
          isPrivate: room.isPrivate,
          gameState: room.game.getStatePayload(),
          existingDrawActions: room.drawingBoard.getActions(),
          chatHistory: room.chatMessages.slice(-50),
        });

        // Broadcast updated players list to room
        room.broadcastPlayers();
      } catch (err) {
        socket.emit('error_message', { message: 'Could not join room' });
      }
    });

    // 3. Start Game (Host only)
    socket.on('start_game', () => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      if (!player.isHost) {
        socket.emit('error_message', { message: 'Only the host can start the game.' });
        return;
      }

      if (room.players.size < 2) {
        socket.emit('error_message', { message: 'Need at least 2 players to start.' });
        return;
      }

      const started = room.game.start();
      if (!started) {
        socket.emit('error_message', { message: 'Failed to start game' });
      }
    });

    // 4. Update Settings (Host only)
    socket.on('update_settings', (newSettings: Partial<RoomSettings>) => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      if (!player.isHost) return;

      room.game.updateSettings(newSettings);
      io.to(room.id).emit('settings_updated', { settings: room.game.getSettings() });
      room.addSystemMessage('Room settings were updated.');
    });

    // 5. Word Chosen by Drawer
    socket.on('word_chosen', (data: { word: string; category?: string }) => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      if (room.game.currentDrawer?.id !== player.id) return;
      if (room.game.phase !== 'CHOOSING_WORD') return;

      room.game.chooseWord(data.word, data.category || 'general');
    });

    // 6. Drawing Events
    socket.on('draw_data', (action: StrokeAction) => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      // Only active drawer in DRAWING phase can draw
      if (room.game.phase !== 'DRAWING' || room.game.currentDrawer?.id !== player.id) {
        return;
      }

      room.handleStroke(action);
    });

    socket.on('draw_undo', () => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      if (room.game.phase !== 'DRAWING' || room.game.currentDrawer?.id !== player.id) {
        return;
      }

      room.handleUndo();
    });

    socket.on('canvas_clear', () => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      if (room.game.phase !== 'DRAWING' || room.game.currentDrawer?.id !== player.id) {
        return;
      }

      room.handleClear();
    });

    // 7. Chat & Guessing
    socket.on('chat', (data: { text: string }) => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      room.handleChat(player, data.text);
    });

    // 8. Host Kick
    socket.on('kick_player', (data: { targetId: string }) => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      if (!player.isHost) {
        socket.emit('error_message', { message: 'Only host can kick players.' });
        return;
      }

      room.kickPlayer(data.targetId, 'Removed by room host');
    });

    // 9. Votekick
    socket.on('vote_kick', (data: { targetId: string }) => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      room.voteKick(player.id, data.targetId);
    });

    // 10. Play Again (Host resets game back to lobby)
    socket.on('play_again', () => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      if (!player.isHost) return;

      room.drawingBoard.clear();
      io.to(room.id).emit('canvas_clear');
      room.game.resetToLobby();
      room.broadcastPlayers();
    });

    // 11. Leave Room
    socket.on('leave_room', () => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      room.removePlayer(player.id);
      socket.leave(room.id);
    });

    // 12. Disconnection
    socket.on('disconnect', () => {
      const match = roomManager.findRoomBySocketId(socket.id);
      if (!match) return;
      const { room, player } = match;

      room.removePlayer(player.id);
    });
  });
}
