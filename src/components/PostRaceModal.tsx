import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { TrackConfig } from '../types/game';
import { Trophy, RotateCcw, ArrowLeft, Flame, DollarSign, Clock } from 'lucide-react';

interface PostRaceModalProps {
  track: TrackConfig;
  bestLapTime: number | null;
  totalLaps: number;
  driftPoints: number;
  cashEarned: number;
  onRestart: () => void;
  onExitToGarage: () => void;
}

export const PostRaceModal: React.FC<PostRaceModalProps> = ({
  track,
  bestLapTime,
  totalLaps,
  driftPoints,
  cashEarned,
  onRestart,
  onExitToGarage,
}) => {
  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f59e0b', '#38bdf8', '#10b981'],
      });
    } catch {
      // safe fallback
    }
  }, []);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-rose-500 blur-sm" />

        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>

        <span className="text-xs uppercase font-bold tracking-widest text-rose-500">
          PROVA CONCLUÍDA
        </span>
        <h2 className="font-race text-3xl font-black text-white mt-1 mb-2">
          VITÓRIA NA PISTA!
        </h2>
        <p className="text-xs text-zinc-400 mb-6">{track.name}</p>

        {/* Results stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-sky-400" /> Melhor Volta
            </span>
            <span className="font-digital text-base font-bold text-white tabular-nums">
              {formatTime(bestLapTime)}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase flex items-center gap-1 mb-1">
              <Flame className="w-3 h-3 text-amber-500" /> Pontos de Drift
            </span>
            <span className="font-digital text-base font-bold text-amber-400 tabular-nums">
              {driftPoints.toLocaleString()} PTS
            </span>
          </div>
        </div>

        {/* Total Cash Awarded Box */}
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl mb-6 flex items-center justify-between">
          <div className="text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                PRÊMIO TOTAL ADICIONADO
              </span>
              <span className="text-xs text-zinc-400">Voltas ({totalLaps}) + Combos de Drift</span>
            </div>
          </div>
          <span className="font-race font-black text-2xl text-emerald-300">
            +R$ {cashEarned.toLocaleString('pt-BR')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-race font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Correr De Novo</span>
          </button>

          <button
            onClick={onExitToGarage}
            className="flex-1 py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-race font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-950/40"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Garagem & Tuning</span>
          </button>
        </div>
      </div>
    </div>
  );
};
