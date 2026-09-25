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
import { BuoyManager } from './buoys.js';
import { SeagullFlock } from './seagulls.js';
import { CloudManager } from './clouds.js';
import { MarineWildlife } from './wildlife.js';
import { MarineTraffic } from './traffic.js';
import { Archipelago } from './islands.js';

class App {
  constructor() {
    this.container = document.getElementById('canvasContainer');
    this.time = 0;
    this.clock = new THREE.Clock();

    // Input & cruise state
    this.keys = {};
    this.touchThrottle = 0;
    this.touchRudder = 0;
    this.autopilot = false;

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
      0.3,
      4000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a2634, 1.0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.onResize());
  }

  initSystems() {
    // 1. Weather and lighting
    this.weather = new WeatherManager(this.scene, this.renderer, 'sunset');

    // 2. Dynamic Gerstner Ocean
    this.ocean = new Ocean(this.scene, this.weather.currentPreset);

    // 3. 3D Ship Model
    this.ship = new Ship(this.scene);

    // 4. Hydrodynamics & Buoyancy Physics
    this.physics = new ShipPhysics(this.ship.group);

    // 5. Particles (wake, spray, rain, lightning)
    this.particles = new ParticleSystem(this.scene);
    this.particles.setWeather(this.weather.currentPreset);

    // 6. Navigation Channel Buoys (port & starboard markers on waves)
    this.buoys = new BuoyManager(this.scene);

    // 7. Soaring Seagulls Flock
    this.seagulls = new SeagullFlock(this.scene);

    // 8. Procedural Drifting Clouds
    this.clouds = new CloudManager(this.scene, this.weather.currentPreset);

    // 9. Procedural Web Audio
    this.audio = new OceanAudio();

    // 10. Archipelago Islands & Coastal Lighthouse
    this.islands = new Archipelago(this.scene);

    // 11. Marine Wildlife (Bow-riding Dolphins & Breaching Whales)
    this.wildlife = new MarineWildlife(this.scene);

    // 12. AI Marine Traffic (Container Ship, Fishing Trawler, Sailing Yacht)
    this.traffic = new MarineTraffic(this.scene);

    // 13. Glassmorphic UI HUD
    this.ui = new UIController({
      onWeatherChange: (id) => {
        const preset = this.weather.setPresetById(id);
        if (preset) {
          this.ocean.setWeather(preset);
          this.particles.setWeather(preset);
          this.clouds.setWeather(preset);
        }
        return preset;
      },
      onCameraChange: (mode) => {
        this.camMode = mode;
      },
      onToggleLights: () => {
        const on = this.ship.toggleLights();
        this.ui.showToast(on ? 'Searchlights On' : 'Searchlights Off');
        return on;
      },
      onToggleAutopilot: () => {
        this.autopilot = !this.autopilot;
        this.physics.setAutopilot(this.autopilot);
        const wp = this.physics.waypoints[this.physics.activeWaypointIndex];
        this.ui.showToast(this.autopilot ? `Autopilot: Route to ${wp.name}` : 'Manual Helm Engaged');
        return this.autopilot;
      },
      onHorn: () => {
        this.audio.playFogHorn();
        const responder = this.traffic.respondToPlayerHorn(this.ship.group.position, this.audio);
        if (responder) {
          this.ui.showToast(`Horn: ${responder} answering...`);
        }
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
        const responder = this.traffic.respondToPlayerHorn(this.ship.group.position, this.audio);
        this.ui.showToast(responder ? `Horn Echo: ${responder} answering...` : 'Fog Horn Sounded');
      }
      if (e.key === 'l' || e.key === 'L') {
        const on = this.ship.toggleLights();
        this.ui.showToast(on ? 'Searchlights On' : 'Searchlights Off');
        const btn = document.getElementById('lightsBtn');
        if (btn) btn.classList.toggle('active', on);
      }
      if (e.key === 'c' || e.key === 'C') {
        this.autopilot = !this.autopilot;
        this.physics.setAutopilot(this.autopilot);
        const wp = this.physics.waypoints[this.physics.activeWaypointIndex];
        this.ui.showToast(this.autopilot ? `Autopilot: Route to ${wp.name}` : 'Manual Helm Engaged');
        const btn = document.getElementById('cruiseBtn');
        if (btn) btn.classList.toggle('active', this.autopilot);
      }
      if (e.key === 'u' || e.key === 'U') {
        const hudToggleBtn = document.getElementById('hudToggleBtn');
        if (hudToggleBtn) hudToggleBtn.click();
      }
      if (e.key === '1') this.setCamera('chase');
      if (e.key === '2') this.setCamera('bridge');
      if (e.key === '3') this.setCamera('orbit');
      if (e.key === '4') this.setCamera('bow');
      if (e.key === '5') this.setCamera('underwater');
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
      if (e.key === 'm' || e.key === 'M') {
        const isMuted = this.audio.toggleMute();
        this.ui.setAudioIcon(isMuted);
        this.ui.showToast(isMuted ? 'Audio Muted' : 'Audio Enabled');
      }
      if (e.key === 'k' || e.key === 'K' || e.key === '?') {
        this.ui.toggleControlsModal();
      }
      if (e.key === 'Escape') {
        this.ui.toggleControlsModal(false);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse drag for camera orbit
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#hud, #touchControls, #controlsModal')) return;
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
        -0.55,
        1.15
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

    // Autopilot cruise mode holds full throttle
    if (this.autopilot) {
      throttleInput = 1.0;
    }

    // Merge touch inputs if active
    if (this.touchThrottle !== 0) throttleInput = this.touchThrottle;
    if (this.touchRudder !== 0) rudderInput = this.touchRudder;

    this.physics.setControls(throttleInput, rudderInput);

    // Bow Thruster (Q: Port / E: Starboard)
    let thrusterInput = 0;
    if (this.keys['q']) thrusterInput -= 1.0;
    if (this.keys['e']) thrusterInput += 1.0;
    this.physics.setBowThruster(thrusterInput);
    this.audio.setBowThruster(Math.abs(thrusterInput) > 0.05);
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

      // Orient behind the ship's forward heading with subtle sea breathing
      const seaBreathing = Math.sin(this.time * 0.9) * 0.35;
      const camTargetPos = shipPos.clone().sub(forward.clone().multiplyScalar(dist * 0.6)).add(offset);
      camTargetPos.y += seaBreathing;
      this.camera.position.lerp(camTargetPos, 5.0 * dt);
      
      const lookTarget = shipPos.clone().add(new THREE.Vector3(0, 2.5, 0));
      this.camera.lookAt(lookTarget);

    } else if (this.camMode === 'bridge') {
      // First-person view from inside the wheelhouse overlooking glowing helm console
      const bridgePos = shipPos.clone()
        .add(up.clone().multiplyScalar(3.56))
        .add(forward.clone().multiplyScalar(1.15));

      this.camera.position.copy(bridgePos);
      const bridgeLook = bridgePos.clone()
        .add(forward.clone().multiplyScalar(45.0))
        .add(up.clone().multiplyScalar(-2.2));
      this.camera.lookAt(bridgeLook);

    } else if (this.camMode === 'orbit') {
      // Free drone orbit around ship (allows seamless above & below water exploration)
      const dist = this.orbitAngles.distance * 1.4;
      const x = shipPos.x + Math.sin(this.orbitAngles.yaw) * Math.cos(this.orbitAngles.pitch) * dist;
      const y = shipPos.y + Math.sin(this.orbitAngles.pitch) * dist + 2.5;
      const z = shipPos.z + Math.cos(this.orbitAngles.yaw) * Math.cos(this.orbitAngles.pitch) * dist;

      this.camera.position.set(x, y, z);
      this.camera.lookAt(shipPos.clone().add(new THREE.Vector3(0, 1.5, 0)));

    } else if (this.camMode === 'bow') {
      // Low angle waterline spray camera looking back at the ship slicing waves
      const bowPos = shipPos.clone()
        .add(forward.clone().multiplyScalar(12.0))
        .add(new THREE.Vector3(0, 1.2, 0));

      this.camera.position.copy(bowPos);
      this.camera.lookAt(shipPos.clone().add(new THREE.Vector3(0, 3.0, -2.0)));

    } else if (this.camMode === 'underwater') {
      // Sub-surface keel perspective looking up at the hull, props, waves & Snell's window
      const underPos = shipPos.clone()
        .sub(forward.clone().multiplyScalar(9.0))
        .add(new THREE.Vector3(0, -4.5, 0));

      this.camera.position.copy(underPos);
      this.camera.lookAt(shipPos.clone().add(new THREE.Vector3(0, -0.6, 3.5)));
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    let dt = this.clock.getDelta();
    dt = Math.min(dt, 0.05); // Clamp frame delta to prevent physics jumps
    this.time += dt;

    // Dynamic underwater atmosphere transition
    if (this.scene.fog) {
      const isUnderwater = this.camera.position.y < -0.2;
      if (isUnderwater) {
        const deepCol = this.weather.currentPreset.waterDeepColor;
        this.scene.fog.color.setRGB(deepCol[0] * 1.5, deepCol[1] * 2.0, deepCol[2] * 2.5);
        this.scene.fog.density = 0.016;
      } else {
        this.scene.fog.color.set(this.weather.currentPreset.fogColor);
        this.scene.fog.density = this.weather.currentPreset.fogDensity;
      }
    }

    // 1. Process player inputs
    this.handleControls();

    // 2. Update hydrodynamics physics & live depth sounding
    this.physics.update(dt, this.time, this.weather.currentPreset.waveScale, this.islands);

    // Shallow water sonar warning alarm
    if (this.physics.shallowAlarm && (this.time - (this.lastShallowPing || 0) > 1.8)) {
      this.audio.playShallowPing();
      this.lastShallowPing = this.time;
    }

    // Dynamic wave impact sounds when bow slices heavy wave swells
    const vertVelocity = this.physics.linearVelocity.y;
    if (this.lastVertVelocity !== undefined) {
      const slap = vertVelocity - this.lastVertVelocity;
      if (slap > 2.2 && (this.time - (this.lastSlapTime || 0) > 1.2)) {
        this.audio.playWaveImpact(slap / 2.5);
        this.lastSlapTime = this.time;
      }
    }
    this.lastVertVelocity = vertVelocity;

    // 3. Update procedural ship model animations (props, rudder, radar, flag)
    this.ship.update(dt, this.physics.throttle, this.physics.rudder, this.physics.speedKnots, this.time);

    // 4. Update Ocean displacement and follow ship
    this.ocean.update(this.time, this.ship.group.position);

    // 5. Update Sky, Sunlight and Fog
    this.weather.update(this.time, this.ship.group.position);

    // 6. Update Wake, Bow Spray, Rain, Lightning
    const isStorm = this.weather.currentPreset.id === 'storm';
    this.particles.update(dt, this.ship.group, this.physics, isStorm, this.camera);

    // 7. Update Wildlife, AI Traffic, Islands, Buoys, Seagulls, and Clouds
    this.wildlife.update(dt, this.time, this.ship.group.position, this.ship.group.quaternion, this.physics.speedKnots);
    this.traffic.update(dt, this.time, this.ship.group.position);
    this.islands.update(dt, this.weather ? this.weather.currentPreset : null);
    this.buoys.update(dt, this.time, this.weather.currentPreset.waveScale, this.ship.group.position);
    this.seagulls.update(dt, this.time, this.ship.group.position, this.ship.group.quaternion, this.physics.speedKnots);
    this.clouds.update(dt, this.time, this.ship.group.position);

    // 8. Update Procedural Audio
    this.audio.update(dt, this.physics.throttle, this.physics.speedKnots, this.weather.currentPreset.windSpeedKnots);

    // 9. Update Camera Position & Target
    this.updateCamera(dt);

    // 10. Update Glassmorphic Telemetry HUD
    this.ui.update(this.physics, this.weather.currentPreset);

    // 11. Render frame
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
