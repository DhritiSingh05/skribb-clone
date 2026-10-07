import React, { useState } from 'react';
import { GameStatePayload } from '../../types';
import {
  Clock,
  Copy,
  Check,
  Volume2,
  VolumeX,
  LogOut,
  Pencil,
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface GameHeaderProps {
  roomId: string;
  gameState: GameStatePayload;
  isDrawer: boolean;
  drawerWord?: string;
  onLeaveRoom: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  roomId,
  gameState,
  isDrawer,
  drawerWord,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    const newMuted = soundManager.toggleMute();
    setIsMuted(newMuted);
  };

  const isLowTime = gameState.timeLeft <= 10 && gameState.phase === 'DRAWING';

  return (
    <header className="w-full bg-white rounded-2xl shadow-md border-4 border-slate-700 p-3 flex flex-wrap items-center justify-between gap-3">
      {/* Left: Round & Timer */}
      <div className="flex items-center gap-3">
        {/* Round Badge */}
        <div className="px-3.5 py-1.5 bg-blue-100 text-blue-900 rounded-xl font-bold text-sm border-2 border-blue-300">
          Round {gameState.round} of {gameState.totalRounds}
        </div>

        {/* Timer Badge */}
        <div
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-lg transition-colors border-2 ${
            isLowTime
              ? 'bg-red-500 text-white border-red-700 animate-pulse'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}
        >
          <Clock size={20} className={isLowTime ? 'animate-spin' : ''} />
          <span>{gameState.timeLeft}s</span>
        </div>
      </div>

      {/* Middle: Word Display or Blanks */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-[200px]">
        {gameState.phase === 'DRAWING' ? (
          isDrawer ? (
            <div className="text-center">
              <span className="text-xs font-bold text-blue-600 tracking-wider uppercase block flex items-center justify-center gap-1">
                <Pencil size={14} /> You are drawing!
              </span>
              <span className="text-2xl font-black text-slate-800 tracking-widest uppercase">
                {drawerWord || gameState.hint}
              </span>
              {gameState.category && (
                <span className="text-xs text-slate-500 font-semibold ml-2">
                  ({gameState.category})
                </span>
              )}
            </div>
          ) : (
            <div className="text-center">
              <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block">
                Guess the word ({gameState.wordLength} letters)
              </span>
              <span className="text-2xl font-black text-slate-800 tracking-widest font-mono">
                {gameState.hint || '_ '.repeat(gameState.wordLength)}
              </span>
            </div>
          )
        ) : gameState.phase === 'CHOOSING_WORD' ? (
          <div className="text-sm font-bold text-slate-600 animate-pulse">
            {isDrawer ? 'Pick a word to draw!' : `${gameState.drawerName || 'Drawer'} is choosing a word...`}
          </div>
        ) : gameState.phase === 'ROUND_END' ? (
          <div className="text-sm font-bold text-indigo-600">
            Round finished! Preparing next turn...
          </div>
        ) : (
          <div className="text-sm font-bold text-slate-600">
            Waiting for game to begin...
          </div>
        )}
      </div>

      {/* Right: Room Actions */}
      <div className="flex items-center gap-2">
        {/* Copy Invite Link */}
        <button
          onClick={handleCopyLink}
          title="Copy Room Link"
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-300 transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : `Room: ${roomId}`}</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className={`p-2 rounded-xl border transition-colors ${
            isMuted
              ? 'bg-slate-100 text-slate-400 border-slate-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-300'
          }`}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Leave Room */}
        <button
          onClick={onLeaveRoom}
          title="Leave Room"
          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
