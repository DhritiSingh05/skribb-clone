import React from 'react';

interface RoundEndData {
  word: string;
  scores: { id: string; name: string; roundScore: number; totalScore: number }[];
  nextDrawerName: string | null;
}

interface RoundEndModalProps {
  data: RoundEndData;
  timeLeft: number;
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({ data, timeLeft }) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-slate-700 max-w-md w-full p-6 text-center">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-1">
          Round Finished!
        </span>
        <h2 className="text-3xl font-black text-slate-800 tracking-wider mb-2">
          The word was:
        </h2>
        <div className="inline-block px-5 py-2.5 bg-blue-100 border-2 border-blue-400 rounded-2xl text-2xl font-black text-blue-900 uppercase tracking-widest mb-5 shadow-sm">
          {data.word}
        </div>

        {/* Score delta table */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 mb-4 max-h-48 overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-left px-2">
            Round Summary
          </div>
          {data.scores.map((sc) => (
            <div
              key={sc.id}
              className="flex items-center justify-between p-1.5 px-3 rounded-lg hover:bg-slate-100 text-sm font-semibold"
            >
              <span className="text-slate-800 truncate">{sc.name}</span>
              <div className="flex items-center gap-2">
                {sc.roundScore > 0 ? (
                  <span className="text-emerald-600 font-bold">+{sc.roundScore} pts</span>
                ) : (
                  <span className="text-slate-400">+0</span>
                )}
                <span className="text-slate-600 text-xs">({sc.totalScore})</span>
              </div>
            </div>
          ))}
        </div>

        {/* Next Drawer info & countdown */}
        <div className="text-sm font-bold text-slate-600">
          {data.nextDrawerName ? (
            <span>Next drawer: <strong className="text-slate-900">{data.nextDrawerName}</strong></span>
          ) : (
            <span>Starting next round...</span>
          )}
        </div>
        <div className="text-xs text-slate-400 font-medium mt-1">
          Continuing in {timeLeft}s
        </div>
      </div>
    </div>
  );
};
