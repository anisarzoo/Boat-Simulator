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

        void main() {
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

        // Simple pseudo-noise for foam texturing
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                     mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
        }

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 lightDir = normalize(uSunPosition - vWorldPos);

          // Fresnel reflection calculation
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.5);
          fresnel = clamp(fresnel, 0.04, 0.95);

          // Subsurface scattering on wave crests
          float sss = pow(clamp(dot(viewDir, -lightDir), 0.0, 1.0), 3.0) * max(vCrest, 0.0);
          vec3 sssColor = vec3(0.05, 0.45, 0.42) * sss * 1.6;

          // Sun Specular (Blinn-Phong)
          vec3 halfVec = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVec), 0.0), 128.0) * uSunIntensity;
          vec3 specular = uSunColor * spec * (fresnel * 1.4);

          // Base ocean body color gradient based on height/steepness
          float heightFactor = clamp((vWorldPos.y + 1.8) / 4.5, 0.0, 1.0);
          vec3 waterBody = mix(uDeepColor, uShallowColor, heightFactor);

          // Ambient skylight reflection
          vec3 skyReflect = mix(uShallowColor * 1.3, uSunColor * 0.8, fresnel);

          vec3 finalColor = mix(waterBody, skyReflect, fresnel * 0.65) + specular + sssColor;

          // Dynamic foam on wave crests
          float foamNoise = noise(vWorldPos.xz * 2.2 + vec2(uTime * 0.35));
          float foamThreshold = 0.58;
          if (vCrest > foamThreshold) {
            float foamAmount = smoothstep(foamThreshold, 0.9, vCrest) * (foamNoise * 0.8 + 0.4);
            finalColor = mix(finalColor, uFoamColor, foamAmount);
          }

          // Bioluminescent glow at night
          if (uBioluminescence > 0.5) {
            float bioPulse = sin(uTime * 2.5 + vWorldPos.x * 0.1) * 0.5 + 0.5;
            vec3 bioGlow = vec3(0.1, 0.95, 0.65) * (vCrest * 0.8 * bioPulse);
            finalColor += bioGlow;
          }

          gl_FragColor = vec4(finalColor, 0.96);
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
