import { CarModelConfig, TrackConfig } from '../types/game';

export const CARS_DATABASE: CarModelConfig[] = [
  {
    id: 'apex_911',
    name: 'Spectral GT RS',
    subtitle: 'Esportivo 3D de alta fidelidade',
    inspiredBy: 'Modelo esportivo realista com interior e detalhes mecânicos',
    price: 0, // Carro inicial
    unlocked: true,
    baseStats: {
      topSpeed: 295,
      acceleration: 3.4,
      handling: 94,
      driftAbility: 88,
      weight: 1430,
      baseHp: 525,
    },
    dimensions: {
      length: 4.57,
      width: 1.90,
      height: 1.30,
      wheelbase: 2.45,
      trackWidth: 1.62,
      wheelRadius: 0.36,
    },
    bodyStyle: '911_gt',
    defaultCustomization: {
      bodyColor: '#e11d48', // Racing Crimson
      finish: 'gloss',
      rimColor: '#18181b', // Satin Black
      caliperColor: '#eab308', // Racing Yellow
      underglowColor: null,
      windowTint: 'smoke',
    },
  },
  {
    id: 'spirit_supra',
    name: 'Spirit MK-T',
    subtitle: 'A Lenda das Montanhas do Japão',
    inspiredBy: 'Inspirado no Toyota GR Supra',
    price: 38000,
    unlocked: false,
    baseStats: {
      topSpeed: 285,
      acceleration: 3.8,
      handling: 90,
      driftAbility: 98, // Drift king
      weight: 1490,
      baseHp: 480,
    },
    dimensions: {
      length: 4.38,
      width: 1.86,
      height: 1.29,
      wheelbase: 2.47,
      trackWidth: 1.59,
      wheelRadius: 0.35,
    },
    bodyStyle: 'flowing_supra',
    defaultCustomization: {
      bodyColor: '#f97316', // Sunset Orange
      finish: 'metallic',
      rimColor: '#71717a', // Gunmetal
      caliperColor: '#ef4444', // Brembo Red
      underglowColor: '#f97316',
      windowTint: 'dark',
    },
  },
  {
    id: 'shadow_gtr',
    name: 'Shadow R-35',
    subtitle: 'Godzilla da Tração Integral',
    inspiredBy: 'Inspirado no Nissan GT-R Nismo',
    price: 85000,
    unlocked: false,
    baseStats: {
      topSpeed: 320,
      acceleration: 2.9,
      handling: 87,
      driftAbility: 85,
      weight: 1720,
      baseHp: 650,
    },
    dimensions: {
      length: 4.69,
      width: 1.89,
      height: 1.37,
      wheelbase: 2.78,
      trackWidth: 1.60,
      wheelRadius: 0.37,
    },
    bodyStyle: 'muscle_gtr',
    defaultCustomization: {
      bodyColor: '#38bdf8', // Nardo / Electric Blue
      finish: 'metallic',
      rimColor: '#09090b', // Gloss Black
      caliperColor: '#eab308', // Gold
      underglowColor: '#06b6d4',
      windowTint: 'dark',
    },
  },
  {
    id: 'veneno_v10',
    name: 'Veloce V-10',
    subtitle: 'Superesportivo Furioso de Bolonha',
    inspiredBy: 'Inspirado no Lamborghini Huracán Performante',
    price: 150000,
    unlocked: false,
    baseStats: {
      topSpeed: 335,
      acceleration: 2.7,
      handling: 95,
      driftAbility: 92,
      weight: 1380,
      baseHp: 740,
    },
    dimensions: {
      length: 4.52,
      width: 1.95,
      height: 1.16,
      wheelbase: 2.62,
      trackWidth: 1.67,
      wheelRadius: 0.36,
    },
    bodyStyle: 'wedge_v10',
    defaultCustomization: {
      bodyColor: '#84cc16', // Verde Mantis
      finish: 'gloss',
      rimColor: '#18181b', // Stealth
      caliperColor: '#84cc16', // Acid Green
      underglowColor: '#84cc16',
      windowTint: 'dark',
    },
  },
  {
    id: 'hyperion_v16',
    name: 'Hyperion W-16',
    subtitle: 'O Pináculo da Velocidade Absoluta',
    inspiredBy: 'Inspirado no Bugatti Chiron Super Sport',
    price: 280000,
    unlocked: false,
    baseStats: {
      topSpeed: 420,
      acceleration: 2.3,
      handling: 91,
      driftAbility: 84,
      weight: 1980,
      baseHp: 1600,
    },
    dimensions: {
      length: 4.75,
      width: 2.04,
      height: 1.21,
      wheelbase: 2.71,
      trackWidth: 1.74,
      wheelRadius: 0.38,
    },
    bodyStyle: 'hyperion_v16',
    defaultCustomization: {
      bodyColor: '#1e3a8a', // Deep French Racing Blue
      finish: 'carbon',
      rimColor: '#d4d4d8', // Polished Chrome
      caliperColor: '#3b82f6', // Cobalt
      underglowColor: '#3b82f6',
      windowTint: 'dark',
    },
  },
];

export const TRACKS_DATABASE: TrackConfig[] = [
  {
    id: 'tokyo_expressway',
    name: 'Tóquio Neon Expressway',
    description: 'Autoestrada metropolitana noturna com túneis iluminados, retas de alta velocidade e curvas rápidas.',
    difficulty: 'Fácil',
    environment: 'tokyo_night',
    lapsToComplete: 2,
    driftBonusMultiplier: 1.2,
    checkpointCount: 8,
    lengthMeters: 2800,
  },
  {
    id: 'sunset_canyon_touge',
    name: 'Touge Canyon Drift',
    description: 'Circuito serpeante nas montanhas ao pôr do sol. O paraíso para encadear drifts em grampos fechados.',
    difficulty: 'Médio',
    environment: 'sunset_touge',
    lapsToComplete: 2,
    driftBonusMultiplier: 1.8,
    checkpointCount: 10,
    lengthMeters: 3400,
  },
  {
    id: 'apex_gp_circuit',
    name: 'Apex Grand Prix Arena',
    description: 'Pista de corrida profissional de asfalto com zebras zebradas (red & white), curvas técnicas e arquibancadas.',
    difficulty: 'Difícil',
    environment: 'grand_prix',
    lapsToComplete: 3,
    driftBonusMultiplier: 1.5,
    checkpointCount: 12,
    lengthMeters: 4100,
  },
];

export const COLOR_PALETTE = [
  { name: 'Vermelho Rosso Corsa', hex: '#dc2626' },
  { name: 'Cinza Nardo Pro', hex: '#64748b' },
  { name: 'Azul Miami Riviera', hex: '#0284c7' },
  { name: 'Preto Ônix Puro', hex: '#18181b' },
  { name: 'Amarelo Modena', hex: '#eab308' },
  { name: 'Verde British Racing', hex: '#15803d' },
  { name: 'Branco Pérola Glacier', hex: '#f8fafc' },
  { name: 'Laranja Papaya Racing', hex: '#ea580c' },
  { name: 'Roxo Midnight Drift', hex: '#7c3aed' },
  { name: 'Verde Ácido Mantis', hex: '#65a30d' },
  { name: 'Dourado Champanhe', hex: '#ca8a04' },
  { name: 'Rosa Cyberpunk Neo', hex: '#db2777' },
];

export const RIM_COLORS = [
  { name: 'Preto Acetinado', hex: '#18181b' },
  { name: 'Gunmetal Grafite', hex: '#52525b' },
  { name: 'Cromo Diamantado', hex: '#e4e4e7' },
  { name: 'Bronze Dourado Racing', hex: '#a16207' },
  { name: 'Branco Rally', hex: '#ffffff' },
];

export const CALIPER_COLORS = [
  { name: 'Vermelho Brembo', hex: '#ef4444' },
  { name: 'Amarelo Carbon Ceramic', hex: '#eab308' },
  { name: 'Verde Ácido GT3', hex: '#84cc16' },
  { name: 'Azul Elétrico', hex: '#06b6d4' },
  { name: 'Laranja Competição', hex: '#f97316' },
];

export const UNDERGLOW_COLORS = [
  { name: 'Desligado', hex: null },
  { name: 'Ciano Neon', hex: '#06b6d4' },
  { name: 'Roxo Neon', hex: '#a855f7' },
  { name: 'Vermelho Fúria', hex: '#ef4444' },
  { name: 'Verde Venom', hex: '#22c55e' },
  { name: 'Azul Cobalto', hex: '#3b82f6' },
  { name: 'Amarelo Ouro', hex: '#eab308' },
];

export const UPGRADE_TIERS = {
  engine: [
    { stage: 1, name: 'Original de Fábrica', cost: 0, hpBonus: 0, topSpeedBonus: 0, desc: 'Configuração original balanceada.' },
    { stage: 2, name: 'Filtro & Escape Esportivo', cost: 5500, hpBonus: 45, topSpeedBonus: 12, desc: 'Entrada de ar livre e ronco mais encorpado.' },
    { stage: 3, name: 'Reprogramação ECU Stage 2', cost: 14000, hpBonus: 95, topSpeedBonus: 24, desc: 'Mapeamento agressivo de injeção e ignição.' },
    { stage: 4, name: 'Upgrade Twin-Turbo / Intercooler', cost: 28000, hpBonus: 170, topSpeedBonus: 40, desc: 'Pressão de turbo de 1.8 bar com refrigeração extrema.' },
    { stage: 5, name: 'Preparação Motor de Pista Forjado', cost: 52000, hpBonus: 280, topSpeedBonus: 65, desc: 'Pistões forjados, comando esportivo e limite a 9000 RPM.' },
  ],
  transmission: [
    { stage: 1, name: 'Câmbio Original', cost: 0, accelBonus: 0, desc: 'Relações de marcha padrão.' },
    { stage: 2, name: 'Embreagem Reforçada', cost: 4200, accelBonus: 0.2, desc: 'Menor perda de torque nas arrancadas.' },
    { stage: 3, name: 'Câmbio Manual Rápido (Short-Shifter)', cost: 11000, accelBonus: 0.45, desc: 'Trocas instantâneas com estalo esportivo.' },
    { stage: 4, name: 'Diferencial Blocante LSD 2-Way', cost: 22000, accelBonus: 0.75, desc: 'Distribuição simétrica de tração, perfeito para drift.' },
    { stage: 5, name: 'Câmbio Sequencial de Competição', cost: 44000, accelBonus: 1.15, desc: 'Trocas milissegundas sem perda de pressão de turbo.' },
  ],
  tires: [
    { stage: 1, name: 'Pneus de Rua', cost: 0, gripBonus: 0, driftBonus: 0, desc: 'Pneus padrão com aderência moderada.' },
    { stage: 2, name: 'Pneus Esportivos Street', cost: 4800, gripBonus: 6, driftBonus: 0.2, desc: 'Composto mais macio para curvas firmes.' },
    { stage: 3, name: 'Kit de Ângulo de Esterço & Drift', cost: 13500, gripBonus: 10, driftBonus: 0.5, desc: 'Maior esterço para ângulos de drift absurdos.' },
    { stage: 4, name: 'Semi-Slick Pro Competição', cost: 25000, gripBonus: 18, driftBonus: 0.85, desc: 'Máxima tração e controle milimétrico nas saídas.' },
    { stage: 5, name: 'Composto Formula Drift Especial', cost: 46000, gripBonus: 25, driftBonus: 1.3, desc: 'Fumaça espessa volumosa e pontuação de drift multiplicada!' },
  ],
  nitro: [
    { stage: 1, name: 'Sem Garrafa de Nitro', cost: 0, boostBonus: 0, capacityBonus: 0, desc: 'Veículo aspirado/turbo sem injeção química.' },
    { stage: 2, name: 'Kit Nitro Street (50 HP Shot)', cost: 6000, boostBonus: 20, capacityBonus: 20, desc: 'Um pequeno impulso extra nas retas.' },
    { stage: 3, name: 'Garrafa Dupla NOS 100 HP', cost: 16000, boostBonus: 45, capacityBonus: 45, desc: 'Aceleração violenta com chama no escapamento.' },
    { stage: 4, name: 'Injeção Direta Wet NOS 175 HP', cost: 32000, boostBonus: 75, capacityBonus: 75, desc: 'Pressão intensa e recarga regenerativa mais veloz.' },
    { stage: 5, name: 'Sistema Nitro Pro de Corrida Triplo', cost: 58000, boostBonus: 120, capacityBonus: 100, desc: 'O empurrão final para quebrar qualquer recorde!' },
  ],
};
