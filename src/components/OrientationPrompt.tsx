import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, X } from 'lucide-react';

export const OrientationPrompt: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if mobile device in portrait mode
      const isMobile = window.innerWidth <= 900 || ('ontouchstart' in window);
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && isPortraitMode);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
      <div className="relative max-w-sm w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/80 transition-colors"
          title="Fechar e continuar em pé"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Phone Rotate Icon */}
        <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 bg-rose-600/20 rounded-full animate-ping pointer-events-none" />
          <div className="relative flex items-center justify-center bg-zinc-800 border-2 border-rose-500 rounded-2xl w-16 h-16 shadow-lg shadow-rose-600/20">
            <Smartphone className="w-8 h-8 text-rose-400 animate-bounce" />
            <RotateCw className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        <span className="text-[11px] font-race font-bold tracking-widest uppercase text-rose-500 mb-1">
          Experiência Mobile Otimizada
        </span>
        <h3 className="font-race text-xl font-black text-white mb-2">
          VIRE O CELULAR NA HORIZONTAL
        </h3>
        <p className="text-xs text-zinc-300 leading-relaxed mb-6">
          Para ter o controle total do volante, pedais de gás, freio, drift e nitro na ponta dos polegares, deite seu celular de lado (modo paisagem).
        </p>

        <div className="w-full flex flex-col gap-2.5">
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 text-white rounded-xl font-race font-bold text-xs shadow-lg shadow-rose-600/25">
            <RotateCw className="w-4 h-4" />
            <span>Gire o aparelho para pilotar</span>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="w-full py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Continuar com o celular em pé
          </button>
        </div>
      </div>
    </div>
  );
};
