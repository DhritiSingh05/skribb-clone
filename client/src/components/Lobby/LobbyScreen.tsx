import React, { useState } from 'react';
import { PlayerData, RoomSettings, WordMode } from '../../types';
import {
  Users,
  Play,
  Copy,
  Check,
  Crown,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import { Avatar } from '../Avatar/Avatar';

interface LobbyScreenProps {
  roomId: string;
  roomName: string;
  isPrivate: boolean;
  players: PlayerData[];
  currentPlayer: PlayerData | null;
  settings: RoomSettings;
  onStartGame: () => void;
  onUpdateSettings: (newSettings: Partial<RoomSettings>) => void;
  onLeaveRoom: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomId,
  players,
  currentPlayer,
  settings,
  onStartGame,
  onUpdateSettings,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [customWordsText, setCustomWordsText] = useState(settings.customWords?.join(', ') || '');
  const isHost = currentPlayer?.isHost ?? false;

  const handleCopyInvite = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomWordsBlur = () => {
    const words = customWordsText
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);
    onUpdateSettings({ customWords: words });
  };

  return (
    <div className="max-w-4xl w-full mx-auto p-4 flex flex-col gap-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-slate-800 tracking-wide">
              GAME LOBBY
            </h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
              Room: {roomId}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Share the room code or invite link to play with friends!
          </p>
        </div>

        {/* Copy Invite & Leave */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyInvite}
            className="py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl font-bold text-sm border-2 border-blue-200 shadow-sm flex items-center gap-2 transition-transform active:scale-95"
          >
            {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
            <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
          <button
            onClick={onLeaveRoom}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm border border-slate-300 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Players in Room */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-xl border-4 border-slate-700 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-blue-600" size={24} />
                <h2 className="text-xl font-black text-slate-800">
                  PLAYERS ({players.length}/{settings.maxPlayers})
                </h2>
              </div>
              {players.length < 2 && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Waiting for at least 2 players...
                </span>
              )}
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {players.map((p) => {
                const isMe = p.id === currentPlayer?.id;
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-transform hover:-translate-y-0.5 ${
                      isMe
                        ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="relative mb-2">
                      <Avatar config={p.avatar} size="md" />
                      {p.isHost && (
                        <div
                          className="absolute -top-1 -right-1 p-1 bg-amber-400 text-amber-950 rounded-full shadow-sm"
                          title="Room Host"
                        >
                          <Crown size={12} />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-sm text-slate-800 truncate w-full">
                      {p.name} {isMe && '(You)'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {p.isHost ? 'Host' : 'Ready'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Start Game Action */}
          <div className="mt-8 pt-4 border-t-2 border-slate-100 flex flex-col items-center">
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={players.length < 2}
                className="w-full sm:w-auto min-w-[240px] py-4 px-8 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl font-black text-xl shadow-lg border-b-4 border-emerald-700 transition-all transform active:translate-y-1 flex items-center justify-center gap-3"
              >
                <Play fill="white" size={24} />
                <span>START GAME</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-100 py-3 px-6 rounded-2xl">
                <Sparkles size={18} className="text-amber-500 animate-spin" />
                <span>Waiting for host to start the game...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Room Settings */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-slate-700 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="text-slate-700" size={22} />
            <h2 className="text-xl font-black text-slate-800">ROOM SETTINGS</h2>
          </div>

          <div className="space-y-4 flex-1">
            {/* Rounds */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Rounds: {settings.rounds}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={settings.rounds}
                disabled={!isHost}
                onChange={(e) => onUpdateSettings({ rounds: parseInt(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Draw Time */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Draw Time: {settings.drawTime} seconds
              </label>
              <input
                type="range"
                min="30"
                max="180"
                step="10"
                value={settings.drawTime}
                disabled={!isHost}
                onChange={(e) => onUpdateSettings({ drawTime: parseInt(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Word Choices Count */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Word Choices: {settings.wordCount}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={settings.wordCount}
                disabled={!isHost}
                onChange={(e) => onUpdateSettings({ wordCount: parseInt(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Hints Count */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Hints: {settings.hintsCount}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                value={settings.hintsCount}
                disabled={!isHost}
                onChange={(e) => onUpdateSettings({ hintsCount: parseInt(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Word Mode */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Word Mode
              </label>
              <select
                value={settings.wordMode}
                disabled={!isHost}
                onChange={(e) => onUpdateSettings({ wordMode: e.target.value as WordMode })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-sm text-slate-700"
              >
                <option value="normal">Normal (Letters revealed)</option>
                <option value="hidden">Hidden (No letters shown)</option>
                <option value="combination">Combination</option>
              </select>
            </div>

            {/* Custom Words */}
            {isHost && (
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Custom Words (comma separated)
                </label>
                <textarea
                  value={customWordsText}
                  onChange={(e) => setCustomWordsText(e.target.value)}
                  onBlur={handleCustomWordsBlur}
                  rows={2}
                  placeholder="superhero, pizza, helicopter..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2 mt-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.customWordsOnly}
                    onChange={(e) => onUpdateSettings({ customWordsOnly: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  <span>Use custom words ONLY</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
