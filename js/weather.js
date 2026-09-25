// Dynamic Atmospheric Weather, Sky Dome, 3D Sun, 3D Moon, and Starfield
import * as THREE from 'three';
import { WEATHER_PRESETS } from './constants.js';

export class WeatherManager {
  constructor(scene, initialPresetId = 'sunset') {
    this.scene = scene;
    this.currentPreset = WEATHER_PRESETS[initialPresetId] || WEATHER_PRESETS.sunset;

    this.initLighting();
    this.initSkyDome();
    this.initSun();
    this.initMoon();
    this.initStarfield();
    this.applyPreset(this.currentPreset);
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

  // 1. SKY DOME
  initSkyDome() {
    // Normal SphereGeometry with side: THREE.BackSide (no negative scale)
    const skyGeo = new THREE.SphereGeometry(1200, 48, 32);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(0x1d1536) },
        uBottomColor: { value: new THREE.Color(0xff6622) },
        uSunColor: { value: new THREE.Color(0xff8833) },
        uSunDir: { value: new THREE.Vector3(0.2, 0.2, 0.9).normalize() },
        uAurora: { value: 0.0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        uniform float uAurora;
        uniform float uTime;
        varying vec3 vWorldPos;

        void main() {
          vec3 dir = normalize(vWorldPos);

          // Height gradient from horizon (y=0) to zenith (y=1)
          float h = clamp(dir.y * 1.5, 0.0, 1.0);
          vec3 sky = mix(uBottomColor, uTopColor, pow(h, 0.7));

          // Sun atmospheric scatter flare
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float sunScatter = pow(sunDot, 16.0) * 0.75 + pow(sunDot, 64.0) * 1.2;
          sky += uSunColor * sunScatter;

          // Aurora Borealis curtains in upper atmosphere (Night preset)
          if (uAurora > 0.5 && dir.y > 0.15) {
            float wave1 = sin(dir.x * 6.0 + uTime * 0.8) * 0.5 + 0.5;
            float wave2 = cos(dir.z * 5.0 - uTime * 0.5) * 0.5 + 0.5;
            float curtain = pow(wave1 * wave2, 2.5) * smoothstep(0.15, 0.7, dir.y);
            vec3 auroraColor = mix(vec3(0.05, 0.95, 0.55), vec3(0.1, 0.5, 0.95), wave2);
            sky += auroraColor * curtain * 0.85;
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyDome);
  }

  // 2. 3D SUN (Visible Disc + Radiant Corona Halo)
  initSun() {
    this.sunGroup = new THREE.Group();

    // Core bright sun disc
    const sunGeo = new THREE.SphereGeometry(45, 32, 32);
    this.sunCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sunMesh = new THREE.Mesh(sunGeo, this.sunCoreMat);
    this.sunGroup.add(this.sunMesh);

    // Inner bright flare
    const flareTex = this.createGlowTexture(0xffeedd, 0.95);
    const flareMat = new THREE.SpriteMaterial({
      map: flareTex,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.sunFlare = new THREE.Sprite(flareMat);
    this.sunFlare.scale.set(240, 240, 1);
    this.sunGroup.add(this.sunFlare);

    // Outer atmospheric corona glow
    const coronaTex = this.createGlowTexture(0xff7733, 0.7);
    const coronaMat = new THREE.SpriteMaterial({
      map: coronaTex,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.sunCorona = new THREE.Sprite(coronaMat);
    this.sunCorona.scale.set(520, 520, 1);
    this.sunGroup.add(this.sunCorona);

    this.scene.add(this.sunGroup);
  }

  // 3. 3D MOON (Visible Crescent/Sphere + Silver Halo)
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

    const moonGeo = new THREE.SphereGeometry(32, 24, 24);
    this.moonMesh = new THREE.Mesh(moonGeo, new THREE.MeshBasicMaterial({ map: moonTex }));
    this.moonGroup.add(this.moonMesh);

    // Soft silver-cyan lunar halo
    const moonHaloTex = this.createGlowTexture(0x99ccff, 0.75);
    const moonHaloMat = new THREE.SpriteMaterial({
      map: moonHaloTex,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.moonHalo = new THREE.Sprite(moonHaloMat);
    this.moonHalo.scale.set(180, 180, 1);
    this.moonGroup.add(this.moonHalo);

    this.scene.add(this.moonGroup);
  }

  // 4. TWINKLING CELESTIAL STARFIELD
  initStarfield() {
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Upper hemisphere distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.48; // restrict to upper dome

      const radius = 1150;
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi) + 20; // above horizon
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });

    this.stars = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.stars);
  }

  applyPreset(preset) {
    this.currentPreset = preset;

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

    // 4. Sun Object
    const sunDir = new THREE.Vector3(...preset.sunPosition).normalize();
    this.sunGroup.position.copy(sunDir.clone().multiplyScalar(1050));
    this.sunCoreMat.color.setHex(preset.sunColor);
    this.sunFlare.material.color.setHex(preset.sunGlowColor || preset.sunColor);
    this.sunCorona.material.color.setHex(preset.sunGlowColor || preset.sunColor);

    const isSunVisible = preset.sunPosition[1] > 0;
    this.sunGroup.visible = isSunVisible;

    // 5. Moon Object
    const moonDir = new THREE.Vector3(...preset.moonPosition).normalize();
    this.moonGroup.position.copy(moonDir.clone().multiplyScalar(1050));
    const isMoonVisible = preset.moonPosition[1] > 0;
    this.moonGroup.visible = isMoonVisible;
    this.moonHalo.material.opacity = preset.moonIntensity > 0 ? 0.8 : 0.0;

    // 6. Stars
    this.starMat.opacity = preset.starsOpacity || 0.0;
  }

  setPresetById(id) {
    if (WEATHER_PRESETS[id]) {
      this.applyPreset(WEATHER_PRESETS[id]);
      return this.currentPreset;
    }
    return null;
  }

  update(time, shipPosition) {
    this.skyMat.uniforms.uTime.value = time;

    if (shipPosition) {
      // Center celestial dome around ship so it appears infinitely far
      this.skyDome.position.copy(shipPosition);
      this.stars.position.copy(shipPosition);

      // Keep Sun & Moon relative to ship
      const sunDir = new THREE.Vector3(...this.currentPreset.sunPosition).normalize();
      this.sunGroup.position.copy(shipPosition).add(sunDir.multiplyScalar(1050));

      const moonDir = new THREE.Vector3(...this.currentPreset.moonPosition).normalize();
      this.moonGroup.position.copy(shipPosition).add(moonDir.multiplyScalar(1050));

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
