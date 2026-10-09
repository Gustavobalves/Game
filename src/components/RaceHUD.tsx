import React, { useState } from 'react';
import { CameraView, GameMode, TrackConfig, VehicleState } from '../types/game';
import { Camera, Volume2, VolumeX, ArrowLeft, RotateCcw, Zap, Sliders, ChevronUp, ChevronDown, X } from 'lucide-react';

interface RaceHUDProps {
  vehicleState: VehicleState;
  trackConfig: TrackConfig;
  gameMode: GameMode;
  currentLap: number;
  currentLapTime: number;
  bestLapTime: number | null;
  totalCashEarnedInRace: number;
  recentCashReward: { amount: number; text: string; id: number } | null;
  cameraView: CameraView;
  isMuted: boolean;
  steeringSensitivity: number;
  onUpdateSteeringSensitivity: (val: number) => void;
  onToggleSound: () => void;
  onSwitchCamera: () => void;
  onResetCar: () => void;
  onExitToGarage: () => void;
  onShiftUp: () => void;
  onShiftDown: () => void;
  onToggleTransmission: () => void;
  onTouchInput: (key: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake' | 'nitro', active: boolean) => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  vehicleState,
  trackConfig,
  gameMode,
  currentLap,
  currentLapTime,
  bestLapTime,
  totalCashEarnedInRace,
  recentCashReward,
  cameraView,
  isMuted,
  steeringSensitivity,
  onUpdateSteeringSensitivity,
  onToggleSound,
  onSwitchCamera,
  onResetCar,
  onExitToGarage,
  onShiftUp,
  onShiftDown,
  onToggleTransmission,
  onTouchInput,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(2, '0')}`;
  };

  const { speedKmh, rpm, gear, isManualTransmission, nitroAmount, isNitroActive, driftState } = vehicleState;

  // Tachometer geometry calculations
  const maxRpm = 9000;
  const rpmRatio = Math.min(1.0, Math.max(0, (rpm - 800) / (maxRpm - 800)));
  const needleAngle = -135 + rpmRatio * 270;
  const isRedline = rpm > 7600;

  // Touch helper preventing unwanted iOS gestures
  const bindTouch = (key: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake' | 'nitro') => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      onTouchInput(key, true);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      onTouchInput(key, false);
    },
    onTouchCancel: (e: React.TouchEvent) => {
      e.preventDefault();
      onTouchInput(key, false);
    },
    onMouseDown: () => onTouchInput(key, true),
    onMouseUp: () => onTouchInput(key, false),
    onMouseLeave: () => onTouchInput(key, false),
  });

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-between p-2.5 sm:p-5 font-sans touch-none">
      {/* 1. TOP HEADER OVERLAY */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Left: Lap & Timing info */}
        <div className="flex flex-col gap-1 bg-zinc-950/85 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-zinc-800/90 pointer-events-auto shadow-lg shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-race font-bold text-[10px] sm:text-xs uppercase tracking-wider text-rose-500">
              {gameMode === 'drift_freerun' ? 'DRIFT LIVRE' : `VOLTA ${currentLap}/${trackConfig.lapsToComplete}`}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-[10px] sm:text-xs text-zinc-300 font-medium truncate max-w-[100px] sm:max-w-none">
              {trackConfig.name}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[9px] text-zinc-400 block font-semibold uppercase leading-none">Tempo</span>
              <span className="font-digital font-bold text-sm sm:text-base text-white tabular-nums">
                {formatTime(currentLapTime)}
              </span>
            </div>

            {bestLapTime && (
              <div>
                <span className="text-[9px] text-zinc-400 block font-semibold uppercase leading-none">Melhor</span>
                <span className="font-digital font-bold text-xs sm:text-sm text-emerald-400 tabular-nums">
                  {formatTime(bestLapTime)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Live Drift Combo Widget */}
        {driftState.score > 0 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-2 sm:top-5 flex flex-col items-center pointer-events-none z-30 animate-fade-in">
            <div className="bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-xl border-2 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-3 sm:gap-4">
              <div className="text-center">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-amber-400 block">
                  DRIFT {driftState.quality}
                </span>
                <span className="font-digital text-lg sm:text-2xl font-black text-white tabular-nums drop-shadow">
                  {driftState.score.toLocaleString()} PTS
                </span>
              </div>

              <div className="h-6 sm:h-8 w-px bg-zinc-800" />

              <div className="text-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block">MULTIPLICADOR</span>
                <span className="font-race text-base sm:text-xl font-black text-rose-500">
                  {driftState.multiplier.toFixed(1)}x
                </span>
              </div>

              <div className="h-6 sm:h-8 w-px bg-zinc-800" />

              <div className="text-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block">ÂNGULO</span>
                <span className="font-race text-sm sm:text-lg font-bold text-amber-300">
                  {driftState.angle}°
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cash reward pop-up alert */}
        {recentCashReward && (
          <div className="absolute left-1/2 -translate-x-1/2 top-16 sm:top-20 pointer-events-none animate-bounce z-40">
            <div className="bg-emerald-950/95 backdrop-blur-md px-4 py-1.5 rounded-xl border border-emerald-500 text-center shadow-xl">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-300 block">{recentCashReward.text}</span>
              <span className="font-race font-black text-base sm:text-lg text-emerald-400">
                +R$ {recentCashReward.amount.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {/* Right: Cash & Quick Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          <div className="hidden sm:flex bg-zinc-950/85 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-800 items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 font-semibold">GANHOS:</span>
            <span className="font-race font-bold text-emerald-400 text-xs">
              R$ {totalCashEarnedInRace.toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Quick Steering Sensitivity Toggle / Trigger */}
          <button
            onClick={() => setShowSettingsModal((prev) => !prev)}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all shadow-md flex items-center gap-1.5 ${
              showSettingsModal
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-zinc-950/85 hover:bg-zinc-900 text-zinc-300 border-zinc-800'
            }`}
            title="Ajustar Sensibilidade da Direção"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden md:inline text-[11px] font-race font-bold">
              {steeringSensitivity.toFixed(1)}x
            </span>
          </button>

          <button
            onClick={onSwitchCamera}
            className="p-2 sm:p-2.5 bg-zinc-950/85 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 transition-colors shadow-md"
            title={`Câmera (${cameraView === 'chase_far' ? 'Terceira Pessoa' : cameraView === 'chase_close' ? 'Perto' : 'Capô'})`}
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={onResetCar}
            className="p-2 sm:p-2.5 bg-zinc-950/85 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 transition-colors shadow-md"
            title="Resetar Carro na Pista (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleSound}
            className="p-2 sm:p-2.5 bg-zinc-950/85 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 transition-colors shadow-md"
            title="Alternar Áudio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
          </button>

          <button
            onClick={onExitToGarage}
            className="flex items-center gap-1 px-3 py-2 sm:py-2.5 bg-rose-600/90 hover:bg-rose-500 border border-rose-500/50 rounded-xl text-white text-[11px] sm:text-xs font-race font-bold transition-colors shadow-md"
            title="Voltar para Garagem"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GARAGEM</span>
          </button>
        </div>
      </div>

      {/* SENSITIVITY POPUP MODAL (Can be opened anytime in race) */}
      {showSettingsModal && (
        <div className="absolute top-14 sm:top-16 right-2 sm:right-6 pointer-events-auto bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-2xl z-50 w-72 sm:w-80 animate-fade-in text-zinc-100">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-500" />
              <span className="font-race font-bold text-xs uppercase text-white">Sensibilidade do Volante</span>
            </div>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Resposta da Direção:</span>
              <span className="font-race font-black text-rose-400 text-sm">
                {steeringSensitivity.toFixed(1)}x{' '}
                <span className="text-[10px] text-zinc-400 font-normal">
                  ({steeringSensitivity < 0.8 ? 'Suave' : steeringSensitivity > 1.4 ? 'Extrema' : 'Rápida'})
                </span>
              </span>
            </div>

            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.1"
              value={steeringSensitivity}
              onChange={(e) => onUpdateSteeringSensitivity(parseFloat(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '0.6x', text: 'Suave', val: 0.6 },
                { label: '1.0x', text: 'Padrão', val: 1.0 },
                { label: '1.4x', text: 'Rápida', val: 1.4 },
                { label: '2.0x', text: 'Drift+', val: 2.0 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onUpdateSteeringSensitivity(preset.val)}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-race font-bold border transition-colors text-center ${
                    Math.abs(steeringSensitivity - preset.val) < 0.05
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                  }`}
                >
                  <div>{preset.label}</div>
                  <div className="text-[8px] font-normal opacity-80">{preset.text}</div>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-zinc-400 leading-tight pt-1">
              Dica: Valores mais altos (1.4x+) permitem contra-esterçar mais rápido no celular para segurar drifts longos!
            </p>
          </div>
        </div>
      )}

      {/* 2. BOTTOM CONTROLS & ERGONOMIC LANDSCAPE THUMB ZONES */}
      <div className="flex items-end justify-between w-full mt-auto gap-2">
        {/* LEFT THUMB ZONE: Directional Steer Buttons + Sensitivity Badge */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Quick Sensitivity display button for mobile */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              onClick={() => setShowSettingsModal((prev) => !prev)}
              className="px-2 py-1 bg-zinc-900/90 border border-zinc-800 rounded-lg flex items-center gap-1 text-[10px] font-race text-zinc-300"
            >
              <Sliders className="w-3 h-3 text-rose-500" />
              <span>Sens: {steeringSensitivity.toFixed(1)}x</span>
            </button>
          </div>

          {/* Ergonomic Steer Buttons (Left & Right) */}
          <div className="flex gap-2 sm:gap-3">
            <button
              {...bindTouch('left')}
              className="w-16 sm:w-20 h-16 sm:h-20 bg-zinc-900/90 active:bg-rose-600 border border-zinc-700/80 active:border-white rounded-2xl flex flex-col items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-xl select-none transition-transform active:scale-95"
            >
              <span>◀</span>
              <span className="text-[8px] sm:text-[9px] font-race font-bold text-zinc-400 uppercase leading-none mt-0.5">
                ESQ
              </span>
            </button>

            <button
              {...bindTouch('right')}
              className="w-16 sm:w-20 h-16 sm:h-20 bg-zinc-900/90 active:bg-rose-600 border border-zinc-700/80 active:border-white rounded-2xl flex flex-col items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-xl select-none transition-transform active:scale-95"
            >
              <span>▶</span>
              <span className="text-[8px] sm:text-[9px] font-race font-bold text-zinc-400 uppercase leading-none mt-0.5">
                DIR
              </span>
            </button>
          </div>

          {/* Desktop Keyboard Helper */}
          <div className="hidden lg:flex flex-col gap-1 bg-zinc-950/85 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-800 text-[10px] text-zinc-400 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 font-bold rounded">W / ↑</span>
              <span>Acelerar</span>
              <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 font-bold rounded">S / ↓</span>
              <span>Freio/Ré</span>
              <span className="px-1.5 py-0.5 bg-zinc-800 text-rose-300 font-bold rounded">A / D</span>
              <span className="text-zinc-200">Volante</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded">ESPAÇO</span>
              <span>Drift</span>
              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 font-bold rounded">SHIFT</span>
              <span>Nitro</span>
              <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 font-bold rounded">Q / E</span>
              <span>Marcha</span>
            </div>
          </div>
        </div>

        {/* CENTER / MID CLUSTER: Gear, Speedometer & Mobile Transmission Switch */}
        <div className="flex flex-col items-center pointer-events-auto">
          {/* Compact Telemetry Cluster */}
          <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800 rounded-2xl px-3 sm:px-5 py-1.5 sm:py-2 flex items-center gap-3 sm:gap-5 shadow-2xl">
            {/* Gear Indicator */}
            <div className="text-center">
              <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase block leading-none">
                MARCHA
              </span>
              <span
                className={`font-race font-black text-2xl sm:text-3xl leading-tight ${
                  gear === 'R' ? 'text-amber-400' : 'text-white'
                }`}
              >
                {gear}
              </span>
            </div>

            <div className="h-8 sm:h-10 w-px bg-zinc-800" />

            {/* Digital Speed */}
            <div className="text-center">
              <div className="font-digital text-2xl sm:text-4xl font-black text-white tabular-nums tracking-tight leading-none">
                {speedKmh}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 tracking-wider">
                KM/H
              </span>
            </div>

            <div className="h-8 sm:h-10 w-px bg-zinc-800" />

            {/* NOS Tank Gauge */}
            <div className="flex flex-col items-center">
              <div className="w-3.5 sm:w-4 h-10 sm:h-12 bg-zinc-900 rounded-full border border-zinc-700/80 p-0.5 flex flex-col justify-end overflow-hidden">
                <div
                  className={`w-full rounded-full transition-all duration-700 ${
                    isNitroActive
                      ? 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)] animate-pulse'
                      : 'bg-cyan-500'
                  }`}
                  style={{ height: `${nitroAmount}%` }}
                />
              </div>
              <span className="text-[8px] font-bold text-cyan-400 mt-0.5">NOS</span>
            </div>
          </div>

          {/* Manual Gear Controls */}
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={onShiftDown}
              className="px-2 py-0.5 bg-zinc-900/90 active:bg-rose-600 border border-zinc-800 rounded-lg text-white text-[10px] font-race font-bold"
              title="Reduzir marcha (Q)"
            >
              - [Q]
            </button>
            <button
              onClick={onToggleTransmission}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-race font-bold border ${
                isManualTransmission
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {isManualTransmission ? 'MANUAL' : 'AUTO'}
            </button>
            <button
              onClick={onShiftUp}
              className="px-2 py-0.5 bg-zinc-900/90 active:bg-rose-600 border border-zinc-800 rounded-lg text-white text-[10px] font-race font-bold"
              title="Subir marcha (E)"
            >
              + [E]
            </button>
          </div>
        </div>

        {/* RIGHT THUMB ZONE: Throttle, Brake, Drift, Nitro Pedals */}
        <div className="flex items-end gap-2 sm:gap-2.5 pointer-events-auto">
          {/* Action Pedals: Drift & NOS */}
          <div className="flex flex-col gap-2">
            <button
              {...bindTouch('nitro')}
              className="w-14 sm:w-16 h-12 sm:h-14 bg-cyan-600/90 active:bg-cyan-400 border border-cyan-400/80 rounded-2xl flex flex-col items-center justify-center text-white font-black shadow-xl select-none transition-transform active:scale-95"
            >
              <Zap className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
              <span className="text-[8px] sm:text-[9px] font-race font-black tracking-wider leading-none">
                NITRO
              </span>
            </button>

            <button
              {...bindTouch('handbrake')}
              className="w-14 sm:w-16 h-12 sm:h-14 bg-amber-600/90 active:bg-amber-400 border border-amber-400/80 rounded-2xl flex flex-col items-center justify-center text-white font-black shadow-xl select-none transition-transform active:scale-95"
            >
              <span className="text-xs sm:text-sm font-digital leading-none">⚡</span>
              <span className="text-[8px] sm:text-[9px] font-race font-black tracking-wider leading-none mt-0.5">
                DRIFT
              </span>
            </button>
          </div>

          {/* Main Driving Pedals: Brake and Gas */}
          <div className="flex gap-2">
            <button
              {...bindTouch('brake')}
              className="w-15 sm:w-18 h-20 sm:h-24 bg-red-700 active:bg-red-500 border border-red-500/80 rounded-2xl flex flex-col items-center justify-center text-white font-race font-black shadow-xl select-none transition-transform active:scale-95"
            >
              <span className="text-sm sm:text-base leading-none">▼</span>
              <span className="text-[10px] sm:text-xs tracking-wider uppercase mt-1">
                FREIO
              </span>
              <span className="text-[8px] text-red-200 opacity-80 leading-none">
                / RÉ
              </span>
            </button>

            <button
              {...bindTouch('throttle')}
              className="w-16 sm:w-20 h-22 sm:h-26 bg-emerald-600 active:bg-emerald-400 border-2 border-emerald-400 rounded-2xl flex flex-col items-center justify-center text-white font-race font-black shadow-xl select-none transition-transform active:scale-95"
            >
              <span className="text-base sm:text-lg leading-none">▲</span>
              <span className="text-[11px] sm:text-xs tracking-wider uppercase mt-1">
                GÁS
              </span>
              <span className="text-[8px] text-emerald-100 opacity-80 leading-none">
                ACELERAR
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
