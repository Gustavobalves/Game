import React, { useState } from 'react';
import {
  CarCustomization,
  CarModelConfig,
  CarUpgrades,
  GameMode,
  PaintFinish,
  TrackConfig,
} from '../types/game';
import {
  CARS_DATABASE,
  TRACKS_DATABASE,
  COLOR_PALETTE,
  RIM_COLORS,
  CALIPER_COLORS,
  UNDERGLOW_COLORS,
  UPGRADE_TIERS,
} from '../data/cars';
import { ShowroomCanvas } from './ShowroomCanvas';
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Zap,
  Flame,
  Award,
  Volume2,
  VolumeX,
  Palette,
  Wrench,
  Flag,
  Lock,
  Check,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface GarageProps {
  cash: number;
  unlockedCarIds: string[];
  selectedCarId: string;
  customizations: Record<string, CarCustomization>;
  upgrades: Record<string, CarUpgrades>;
  onSelectCar: (carId: string) => void;
  onBuyCar: (car: CarModelConfig) => void;
  onUpdateCustomization: (carId: string, customization: CarCustomization) => void;
  onUpgradePart: (carId: string, part: keyof CarUpgrades, cost: number) => void;
  onStartRace: (carId: string, track: TrackConfig, mode: GameMode) => void;
}

export const Garage: React.FC<GarageProps> = ({
  cash,
  unlockedCarIds,
  selectedCarId,
  customizations,
  upgrades,
  onSelectCar,
  onBuyCar,
  onUpdateCustomization,
  onUpgradePart,
  onStartRace,
}) => {
  const [activeTab, setActiveTab] = useState<'paint' | 'tuning' | 'race'>('paint');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('tokyo_expressway');
  const [gameMode, setGameMode] = useState<GameMode>('circuit_race');
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.isSoundMuted());

  // Find index of current selected car
  const currentCarIndex = CARS_DATABASE.findIndex((c) => c.id === selectedCarId);
  const currentCar = CARS_DATABASE[currentCarIndex !== -1 ? currentCarIndex : 0];

  const currentCustomization =
    customizations[currentCar.id] || currentCar.defaultCustomization;
  const currentUpgrades =
    upgrades[currentCar.id] || {
      engineStage: 1,
      transmissionStage: 1,
      tiresStage: 1,
      nitroStage: 1,
    };

  const isCarUnlocked = unlockedCarIds.includes(currentCar.id);
  const selectedTrack =
    TRACKS_DATABASE.find((t) => t.id === selectedTrackId) || TRACKS_DATABASE[0];

  const handlePrevCar = () => {
    const nextIdx = (currentCarIndex - 1 + CARS_DATABASE.length) % CARS_DATABASE.length;
    onSelectCar(CARS_DATABASE[nextIdx].id);
  };

  const handleNextCar = () => {
    const nextIdx = (currentCarIndex + 1) % CARS_DATABASE.length;
    onSelectCar(CARS_DATABASE[nextIdx].id);
  };

  const handleToggleSound = () => {
    soundEngine.init();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Upgraded stats preview
  const engineBonus = UPGRADE_TIERS.engine[currentUpgrades.engineStage - 1] || { hpBonus: 0, topSpeedBonus: 0 };
  const transBonus = UPGRADE_TIERS.transmission[currentUpgrades.transmissionStage - 1] || { accelBonus: 0 };
  const tireBonus = UPGRADE_TIERS.tires[currentUpgrades.tiresStage - 1] || { gripBonus: 0, driftBonus: 0 };

  const currentHp = currentCar.baseStats.baseHp + engineBonus.hpBonus;
  const currentTopSpeed = currentCar.baseStats.topSpeed + engineBonus.topSpeedBonus;
  const currentAccel = Math.max(1.8, +(currentCar.baseStats.acceleration - transBonus.accelBonus).toFixed(2));
  const currentHandling = Math.min(100, currentCar.baseStats.handling + tireBonus.gripBonus);

  return (
    <div className="relative w-full h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden select-none">
      {/* 1. TOP BAR CONTRACT */}
      <header className="h-16 px-6 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <span className="font-race text-xl font-bold tracking-wider text-white">
            APEX MOTORSPORT
          </span>
          <span className="hidden sm:inline-block text-xs font-medium text-zinc-400 border-l border-zinc-800 pl-4">
            Garagem & Centro de Preparação 3D
          </span>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveTab('paint')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'paint'
                ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Pintura & Cores</span>
          </button>
          <button
            onClick={() => setActiveTab('tuning')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'tuning'
                ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Motores & Upgrades</span>
          </button>
          <button
            onClick={() => setActiveTab('race')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'race'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Pistas & Corrida</span>
          </button>
        </div>

        {/* Cash Balance & Sound toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900/90 border border-emerald-500/30 rounded-lg">
            <span className="text-xs text-zinc-400 font-medium">SALDO:</span>
            <span className="font-race font-bold text-emerald-400 text-sm tracking-wide">
              R$ {cash.toLocaleString('pt-BR')}
            </span>
          </div>

          <button
            onClick={handleToggleSound}
            aria-label="Alternar áudio"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
        {/* 3D SHOWROOM VIEWPORT */}
        <div className="relative flex-1 h-[45vh] lg:h-full bg-zinc-950">
          <ShowroomCanvas
            carConfig={currentCar}
            customization={currentCustomization}
          />

          {/* Car Navigation Arrows */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
            <button
              onClick={handlePrevCar}
              className="pointer-events-auto p-2.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-full text-zinc-200 transition-all hover:scale-105 backdrop-blur-md shadow-lg"
              title="Carro anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Car Badge & Title */}
            <div className="text-center bg-zinc-950/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-zinc-800/80 shadow-xl">
              <span className="text-[10px] uppercase font-bold tracking-widest text-rose-500">
                {currentCar.inspiredBy}
              </span>
              <h2 className="font-race text-2xl font-black text-white tracking-wide">
                {currentCar.name}
              </h2>
              <p className="text-xs text-zinc-400">{currentCar.subtitle}</p>
            </div>

            <button
              onClick={handleNextCar}
              className="pointer-events-auto p-2.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-full text-zinc-200 transition-all hover:scale-105 backdrop-blur-md shadow-lg"
              title="Próximo carro"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Real Car Stats Overlay */}
          <div className="absolute bottom-6 left-6 pointer-events-auto bg-zinc-950/85 backdrop-blur-md p-4 rounded-xl border border-zinc-800 max-w-sm w-full hidden sm:block">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <span className="text-xs uppercase font-bold text-zinc-400">Desempenho Atual</span>
              <span className="text-xs text-zinc-500 font-race font-bold">
                {currentCar.baseStats.weight} KG
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" /> Potência
                  </span>
                  <span className="font-race font-bold text-white">{currentHp} CV</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentHp / 1600) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-sky-400" /> Velocidade Máxima
                  </span>
                  <span className="font-race font-bold text-white">{currentTopSpeed} km/h</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentTopSpeed / 420) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" /> 0 a 100 km/h
                  </span>
                  <span className="font-race font-bold text-white">{currentAccel}s</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((4.5 - currentAccel) / 2.7) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-400" /> Maneabilidade & Drift
                  </span>
                  <span className="font-race font-bold text-white">{currentHandling} / 100</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${currentHandling}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buy or Unlocked Car Action Bar */}
          {!isCarUnlocked && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 z-20 pointer-events-auto">
              <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-700 max-w-md w-full text-center shadow-2xl">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-race text-xl font-bold text-white">{currentCar.name} Bloqueado</h3>
                <p className="text-xs text-zinc-400 mt-1 mb-4">
                  Ganhe dinheiro vencendo corridas e acumulando drifts insanos para comprar esta máquina!
                </p>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 mb-5">
                  <span className="text-xs text-zinc-500 block">Preço de Aquisição:</span>
                  <span className="font-race text-2xl font-black text-emerald-400">
                    R$ {currentCar.price.toLocaleString('pt-BR')}
                  </span>
                </div>

                <button
                  disabled={cash < currentCar.price}
                  onClick={() => onBuyCar(currentCar)}
                  className={`w-full py-3 px-4 rounded-xl font-race font-bold text-sm tracking-wide transition-all ${
                    cash >= currentCar.price
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {cash >= currentCar.price
                    ? 'COMPRAR AGORA 🛒'
                    : `FALTAM R$ ${(currentCar.price - cash).toLocaleString('pt-BR')}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SIDE DRAWER FOR CUSTOMIZATION & TUNING */}
        <div className="w-full lg:w-[460px] h-[55vh] lg:h-full bg-zinc-900/95 border-t lg:border-t-0 lg:border-l border-zinc-800 p-6 flex flex-col overflow-y-auto shrink-0 z-20">
          {/* TAB 1: PAINT & CUSTOMIZATION */}
          {activeTab === 'paint' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-race font-bold text-white text-base tracking-wide flex items-center gap-2">
                  <Palette className="w-4 h-4 text-rose-500" /> Pintura da Carroceria
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 mb-3">
                  Escolha entre pigmentos automotivos premium.
                </p>

                {/* Color swatch grid */}
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_PALETTE.map((color) => {
                    const isSelected = currentCustomization.bodyColor === color.hex;
                    return (
                      <button
                        key={color.hex}
                        onClick={() =>
                          onUpdateCustomization(currentCar.id, {
                            ...currentCustomization,
                            bodyColor: color.hex,
                          })
                        }
                        title={color.name}
                        className={`h-9 rounded-lg border-2 transition-all flex items-center justify-center ${
                          isSelected
                            ? 'border-white scale-105 shadow-md'
                            : 'border-transparent hover:border-zinc-500'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        {isSelected && (
                          <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paint Finish */}
              <div>
                <h4 className="text-xs uppercase font-bold text-zinc-400 mb-2">
                  Acabamento da Pintura
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'gloss', label: 'Brilhante Gloss' },
                    { id: 'metallic', label: 'Metálico Perolizado' },
                    { id: 'matte', label: 'Fosco Satin' },
                    { id: 'carbon', label: 'Fibra de Carbono' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        onUpdateCustomization(currentCar.id, {
                          ...currentCustomization,
                          finish: f.id as PaintFinish,
                        })
                      }
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-colors ${
                        currentCustomization.finish === f.id
                          ? 'bg-zinc-100 text-zinc-900 border-white'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rims & Calipers */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
                <div>
                  <h4 className="text-xs uppercase font-bold text-zinc-400 mb-2">
                    Cor dos Aros / Rodas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {RIM_COLORS.map((rc) => (
                      <button
                        key={rc.hex}
                        onClick={() =>
                          onUpdateCustomization(currentCar.id, {
                            ...currentCustomization,
                            rimColor: rc.hex,
                          })
                        }
                        title={rc.name}
                        className={`w-7 h-7 rounded-md border-2 transition-transform ${
                          currentCustomization.rimColor === rc.hex
                            ? 'border-white scale-110 shadow'
                            : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: rc.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase font-bold text-zinc-400 mb-2">
                    Pinças de Freio
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {CALIPER_COLORS.map((cc) => (
                      <button
                        key={cc.hex}
                        onClick={() =>
                          onUpdateCustomization(currentCar.id, {
                            ...currentCustomization,
                            caliperColor: cc.hex,
                          })
                        }
                        title={cc.name}
                        className={`w-7 h-7 rounded-md border-2 transition-transform ${
                          currentCustomization.caliperColor === cc.hex
                            ? 'border-white scale-110 shadow'
                            : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: cc.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Neon Underglow & Window Tint */}
              <div className="pt-2 border-t border-zinc-800/80">
                <h4 className="text-xs uppercase font-bold text-zinc-400 mb-2">
                  Luz Neon Underglow (Chassi)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {UNDERGLOW_COLORS.map((ug) => (
                    <button
                      key={ug.hex || 'off'}
                      onClick={() =>
                        onUpdateCustomization(currentCar.id, {
                          ...currentCustomization,
                          underglowColor: ug.hex,
                        })
                      }
                      className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                        currentCustomization.underglowColor === ug.hex
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {ug.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase font-bold text-zinc-400 mb-2">
                  Película dos Vidros (Insulfilm)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'clear', label: 'Transparente' },
                    { id: 'smoke', label: 'Fumê 35%' },
                    { id: 'dark', label: 'Blackout G5' },
                  ].map((tint) => (
                    <button
                      key={tint.id}
                      onClick={() =>
                        onUpdateCustomization(currentCar.id, {
                          ...currentCustomization,
                          windowTint: tint.id as 'clear' | 'smoke' | 'dark',
                        })
                      }
                      className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                        currentCustomization.windowTint === tint.id
                          ? 'bg-zinc-100 text-zinc-900 border-white'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {tint.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TUNING & ENGINE PERFORMANCE */}
          {activeTab === 'tuning' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-race font-bold text-white text-base tracking-wide flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" /> Preparação de Motores
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Suba o estágio das peças para desbloquear cavalos e velocidade de pista.
                </p>
              </div>

              {/* 1. Engine & Turbo Upgrade */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-sm text-white">Motor & Twin-Turbo</span>
                  </div>
                  <span className="text-xs text-amber-400 font-race font-bold">
                    ESTÁGIO {currentUpgrades.engineStage} / 5
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  {UPGRADE_TIERS.engine[currentUpgrades.engineStage - 1]?.desc}
                </p>

                {currentUpgrades.engineStage < 5 ? (
                  (() => {
                    const nextTier = UPGRADE_TIERS.engine[currentUpgrades.engineStage];
                    return (
                      <button
                        onClick={() =>
                          onUpgradePart(currentCar.id, 'engineStage', nextTier.cost)
                        }
                        disabled={cash < nextTier.cost}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-race font-bold flex items-center justify-between transition-colors ${
                          cash >= nextTier.cost
                            ? 'bg-amber-600 hover:bg-amber-500 text-white'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <span>MELHORAR (+{nextTier.hpBonus} CV, +{nextTier.topSpeedBonus} km/h)</span>
                        <span>R$ {nextTier.cost.toLocaleString('pt-BR')}</span>
                      </button>
                    );
                  })()
                ) : (
                  <div className="text-center py-1.5 text-xs font-race font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-lg">
                    ESTÁGIO MÁXIMO ALCANÇADO ✓
                  </div>
                )}
              </div>

              {/* 2. Transmission */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">Câmbio & Diferencial</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-race font-bold">
                    ESTÁGIO {currentUpgrades.transmissionStage} / 5
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  {UPGRADE_TIERS.transmission[currentUpgrades.transmissionStage - 1]?.desc}
                </p>

                {currentUpgrades.transmissionStage < 5 ? (
                  (() => {
                    const nextTier = UPGRADE_TIERS.transmission[currentUpgrades.transmissionStage];
                    return (
                      <button
                        onClick={() =>
                          onUpgradePart(currentCar.id, 'transmissionStage', nextTier.cost)
                        }
                        disabled={cash < nextTier.cost}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-race font-bold flex items-center justify-between transition-colors ${
                          cash >= nextTier.cost
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <span>INSTALAR (-{nextTier.accelBonus}s no 0-100)</span>
                        <span>R$ {nextTier.cost.toLocaleString('pt-BR')}</span>
                      </button>
                    );
                  })()
                ) : (
                  <div className="text-center py-1.5 text-xs font-race font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-lg">
                    ESTÁGIO MÁXIMO ALCANÇADO ✓
                  </div>
                )}
              </div>

              {/* 3. Tires & Drift Angle Kit */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-sm text-white">Pneus & Kit de Ângulo Drift</span>
                  </div>
                  <span className="text-xs text-purple-400 font-race font-bold">
                    ESTÁGIO {currentUpgrades.tiresStage} / 5
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  {UPGRADE_TIERS.tires[currentUpgrades.tiresStage - 1]?.desc}
                </p>

                {currentUpgrades.tiresStage < 5 ? (
                  (() => {
                    const nextTier = UPGRADE_TIERS.tires[currentUpgrades.tiresStage];
                    return (
                      <button
                        onClick={() =>
                          onUpgradePart(currentCar.id, 'tiresStage', nextTier.cost)
                        }
                        disabled={cash < nextTier.cost}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-race font-bold flex items-center justify-between transition-colors ${
                          cash >= nextTier.cost
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <span>UPGRADE (+{nextTier.driftBonus * 100}% Bônus Drift)</span>
                        <span>R$ {nextTier.cost.toLocaleString('pt-BR')}</span>
                      </button>
                    );
                  })()
                ) : (
                  <div className="text-center py-1.5 text-xs font-race font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-lg">
                    ESTÁGIO MÁXIMO ALCANÇADO ✓
                  </div>
                )}
              </div>

              {/* 4. Nitro System */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-sm text-white">Garrafas Nitro NOS</span>
                  </div>
                  <span className="text-xs text-cyan-400 font-race font-bold">
                    ESTÁGIO {currentUpgrades.nitroStage} / 5
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  {UPGRADE_TIERS.nitro[currentUpgrades.nitroStage - 1]?.desc}
                </p>

                {currentUpgrades.nitroStage < 5 ? (
                  (() => {
                    const nextTier = UPGRADE_TIERS.nitro[currentUpgrades.nitroStage];
                    return (
                      <button
                        onClick={() =>
                          onUpgradePart(currentCar.id, 'nitroStage', nextTier.cost)
                        }
                        disabled={cash < nextTier.cost}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-race font-bold flex items-center justify-between transition-colors ${
                          cash >= nextTier.cost
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <span>INSTALAR KIT (+{nextTier.boostBonus} HP Boost)</span>
                        <span>R$ {nextTier.cost.toLocaleString('pt-BR')}</span>
                      </button>
                    );
                  })()
                ) : (
                  <div className="text-center py-1.5 text-xs font-race font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-lg">
                    ESTÁGIO MÁXIMO ALCANÇADO ✓
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TRACK SELECTION & START RACE */}
          {activeTab === 'race' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-race font-bold text-white text-base tracking-wide flex items-center gap-2">
                  <Flag className="w-4 h-4 text-rose-500" /> Escolha o Circuito
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 mb-3">
                  Pistas desenhadas para alta velocidade e combos de drift.
                </p>

                <div className="space-y-2.5">
                  {TRACKS_DATABASE.map((track) => {
                    const isSelected = selectedTrackId === track.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => setSelectedTrackId(track.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-zinc-950 border-rose-500 shadow-md ring-1 ring-rose-500'
                            : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-race font-bold text-sm text-white">
                            {track.name}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-zinc-900 text-rose-400 border border-zinc-800">
                            {track.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {track.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                          <span>Distância: {track.lengthMeters}m</span>
                          <span>·</span>
                          <span className="text-amber-400">Bônus Drift: {track.driftBonusMultiplier}x</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mode Switcher */}
              <div>
                <h4 className="text-xs uppercase font-bold text-zinc-400 mb-2">
                  Modo de Prova
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGameMode('circuit_race')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      gameMode === 'circuit_race'
                        ? 'bg-zinc-100 text-zinc-900 border-white'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5">Corrida Oficial</div>
                    <div className="text-[11px] opacity-80">{selectedTrack.lapsToComplete} Voltas cronometradas</div>
                  </button>

                  <button
                    onClick={() => setGameMode('drift_freerun')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      gameMode === 'drift_freerun'
                        ? 'bg-zinc-100 text-zinc-900 border-white'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5">Drift Farm Livre</div>
                    <div className="text-[11px] opacity-80">Sem limite, farme dinheiro</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Start Race Button */}
          <div className="mt-auto pt-4 border-t border-zinc-800 shrink-0">
            <button
              disabled={!isCarUnlocked}
              onClick={() => {
                soundEngine.init();
                onStartRace(currentCar.id, selectedTrack, gameMode);
              }}
              className={`w-full py-4 px-6 rounded-xl font-race font-black text-base tracking-wider uppercase flex items-center justify-center gap-3 transition-all ${
                isCarUnlocked
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/50 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Flame className="w-5 h-5 text-amber-300" />
              <span>ACELERAR NA PISTA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
