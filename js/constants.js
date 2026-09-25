// Configuration and presets for Ship & Ocean Simulation

export const GRAVITY = 9.81;

// Realistic multi-octave ocean swell & wind-sea spectrum (JONSWAP / Phillips inspired)
export const BASE_WAVES = [
  // Primary oceanic swell (long, smooth rolling swells)
  { dir: [0.85, 0.52],  steepness: 0.13, wavelength: 72.0, speed: 1.0 },
  // Secondary cross-swell (counter-angle creates natural interference pockets)
  { dir: [0.45, -0.89], steepness: 0.11, wavelength: 46.0, speed: 1.18 },
  // Intermediate wind sea (angled with prevailing wind)
  { dir: [0.92, 0.38],  steepness: 0.11, wavelength: 30.0, speed: 1.35 },
  // Cross-chop sea
  { dir: [-0.62, 0.78], steepness: 0.09, wavelength: 20.0, speed: 1.55 },
  // Short wind chop
  { dir: [0.78, -0.62], steepness: 0.08, wavelength: 13.0, speed: 1.8 },
  // High-frequency crest chop
  { dir: [0.35, 0.94],  steepness: 0.06, wavelength: 8.5,  speed: 2.1 },
  // Diagonal micro-swell
  { dir: [-0.82, -0.57], steepness: 0.05, wavelength: 5.2, speed: 2.5 },
  // Surface capillary agitation
  { dir: [0.98, -0.18], steepness: 0.04, wavelength: 3.2,  speed: 3.0 }
];

export const WEATHER_PRESETS = {
  sunny: {
    id: 'sunny',
    name: 'Tropical Noon',
    skyTopColor: 0x145da0,
    skyHorizonColor: 0x98d4f8,
    sunColor: 0xfffaed,
    sunGlowColor: 0xffe899,
    sunIntensity: 2.2,
    sunPosition: [160, 320, 280],
    moonPosition: [-280, -200, -300],
    moonIntensity: 0.0,
    ambientColor: 0x88b7d5,
    ambientIntensity: 0.85,
    waterDeepColor: [0.008, 0.055, 0.14],
    waterShallowColor: [0.025, 0.32, 0.38],
    foamColor: [0.94, 0.98, 1.0],
    waveScale: 0.65,
    windSpeedKnots: 12,
    fogColor: 0x8ec8f2,
    fogDensity: 0.0008,
    starsOpacity: 0.0,
    rain: false,
    lightning: false,
    bioluminescence: false
  },
  sunset: {
    id: 'sunset',
    name: 'Golden Hour',
    skyTopColor: 0x4477bb,     // Bright twilight blue (survives sRGB linearization)
    skyHorizonColor: 0xdd6633, // Warm amber sunset horizon (not pure red)
    sunColor: 0xffbb55,        // Golden amber sunlight
    sunGlowColor: 0xff7733,
    sunIntensity: 2.2,
    sunPosition: [110, 85, 480],
    moonPosition: [-240, 160, -380],
    moonIntensity: 0.25,
    ambientColor: 0x6a4a3e,
    ambientIntensity: 0.6,
    waterDeepColor: [0.01, 0.04, 0.10],   // Deep ocean blue-black
    waterShallowColor: [0.05, 0.10, 0.12], // Dark teal-blue surface
    foamColor: [1.0, 0.92, 0.85],
    waveScale: 0.82,
    windSpeedKnots: 16,
    fogColor: 0x7a4835,        // Muted warm brown fog
    fogDensity: 0.0006,
    starsOpacity: 0.25,
    rain: false,
    lightning: false,
    bioluminescence: false
  },
  storm: {
    id: 'storm',
    name: 'Midnight Tempest',
    skyTopColor: 0x05080c,
    skyHorizonColor: 0x141d28,
    sunColor: 0x5a7088,
    sunGlowColor: 0x334455,
    sunIntensity: 0.35,
    sunPosition: [80, 140, 360],
    moonPosition: [-160, 220, -280],
    moonIntensity: 0.3,
    ambientColor: 0x141f2b,
    ambientIntensity: 0.35,
    waterDeepColor: [0.008, 0.018, 0.035],
    waterShallowColor: [0.03, 0.06, 0.09],
    foamColor: [0.75, 0.82, 0.90],
    waveScale: 2.2,
    windSpeedKnots: 48,
    fogColor: 0x0c141d,
    fogDensity: 0.0035,
    starsOpacity: 0.1,
    rain: true,
    lightning: true,
    bioluminescence: false
  },
  aurora: {
    id: 'aurora',
    name: 'Bioluminescent Night',
    skyTopColor: 0x010811,
    skyHorizonColor: 0x041924,
    sunColor: 0x112233,
    sunGlowColor: 0x001122,
    sunIntensity: 0.1,
    sunPosition: [100, -200, 300], // Sun below horizon
    moonPosition: [-140, 310, 440], // Prominent full moon in front of ship!
    moonIntensity: 1.8,
    ambientColor: 0x0d2825,
    ambientIntensity: 0.45,
    waterDeepColor: [0.003, 0.015, 0.025],
    waterShallowColor: [0.02, 0.16, 0.15],
    foamColor: [0.35, 1.0, 0.82],
    waveScale: 0.6,
    windSpeedKnots: 8,
    fogColor: 0x041620,
    fogDensity: 0.002,
    starsOpacity: 1.0,
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
