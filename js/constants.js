// Configuration and presets for Ship & Ocean Simulation

export const GRAVITY = 9.81;

// Gerstner Wave definitions (Direction, Steepness, Wavelength, Speed)
export const BASE_WAVES = [
  { dir: [1.0, 0.25], steepness: 0.22, wavelength: 48.0, speed: 1.15 },
  { dir: [0.75, 0.7],  steepness: 0.18, wavelength: 26.0, speed: 1.35 },
  { dir: [-0.4, 0.9],  steepness: 0.12, wavelength: 14.0, speed: 1.55 },
  { dir: [0.2, -0.95], steepness: 0.08, wavelength: 8.0,  speed: 1.85 }
];

export const WEATHER_PRESETS = {
  sunny: {
    id: 'sunny',
    name: 'Tropical Noon',
    icon: '☀️',
    skyColor: 0x5fa8d3,
    sunColor: 0xfffaed,
    sunIntensity: 2.2,
    sunPosition: [120, 180, 80],
    ambientColor: 0x88b7d5,
    ambientIntensity: 0.8,
    waterDeepColor: [0.015, 0.09, 0.18],      // Deep oceanic blue
    waterShallowColor: [0.03, 0.42, 0.45],   // Tropical turquoise
    foamColor: [0.92, 0.98, 1.0],
    waveScale: 0.75,
    windSpeedKnots: 12,
    fogColor: 0x7eb9de,
    fogDensity: 0.0018,
    rain: false,
    lightning: false,
    bioluminescence: false
  },
  sunset: {
    id: 'sunset',
    name: 'Golden Hour',
    icon: '🌅',
    skyColor: 0xff6b4a,
    sunColor: 0xffaa5e,
    sunIntensity: 2.8,
    sunPosition: [280, 42, -180],
    ambientColor: 0x9b4d45,
    ambientIntensity: 0.65,
    waterDeepColor: [0.04, 0.06, 0.14],
    waterShallowColor: [0.18, 0.22, 0.32],
    foamColor: [1.0, 0.88, 0.75],
    waveScale: 1.05,
    windSpeedKnots: 18,
    fogColor: 0xd96f52,
    fogDensity: 0.0022,
    rain: false,
    lightning: false,
    bioluminescence: false
  },
  storm: {
    id: 'storm',
    name: 'Midnight Tempest',
    icon: '⛈️',
    skyColor: 0x0a1017,
    sunColor: 0x6b8299,
    sunIntensity: 0.3,
    sunPosition: [50, 100, -50],
    ambientColor: 0x141f2b,
    ambientIntensity: 0.35,
    waterDeepColor: [0.008, 0.018, 0.035],
    waterShallowColor: [0.03, 0.06, 0.09],
    foamColor: [0.75, 0.82, 0.90],
    waveScale: 2.2,
    windSpeedKnots: 48,
    fogColor: 0x0c141d,
    fogDensity: 0.0045,
    rain: true,
    lightning: true,
    bioluminescence: false
  },
  aurora: {
    id: 'aurora',
    name: 'Bioluminescent Night',
    icon: '✨',
    skyColor: 0x040810,
    sunColor: 0x2cd5a4,
    sunIntensity: 0.5,
    sunPosition: [-100, 70, 120],
    ambientColor: 0x0d2825,
    ambientIntensity: 0.4,
    waterDeepColor: [0.003, 0.015, 0.025],
    waterShallowColor: [0.02, 0.16, 0.15],
    foamColor: [0.35, 1.0, 0.82], // Glowing cyan/green bioluminescent wake
    waveScale: 0.6,
    windSpeedKnots: 8,
    fogColor: 0x05141c,
    fogDensity: 0.0028,
    rain: false,
    lightning: false,
    bioluminescence: true
  }
};

export const SHIP_CONFIG = {
  length: 18.0,
  beam: 5.2,
  mass: 28000,           // kg
  maxEnginePower: 58000, // Newtons
  maxReversePower: 22000,
  maxRudderAngle: 0.55,  // radians (~32 deg)
  rudderTurnSpeed: 1.8,
  dragLinear: 1800,      // Hull water friction
  dragAngular: 6500,     // Yaw damping
  buoyancyStiffness: 42000,
  buoyancyDamping: 11000,
  rightingTorque: 95000, // Self-righting roll stabilization
  
  // Hull probes for multi-point buoyancy sampling (relative to ship center)
  probes: [
    { name: 'bow', x: 0, y: -0.3, z: 7.8, weight: 1.3 },
    { name: 'stern', x: 0, y: -0.3, z: -7.5, weight: 1.4 },
    { name: 'port_mid', x: -2.3, y: -0.2, z: 0.0, weight: 1.0 },
    { name: 'starboard_mid', x: 2.3, y: -0.2, z: 0.0, weight: 1.0 },
    { name: 'port_bow', x: -1.7, y: -0.2, z: 4.5, weight: 0.9 },
    { name: 'starboard_bow', x: 1.7, y: -0.2, z: 4.5, weight: 0.9 },
    { name: 'port_stern', x: -1.9, y: -0.2, z: -4.8, weight: 1.0 },
    { name: 'starboard_stern', x: 1.9, y: -0.2, z: -4.8, weight: 1.0 }
  ]
};
