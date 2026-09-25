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
        varying vec2 vUv;

        void main() {
          vUv = uv * 32.0;
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
        uniform vec3 uTopSkyColor;
        uniform vec3 uHorizonColor;
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

        // Multi-octave capillary wind ripple perturbation
        vec3 getCapillaryNormal(vec2 pos, float time) {
          vec2 dN = vec2(0.0);
          vec2 d1 = vec2(0.8, 0.6);
          vec2 d2 = vec2(-0.7, 0.7);
          vec2 d3 = vec2(0.9, -0.4);
          vec2 d4 = vec2(-0.5, -0.85);

          float p1 = dot(pos, d1) * 0.95 + time * 2.2;
          float p2 = dot(pos, d2) * 1.65 - time * 2.8;
          float p3 = dot(pos, d3) * 3.10 + time * 4.1;
          float p4 = dot(pos, d4) * 5.40 - time * 5.8;

          dN += d1 * cos(p1) * 0.08;
          dN += d2 * cos(p2) * 0.055;
          dN += d3 * cos(p3) * 0.032;
          dN += d4 * cos(p4) * 0.018;

          return normalize(vec3(-dN.x, 1.0, -dN.y));
        }

        void main() {
          // Combine macroscopic wave normal with high-frequency capillary ripples
          vec3 baseNormal = normalize(vNormal);
          vec3 capNorm = getCapillaryNormal(vWorldPos.xz * 0.35, uTime);
          vec3 normal = normalize(baseNormal + vec3(capNorm.x, 0.0, capNorm.z) * 0.42);

          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 lightDir = normalize(uSunPosition - vWorldPos);
          vec3 R = reflect(-viewDir, normal);

          // Physically accurate Fresnel reflection (F0 = 0.02 for water IOR 1.333)
          float NdotV = clamp(dot(normal, viewDir), 0.001, 1.0);
          float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);

          // Analytical atmospheric sky dome reflection along R
          float skyH = clamp(R.y, 0.0, 1.0);
          vec3 skyReflect = mix(uHorizonColor, uTopSkyColor, pow(skyH, 0.48));

          // Sun flare & corona along reflected eye vector
          float sunReflectDot = max(dot(R, lightDir), 0.0);
          skyReflect += uSunColor * (pow(sunReflectDot, 32.0) * 0.6 + pow(sunReflectDot, 128.0) * 1.2) * (uSunIntensity * 0.45);

          // Trough self-reflection for downward rays
          if (R.y < 0.0) {
            vec3 troughColor = uDeepColor * 0.7;
            skyReflect = mix(skyReflect, troughColor, clamp(-R.y * 3.0, 0.0, 0.9));
          }

          // Physically-based GGX Microfacet Specular Highlight (The Sun Glitter Path)
          vec3 H = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, H), 0.0);
          float NdotL = max(dot(normal, lightDir), 0.0);
          float roughness = 0.095;
          float alpha = roughness * roughness;
          float denom = NdotH * NdotH * (alpha * alpha - 1.0) + 1.0;
          float D = (alpha * alpha) / (3.14159265 * denom * denom);

          float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
          float G = (NdotL / (NdotL * (1.0 - k) + k)) * (NdotV / (NdotV * (1.0 - k) + k));
          vec3 specular = uSunColor * ((D * G * fresnel) / max(4.0 * NdotV * NdotL, 0.001)) * (uSunIntensity * 0.45);

          // Subsurface scattering on wave crests (light shining through thin water tops)
          float forwardScatter = pow(clamp(dot(viewDir, -lightDir), 0.0, 1.0), 3.2);
          float crestThick = clamp(vCrest * 1.8 + (vWorldPos.y + 1.5) * 0.35, 0.0, 2.5);
          vec3 sssColor = mix(uShallowColor, vec3(0.05, 0.68, 0.58), 0.6) * forwardScatter * crestThick * 2.2;

          // Water body gradient from deep oceanic trough to crest
          float heightFactor = clamp((vWorldPos.y + 2.8) / 5.6, 0.0, 1.0);
          vec3 waterBody = mix(uDeepColor, uShallowColor, heightFactor);

          // Composite water surface
          vec3 finalColor = mix(waterBody, skyReflect, fresnel) + sssColor + specular;

          // Multi-layer cellular wave foam on steep crests
          float n1 = noise(vWorldPos.xz * 1.6 + vec2(uTime * 0.22));
          float n2 = noise(vWorldPos.xz * 4.8 - vec2(uTime * 0.38));
          float cells = pow(abs(sin(vWorldPos.x * 2.2 + n1 * 2.5) * cos(vWorldPos.z * 2.2 + n2 * 2.5)), 0.65);
          float combinedFoam = n1 * 0.45 + cells * 0.55;
          if (vCrest > 0.46) {
            float foamMask = smoothstep(0.46, 0.85, vCrest) * combinedFoam;
            finalColor = mix(finalColor, uFoamColor, foamMask * 0.95);
          }

          // Bioluminescent plankton glow (night/aurora)
          if (uBioluminescence > 0.5) {
            float bioPulse = sin(uTime * 2.5 + vWorldPos.x * 0.18 + vWorldPos.z * 0.18) * 0.5 + 0.5;
            vec3 bioColor = vec3(0.06, 0.98, 0.72) * (vCrest * 0.95 * bioPulse);
            finalColor += bioColor;
          }

          // Atmospheric horizon distance fog blending
          float dist = length(cameraPosition - vWorldPos);
          float fogFactor = 1.0 - exp(-dist * 0.0014);
          vec3 horizonColor = mix(uHorizonColor, uSunColor, 0.2);
          finalColor = mix(finalColor, horizonColor, clamp(fogFactor * 0.92, 0.0, 0.98));

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
