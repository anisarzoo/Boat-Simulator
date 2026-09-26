// Shared Gerstner Wave math for both CPU physics and GPU GLSL shaders
import { BASE_WAVES, GRAVITY } from './constants.js';

// Precompute wave parameters with smooth trochoidal crest curvature (strictly zero cusping)
export function computeWaveSpecs(baseWaves = BASE_WAVES, scale = 1.0) {
  // Safe combined sharpness ceiling: 0.52 guarantees waves remain smooth, rounded, and natural
  const maxCombinedSharpness = 0.52;
  const rawTotalSteepness = baseWaves.reduce((sum, w) => sum + w.steepness, 0);

  return baseWaves.map(w => {
    const len = Math.hypot(w.dir[0], w.dir[1]) || 1;
    const dx = w.dir[0] / len;
    const dz = w.dir[1] / len;
    const wavelength = w.wavelength;
    const k = (2 * Math.PI) / wavelength;
    const wFreq = Math.sqrt(GRAVITY * k) * w.speed;

    // Amplitude scaled proportionally with weather wave scale
    // Natural dispersion: longer rolling swells carry proportional harmonic energy
    const waveEnergyFactor = Math.sqrt(wavelength / 48.0);
    const amplitude = (wavelength * 0.036) * (w.steepness * 2.2) * waveEnergyFactor * scale;

    // Gerstner Q parameter: strictly bounded so sum of (Q * k * A) <= maxCombinedSharpness
    const waveShare = w.steepness / rawTotalSteepness;
    const targetQkA = waveShare * maxCombinedSharpness;
    const q = targetQkA / (k * Math.max(amplitude, 0.0001));

    return {
      dx,
      dz,
      k,
      wFreq,
      amplitude,
      q: Math.min(q, 0.32) // Strict ceiling ensures crests are always smooth and rounded
    };
  });
}

// CPU Wave evaluation for Buoyancy Physics
export function sampleOcean(x, z, time, waveScale = 1.0) {
  const waves = computeWaveSpecs(BASE_WAVES, waveScale);
  let dispX = 0;
  let dispZ = 0;
  let heightY = 0;

  let normX = 0;
  let normZ = 0;
  let normY = 1.0;

  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    const dot = (w.dx * x + w.dz * z) * w.k;
    const phase = dot + w.wFreq * time;
    const cosP = Math.cos(phase);
    const sinP = Math.sin(phase);

    dispX += w.q * w.amplitude * w.dx * cosP;
    dispZ += w.q * w.amplitude * w.dz * cosP;
    heightY += w.amplitude * sinP;

    const kA = w.k * w.amplitude;
    normX -= w.dx * kA * cosP;
    normZ -= w.dz * kA * cosP;
    normY -= w.q * kA * sinP;
  }

  normY = Math.max(0.35, normY); // Never allow horizontal or inverted normals
  const nLen = Math.hypot(normX, normY, normZ) || 1;

  return {
    height: heightY,
    x: x + dispX,
    z: z + dispZ,
    normal: {
      x: normX / nLen,
      y: normY / nLen,
      z: normZ / nLen
    }
  };
}

// GLSL Shader code generator for Three.js
export function getGerstnerGLSL() {
  return `
    struct Wave {
      vec2 dir;
      float k;
      float wFreq;
      float amplitude;
      float q;
    };

    uniform Wave uWaves[8];
    uniform float uTime;
    uniform float uWaveScale;

    // Evaluates Gerstner wave displacement & normal on GPU
    void evaluateGerstner(in vec3 worldPos, in float time, out vec3 displaced, out vec3 normal, out float crestFactor) {
      displaced = worldPos;
      vec3 n = vec3(0.0, 1.0, 0.0);
      float totalCrest = 0.0;

      for (int i = 0; i < 8; i++) {
        Wave w = uWaves[i];
        float dotVal = dot(w.dir, worldPos.xz) * w.k;
        float phase = dotVal + w.wFreq * time;
        float cosP = cos(phase);
        float sinP = sin(phase);

        displaced.x += w.q * w.amplitude * w.dir.x * cosP;
        displaced.z += w.q * w.amplitude * w.dir.y * cosP;
        displaced.y += w.amplitude * sinP;

        float kA = w.k * w.amplitude;
        n.x -= w.dir.x * kA * cosP;
        n.z -= w.dir.y * kA * cosP;
        n.y -= w.q * kA * sinP;

        // Measure steepness/cresting for dynamic white foam
        totalCrest += sinP * (kA * 1.2);
      }

      n.y = max(0.35, n.y); // Strictly prevent inverted, horizontal, or cusp normals
      normal = normalize(n);
      crestFactor = clamp(totalCrest * 0.40, 0.0, 1.0);
    }
  `;
}
