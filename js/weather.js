// Dynamic Weather & Atmospheric Lighting Manager
import * as THREE from 'three';
import { WEATHER_PRESETS } from './constants.js';

export class WeatherManager {
  constructor(scene, initialPresetId = 'sunny') {
    this.scene = scene;
    this.currentPreset = WEATHER_PRESETS[initialPresetId] || WEATHER_PRESETS.sunny;

    this.initLighting();
    this.initSkyDome();
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
    this.sunLight.shadow.camera.far = 450;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 45;
    this.sunLight.shadow.camera.bottom = -45;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Hemispheric fill light
    this.hemiLight = new THREE.HemisphereLight(0x88bbdd, 0x112233, 0.6);
    this.scene.add(this.hemiLight);

    // Exponential fog
    this.scene.fog = new THREE.FogExp2(0x5fa8d3, 0.0018);
  }

  initSkyDome() {
    const skyGeo = new THREE.SphereGeometry(800, 32, 16);
    skyGeo.scale(-1, 1, 1);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(0x3282b8) },
        uBottomColor: { value: new THREE.Color(0xbbe1fa) },
        uSunColor: { value: new THREE.Color(0xfffaed) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
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
        varying vec3 vWorldPos;

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y * 1.4, 0.0, 1.0);
          vec3 sky = mix(uBottomColor, uTopColor, h);

          // Sun disc & glow
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float sunGlow = pow(sunDot, 12.0) * 0.45;
          float sunDisc = pow(sunDot, 512.0) * 1.8;

          vec3 finalSky = sky + (uSunColor * (sunGlow + sunDisc));
          gl_FragColor = vec4(finalSky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyDome);
  }

  applyPreset(preset) {
    this.currentPreset = preset;

    // 1. Ambient & Hemispheric light
    this.ambientLight.color.setHex(preset.ambientColor);
    this.ambientLight.intensity = preset.ambientIntensity;
    this.hemiLight.color.setHex(preset.skyColor);

    // 2. Sunlight
    this.sunLight.color.setHex(preset.sunColor);
    this.sunLight.intensity = preset.sunIntensity;
    this.sunLight.position.set(...preset.sunPosition);

    // 3. Fog
    this.scene.fog.color.setHex(preset.fogColor);
    this.scene.fog.density = preset.fogDensity;

    // 4. Sky dome uniforms
    this.skyMat.uniforms.uBottomColor.value.setHex(preset.fogColor);
    this.skyMat.uniforms.uTopColor.value.setHex(preset.skyColor);
    this.skyMat.uniforms.uSunColor.value.setHex(preset.sunColor);
    this.skyMat.uniforms.uSunDir.value.set(...preset.sunPosition).normalize();
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
      this.skyDome.position.copy(shipPosition);

      // Keep sun shadows centered around the ship
      this.sunLight.target.position.copy(shipPosition);
      this.sunLight.target.updateMatrixWorld();
    }
  }
}
