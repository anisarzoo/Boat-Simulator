// Ocean mesh and custom Gerstner wave shader material — Ultra-Realistic PBR Water
import * as THREE from 'three';
import { BASE_WAVES } from './constants.js';
import { computeWaveSpecs, getGerstnerGLSL } from './gerstner.js';

export class Ocean {
  constructor(scene, initialWeather) {
    this.scene = scene;
    this.weather = initialWeather;
    this.gridSize = 3000;
    this.segments = 256;

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
      uTopSkyColor: { value: new THREE.Color(this.weather.skyTopColor) },
      uHorizonColor: { value: new THREE.Color(this.weather.skyHorizonColor) },
      uBioluminescence: { value: this.weather.bioluminescence ? 1.0 : 0.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        ${getGerstnerGLSL()}

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vCrest;
        varying float vDist;
        varying float vEdgeAlpha;

        void main() {
          vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vec3 displacedPos;
          vec3 displacedNormal;
          float crest;

          evaluateGerstner(worldPos, uTime, displacedPos, displacedNormal, crest);

          // Smoothly fade waves to flat plane near the mesh boundary using local geometry radius
          float r = length(position.xz);
          float edgeFade = 1.0 - smoothstep(950.0, 1420.0, r);
          displacedPos.y *= edgeFade;
          displacedPos.xz = mix(worldPos.xz, displacedPos.xz, edgeFade);

          vWorldPos = displacedPos;
          vNormal = mix(vec3(0.0, 1.0, 0.0), displacedNormal, edgeFade);
          vCrest = crest * edgeFade;
          vDist = length(cameraPosition - displacedPos);
          vEdgeAlpha = 1.0 - smoothstep(1250.0, 1480.0, r);

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
        uniform vec3 uTopSkyColor;
        uniform vec3 uHorizonColor;
        uniform float uBioluminescence;
        uniform float uTime;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vCrest;
        varying float vDist;
        varying float vEdgeAlpha;

        // ── Non-repeating Value Noise (Quintic Hermite) ──
        // Uses large prime-based hashing to prevent visible tiling
        vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }

        float gradientNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic

          float a = dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
          float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
          float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
          float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        // ── Multi-scale Detail Normal from analytical noise derivatives ──
        // Each octave uses a different rotation matrix to break axis alignment
        vec3 getDetailNormal(vec2 pos, float time, float lod) {
          vec2 dN = vec2(0.0);
          float eps = 0.08;

          // 6 directional wave trains at different scales and speeds
          // Using irrational multipliers to prevent alignment
          vec2 dirs[6];
          dirs[0] = vec2(0.809, 0.588);
          dirs[1] = vec2(-0.656, 0.755);
          dirs[2] = vec2(0.951, -0.309);
          dirs[3] = vec2(-0.454, -0.891);
          dirs[4] = vec2(0.276, 0.961);
          dirs[5] = vec2(-0.978, 0.208);

          float scales[6];
          scales[0] = 0.72;
          scales[1] = 1.37;
          scales[2] = 2.63;
          scales[3] = 4.87;
          scales[4] = 8.21;
          scales[5] = 14.6;

          float speeds[6];
          speeds[0] = 1.8;
          speeds[1] = -2.3;
          speeds[2] = 3.1;
          speeds[3] = -4.5;
          speeds[4] = 5.7;
          speeds[5] = -7.2;

          float amps[6];
          amps[0] = 0.085;
          amps[1] = 0.062;
          amps[2] = 0.040;
          amps[3] = 0.024;
          amps[4] = 0.014;
          amps[5] = 0.007;

          // LOD: skip high-frequency octaves at distance
          int maxOctaves = int(mix(6.0, 2.0, clamp(lod, 0.0, 1.0)));

          for (int i = 0; i < 6; i++) {
            if (i >= maxOctaves) break;
            float phase = dot(pos, dirs[i]) * scales[i] + time * speeds[i];
            dN += dirs[i] * cos(phase) * amps[i];
          }

          return normalize(vec3(-dN.x, 1.0, -dN.y));
        }

        // ── Worley (cellular) noise for organic foam patterns ──
        float worley(vec2 p) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float minDist = 1.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = fract(sin(vec2(dot(n + g, vec2(127.1, 311.7)), dot(n + g, vec2(269.5, 183.3)))) * 43758.5453);
              vec2 r = g + o - f;
              float d = dot(r, r);
              minDist = min(minDist, d);
            }
          }
          return sqrt(minDist);
        }

        // ── Multi-octave fBm with domain rotation to break tiling ──
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8); // 36.87° rotation
          for (int i = 0; i < 5; i++) {
            v += a * gradientNoise(p);
            p = rot * p * 2.03 + vec2(1.7, 0.9);
            a *= 0.49;
          }
          return v;
        }

        void main() {
          // LOD factor for detail culling at distance
          float lodFactor = clamp((vDist - 30.0) / 350.0, 0.0, 1.0);

          // Combine macroscopic wave normal with multi-scale detail ripples
          vec3 baseNormal = normalize(vNormal);
          vec3 detailN = getDetailNormal(vWorldPos.xz, uTime, lodFactor);
          float detailStrength = mix(0.45, 0.08, lodFactor);
          vec3 normal = normalize(baseNormal + vec3(detailN.x, 0.0, detailN.z) * detailStrength);

          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 lightDir = normalize(uSunPosition - vWorldPos);
          vec3 R = reflect(-viewDir, normal);

          // Physically accurate Schlick Fresnel (F0 = 0.02 for water IOR 1.333)
          float NdotV = clamp(dot(normal, viewDir), 0.001, 1.0);
          float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);

          // Sky dome reflection with non-linear height falloff
          float skyH = clamp(R.y, 0.0, 1.0);
          vec3 skyReflect = mix(uHorizonColor, uTopSkyColor, pow(skyH, 0.42));

          // Sun specular reflection on water surface
          float sunReflectDot = max(dot(R, lightDir), 0.0);
          skyReflect += uSunColor * (pow(sunReflectDot, 48.0) * 0.5 + pow(sunReflectDot, 256.0) * 1.8) * (uSunIntensity * 0.4);

          // Trough darkening for downward reflected rays
          if (R.y < 0.0) {
            vec3 troughColor = uDeepColor * 0.6;
            skyReflect = mix(skyReflect, troughColor, clamp(-R.y * 3.5, 0.0, 0.92));
          }

          // ── GGX Microfacet Specular (sun glitter path) ──
          vec3 H = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, H), 0.0);
          float NdotL = max(dot(normal, lightDir), 0.0);
          float roughness = 0.08;
          float alpha = roughness * roughness;
          float alpha2 = alpha * alpha;
          float denom = NdotH * NdotH * (alpha2 - 1.0) + 1.0;
          float D = alpha2 / (3.14159265 * denom * denom);

          float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
          float G = (NdotL / (NdotL * (1.0 - k) + k)) * (NdotV / (NdotV * (1.0 - k) + k));
          vec3 specular = uSunColor * ((D * G * fresnel) / max(4.0 * NdotV * NdotL, 0.001)) * (uSunIntensity * 0.4);

          // ── Subsurface Scattering (light through thin wave crests) ──
          float forwardScatter = pow(clamp(dot(viewDir, -lightDir), 0.0, 1.0), 4.0);
          float crestThick = clamp(vCrest * 2.0 + (vWorldPos.y + 1.5) * 0.3, 0.0, 2.0);
          vec3 sssColor = mix(uShallowColor, uSunColor, 0.7) * forwardScatter * crestThick * 1.2;

          // ── Depth-dependent water body color ──
          // Uses world-space noise to break visual monotony across the ocean
          float heightFactor = clamp((vWorldPos.y + 2.8) / 5.6, 0.0, 1.0);
          // Add large-scale color variation using slow-moving noise
          float colorVar = fbm(vWorldPos.xz * 0.0018 + vec2(uTime * 0.003)) * 0.15;
          vec3 waterBody = mix(uDeepColor * (1.0 - colorVar), uShallowColor * (1.0 + colorVar * 0.5), heightFactor);

          // Composite water surface
          vec3 finalColor = mix(waterBody, skyReflect, fresnel) + sssColor + specular;

          // ── Organic Foam using Worley noise cells ──
          if (vCrest > 0.35) {
            // Multi-scale cellular foam pattern
            float w1 = worley(vWorldPos.xz * 0.8 + vec2(uTime * 0.15, -uTime * 0.08));
            float w2 = worley(vWorldPos.xz * 2.4 - vec2(uTime * 0.22, uTime * 0.12));
            float w3 = worley(vWorldPos.xz * 6.0 + vec2(-uTime * 0.3, uTime * 0.18));

            // Organic foam cells: thin veins between Voronoi regions
            float foamCells = (1.0 - smoothstep(0.0, 0.25, w1)) * 0.5
                            + (1.0 - smoothstep(0.0, 0.15, w2)) * 0.3
                            + (1.0 - smoothstep(0.0, 0.10, w3)) * 0.2;

            // Large-scale noise modulation to prevent uniform foam coverage
            float foamMod = fbm(vWorldPos.xz * 0.06 + vec2(uTime * 0.02));
            foamCells *= smoothstep(0.3, 0.6, foamMod);

            float foamMask = smoothstep(0.35, 0.80, vCrest) * foamCells;
            // Foam is slightly bluish-white, not pure white
            vec3 foam = uFoamColor * (0.85 + foamMask * 0.15);
            finalColor = mix(finalColor, foam, clamp(foamMask * 0.9, 0.0, 1.0));
          }

          // ── Bioluminescent plankton glow (night/aurora) ──
          if (uBioluminescence > 0.5) {
            float bioPulse = sin(uTime * 2.5 + vWorldPos.x * 0.18 + vWorldPos.z * 0.18) * 0.5 + 0.5;
            float bioSwirl = gradientNoise(vWorldPos.xz * 0.05 + uTime * 0.4) * 0.5 + 0.5;
            vec3 bioColor = vec3(0.06, 0.98, 0.72) * (vCrest * 0.8 * bioPulse * bioSwirl);
            finalColor += bioColor;
          }

          // ── Atmospheric horizon blending ──
          // Seamlessly blend ocean into the exact horizon sky color with solar haze
          float fogFactor = clamp((vDist - 250.0) / 1050.0, 0.0, 1.0);
          fogFactor = fogFactor * fogFactor * (3.0 - 2.0 * fogFactor); // smoothstep curve

          // Towards the sun, horizon atmospheric haze takes on warm solar scattering
          float sunHaze = pow(max(dot(viewDir, lightDir), 0.0), 3.0);
          vec3 horizonTarget = mix(uHorizonColor, uSunColor, sunHaze * 0.25);

          finalColor = mix(finalColor, horizonTarget, fogFactor);

          gl_FragColor = vec4(finalColor, vEdgeAlpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide
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
    this.mesh.material.uniforms.uTopSkyColor.value.set(weather.skyTopColor);
    this.mesh.material.uniforms.uHorizonColor.value.set(weather.skyHorizonColor);
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
