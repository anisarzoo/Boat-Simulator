// Ocean mesh and custom Gerstner wave shader material
import * as THREE from 'three';
import { BASE_WAVES } from './constants.js';
import { computeWaveSpecs, getGerstnerGLSL } from './gerstner.js';

export class Ocean {
  constructor(scene, initialWeather) {
    this.scene = scene;
    this.weather = initialWeather;
    this.gridSize = 650;
    this.segments = 220; // 220x220 = ~48k vertices for crisp wave crests

    this.initMesh();
  }

  initMesh() {
    const geometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize, this.segments, this.segments);
    geometry.rotateX(-Math.PI / 2);

    const waveSpecs = computeWaveSpecs(BASE_WAVES, this.weather.waveScale);

    const uniforms = {
      uTime: { value: 0 },
      uWaveScale: { value: this.weather.waveScale },
      uWaves: {
        value: waveSpecs.map(w => ({
          dir: new THREE.Vector2(w.dx, w.dz),
          k: w.k,
          wFreq: w.wFreq,
          amplitude: w.amplitude,
          q: w.q
        }))
      },
      uSunPosition: { value: new THREE.Vector3(...this.weather.sunPosition) },
      uSunColor: { value: new THREE.Color(this.weather.sunColor) },
      uSunIntensity: { value: this.weather.sunIntensity },
      uDeepColor: { value: new THREE.Vector3(...this.weather.waterDeepColor) },
      uShallowColor: { value: new THREE.Vector3(...this.weather.waterShallowColor) },
      uFoamColor: { value: new THREE.Vector3(...this.weather.foamColor) },
      uBioluminescence: { value: this.weather.bioluminescence ? 1.0 : 0.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        ${getGerstnerGLSL()}

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vCrest;
        varying vec2 vUv;

        void main() {
          vUv = uv * 32.0; // Tiled UVs for micro-surface ripple sampling
          vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vec3 displacedPos;
          vec3 displacedNormal;
          float crest;

          evaluateGerstner(worldPos, uTime, displacedPos, displacedNormal, crest);

          vWorldPos = displacedPos;
          vNormal = displacedNormal;
          vCrest = crest;

          gl_Position = projectionMatrix * viewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSunPosition;
        uniform vec3 uSunColor;
        uniform float uSunIntensity;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        uniform float uBioluminescence;
        uniform float uTime;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vCrest;
        varying vec2 vUv;

        // Analytical hash & smooth value noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                     mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
        }

        // Dual-octave micro ripple normal perturber
        vec3 getMicroNormal(vec2 uv, float t) {
          vec2 uv1 = uv * 3.5 + vec2(t * 0.45, t * 0.35);
          vec2 uv2 = uv * 7.0 - vec2(t * 0.65, t * 0.55);
          float n1 = noise(uv1);
          float n2 = noise(uv2);
          vec2 dN = vec2(n1 - 0.5, n2 - 0.5) * 0.14;
          return normalize(vec3(dN.x, 1.0, dN.y));
        }

        void main() {
          // Combine macroscopic wave normal with high-frequency micro ripples
          vec3 baseNormal = normalize(vNormal);
          vec3 microNorm = getMicroNormal(vWorldPos.xz * 0.18, uTime);
          vec3 normal = normalize(baseNormal + vec3(microNorm.x, 0.0, microNorm.z) * 0.45);

          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 lightDir = normalize(uSunPosition - vWorldPos);

          // Fresnel reflection calculation (Schlick approximation)
          float NdotV = max(dot(viewDir, normal), 0.0);
          float fresnel = 0.03 + (1.0 - 0.03) * pow(1.0 - NdotV, 4.2);

          // Subsurface scattering on wave crests (light shines through thin water tops)
          float sss = pow(clamp(dot(viewDir, -lightDir), 0.0, 1.0), 3.5) * max(vCrest, 0.0);
          vec3 sssColor = mix(uShallowColor, vec3(0.08, 0.62, 0.52), 0.65) * sss * 2.2;

          // Blinn-Phong specular glints from sun/moon
          vec3 halfVec = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVec), 0.0);
          float specPower = 180.0;
          float spec = pow(NdotH, specPower) * uSunIntensity;
          vec3 specular = uSunColor * spec * (fresnel * 1.8 + 0.15);

          // Water body gradient from deep oceanic trough to crest
          float heightFactor = clamp((vWorldPos.y + 2.0) / 4.8, 0.0, 1.0);
          vec3 waterBody = mix(uDeepColor, uShallowColor, heightFactor);

          // Sky ambient reflection
          vec3 skyReflect = mix(uShallowColor * 1.2, uSunColor * 0.9, fresnel);
          vec3 finalColor = mix(waterBody, skyReflect, fresnel * 0.75) + specular + sssColor;

          // Multi-layer turbulent wave foam on crests
          float foamNoise1 = noise(vWorldPos.xz * 1.8 + vec2(uTime * 0.25));
          float foamNoise2 = noise(vWorldPos.xz * 4.5 - vec2(uTime * 0.4));
          float combinedFoam = foamNoise1 * 0.65 + foamNoise2 * 0.35;
          float foamThreshold = 0.52;
          if (vCrest > foamThreshold) {
            float foamMask = smoothstep(foamThreshold, 0.85, vCrest) * combinedFoam;
            finalColor = mix(finalColor, uFoamColor, foamMask * 0.9);
          }

          // Bioluminescent plankton glow (night/aurora)
          if (uBioluminescence > 0.5) {
            float bioPulse = sin(uTime * 2.8 + vWorldPos.x * 0.15 + vWorldPos.z * 0.15) * 0.5 + 0.5;
            vec3 bioColor = vec3(0.08, 0.98, 0.72) * (vCrest * 0.9 * bioPulse);
            finalColor += bioColor;
          }

          // Distance fog atmospheric blending at the horizon
          float dist = length(cameraPosition - vWorldPos);
          float fogFactor = 1.0 - exp(-dist * 0.0018);
          vec3 horizonColor = mix(uShallowColor * 0.8, uSunColor * 0.6, 0.5);
          finalColor = mix(finalColor, horizonColor, clamp(fogFactor * 0.85, 0.0, 0.95));

          gl_FragColor = vec4(finalColor, 0.98);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  setWeather(weather) {
    this.weather = weather;
    const waveSpecs = computeWaveSpecs(BASE_WAVES, weather.waveScale);

    this.mesh.material.uniforms.uWaveScale.value = weather.waveScale;
    this.mesh.material.uniforms.uWaves.value = waveSpecs.map(w => ({
      dir: new THREE.Vector2(w.dx, w.dz),
      k: w.k,
      wFreq: w.wFreq,
      amplitude: w.amplitude,
      q: w.q
    }));

    this.mesh.material.uniforms.uSunPosition.value.set(...weather.sunPosition);
    this.mesh.material.uniforms.uSunColor.value.set(weather.sunColor);
    this.mesh.material.uniforms.uSunIntensity.value = weather.sunIntensity;
    this.mesh.material.uniforms.uDeepColor.value.set(...weather.waterDeepColor);
    this.mesh.material.uniforms.uShallowColor.value.set(...weather.waterShallowColor);
    this.mesh.material.uniforms.uFoamColor.value.set(...weather.foamColor);
    this.mesh.material.uniforms.uBioluminescence.value = weather.bioluminescence ? 1.0 : 0.0;
  }

  update(time, shipPosition) {
    this.mesh.material.uniforms.uTime.value = time;

    // Follow the ship smoothly in discrete steps to prevent vertex popping
    if (shipPosition) {
      const snap = this.gridSize / this.segments;
      const snapX = Math.floor(shipPosition.x / snap) * snap;
      const snapZ = Math.floor(shipPosition.z / snap) * snap;
      this.mesh.position.set(snapX, 0, snapZ);
    }
  }
}
