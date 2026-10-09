export type PaintFinish = 'gloss' | 'metallic' | 'matte' | 'carbon';

export interface CarCustomization {
  bodyColor: string;
  finish: PaintFinish;
  rimColor: string;
  caliperColor: string;
  underglowColor: string | null; // null for off
  windowTint: 'clear' | 'smoke' | 'dark';
}

export interface CarUpgrades {
  engineStage: number; // 1 to 5
  transmissionStage: number; // 1 to 5
  tiresStage: number; // 1 to 5
  nitroStage: number; // 1 to 5
}

export interface CarModelConfig {
  id: string;
  name: string;
  subtitle: string;
  inspiredBy: string;
  price: number;
  unlocked: boolean;
  baseStats: {
    topSpeed: number; // km/h
    acceleration: number; // 0-100s lower is better
    handling: number; // 0-100
    driftAbility: number; // 0-100
    weight: number; // kg
    baseHp: number;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    wheelbase: number;
    trackWidth: number;
    wheelRadius: number;
  };
  bodyStyle: '911_gt' | 'wedge_v10' | 'muscle_gtr' | 'flowing_supra' | 'hyperion_v16';
  defaultCustomization: CarCustomization;
}

export type GameMode = 'drift_freerun' | 'time_attack' | 'circuit_race';

export interface TrackConfig {
  id: string;
  name: string;
  description: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil' | 'Perito';
  environment: 'tokyo_night' | 'sunset_touge' | 'grand_prix';
  lapsToComplete: number;
  driftBonusMultiplier: number;
  checkpointCount: number;
  lengthMeters: number;
}

export interface PlayerProgress {
  cash: number;
  unlockedCarIds: string[];
  carCustomizations: Record<string, CarCustomization>;
  carUpgrades: Record<string, CarUpgrades>;
  selectedCarId: string;
  bestLapTimes: Record<string, number>;
  bestDriftScores: Record<string, number>;
  steeringSensitivity?: number;
}

export type CameraView = 'chase_far' | 'chase_close' | 'hood';

export interface DriftState {
  isDrifting: boolean;
  angle: number; // in degrees
  score: number;
  multiplier: number;
  cashAccumulated: number;
  comboTimer: number;
  quality: 'BOM' | 'ÓTIMO' | 'INSANO' | 'PERFEITO';
}

export interface VehicleState {
  speedKmh: number;
  rpm: number;
  gear: number | 'R' | 'N';
  isManualTransmission: boolean;
  nitroAmount: number; // 0 to 100
  isNitroActive: boolean;
  isBraking: boolean;
  isHandbraking: boolean;
  steerAngle: number;
  driftState: DriftState;
}
