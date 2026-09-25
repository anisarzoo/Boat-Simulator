// Main application entrypoint, game loop, camera modes, and input orchestration
import * as THREE from 'three';
import { WEATHER_PRESETS } from './constants.js';
import { WeatherManager } from './weather.js';
import { Ocean } from './ocean.js';
import { Ship } from './ship.js';
import { ShipPhysics } from './physics.js';
import { ParticleSystem } from './particles.js';
import { OceanAudio } from './audio.js';
import { UIController } from './ui.js';

class App {
  constructor() {
    this.container = document.getElementById('canvasContainer');
    this.time = 0;
    this.clock = new THREE.Clock();

    // Input state
    this.keys = {};
    this.touchThrottle = 0;
    this.touchRudder = 0;

    // Camera modes
    this.camMode = 'chase'; // 'chase', 'bridge', 'orbit', 'bow'
    this.orbitAngles = { yaw: 0, pitch: 0.18, distance: 38 };
    this.isMouseDown = false;
    this.lastMouse = { x: 0, y: 0 };

    this.initThree();
    this.initSystems();
    this.initInputs();
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.5,
      3000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a2634, 1.0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.onResize());
  }

  initSystems() {
    // 1. Weather and lighting
    this.weather = new WeatherManager(this.scene, 'sunset');

    // 2. Dynamic Gerstner Ocean
    this.ocean = new Ocean(this.scene, this.weather.currentPreset);

    // 3. 3D Ship Model
    this.ship = new Ship(this.scene);

    // 4. Hydrodynamics & Buoyancy Physics
    this.physics = new ShipPhysics(this.ship.group);

    // 5. Particles (wake, spray, rain, lightning)
    this.particles = new ParticleSystem(this.scene);
    this.particles.setWeather(this.weather.currentPreset);

    // 6. Procedural Web Audio
    this.audio = new OceanAudio();

    // 7. Glassmorphic UI HUD
    this.ui = new UIController({
      onWeatherChange: (id) => {
        const preset = this.weather.setPresetById(id);
        if (preset) {
          this.ocean.setWeather(preset);
          this.particles.setWeather(preset);
        }
        return preset;
      },
      onCameraChange: (mode) => {
        this.camMode = mode;
      },
      onHorn: () => {
        this.audio.playFogHorn();
      },
      onToggleMute: () => {
        return this.audio.toggleMute();
      },
      onTouchInput: (thr, rud) => {
        this.touchThrottle = thr;
        this.touchRudder = rud;
      }
    });

    // Start with subtle initial ocean engine audio on first user click
    const startAudioOnce = () => {
      this.audio.init();
      window.removeEventListener('pointerdown', startAudioOnce);
      window.removeEventListener('keydown', startAudioOnce);
    };
    window.addEventListener('pointerdown', startAudioOnce);
    window.addEventListener('keydown', startAudioOnce);
  }

  initInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;

      // Quick key shortcuts
      if (e.key === 'h' || e.key === 'H') {
        this.audio.playFogHorn();
        this.ui.showToast('📯 Fog Horn Sounded');
      }
      if (e.key === '1') this.setCamera('chase');
      if (e.key === '2') this.setCamera('bridge');
      if (e.key === '3') this.setCamera('orbit');
      if (e.key === '4') this.setCamera('bow');
      if (e.key === 'm' || e.key === 'M') {
        const isMuted = this.audio.toggleMute();
        this.ui.showToast(isMuted ? 'Audio Muted' : 'Audio Enabled');
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse drag for camera orbit
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#hud, #touchControls')) return;
      this.isMouseDown = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse = { x: e.clientX, y: e.clientY };

      this.orbitAngles.yaw -= dx * 0.006;
      this.orbitAngles.pitch = THREE.MathUtils.clamp(
        this.orbitAngles.pitch + dy * 0.004,
        -0.2,
        0.85
      );
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('wheel', (e) => {
      this.orbitAngles.distance = THREE.MathUtils.clamp(
        this.orbitAngles.distance + e.deltaY * 0.04,
        15,
        90
      );
    });
  }

  setCamera(mode) {
    this.camMode = mode;
    const btn = document.querySelector(`.cam-btn[data-cam="${mode}"]`);
    if (btn) {
      document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  }

  handleControls() {
    let throttleInput = 0;
    let rudderInput = 0;

    if (this.keys['w'] || this.keys['arrowup']) throttleInput += 1.0;
    if (this.keys['s'] || this.keys['arrowdown']) throttleInput -= 0.6;
    if (this.keys['a'] || this.keys['arrowleft']) rudderInput -= 1.0;
    if (this.keys['d'] || this.keys['arrowright']) rudderInput += 1.0;

    // Merge touch inputs if active
    if (this.touchThrottle !== 0) throttleInput = this.touchThrottle;
    if (this.touchRudder !== 0) rudderInput = this.touchRudder;

    this.physics.setControls(throttleInput, rudderInput);
  }

  updateCamera(dt) {
    const shipPos = this.ship.group.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.ship.group.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.ship.group.quaternion);

    if (this.camMode === 'chase') {
      // Third-person trailing camera with mouse orbit offset
      const dist = this.orbitAngles.distance;
      const pitch = this.orbitAngles.pitch;
      const yaw = this.orbitAngles.yaw;

      const offset = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch) * dist,
        Math.sin(pitch) * dist + 7.5,
        -Math.cos(yaw) * Math.cos(pitch) * dist
      );

      // Orient behind the ship's forward heading
      const camTargetPos = shipPos.clone().sub(forward.clone().multiplyScalar(dist * 0.6)).add(offset);
      this.camera.position.lerp(camTargetPos, 5.0 * dt);
      
      const lookTarget = shipPos.clone().add(new THREE.Vector3(0, 2.5, 0));
      this.camera.lookAt(lookTarget);

    } else if (this.camMode === 'bridge') {
      // First-person view from inside the wheelhouse
      const bridgePos = shipPos.clone()
        .add(up.clone().multiplyScalar(3.8))
        .add(forward.clone().multiplyScalar(1.2));

      this.camera.position.copy(bridgePos);
      const bridgeLook = bridgePos.clone().add(forward.clone().multiplyScalar(60.0));
      this.camera.lookAt(bridgeLook);

    } else if (this.camMode === 'orbit') {
      // Free drone orbit around ship
      const dist = this.orbitAngles.distance * 1.4;
      const x = shipPos.x + Math.sin(this.orbitAngles.yaw) * Math.cos(this.orbitAngles.pitch) * dist;
      const y = shipPos.y + Math.max(2.0, Math.sin(this.orbitAngles.pitch) * dist + 8.0);
      const z = shipPos.z + Math.cos(this.orbitAngles.yaw) * Math.cos(this.orbitAngles.pitch) * dist;

      this.camera.position.set(x, y, z);
      this.camera.lookAt(shipPos.clone().add(new THREE.Vector3(0, 2, 0)));

    } else if (this.camMode === 'bow') {
      // Low angle waterline spray camera looking back at the ship slicing waves
      const bowPos = shipPos.clone()
        .add(forward.clone().multiplyScalar(12.0))
        .add(new THREE.Vector3(0, 1.2, 0));

      this.camera.position.copy(bowPos);
      this.camera.lookAt(shipPos.clone().add(new THREE.Vector3(0, 3.0, -2.0)));
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    let dt = this.clock.getDelta();
    dt = Math.min(dt, 0.05); // Clamp frame delta to prevent physics jumps
    this.time += dt;

    // 1. Process player inputs
    this.handleControls();

    // 2. Update hydrodynamics physics
    this.physics.update(dt, this.time, this.weather.currentPreset.waveScale);

    // 3. Update procedural ship model animations (props, rudder, radar, flag)
    this.ship.update(dt, this.physics.throttle, this.physics.rudder, this.physics.speedKnots, this.time);

    // 4. Update Ocean displacement and follow ship
    this.ocean.update(this.time, this.ship.group.position);

    // 5. Update Sky, Sunlight and Fog
    this.weather.update(this.time, this.ship.group.position);

    // 6. Update Wake, Bow Spray, Rain, Lightning
    const isStorm = this.weather.currentPreset.id === 'storm';
    this.particles.update(dt, this.ship.group, this.physics, isStorm);

    // 7. Update Procedural Audio
    this.audio.update(dt, this.physics.throttle, this.physics.speedKnots, this.weather.currentPreset.windSpeedKnots);

    // 8. Update Camera Position & Target
    this.updateCamera(dt);

    // 9. Update Glassmorphic Telemetry HUD
    this.ui.update(this.physics, this.weather.currentPreset);

    // 10. Render frame
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
