import { useState, useEffect } from 'react';
import {
  CarCustomization,
  CarModelConfig,
  CarUpgrades,
  GameMode,
  PlayerProgress,
  TrackConfig,
} from './types/game';
import { CARS_DATABASE, TRACKS_DATABASE } from './data/cars';
import { Garage } from './components/Garage';
import { RaceCanvas } from './components/RaceCanvas';
import { OrientationPrompt } from './components/OrientationPrompt';

const STORAGE_KEY = 'apex_racing_simulator_save_v1';

const INITIAL_PROGRESS: PlayerProgress = {
  cash: 1000000000, // Starting cash bonus for immediate tuning & customization
  unlockedCarIds: ['apex_911'],
  carCustomizations: {},
  carUpgrades: {},
  selectedCarId: 'apex_911',
  bestLapTimes: {},
  bestDriftScores: {},
};

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // safe fallback
    }
    return INITIAL_PROGRESS;
  });

  const [currentScreen, setCurrentScreen] = useState<'garage' | 'race'>('garage');
  const [activeTrack, setActiveTrack] = useState<TrackConfig>(TRACKS_DATABASE[0]);
  const [activeMode, setActiveMode] = useState<GameMode>('circuit_race');
  const [steeringSensitivity, setSteeringSensitivity] = useState<number>(() => {
    const saved = Number(localStorage.getItem('apex_steering_sensitivity'));
    return Number.isFinite(saved) && saved >= 0.4 && saved <= 2.5 ? saved : 1.0;
  });

  const handleUpdateSteeringSensitivity = (value: number) => {
    const nextValue = Math.max(0.4, Math.min(2.5, value));
    setSteeringSensitivity(nextValue);
    try { localStorage.setItem('apex_steering_sensitivity', String(nextValue)); } catch { /* storage unavailable */ }
  };

  // Save progress changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // storage quota or private mode
    }
  }, [progress]);

  const handleSelectCar = (carId: string) => {
    setProgress((prev) => ({
      ...prev,
      selectedCarId: carId,
    }));
  };

  const handleBuyCar = (car: CarModelConfig) => {
    if (progress.cash < car.price) return;

    setProgress((prev) => ({
      ...prev,
      cash: prev.cash - car.price,
      unlockedCarIds: [...prev.unlockedCarIds, car.id],
      selectedCarId: car.id,
    }));
  };

  const handleUpdateCustomization = (carId: string, customization: CarCustomization) => {
    setProgress((prev) => ({
      ...prev,
      carCustomizations: {
        ...prev.carCustomizations,
        [carId]: customization,
      },
    }));
  };

  const handleUpgradePart = (carId: string, part: keyof CarUpgrades, cost: number) => {
    if (progress.cash < cost) return;

    setProgress((prev) => {
      const currentCarUpgrades = prev.carUpgrades[carId] || {
        engineStage: 1,
        transmissionStage: 1,
        tiresStage: 1,
        nitroStage: 1,
      };

      return {
        ...prev,
        cash: prev.cash - cost,
        carUpgrades: {
          ...prev.carUpgrades,
          [carId]: {
            ...currentCarUpgrades,
            [part]: Math.min(5, currentCarUpgrades[part] + 1),
          },
        },
      };
    });
  };

  const handleStartRace = (carId: string, track: TrackConfig, mode: GameMode) => {
    setActiveTrack(track);
    setActiveMode(mode);
    setCurrentScreen('race');
  };

  const handleExitRace = (earnedCash: number) => {
    setProgress((prev) => ({
      ...prev,
      cash: prev.cash + earnedCash,
    }));
    setCurrentScreen('garage');
  };

  const selectedCar =
    CARS_DATABASE.find((c) => c.id === progress.selectedCarId) || CARS_DATABASE[0];

  const selectedCarCustomization =
    progress.carCustomizations[selectedCar.id] || selectedCar.defaultCustomization;

  const selectedCarUpgrades =
    progress.carUpgrades[selectedCar.id] || {
      engineStage: 1,
      transmissionStage: 1,
      tiresStage: 1,
      nitroStage: 1,
    };

  return (
    <div className="w-full h-dvh bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {currentScreen === 'garage' ? (
        <Garage
          cash={progress.cash}
          unlockedCarIds={progress.unlockedCarIds}
          selectedCarId={progress.selectedCarId}
          customizations={progress.carCustomizations}
          upgrades={progress.carUpgrades}
          onSelectCar={handleSelectCar}
          onBuyCar={handleBuyCar}
          onUpdateCustomization={handleUpdateCustomization}
          onUpgradePart={handleUpgradePart}
          onStartRace={handleStartRace}
        />
      ) : (
        <RaceCanvas
          carConfig={selectedCar}
          customization={selectedCarCustomization}
          upgrades={selectedCarUpgrades}
          trackConfig={activeTrack}
          gameMode={activeMode}
          steeringSensitivity={steeringSensitivity}
          onUpdateSteeringSensitivity={handleUpdateSteeringSensitivity}
          onExitToGarage={handleExitRace}
        />
      )}
      {currentScreen === 'race' && <OrientationPrompt />}
    </div>
  );
}
