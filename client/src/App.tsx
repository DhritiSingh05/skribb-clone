import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  PlayerData,
  GameStatePayload,
  RoomSettings,
  ChatMessage,
  StrokeAction,
  WordOption,
  AvatarConfig,
} from './types';
import { HomeScreen } from './components/Lobby/HomeScreen';
import { LobbyScreen } from './components/Lobby/LobbyScreen';
import { GameHeader } from './components/Header/GameHeader';
import { Canvas } from './components/Canvas/Canvas';
import { Leaderboard } from './components/Leaderboard/Leaderboard';
import { ChatBox } from './components/Chat/ChatBox';
import { WordSelectModal } from './components/Modals/WordSelectModal';
import { RoundEndModal } from './components/Modals/RoundEndModal';
import { GameOverModal } from './components/Modals/GameOverModal';
import { soundManager } from './utils/audio';

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerData | null>(null);
  const [gameState, setGameState] = useState<GameStatePayload | null>(null);
  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    hintsCount: 2,
    wordMode: 'normal',
    customWords: [],
    customWordsOnly: false,
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingStroke, setIncomingStroke] = useState<StrokeAction | null>(null);
  const [initialActions, setInitialActions] = useState<StrokeAction[]>([]);
  const [clearTrigger, setClearTrigger] = useState<number>(0);
  const [undoTrigger, setUndoTrigger] = useState<number>(0);

  const [wordOptions, setWordOptions] = useState<WordOption[] | null>(null);
  const [drawerWord, setDrawerWord] = useState<string | undefined>(undefined);
  const [roundEndData, setRoundEndData] = useState<{
    word: string;
    scores: { id: string; name: string; roundScore: number; totalScore: number }[];
    nextDrawerName: string | null;
  } | null>(null);
  const [gameOverLeaderboard, setGameOverLeaderboard] = useState<PlayerData[] | null>(null);

  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Check URL query parameters for room code
  const [initialUrlRoomId, setInitialUrlRoomId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setInitialUrlRoomId(code.toUpperCase());
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const serverUrl = window.location.origin.includes('5173')
  ? 'http://localhost:4000'
  : 'https://skribb-clone-1.onrender.com';

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    // Socket Event Listeners
    newSocket.on('room_created', (data) => {
      setRoomId(data.roomId);
      setCurrentPlayer(data.player);
      setSettings(data.settings);
      setIsPrivate(data.isPrivate);
      setGameState({
        phase: 'LOBBY',
        round: 0,
        totalRounds: data.settings.rounds,
        drawerId: null,
        drawerName: null,
        timeLeft: 0,
        hint: '',
        wordLength: 0,
        revealedLettersCount: 0,
      });
    });

    newSocket.on('room_joined', (data) => {
      setRoomId(data.roomId);
      setCurrentPlayer(data.player);
      setSettings(data.settings);
      setIsPrivate(data.isPrivate);
      setGameState(data.gameState);
      if (data.existingDrawActions) {
        setInitialActions(data.existingDrawActions);
      }
      if (data.chatHistory) {
        setChatMessages(data.chatHistory);
      }
    });

    newSocket.on('players_list', (data) => {
      setPlayers(data.players);
      // Update currentPlayer reference
      setCurrentPlayer((prev) => {
        if (!prev) return null;
        const updated = data.players.find((p: PlayerData) => p.id === prev.id);
        return updated || prev;
      });
    });

    newSocket.on('game_state', (data: GameStatePayload) => {
      setGameState(data);

      if (data.phase === 'CHOOSING_WORD') {
        setRoundEndData(null);
        setClearTrigger((prev) => prev + 1);
      }

      if (data.phase === 'DRAWING') {
        setWordOptions(null);
        soundManager.playRoundStart();
      }

      if (data.phase === 'LOBBY') {
        setGameOverLeaderboard(null);
        setRoundEndData(null);
        setDrawerWord(undefined);
        setClearTrigger((prev) => prev + 1);
      }
    });

    newSocket.on('timer_tick', (data: { timeLeft: number }) => {
      setGameState((prev) => (prev ? { ...prev, timeLeft: data.timeLeft } : null));
      if (data.timeLeft <= 5 && data.timeLeft > 0) {
        soundManager.playTick();
      }
    });

    newSocket.on('hint_update', (data: { hint: string; revealedCount: number }) => {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              hint: data.hint,
              revealedLettersCount: data.revealedCount,
            }
          : null
      );
    });

    newSocket.on('word_options', (data: { options: WordOption[] }) => {
      setWordOptions(data.options);
    });

    newSocket.on('drawer_word', (data: { word: string; category: string }) => {
      setDrawerWord(data.word);
    });

    newSocket.on('draw_data', (action: StrokeAction) => {
      setIncomingStroke(action);
    });

    newSocket.on('draw_undo', () => {
      setUndoTrigger((prev) => prev + 1);
    });

    newSocket.on('canvas_clear', () => {
      setClearTrigger((prev) => prev + 1);
    });

    newSocket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      if (msg.type === 'close') {
        soundManager.playClose();
      }
    });

    newSocket.on('guess_result', (data: { correct: boolean; points: number }) => {
      if (data.correct) {
        soundManager.playCorrect();
      }
    });

    newSocket.on('round_end', (data) => {
      setRoundEndData(data);
    });

    newSocket.on('game_over', (data: { leaderboard: PlayerData[] }) => {
      setGameOverLeaderboard(data.leaderboard);
    });

    newSocket.on('settings_updated', (data: { settings: RoomSettings }) => {
      setSettings(data.settings);
    });

    newSocket.on('kicked', (data: { reason: string }) => {
      alert(`You were kicked from the room: ${data.reason}`);
      handleLeaveRoom();
    });

    newSocket.on('error_message', (data: { message: string }) => {
      showToast(data.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const showToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3500);
  };

  // Actions
  const handleCreateRoom = (playerName: string, avatar: AvatarConfig, isPriv: boolean) => {
    if (!socket) return;
    socket.emit('create_room', {
      hostName: playerName,
      avatar,
      isPrivate: isPriv,
      settings,
    });
  };

  const handleJoinRoom = (targetRoomId: string, playerName: string, avatar: AvatarConfig) => {
    if (!socket) return;
    socket.emit('join_room', {
      roomId: targetRoomId.toUpperCase(),
      playerName,
      avatar,
    });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('start_game');
  };

  const handleUpdateSettings = (newSettings: Partial<RoomSettings>) => {
    if (!socket) return;
    socket.emit('update_settings', newSettings);
  };

  const handleWordSelect = (word: string, category: string) => {
    if (!socket) return;
    socket.emit('word_chosen', { word, category });
    setWordOptions(null);
  };

  const handleStrokeAction = (action: StrokeAction) => {
    if (!socket) return;
    socket.emit('draw_data', action);
  };

  const handleUndo = () => {
    if (!socket) return;
    socket.emit('draw_undo');
  };

  const handleClear = () => {
    if (!socket) return;
    socket.emit('canvas_clear');
  };

  const handleSendMessage = (text: string) => {
    if (!socket) return;
    socket.emit('chat', { text });
  };

  const handleKickPlayer = (targetId: string) => {
    if (!socket) return;
    socket.emit('kick_player', { targetId });
  };

  const handleVoteKick = (targetId: string) => {
    if (!socket) return;
    socket.emit('vote_kick', { targetId });
  };

  const handlePlayAgain = () => {
    if (!socket) return;
    socket.emit('play_again');
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leave_room');
    }
    setRoomId(null);
    setCurrentPlayer(null);
    setGameState(null);
    setPlayers([]);
    setChatMessages([]);
    setGameOverLeaderboard(null);
    setRoundEndData(null);
    setWordOptions(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Check if current user is active drawer
  const isDrawer = Boolean(
    currentPlayer &&
    gameState?.drawerId &&
    currentPlayer.id === gameState.drawerId
  );

  const canDraw = Boolean(isDrawer && gameState?.phase === 'DRAWING');

  // Render App Content
  return (
    <div className="min-h-screen bg-slate-200 text-slate-800 flex flex-col font-sans select-none">
      {/* Toast Notification */}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white font-bold py-2.5 px-5 rounded-2xl shadow-2xl border-2 border-white animate-bounce-short">
          {errorToast}
        </div>
      )}

      {!roomId ? (
        // 1. Home / Landing Screen
        <HomeScreen
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          initialRoomId={initialUrlRoomId}
        />
      ) : gameState?.phase === 'LOBBY' ? (
        // 2. Waiting Room Lobby
        <div className="min-h-screen flex items-center justify-center p-4">
          <LobbyScreen
            roomId={roomId}
            roomName={roomName}
            isPrivate={isPrivate}
            players={players}
            currentPlayer={currentPlayer}
            settings={settings}
            onStartGame={handleStartGame}
            onUpdateSettings={handleUpdateSettings}
            onLeaveRoom={handleLeaveRoom}
          />
        </div>
      ) : (
        // 3. In-Game View (Canvas, Chat, Leaderboard, Header)
        <div className="flex flex-col h-screen max-h-screen p-2 sm:p-4 gap-2 sm:gap-3">
          {/* Header */}
          {gameState && (
            <GameHeader
              roomId={roomId}
              gameState={gameState}
              isDrawer={isDrawer}
              drawerWord={drawerWord}
              onLeaveRoom={handleLeaveRoom}
            />
          )}

          {/* Main 3-Column Arena */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 min-h-0">
            {/* Left Col: Leaderboard (3 cols) */}
            <div className="hidden md:block md:col-span-3 h-full min-h-0">
              <Leaderboard
                players={players}
                currentPlayer={currentPlayer}
                drawerId={gameState?.drawerId || null}
                onKickPlayer={handleKickPlayer}
                onVoteKick={handleVoteKick}
              />
            </div>

            {/* Center Col: Drawing Canvas (6 cols) */}
            <div className="col-span-1 md:col-span-6 h-full min-h-0 flex flex-col">
              <Canvas
                isDrawer={isDrawer}
                canDraw={canDraw}
                onStrokeAction={handleStrokeAction}
                onUndo={handleUndo}
                onClear={handleClear}
                incomingAction={incomingStroke}
                clearTrigger={clearTrigger}
                undoTrigger={undoTrigger}
                initialActions={initialActions}
              />
            </div>

            {/* Right Col: Chat & Guesses (3 cols) */}
            <div className="col-span-1 md:col-span-3 h-full min-h-0">
              <ChatBox
                messages={chatMessages}
                currentPlayer={currentPlayer}
                isDrawer={isDrawer}
                hasGuessed={currentPlayer?.hasGuessed ?? false}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>

          {/* Modals */}
          {isDrawer && gameState?.phase === 'CHOOSING_WORD' && wordOptions && (
            <WordSelectModal
              options={wordOptions}
              timeLeft={gameState.timeLeft}
              onSelectWord={handleWordSelect}
            />
          )}

          {gameState?.phase === 'ROUND_END' && roundEndData && (
            <RoundEndModal
              data={roundEndData}
              timeLeft={gameState.timeLeft}
            />
          )}

          {gameState?.phase === 'GAME_OVER' && gameOverLeaderboard && (
            <GameOverModal
              leaderboard={gameOverLeaderboard}
              isHost={currentPlayer?.isHost ?? false}
              onPlayAgain={handlePlayAgain}
              onLeaveRoom={handleLeaveRoom}
            />
          )}
        </div>
      )}
    </div>
  );
};
