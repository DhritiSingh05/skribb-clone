import React from 'react';
import { WordOption } from '../../types';
import { Sparkles, Clock } from 'lucide-react';

interface WordSelectModalProps {
  options: WordOption[];
  timeLeft: number;
  onSelectWord: (word: string, category: string) => void;
}

export const WordSelectModal: React.FC<WordSelectModalProps> = ({
  options,
  timeLeft,
  onSelectWord,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-slate-700 max-w-lg w-full p-6 text-center transform scale-100 transition-all">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="text-amber-500 animate-spin" size={24} />
          <h2 className="text-2xl font-black text-slate-800 tracking-wide">
            CHOOSE A WORD TO DRAW!
          </h2>
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-1.5 text-slate-500 font-bold text-sm mb-6">
          <Clock size={16} />
          <span>Auto-picking in {timeLeft} seconds</span>
        </div>

        {/* Word Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {options.map((opt) => (
            <button
              key={opt.word}
              onClick={() => onSelectWord(opt.word, opt.category)}
              className="group p-4 rounded-2xl bg-gradient-to-b from-blue-50 to-blue-100 hover:from-blue-500 hover:to-blue-600 border-2 border-blue-300 hover:border-blue-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 text-left flex flex-col justify-between"
            >
              <span className="text-lg font-black text-slate-800 group-hover:text-white capitalize block tracking-wide">
                {opt.word}
              </span>
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-100 uppercase tracking-wider mt-2">
                {opt.category}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
