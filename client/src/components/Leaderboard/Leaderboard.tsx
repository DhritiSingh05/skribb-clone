import React from 'react';
import { PlayerData } from '../../types';
import { Crown, Pencil, CheckCircle, UserX, Flag } from 'lucide-react';
import { Avatar } from '../Avatar/Avatar';

interface LeaderboardProps {
  players: PlayerData[];
  currentPlayer: PlayerData | null;
  drawerId: string | null;
  onKickPlayer?: (targetId: string) => void;
  onVoteKick?: (targetId: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  currentPlayer,
  drawerId,
  onKickPlayer,
  onVoteKick,
}) => {
  const isHost = currentPlayer?.isHost ?? false;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border-4 border-slate-700 overflow-hidden">
      {/* Title */}
      <div className="px-4 py-3 bg-slate-800 text-white font-bold flex items-center justify-between">
        <span className="tracking-wide">Leaderboard</span>
        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-600 rounded-full">
          {players.length} players
        </span>
      </div>

      {/* Players List */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-slate-50">
        {players.map((player, index) => {
          const isDrawer = player.id === drawerId;
          const isMe = player.id === currentPlayer?.id;
          const rank = index + 1;

          return (
            <div
              key={player.id}
              className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border-2 ${
                isMe
                  ? 'bg-blue-50 border-blue-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Rank Number */}
              <div className="w-6 text-center font-black text-sm">
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
              </div>

              {/* Avatar */}
              <Avatar config={player.avatar} size="sm" />

              {/* Name & Indicators */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`font-bold text-sm truncate ${isMe ? 'text-blue-700' : 'text-slate-800'}`}>
                    {player.name}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-200 text-blue-800 rounded">
                      You
                    </span>
                  )}
                  {player.isHost && (
                    <span title="Host">
                      <Crown size={14} className="text-amber-500 flex-shrink-0" />
                    </span>
                  )}
                </div>

                {/* Score */}
                <div className="text-xs font-semibold text-slate-500">
                  {player.score} points
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-1">
                {isDrawer && (
                  <div
                    className="p-1 bg-amber-100 text-amber-700 rounded-lg animate-pulse"
                    title="Currently drawing"
                  >
                    <Pencil size={15} />
                  </div>
                )}

                {player.hasGuessed && !isDrawer && (
                  <div
                    className="p-1 bg-emerald-100 text-emerald-700 rounded-lg"
                    title="Guessed correctly"
                  >
                    <CheckCircle size={15} />
                  </div>
                )}

                {/* Host kick or player votekick */}
                {!isMe && (
                  <div className="flex items-center">
                    {isHost ? (
                      <button
                        onClick={() => onKickPlayer && onKickPlayer(player.id)}
                        title={`Kick ${player.name}`}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <UserX size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onVoteKick && onVoteKick(player.id)}
                        title={`Vote to kick ${player.name}`}
                        className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                      >
                        <Flag size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
