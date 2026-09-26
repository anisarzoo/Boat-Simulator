// Ocean mesh, Gerstner wave shader, underwater Snell's optics & bathymetric depth floor
import * as THREE from 'three';
import { BASE_WAVES } from './constants.js';
import { computeWaveSpecs, getGerstnerGLSL } from './gerstner.js';

export class Ocean {
  constructor(scene, initialWeather) {
    this.scene = scene;
    this.weather = initialWeather;
    this.gridSize = 3000;
    this.segments = 144;

    this.initMesh();
    this.initAbyssFloor();
  }

  initMesh() {
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

    const fragmentShader = `
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

      // ── Multi-scale Detail Normal from analytical noise derivatives (Silky, flowing capillary ripples) ──
      vec3 getDetailNormal(vec2 pos, float time, float lod) {
        vec2 dN = vec2(0.0);

        vec2 dirs[6];
        dirs[0] = vec2(0.809, 0.588);
        dirs[1] = vec2(-0.656, 0.755);
        dirs[2] = vec2(0.951, -0.309);
        dirs[3] = vec2(-0.454, -0.891);
        dirs[4] = vec2(0.276, 0.961);
        dirs[5] = vec2(-0.978, 0.208);

        float scales[6];
        scales[0] = 0.48;
        scales[1] = 0.98;
        scales[2] = 1.95;
        scales[3] = 3.65;
        scales[4] = 6.20;
        scales[5] = 9.80;

        float speeds[6];
        speeds[0] = 1.6;
        speeds[1] = -2.1;
        speeds[2] = 2.8;
        speeds[3] = -3.7;
        speeds[4] = 4.8;
        speeds[5] = -6.0;

        float amps[6];
        amps[0] = 0.055;
        amps[1] = 0.040;
        amps[2] = 0.026;
        amps[3] = 0.016;
        amps[4] = 0.009;
        amps[5] = 0.004;

        int maxOctaves = int(mix(6.0, 2.0, clamp(lod, 0.0, 1.0)));

        for (int i = 0; i < 6; i++) {
          if (i >= maxOctaves) break;
          float phase = dot(pos, dirs[i]) * scales[i] + time * speeds[i];
          dN += dirs[i] * cos(phase) * amps[i];
        }

        return normalize(vec3(-dN.x, 1.0, -dN.y));
      }

      // ── Worley cellular noise for foam ──
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

      // ── Streamlined 2-octave fBm (prevents GPU overheating) ──
      float fbm(vec2 p) {
        return gradientNoise(p) * 0.65 + gradientNoise(p * 2.05 + vec2(1.7, 0.9)) * 0.35;
      }

      void main() {
        // Detect viewing orientation (double-sided rendering)
        bool isUnderside = !gl_FrontFacing;

        // LOD factor for detail culling at distance
        float lodFactor = clamp((vDist - 30.0) / 350.0, 0.0, 1.0);

        // Combine macroscopic wave normal with organic, smooth micro-scale ripples
        vec3 baseNormal = normalize(vNormal);
        vec3 detailN = getDetailNormal(vWorldPos.xz, uTime, lodFactor);
        float detailStrength = mix(0.22, 0.04, lodFactor);
        vec3 normal = normalize(baseNormal + vec3(detailN.x, 0.0, detailN.z) * detailStrength);

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 lightDir = normalize(uSunPosition - vWorldPos);

        // ── UNDERWATER OPTICS: SNELL'S WINDOW & TIR (When viewed from underneath) ──
        if (isUnderside) {
          vec3 N = -normal; // Orient normal towards the underwater observer
          float cosTheta = clamp(dot(N, viewDir), 0.0, 1.0);

          vec3 underColor;

          // Snell's critical angle: water (1.333) to air (1.0) -> critical angle ~48.6° (cos ~0.66)
          if (cosTheta > 0.62) {
            // Inside Snell's Window: observer sees the refracted sky & celestial bodies above
            vec3 refr = refract(-viewDir, N, 1.333 / 1.0);
            float skyH = clamp(refr.y, 0.0, 1.0);
            vec3 skyLook = mix(uHorizonColor, uTopSkyColor, pow(skyH, 0.42));

            // Refracted sun glint through the surface
            float sunDot = max(dot(refr, lightDir), 0.0);
            skyLook += uSunColor * (pow(sunDot, 32.0) * 0.7 + pow(sunDot, 128.0) * 1.8) * (uSunIntensity * 0.4);

            // Water extinction filter (Beer-Lambert law: red/amber light attenuated)
            vec3 waterFilter = mix(uShallowColor * 1.8, uDeepColor * 2.4, 0.45);
            vec3 transmitted = skyLook * waterFilter;

            // Fresnel reflection on underside
            float fUnder = 0.02 + 0.98 * pow(1.0 - cosTheta, 5.0);
            vec3 deepWaterReflect = uDeepColor * 0.4;
            underColor = mix(transmitted, deepWaterReflect, fUnder);
          } else {
            // Outside Snell's Window: Total Internal Reflection (TIR)
            vec3 R_under = reflect(-viewDir, N);
            float downward = clamp(-R_under.y, 0.0, 1.0);
            underColor = mix(uDeepColor * 0.32, uShallowColor * 0.22, downward * 0.5);
          }

          // Refractive caustic bands dancing along underside of wave crests
          float causticRipples = gradientNoise(vWorldPos.xz * 0.22 + vec2(uTime * 0.35, -uTime * 0.25));
          causticRipples = pow(causticRipples * 0.5 + 0.5, 3.0);
          underColor += uShallowColor * causticRipples * 0.4 * max(uSunIntensity, 0.4);

          // Foam silhouettes visible from underneath
          if (vCrest > 0.35) {
            float foamSilhouette = smoothstep(0.35, 0.8, vCrest);
            vec3 foamUnder = mix(uFoamColor * 0.45, uShallowColor * 0.7, 0.5);
            underColor = mix(underColor, foamUnder, foamSilhouette * 0.65);
          }

          // Underwater distance absorption fog to deep abyss
          float underFog = clamp((vDist - 60.0) / 650.0, 0.0, 1.0);
          underFog = underFog * underFog * (3.0 - 2.0 * underFog);
          underColor = mix(underColor, uDeepColor * 0.22, underFog);

          gl_FragColor = vec4(underColor, vEdgeAlpha);
          return;
        }

        // ── SURFACE OPTICS (When viewed from above) ──
        vec3 R = reflect(-viewDir, normal);

        // Physically accurate Schlick Fresnel (F0 = 0.02 for water IOR 1.333)
        float NdotV = clamp(dot(normal, viewDir), 0.001, 1.0);
        float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);

        // Sky dome reflection with non-linear height falloff
        float skyH = clamp(R.y, 0.0, 1.0);
        vec3 skyReflect = mix(uHorizonColor, uTopSkyColor, pow(skyH, 0.42));

        // Natural, expansive sun reflection sheen (soft and liquid, strictly no sharp glitter spikes)
        float sunReflectDot = max(dot(R, lightDir), 0.0);
        skyReflect += uSunColor * (pow(sunReflectDot, 36.0) * 0.45 + pow(sunReflectDot, 120.0) * 0.85) * (uSunIntensity * 0.35);

        // Trough darkening for downward reflected rays
        if (R.y < 0.0) {
          vec3 troughColor = uDeepColor * 0.6;
          skyReflect = mix(skyReflect, troughColor, clamp(-R.y * 3.5, 0.0, 0.92));
        }

        // ── GGX Microfacet Specular (Broad, liquid sun glitter path) ──
        vec3 H = normalize(lightDir + viewDir);
        float NdotH = max(dot(normal, H), 0.0);
        float NdotL = max(dot(normal, lightDir), 0.0);
        float roughness = 0.18; // Physically authentic marine water roughness (softens sharp points)
        float alpha = roughness * roughness;
        float alpha2 = alpha * alpha;
        float denom = NdotH * NdotH * (alpha2 - 1.0) + 1.0;
        float D = alpha2 / (3.14159265 * denom * denom);

        float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
        float G = (NdotL / (NdotL * (1.0 - k) + k)) * (NdotV / (NdotV * (1.0 - k) + k));
        vec3 specular = uSunColor * ((D * G * fresnel) / max(4.0 * NdotV * NdotL, 0.001)) * (uSunIntensity * 0.35);

        // ── Subsurface Scattering (light through thin wave crests) ──
        float forwardScatter = pow(clamp(dot(viewDir, -lightDir), 0.0, 1.0), 4.0);
        float crestThick = clamp(vCrest * 2.0 + (vWorldPos.y + 1.5) * 0.3, 0.0, 2.0);
        vec3 sssColor = mix(uShallowColor, uSunColor, 0.7) * forwardScatter * crestThick * 1.2;

        // ── Volumetric water body with depth variation ──
        float heightFactor = clamp((vWorldPos.y + 2.8) / 5.6, 0.0, 1.0);
        float colorVar = fbm(vWorldPos.xz * 0.0018 + vec2(uTime * 0.003)) * 0.15;
        vec3 waterBody = mix(uDeepColor * (1.0 - colorVar), uShallowColor * (1.0 + colorVar * 0.5), heightFactor);

        // Composite water surface
        vec3 finalColor = mix(waterBody, skyReflect, fresnel) + sssColor + specular;

        // ── Organic Foam using Worley noise cells ──
        if (vCrest > 0.35) {
          float w1 = worley(vWorldPos.xz * 0.8 + vec2(uTime * 0.15, -uTime * 0.08));
          float w2 = worley(vWorldPos.xz * 2.4 - vec2(uTime * 0.22, uTime * 0.12));

          float foamCells = (1.0 - smoothstep(0.0, 0.25, w1)) * 0.6
                          + (1.0 - smoothstep(0.0, 0.15, w2)) * 0.4;

          float foamMod = fbm(vWorldPos.xz * 0.06 + vec2(uTime * 0.02));
          foamCells *= smoothstep(0.3, 0.6, foamMod);

          float foamMask = smoothstep(0.35, 0.80, vCrest) * foamCells;
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
        float fogFactor = clamp((vDist - 250.0) / 1050.0, 0.0, 1.0);
        fogFactor = fogFactor * fogFactor * (3.0 - 2.0 * fogFactor);

        float sunHaze = pow(max(dot(viewDir, lightDir), 0.0), 3.0);
        vec3 horizonTarget = mix(uHorizonColor, uSunColor, sunHaze * 0.25);

        finalColor = mix(finalColor, horizonTarget, fogFactor);

        gl_FragColor = vec4(finalColor, vEdgeAlpha);
      }
    `;

    // ── 1. High-Density Near-Field Ocean Mesh (380m x 380m, 190x190 segments = 2.0m spacing) ──
    // Provides ultra-smooth, continuous curvature around the boat, completely eliminating low-poly triangular facets
    const innerGeometry = new THREE.PlaneGeometry(380, 380, 190, 190);
    innerGeometry.rotateX(-Math.PI / 2);

    const innerMaterial = new THREE.ShaderMaterial({
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

          float r = length(position.xz);
          // High-resolution inner mesh gracefully transitions out between 130m and 180m radius
          float edgeFade = 1.0 - smoothstep(130.0, 180.0, r);

          vWorldPos = displacedPos;
          vNormal = displacedNormal;
          vCrest = crest;
          vDist = length(cameraPosition - displacedPos);
          vEdgeAlpha = edgeFade;

          gl_Position = projectionMatrix * viewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true
    });

    this.innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    this.innerMesh.receiveShadow = true;
    this.scene.add(this.innerMesh);

    // ── 2. Wide-Area Ocean Vista Mesh (3000m x 3000m) ──
    // Provides the expansive ocean horizon, cross-fading seamlessly from the inner mesh
    const outerGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize, this.segments, this.segments);
    outerGeometry.rotateX(-Math.PI / 2);

    const outerMaterial = new THREE.ShaderMaterial({
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
          float outerFade = 1.0 - smoothstep(950.0, 1420.0, r);
          displacedPos.y *= outerFade;
          displacedPos.xz = mix(worldPos.xz, displacedPos.xz, outerFade);

          vWorldPos = displacedPos;
          vNormal = mix(vec3(0.0, 1.0, 0.0), displacedNormal, outerFade);
          vCrest = crest * outerFade;
          vDist = length(cameraPosition - displacedPos);

          // Cross-fade in where inner mesh fades out (130m to 180m), and fade out at outer horizon
          float innerHole = smoothstep(130.0, 180.0, r);
          vEdgeAlpha = innerHole * (1.0 - smoothstep(1250.0, 1480.0, r));

          gl_Position = projectionMatrix * viewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true
    });

    this.mesh = new THREE.Mesh(outerGeometry, outerMaterial);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  // ── Bathymetric Seabed Floor (Abyss depth mesh eliminating hollow look from below) ──
  initAbyssFloor() {
    const geo = new THREE.PlaneGeometry(3200, 3200, 128, 128);
    geo.rotateX(-Math.PI / 2);

    const uniforms = {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Vector3(...this.weather.waterDeepColor) },
      uShallowColor: { value: new THREE.Vector3(...this.weather.waterShallowColor) },
      uSunPosition: { value: new THREE.Vector3(...this.weather.sunPosition) },
      uSunColor: { value: new THREE.Color(this.weather.sunColor) },
      uSunIntensity: { value: this.weather.sunIntensity }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        varying float vDist;
        varying float vEdgeAlpha;

        void main() {
          vec3 pos = position;
          // Continental shelf undulating bathymetric dunes & trenches
          float b1 = sin(pos.x * 0.004) * cos(pos.z * 0.004) * 9.0;
          float b2 = sin(pos.x * 0.011 + pos.z * 0.007) * 4.5;
          pos.y += b1 + b2;

          vec4 wp = modelMatrix * vec4(pos, 1.0);
          vWorldPos = wp.xyz;
          vDist = length(cameraPosition - vWorldPos);

          float r = length(position.xz);
          vEdgeAlpha = 1.0 - smoothstep(1100.0, 1500.0, r);

          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSunPosition;
        uniform vec3 uSunColor;
        uniform float uSunIntensity;
        uniform float uTime;

        varying vec3 vWorldPos;
        varying float vDist;
        varying float vEdgeAlpha;

        vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }

        float gnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
            mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y
          );
        }

        void main() {
          // Seabed floor base tone: abyssal deep sediment
          vec3 floorBase = uDeepColor * 0.32;
          float floorSand = gnoise(vWorldPos.xz * 0.02) * 0.05;
          floorBase += vec3(floorSand);

          // Deep caustics shimmering down onto the ocean floor
          vec2 c1 = vWorldPos.xz * 0.05 + vec2(uTime * 0.18, uTime * 0.12);
          vec2 c2 = vWorldPos.xz * 0.09 - vec2(uTime * 0.15, -uTime * 0.22);
          vec2 c3 = vWorldPos.xz * 0.15 + vec2(-uTime * 0.26, uTime * 0.19);

          float n1 = gnoise(c1);
          float n2 = gnoise(c2);
          float n3 = gnoise(c3);

          float causticWeb = pow(max(0.0, 1.0 - abs(n1 + n2 * 0.7 + n3 * 0.4)), 3.2);
          vec3 causticColor = mix(uShallowColor, uSunColor, 0.4) * causticWeb * (max(uSunIntensity, 0.35) * 0.55);

          vec3 color = floorBase + causticColor;

          // Volumetric underwater absorption fog (Beer-Lambert attenuation)
          float fog = clamp((vDist - 30.0) / 450.0, 0.0, 1.0);
          fog = fog * fog * (3.0 - 2.0 * fog);
          vec3 abyssalWater = uDeepColor * 0.16;
          color = mix(color, abyssalWater, fog);

          gl_FragColor = vec4(color, vEdgeAlpha);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide
    });

    this.abyssMesh = new THREE.Mesh(geo, mat);
    this.abyssMesh.position.set(0, -65, 0);
    this.scene.add(this.abyssMesh);
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

    if (this.abyssMesh) {
      this.abyssMesh.material.uniforms.uDeepColor.value.set(...weather.waterDeepColor);
      this.abyssMesh.material.uniforms.uShallowColor.value.set(...weather.waterShallowColor);
      this.abyssMesh.material.uniforms.uSunPosition.value.set(...weather.sunPosition);
      this.abyssMesh.material.uniforms.uSunColor.value.set(weather.sunColor);
      this.abyssMesh.material.uniforms.uSunIntensity.value = weather.sunIntensity;
    }
  }

  update(time, shipPosition) {
    this.mesh.material.uniforms.uTime.value = time;
    if (this.abyssMesh) {
      this.abyssMesh.material.uniforms.uTime.value = time;
    }

    // Follow the ship smoothly in discrete steps to prevent vertex popping
    if (shipPosition) {
      if (this.innerMesh) {
        // High-density near-field mesh snaps in fine 2.0m increments (matches inner quad resolution)
        const snapInnerX = Math.floor(shipPosition.x / 2.0) * 2.0;
        const snapInnerZ = Math.floor(shipPosition.z / 2.0) * 2.0;
        this.innerMesh.position.set(snapInnerX, 0, snapInnerZ);
      }

      const snap = this.gridSize / this.segments;
      const snapX = Math.floor(shipPosition.x / snap) * snap;
      const snapZ = Math.floor(shipPosition.z / snap) * snap;
      this.mesh.position.set(snapX, 0, snapZ);
      if (this.abyssMesh) {
        this.abyssMesh.position.set(snapX, -65, snapZ);
      }
    }
  }
}
