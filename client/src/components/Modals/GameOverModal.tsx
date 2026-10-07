import React, { useEffect } from 'react';
import { PlayerData } from '../../types';
import { Trophy, RotateCcw, LogOut } from 'lucide-react';
import { Avatar } from '../Avatar/Avatar';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/audio';

interface GameOverModalProps {
  leaderboard: PlayerData[];
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  leaderboard,
  isHost,
  onPlayAgain,
  onLeaveRoom,
}) => {
  useEffect(() => {
    soundManager.playGameOver();

    // Trigger celebratory confetti cannons
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-slate-700 max-w-xl w-full p-6 text-center">
        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="text-amber-500 animate-bounce" size={32} />
          <h2 className="text-3xl font-black text-slate-800 tracking-wide">
            GAME OVER!
          </h2>
          <Trophy className="text-amber-500 animate-bounce" size={32} />
        </div>
        <p className="text-sm font-bold text-slate-500 mb-6">
          Final Standings & Champion Celebration
        </p>

        {/* Podium */}
        <div className="flex items-end justify-center gap-3 mb-6 px-4">
          {/* 2nd Place */}
          {second && (
            <div className="flex-1 flex flex-col items-center">
              <Avatar config={second.avatar} size="md" className="mb-2" />
              <div className="font-bold text-xs truncate max-w-[90px]">{second.name}</div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1">{second.score} pts</div>
              <div className="w-full bg-slate-200 border-2 border-slate-400 rounded-t-xl h-20 flex flex-col items-center justify-center font-black text-xl text-slate-700 shadow-sm">
                🥈 2nd
              </div>
            </div>
          )}

          {/* 1st Place (Winner) */}
          {first && (
            <div className="flex-1 flex flex-col items-center">
              <div className="text-2xl animate-bounce mb-1">👑</div>
              <Avatar config={first.avatar} size="lg" className="mb-2 ring-4 ring-amber-400" />
              <div className="font-black text-sm text-amber-600 truncate max-w-[110px]">{first.name}</div>
              <div className="text-xs font-bold text-slate-600 mb-1">{first.score} pts</div>
              <div className="w-full bg-gradient-to-t from-amber-400 to-amber-300 border-2 border-amber-500 rounded-t-2xl h-28 flex flex-col items-center justify-center font-black text-2xl text-amber-950 shadow-md">
                🥇 1st
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="flex-1 flex flex-col items-center">
              <Avatar config={third.avatar} size="md" className="mb-2" />
              <div className="font-bold text-xs truncate max-w-[90px]">{third.name}</div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1">{third.score} pts</div>
              <div className="w-full bg-amber-100 border-2 border-amber-300 rounded-t-xl h-14 flex flex-col items-center justify-center font-black text-lg text-amber-800 shadow-sm">
                🥉 3rd
              </div>
            </div>
          )}
        </div>

        {/* Full scores list */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 mb-6 max-h-40 overflow-y-auto">
          {leaderboard.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-1.5 px-3 rounded-lg hover:bg-slate-100 text-sm font-semibold"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400 w-5">#{idx + 1}</span>
                <span className="text-slate-800">{p.name}</span>
              </div>
              <span className="font-bold text-blue-600">{p.score} points</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3">
          {isHost ? (
            <button
              onClick={onPlayAgain}
              className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-base shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              <span>PLAY AGAIN</span>
            </button>
          ) : (
            <div className="text-xs font-bold text-slate-500 italic">
              Waiting for host to restart game...
            </div>
          )}

          <button
            onClick={onLeaveRoom}
            className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-base border border-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
};
