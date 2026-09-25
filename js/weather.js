// Dynamic Atmospheric Weather, Sky Dome, 3D Sun, 3D Moon, and Starfield
import * as THREE from 'three';
import { WEATHER_PRESETS } from './constants.js';

export class WeatherManager {
  constructor(scene, renderer = null, initialPresetId = 'sunset') {
    this.scene = scene;
    this.renderer = renderer;
    this.currentPreset = { ...(WEATHER_PRESETS[initialPresetId] || WEATHER_PRESETS.sunset) };
    this.currentEnvMap = null;

    // Autonomous diurnal day/night simulation & dynamic weather system
    this.autoMode = true; // Enabled by default for living world simulation
    this.simTime = 6.6; // 06:36 AM morning golden sunrise
    this.simSpeed = 0.045; // ~0.045 hours/sec (full 24h cycle in ~8.8 minutes)
    this.dynamicWeatherTimer = 160.0; // Dynamic passing squall timer (seconds)
    this.stormFactor = 0.0;
    this.stormState = 'clear'; // 'clear' | 'gathering' | 'active' | 'clearing'
    this.stormDuration = 0;
    this.lastEnvMapSimTime = -1;

    if (this.renderer) {
      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.pmremGenerator.compileEquirectangularShader();
    }

    this.initLighting();
    this.initSkyDome();
    this.initSun();
    this.initMoon();
    this.initStarfield();
    this.applyPreset(this.currentPreset);
  }

  generateEnvironmentMap(preset) {
    if (!this.pmremGenerator) return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // 1. Sky & Horizon Gradient
    const topCol = new THREE.Color(preset.skyTopColor);
    const horizCol = new THREE.Color(preset.skyHorizonColor);
    const deepCol = new THREE.Color(...preset.waterDeepColor);
    const shallowCol = new THREE.Color(...preset.waterShallowColor);
    const fogCol = new THREE.Color(preset.fogColor);

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, `#${topCol.getHexString()}`);
    grad.addColorStop(0.46, `#${horizCol.getHexString()}`);
    grad.addColorStop(0.50, `#${fogCol.getHexString()}`);
    grad.addColorStop(0.54, `#${shallowCol.getHexString()}`);
    grad.addColorStop(1.0, `#${deepCol.getHexString()}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // 2. Sun Disk & Atmospheric Corona
    if (preset.sunPosition && preset.sunPosition[1] > -30) {
      const sunDir = new THREE.Vector3(...preset.sunPosition).normalize();
      const u = (Math.atan2(sunDir.x, sunDir.z) / (Math.PI * 2) + 0.5) * 512;
      const v = (0.5 - Math.asin(Math.max(-0.99, Math.min(0.99, sunDir.y))) / Math.PI) * 256;

      const sunCol = new THREE.Color(preset.sunColor);
      const sunGlowCol = new THREE.Color(preset.sunGlowColor || preset.sunColor);

      const sunGrad = ctx.createRadialGradient(u, v, 2, u, v, 70);
      sunGrad.addColorStop(0.0, '#ffffff');
      sunGrad.addColorStop(0.18, `#${sunCol.getHexString()}`);
      sunGrad.addColorStop(0.55, `#${sunGlowCol.getHexString()}`);
      sunGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(u - 75, v - 75, 150, 150);
    }

    // 3. Moon Disk for Night/Aurora
    if (preset.moonPosition && preset.moonPosition[1] > 0 && preset.moonIntensity > 0) {
      const moonDir = new THREE.Vector3(...preset.moonPosition).normalize();
      const mu = (Math.atan2(moonDir.x, moonDir.z) / (Math.PI * 2) + 0.5) * 512;
      const mv = (0.5 - Math.asin(Math.max(-0.99, Math.min(0.99, moonDir.y))) / Math.PI) * 256;

      const moonGrad = ctx.createRadialGradient(mu, mv, 2, mu, mv, 40);
      moonGrad.addColorStop(0.0, '#ffffff');
      moonGrad.addColorStop(0.3, '#c8e2ff');
      moonGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = moonGrad;
      ctx.fillRect(mu - 45, mv - 45, 90, 90);
    }

    const canvasTexture = new THREE.CanvasTexture(canvas);
    const envMap = this.pmremGenerator.fromEquirectangular(canvasTexture).texture;
    canvasTexture.dispose();

    if (this.currentEnvMap) this.currentEnvMap.dispose();
    this.currentEnvMap = envMap;
    this.scene.environment = envMap;
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 650;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0x88bbdd, 0x112233, 0.6);
    this.scene.add(this.hemiLight);

    this.scene.fog = new THREE.FogExp2(0xd95b3b, 0.0016);
  }

  // Soft glowing corona sprite generator
  createGlowTexture(colorHex, innerAlpha = 1.0, outerAlpha = 0.0) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    
    const color = new THREE.Color(colorHex);
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    grad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, ${innerAlpha})`);
    grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${innerAlpha * 0.6})`);
    grad.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${innerAlpha * 0.2})`);
    grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, ${outerAlpha})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }

  // 1. SKY DOME — Photorealistic with volumetric cloud layers
  initSkyDome() {
    const skyGeo = new THREE.SphereGeometry(2600, 64, 48);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(0x1d1536) },
        uBottomColor: { value: new THREE.Color(0xff6622) },
        uSunColor: { value: new THREE.Color(0xff8833) },
        uSunDir: { value: new THREE.Vector3(0.2, 0.2, 0.9).normalize() },
        uMoonDir: { value: new THREE.Vector3(-0.5, 0.5, -0.7).normalize() },
        uMoonIntensity: { value: 0.0 },
        uAurora: { value: 0.0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        uniform vec3 uMoonDir;
        uniform float uMoonIntensity;
        uniform float uAurora;
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vDir;

        // ── Gradient Noise (non-tiling) ──
        vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }

        float gnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
          float a = dot(hash2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0));
          float b = dot(hash2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0));
          float c = dot(hash2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0));
          float d = dot(hash2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        // ── Multi-octave fBm with domain warping for realistic cloud shapes ──
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 6; i++) {
            v += a * gnoise(p);
            p = rot * p * 2.02 + vec2(1.7, 0.9);
            a *= 0.48;
          }
          return v;
        }

        // ── Domain-warped fBm for naturalistic cloud formations ──
        float cloudDensity(vec2 uv, float time) {
          vec2 q = vec2(
            fbm(uv + vec2(0.0, 0.0) + time * 0.015),
            fbm(uv + vec2(5.2, 1.3) - time * 0.012)
          );

          vec2 r = vec2(
            fbm(uv + 4.0 * q + vec2(1.7, 9.2) + time * 0.008),
            fbm(uv + 4.0 * q + vec2(8.3, 2.8) - time * 0.010)
          );

          return fbm(uv + 3.5 * r);
        }

        void main() {
          vec3 dir = normalize(vDir);

          // Optical height gradient from horizon (y=0) to zenith (y=1)
          float h = clamp(dir.y * 1.35, 0.0, 1.0);

          // Non-linear sky gradient: Rayleigh-like scattering simulation
          vec3 sky = mix(uBottomColor, uTopColor, pow(h, 0.38));

          // Zenith-to-horizon tint shift (blue to warmer as y→0)
          vec3 midTint = mix(uBottomColor, uTopColor, 0.35) * 1.08;
          float midBand = exp(-pow((h - 0.25) * 3.5, 2.0));
          sky = mix(sky, midTint, midBand * 0.25);

          // Subterranean ocean abyss: smoothly transition to deep ocean floor color below horizon
          if (dir.y < 0.0) {
            float abyssFactor = clamp(-dir.y * 3.2, 0.0, 1.0);
            vec3 abyssColor = vec3(0.003, 0.010, 0.022);
            sky = mix(uBottomColor * 0.75, abyssColor, abyssFactor);
          }

          // ── Physically Inspired Solar Disc & Mie Atmospheric Scattering ──
          vec3 sunDir = normalize(uSunDir);
          float sunDot = max(dot(dir, sunDir), 0.0);

          if (sunDot > 0.0) {
            // Intense crisp solar core (1 degree disc with smooth anti-aliased edge)
            float sunCore = smoothstep(0.9994, 0.99985, sunDot) * 8.0;
            // High-intensity inner corona
            float sunCorona = pow(sunDot, 128.0) * 2.2;
            // Medium atmospheric bloom
            float sunBloom = pow(sunDot, 24.0) * 0.85;
            // Broad Mie scattering halo
            float mieGlow = pow(sunDot, 5.0) * 0.35;

            sky += uSunColor * (sunCore + sunCorona + sunBloom + mieGlow);
          }

          // Horizon atmospheric extinction band
          float horizonHaze = exp(-max(dir.y, 0.0) * 8.0);
          vec3 hazeColor = mix(uBottomColor, uSunColor, pow(sunDot, 3.0) * 0.25);
          sky = mix(sky, hazeColor, horizonHaze * 0.3);

          // ── Lunar Atmospheric Glow ──
          if (uMoonIntensity > 0.02) {
            vec3 moonDir = normalize(uMoonDir);
            float moonDot = max(dot(dir, moonDir), 0.0);
            float moonCorona = pow(moonDot, 120.0) * 1.2;
            float moonGlow = pow(moonDot, 16.0) * 0.4;
            sky += vec3(0.65, 0.82, 1.0) * (moonCorona + moonGlow) * uMoonIntensity;
          }

          // ── Volumetric Cloud Layer ──
          if (dir.y > 0.02) {
            // Project onto a virtual cloud plane at altitude
            float cloudAlt = max(dir.y, 0.1);
            vec2 cloudUV = (dir.xz / cloudAlt) * 0.22;

            // Domain-warped cloud density
            float density = cloudDensity(cloudUV, uTime);

            // Coverage threshold
            float coverage = 0.48;
            float cloudMask = smoothstep(coverage, coverage + 0.28, density);

            // Smooth fade near horizon to prevent hard cutoff
            cloudMask *= smoothstep(0.03, 0.28, dir.y);

            // Height-based fade
            cloudMask *= 1.0 - smoothstep(0.65, 0.95, dir.y) * 0.4;

            if (cloudMask > 0.005) {
              // Cloud lighting model: self-shadowing towards sun
              vec2 sunOffset = sunDir.xz * 0.12;
              float shadowDensity = cloudDensity(cloudUV + sunOffset, uTime);
              float shadowFactor = smoothstep(coverage, coverage + 0.35, shadowDensity);

              vec3 cloudBright = mix(vec3(1.0, 0.98, 0.95), uSunColor, 0.35);
              vec3 cloudDark = mix(uTopColor * 0.55, uBottomColor * 0.45, 0.4);

              float sunInfluence = pow(max(dot(dir, sunDir), 0.0), 2.5) * 0.55 + 0.45;
              vec3 cloudColor = mix(cloudBright, cloudDark, shadowFactor * 0.7) * sunInfluence;

              // Silver lining / rim light
              float rim = smoothstep(coverage + 0.05, coverage + 0.15, density);
              float rimLight = (1.0 - rim) * pow(sunDot, 4.0) * 0.6;
              cloudColor += uSunColor * rimLight;

              // Atmospheric depth tinting near horizon
              float horizDepth = 1.0 - smoothstep(0.05, 0.4, dir.y);
              cloudColor = mix(cloudColor, hazeColor, horizDepth * 0.45);

              sky = mix(sky, cloudColor, cloudMask * 0.7);
            }
          }

          // ── Aurora Borealis curtains (Night preset) ──
          if (uAurora > 0.5 && dir.y > 0.15) {
            float wave1 = sin(dir.x * 6.0 + uTime * 0.8) * 0.5 + 0.5;
            float wave2 = cos(dir.z * 5.0 - uTime * 0.5) * 0.5 + 0.5;
            float wave3 = sin(dir.x * 3.2 - uTime * 0.3 + dir.z * 2.1) * 0.5 + 0.5;
            float curtain = pow(wave1 * wave2, 2.5) * smoothstep(0.15, 0.7, dir.y);
            float shimmer = pow(wave3, 3.0) * smoothstep(0.2, 0.5, dir.y) * 0.4;
            vec3 auroraGreen = vec3(0.05, 0.95, 0.55);
            vec3 auroraBlue = vec3(0.1, 0.5, 0.95);
            vec3 auroraPurple = vec3(0.6, 0.15, 0.85);
            vec3 auroraColor = mix(auroraGreen, auroraBlue, wave2);
            auroraColor = mix(auroraColor, auroraPurple, shimmer);
            sky += auroraColor * (curtain + shimmer) * 0.85;
          }

          // Safe HDR headroom — tonemapped by ACES in renderer
          sky = min(sky, vec3(16.0));

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyDome);
  }

  // 2. 3D SUN (Atmospheric celestial body rendered in sky dome shader without billboard artifacts)
  initSun() {
    this.sunGroup = new THREE.Group();
    this.scene.add(this.sunGroup);
  }

  // 3. 3D MOON (Visible 3D Sphere with Lunar Maria Texture)
  initMoon() {
    this.moonGroup = new THREE.Group();

    // Procedural lunar surface material with maria/crater variation
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 256; moonCanvas.height = 128;
    const mctx = moonCanvas.getContext('2d');
    mctx.fillStyle = '#d0d8e2';
    mctx.fillRect(0, 0, 256, 128);
    // Dark lunar maria patches
    mctx.fillStyle = 'rgba(70, 80, 95, 0.45)';
    for (let i = 0; i < 18; i++) {
      mctx.beginPath();
      mctx.arc(Math.random() * 256, Math.random() * 128, 12 + Math.random() * 25, 0, Math.PI * 2);
      mctx.fill();
    }
    const moonTex = new THREE.CanvasTexture(moonCanvas);

    const moonGeo = new THREE.SphereGeometry(45, 24, 24);
    this.moonMesh = new THREE.Mesh(moonGeo, new THREE.MeshBasicMaterial({ map: moonTex, fog: false }));
    this.moonGroup.add(this.moonMesh);

    this.scene.add(this.moonGroup);
  }

  // 4. TWINKLING CELESTIAL STARFIELD
  initStarfield() {
    const starCount = 2400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Upper hemisphere distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.48; // restrict to upper dome

      const radius = 2450;
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi) + 20; // above horizon
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    // Circular soft-dot texture for stars (prevents square rendering)
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 64; starCanvas.height = 64;
    const sctx = starCanvas.getContext('2d');
    const starGrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    starGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    starGrad.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)');
    starGrad.addColorStop(0.5, 'rgba(200, 220, 255, 0.3)');
    starGrad.addColorStop(1.0, 'rgba(200, 220, 255, 0.0)');
    sctx.fillStyle = starGrad;
    sctx.fillRect(0, 0, 64, 64);
    const starTexture = new THREE.CanvasTexture(starCanvas);

    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3.0,
      map: starTexture,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      fog: false
    });

    this.stars = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.stars);
  }

  lerpColor(hexA, hexB, t) {
    const rA = (hexA >> 16) & 255, gA = (hexA >> 8) & 255, bA = hexA & 255;
    const rB = (hexB >> 16) & 255, gB = (hexB >> 8) & 255, bB = hexB & 255;
    const cl = Math.max(0, Math.min(1, t));
    const r = Math.round(rA + (rB - rA) * cl);
    const g = Math.round(gA + (gB - gA) * cl);
    const b = Math.round(bA + (bB - bA) * cl);
    return (r << 16) | (g << 8) | b;
  }

  lerpVec3(a, b, t) {
    const cl = Math.max(0, Math.min(1, t));
    return [
      a[0] + (b[0] - a[0]) * cl,
      a[1] + (b[1] - a[1]) * cl,
      a[2] + (b[2] - a[2]) * cl
    ];
  }

  setAutoMode(enabled) {
    this.autoMode = !!enabled;
    if (this.autoMode) {
      this.applyAutoDiurnal(0);
    }
    return this.autoMode;
  }

  formatSimTime() {
    const totalMins = Math.floor(this.simTime * 60);
    const hours24 = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    const padMins = mins < 10 ? `0${mins}` : mins;
    const isPM = hours24 >= 12;
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const padHours = hours12 < 10 ? `0${hours12}` : hours12;
    const ampm = isPM ? 'PM' : 'AM';

    let stage = 'Day';
    if (this.stormFactor > 0.4) stage = 'Storm Squall';
    else if (this.simTime >= 5.0 && this.simTime < 7.5) stage = 'Sunrise';
    else if (this.simTime >= 7.5 && this.simTime < 16.0) stage = 'Tropical Noon';
    else if (this.simTime >= 16.0 && this.simTime < 19.5) stage = 'Golden Sunset';
    else if (this.simTime >= 19.5 && this.simTime < 21.5) stage = 'Twilight';
    else stage = 'Moonlit Night';

    return `${padHours}:${padMins} ${ampm} • ${stage}`;
  }

  applyAutoDiurnal(dt) {
    // 1. Advance continuous 24-hour diurnal clock
    this.simTime += this.simSpeed * dt;
    if (this.simTime >= 24.0) this.simTime -= 24.0;
    if (this.simTime < 0) this.simTime += 24.0;

    // 2. Dynamic Weather Fronts ("somedays dynamic weathers" - passing squalls/tempests)
    this.dynamicWeatherTimer -= dt;
    if (this.stormState === 'clear' && this.dynamicWeatherTimer <= 0) {
      this.stormState = 'gathering';
      this.stormDuration = 22.0;
    } else if (this.stormState === 'gathering') {
      this.stormDuration -= dt;
      this.stormFactor = 1.0 - (this.stormDuration / 22.0);
      if (this.stormDuration <= 0) {
        this.stormState = 'active';
        this.stormDuration = 55.0; // 55s heavy tempest
        this.stormFactor = 1.0;
      }
    } else if (this.stormState === 'active') {
      this.stormDuration -= dt;
      this.stormFactor = 1.0;
      if (this.stormDuration <= 0) {
        this.stormState = 'clearing';
        this.stormDuration = 22.0;
      }
    } else if (this.stormState === 'clearing') {
      this.stormDuration -= dt;
      this.stormFactor = Math.max(0, this.stormDuration / 22.0);
      if (this.stormDuration <= 0) {
        this.stormState = 'clear';
        this.stormFactor = 0.0;
        this.dynamicWeatherTimer = 180.0 + Math.random() * 120.0; // Next squall in 3-5 minutes
      }
    }

    // 3. Astronomical Solar & Lunar Coordinates
    const rad = (this.simTime / 24.0) * Math.PI * 2;
    const sunAlt = -Math.cos(rad); // -1 at midnight, 0 at dawn/dusk, +1 at noon
    const sunAz = Math.sin(rad);  // -1 at dawn, +1 at dusk

    const sunY = sunAlt * 420;
    const sunX = Math.cos(sunAz * 1.1) * 280;
    const sunZ = Math.sin(sunAz * 1.1) * 360 + 80;
    const sunPos = [sunX, sunY, sunZ];

    const moonPos = [-sunX * 0.9, -sunY * 0.85 + 60, -sunZ * 0.9];

    // 4. Diurnal Color and Lighting Interpolation
    let skyTopColor = 0x145da0;
    let skyHorizonColor = 0x98d4f8;
    let sunColor = 0xfffaed;
    let sunIntensity = 2.2;
    let moonIntensity = 0.0;
    let ambientColor = 0x88b7d5;
    let ambientIntensity = 0.85;
    let fogColor = 0x8ec8f2;
    let fogDensity = 0.0008;
    let waterDeepColor = [0.008, 0.055, 0.14];
    let waterShallowColor = [0.025, 0.32, 0.38];
    let foamColor = [0.94, 0.98, 1.0];
    let waveScale = 0.68;
    let windSpeedKnots = 12;
    let starsOpacity = 0.0;
    let bioluminescence = false;

    const goldSkyTop = 0x3d5a80;
    const goldSkyHorizon = (sunAz < 0) ? 0xee7733 : 0xdd6633;
    const goldSunColor = (sunAz < 0) ? 0xffaa55 : 0xff9944;
    const goldAmbientColor = 0x6a4a3e;
    const goldFogColor = 0x7a4835;
    const goldWaterDeep = [0.01, 0.04, 0.10];
    const goldWaterShallow = [0.05, 0.10, 0.12];
    const goldFoam = [1.0, 0.92, 0.85];

    if (sunAlt > 0.22) {
      // Day (Tropical Sun)
      sunIntensity = 1.8 + sunAlt * 0.5;
      ambientIntensity = 0.75 + sunAlt * 0.15;
      starsOpacity = 0.0;
      bioluminescence = false;
    } else if (sunAlt >= 0) {
      // Transition between Golden Hour and Day
      const f = sunAlt / 0.22;
      skyTopColor = this.lerpColor(goldSkyTop, 0x145da0, f);
      skyHorizonColor = this.lerpColor(goldSkyHorizon, 0x98d4f8, f);
      sunColor = this.lerpColor(goldSunColor, 0xfffaed, f);
      sunIntensity = 1.0 + f * 1.0;
      ambientColor = this.lerpColor(goldAmbientColor, 0x88b7d5, f);
      ambientIntensity = 0.58 + f * 0.27;
      fogColor = this.lerpColor(goldFogColor, 0x8ec8f2, f);
      fogDensity = 0.001 - f * 0.0002;
      waterDeepColor = this.lerpVec3(goldWaterDeep, [0.008, 0.055, 0.14], f);
      waterShallowColor = this.lerpVec3(goldWaterShallow, [0.025, 0.32, 0.38], f);
      foamColor = this.lerpVec3(goldFoam, [0.94, 0.98, 1.0], f);
      starsOpacity = (1.0 - f) * 0.25;
      waveScale = 0.78 - f * 0.10;
      windSpeedKnots = 15 - f * 3;
    } else if (sunAlt >= -0.14) {
      // Transition between Golden Hour and Moonlit Night
      const f = (-sunAlt) / 0.14;
      skyTopColor = this.lerpColor(goldSkyTop, 0x010811, f);
      skyHorizonColor = this.lerpColor(goldSkyHorizon, 0x041924, f);
      sunIntensity = Math.max(0.0, (1.0 - f) * 0.9);
      sunColor = this.lerpColor(goldSunColor, 0x223344, f);
      moonIntensity = f * 1.5;
      ambientColor = this.lerpColor(goldAmbientColor, 0x0d2825, f);
      ambientIntensity = 0.58 - f * 0.16;
      fogColor = this.lerpColor(goldFogColor, 0x041620, f);
      fogDensity = 0.001 + f * 0.0008;
      waterDeepColor = this.lerpVec3(goldWaterDeep, [0.003, 0.015, 0.025], f);
      waterShallowColor = this.lerpVec3(goldWaterShallow, [0.02, 0.16, 0.15], f);
      foamColor = this.lerpVec3(goldFoam, [0.35, 1.0, 0.82], f);
      starsOpacity = 0.25 + f * 0.75;
      bioluminescence = f > 0.6;
      waveScale = 0.78 - f * 0.18;
      windSpeedKnots = 15 - f * 7;
    } else {
      // Night (Moonlit & Bioluminescent)
      skyTopColor = 0x010811;
      skyHorizonColor = 0x041924;
      sunIntensity = 0.0;
      sunColor = 0x112233;
      moonIntensity = 1.7;
      ambientColor = 0x0d2825;
      ambientIntensity = 0.42;
      fogColor = 0x041620;
      fogDensity = 0.0018;
      waterDeepColor = [0.003, 0.015, 0.025];
      waterShallowColor = [0.02, 0.16, 0.15];
      foamColor = [0.35, 1.0, 0.82];
      starsOpacity = 1.0;
      bioluminescence = true;
      waveScale = 0.60;
      windSpeedKnots = 8;
    }

    // 5. Blend Dynamic Passing Squalls / Storm Fronts ("somedays dynamic weathers")
    let rain = false;
    let lightning = false;
    if (this.stormFactor > 0.01) {
      const sf = this.stormFactor;
      skyTopColor = this.lerpColor(skyTopColor, 0x05080c, sf * 0.95);
      skyHorizonColor = this.lerpColor(skyHorizonColor, 0x141d28, sf * 0.9);
      fogColor = this.lerpColor(fogColor, 0x0c141d, sf * 0.9);
      fogDensity = THREE.MathUtils.lerp(fogDensity, 0.0022, sf);
      sunIntensity *= (1.0 - sf * 0.85);
      moonIntensity *= (1.0 - sf * 0.85);
      ambientColor = this.lerpColor(ambientColor, 0x141f2b, sf * 0.8);
      ambientIntensity = THREE.MathUtils.lerp(ambientIntensity, 0.35, sf);
      waterDeepColor = this.lerpVec3(waterDeepColor, [0.008, 0.018, 0.035], sf * 0.9);
      waterShallowColor = this.lerpVec3(waterShallowColor, [0.03, 0.06, 0.09], sf * 0.9);
      foamColor = this.lerpVec3(foamColor, [0.75, 0.82, 0.90], sf);
      waveScale = THREE.MathUtils.lerp(waveScale, 2.2, sf);
      windSpeedKnots = THREE.MathUtils.lerp(windSpeedKnots, 48, sf);
      starsOpacity *= (1.0 - sf);
      rain = sf > 0.28;
      lightning = sf > 0.52;
      if (sf > 0.35) bioluminescence = false;
    }

    // 6. Apply live values to Three.js lighting & fog
    this.ambientLight.color.setHex(ambientColor);
    this.ambientLight.intensity = ambientIntensity;
    this.hemiLight.color.setHex(skyTopColor);

    this.sunLight.color.setHex(sunColor);
    this.sunLight.intensity = Math.max(0.01, sunIntensity);
    this.sunLight.position.set(...sunPos);

    this.scene.fog.color.setHex(fogColor);
    this.scene.fog.density = fogDensity;

    // 7. Update Sky Dome Shader Uniforms
    this.skyMat.uniforms.uBottomColor.value.setHex(skyHorizonColor);
    this.skyMat.uniforms.uTopColor.value.setHex(skyTopColor);
    this.skyMat.uniforms.uSunColor.value.setHex(sunColor);
    this.skyMat.uniforms.uSunDir.value.set(...sunPos).normalize();
    this.skyMat.uniforms.uMoonDir.value.set(...moonPos).normalize();
    this.skyMat.uniforms.uMoonIntensity.value = moonIntensity;
    this.skyMat.uniforms.uAurora.value = bioluminescence ? 1.0 : 0.0;

    // 8. Celestial objects visibility
    this.sunGroup.visible = (sunPos[1] > -35);
    this.moonGroup.visible = (moonPos[1] > -25);
    this.starMat.opacity = starsOpacity;

    // 9. Update live currentPreset properties for main.js, ocean, particles, audio, and UI
    this.currentPreset.id = (this.stormFactor > 0.4) ? 'storm' : (sunAlt > 0.22 ? 'sunny' : (sunAlt > -0.14 ? 'sunset' : 'aurora'));
    this.currentPreset.skyTopColor = skyTopColor;
    this.currentPreset.skyHorizonColor = skyHorizonColor;
    this.currentPreset.sunColor = sunColor;
    this.currentPreset.sunPosition = sunPos;
    this.currentPreset.sunIntensity = sunIntensity;
    this.currentPreset.moonPosition = moonPos;
    this.currentPreset.moonIntensity = moonIntensity;
    this.currentPreset.ambientColor = ambientColor;
    this.currentPreset.ambientIntensity = ambientIntensity;
    this.currentPreset.waterDeepColor = waterDeepColor;
    this.currentPreset.waterShallowColor = waterShallowColor;
    this.currentPreset.foamColor = foamColor;
    this.currentPreset.waveScale = waveScale;
    this.currentPreset.windSpeedKnots = windSpeedKnots;
    this.currentPreset.fogColor = fogColor;
    this.currentPreset.fogDensity = fogDensity;
    this.currentPreset.starsOpacity = starsOpacity;
    this.currentPreset.rain = rain;
    this.currentPreset.lightning = lightning;
    this.currentPreset.bioluminescence = bioluminescence;
    this.currentPreset.name = this.formatSimTime();

    // 10. Low-frequency IBL Environment Map update (throttled every 0.2 hours of sim time)
    if (this.lastEnvMapSimTime < 0 || Math.abs(this.simTime - this.lastEnvMapSimTime) > 0.25) {
      this.generateEnvironmentMap(this.currentPreset);
      this.lastEnvMapSimTime = this.simTime;
    }
  }

  applyPreset(preset) {
    this.currentPreset = { ...preset };

    // 1. Lighting
    this.ambientLight.color.setHex(preset.ambientColor);
    this.ambientLight.intensity = preset.ambientIntensity;
    this.hemiLight.color.setHex(preset.skyTopColor);

    this.sunLight.color.setHex(preset.sunColor);
    this.sunLight.intensity = preset.sunIntensity;
    this.sunLight.position.set(...preset.sunPosition);

    // 2. Fog
    this.scene.fog.color.setHex(preset.fogColor);
    this.scene.fog.density = preset.fogDensity;

    // 3. Sky Dome Shaders
    this.skyMat.uniforms.uBottomColor.value.setHex(preset.skyHorizonColor);
    this.skyMat.uniforms.uTopColor.value.setHex(preset.skyTopColor);
    this.skyMat.uniforms.uSunColor.value.setHex(preset.sunColor);
    this.skyMat.uniforms.uSunDir.value.set(...preset.sunPosition).normalize();
    this.skyMat.uniforms.uAurora.value = preset.bioluminescence ? 1.0 : 0.0;

    if (preset.moonPosition) {
      this.skyMat.uniforms.uMoonDir.value.set(...preset.moonPosition).normalize();
      this.skyMat.uniforms.uMoonIntensity.value = preset.moonIntensity || 0.0;
    }

    // 4. Sun Object
    const isSunVisible = preset.sunPosition && preset.sunPosition[1] > -35;
    this.sunGroup.visible = isSunVisible;

    // 5. Moon Object
    const moonDir = new THREE.Vector3(...preset.moonPosition).normalize();
    this.moonGroup.position.copy(moonDir.clone().multiplyScalar(2300));
    const isMoonVisible = preset.moonPosition[1] > -25;
    this.moonGroup.visible = isMoonVisible;

    // 6. Stars
    this.starMat.opacity = preset.starsOpacity || 0.0;

    // 7. Dynamic IBL Environment Map for physical ship reflections
    this.generateEnvironmentMap(preset);
  }

  setPresetById(id) {
    if (id === 'auto') {
      this.setAutoMode(true);
      return this.currentPreset;
    }
    this.setAutoMode(false);
    if (WEATHER_PRESETS[id]) {
      this.applyPreset(WEATHER_PRESETS[id]);
      return this.currentPreset;
    }
    return null;
  }

  update(time, shipPosition, dt = 0.016) {
    if (this.autoMode) {
      this.applyAutoDiurnal(dt);
    }

    this.skyMat.uniforms.uTime.value = time;

    if (shipPosition) {
      // Center celestial dome around ship so it appears infinitely far
      this.skyDome.position.copy(shipPosition);
      this.stars.position.copy(shipPosition);

      // Keep Sun & Moon relative to ship
      const sunDir = new THREE.Vector3(...this.currentPreset.sunPosition).normalize();
      this.sunGroup.position.copy(shipPosition).add(sunDir.multiplyScalar(2300));

      const moonDir = new THREE.Vector3(...this.currentPreset.moonPosition).normalize();
      this.moonGroup.position.copy(shipPosition).add(moonDir.multiplyScalar(2300));

      // Update sun shadow target to stay locked on ship
      this.sunLight.target.position.copy(shipPosition);
      this.sunLight.target.updateMatrixWorld();
    }

    // Subtle star twinkle
    if (this.starMat.opacity > 0.05) {
      this.starMat.size = 2.0 + Math.sin(time * 3.5) * 0.5;
    }
  }
}
