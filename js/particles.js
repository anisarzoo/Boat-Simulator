// Ocean wake, bow spray, storm rain, and lightning effects
import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    // Wake and bow spray particles
    this.wakeCount = 500;
    this.sprayCount = 350;
    this.rainCount = 2000;

    this.initWake();
    this.initSpray();
    this.initRain();
    this.initLightning();
  }

  initWake() {
    this.wakeGeo = new THREE.BufferGeometry();
    this.wakePositions = new Float32Array(this.wakeCount * 3);
    this.wakeOpacities = new Float32Array(this.wakeCount);
    this.wakeScales = new Float32Array(this.wakeCount);
    this.wakeLife = new Float32Array(this.wakeCount);
    this.wakeMaxLife = new Float32Array(this.wakeCount);

    for (let i = 0; i < this.wakeCount; i++) {
      this.wakeLife[i] = 0;
      this.wakeMaxLife[i] = 4.0;
      this.wakePositions[i * 3 + 1] = -100; // hidden initially
    }

    this.wakeGeo.setAttribute('position', new THREE.BufferAttribute(this.wakePositions, 3));

    // Custom circular soft particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(220,245,255,0.6)');
    grad.addColorStop(1, 'rgba(220,245,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    this.wakeMat = new THREE.PointsMaterial({
      color: 0xe6f4f8,
      size: 3.2,
      map: texture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.wakePoints = new THREE.Points(this.wakeGeo, this.wakeMat);
    this.scene.add(this.wakePoints);
    this.wakeIndex = 0;
  }

  initSpray() {
    this.sprayGeo = new THREE.BufferGeometry();
    this.sprayPositions = new Float32Array(this.sprayCount * 3);
    this.sprayVelocities = new Float32Array(this.sprayCount * 3);
    this.sprayLife = new Float32Array(this.sprayCount);

    for (let i = 0; i < this.sprayCount; i++) {
      this.sprayLife[i] = 0;
      this.sprayPositions[i * 3 + 1] = -100;
    }

    this.sprayGeo.setAttribute('position', new THREE.BufferAttribute(this.sprayPositions, 3));

    this.sprayMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    this.sprayPoints = new THREE.Points(this.sprayGeo, this.sprayMat);
    this.scene.add(this.sprayPoints);
    this.sprayIndex = 0;
  }

  initRain() {
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 120;
      rainPositions[i * 3 + 1] = Math.random() * 60;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    this.rainMat = new THREE.PointsMaterial({
      color: 0x90aabf,
      size: 0.75,
      transparent: true,
      opacity: 0.0, // enabled in storm preset
      depthWrite: false
    });

    this.rainPoints = new THREE.Points(rainGeo, this.rainMat);
    this.scene.add(this.rainPoints);
  }

  initLightning() {
    this.lightningLight = new THREE.DirectionalLight(0xb0d0ff, 0);
    this.lightningLight.position.set(-100, 200, -80);
    this.scene.add(this.lightningLight);

    this.lightningTimer = 0;
    this.nextFlash = 4.0 + Math.random() * 6.0;
  }

  setWeather(weather) {
    // Bioluminescent wake glow in aurora preset
    if (weather.bioluminescence) {
      this.wakeMat.color.setHex(0x38ffd0);
      this.wakeMat.opacity = 0.95;
    } else {
      this.wakeMat.color.setHex(0xe6f4f8);
      this.wakeMat.opacity = 0.65;
    }

    // Rain visibility
    this.rainMat.opacity = weather.rain ? 0.75 : 0.0;
  }

  emitWake(sternWorldPos, speedKnots) {
    if (Math.abs(speedKnots) < 1.0) return;

    // Spawn 2 wake particles per frame behind dual props
    for (let i = 0; i < 2; i++) {
      const idx = this.wakeIndex;
      const offsetLateral = (Math.random() - 0.5) * 3.5;
      
      this.wakePositions[idx * 3] = sternWorldPos.x + offsetLateral;
      this.wakePositions[idx * 3 + 1] = sternWorldPos.y + 0.15;
      this.wakePositions[idx * 3 + 2] = sternWorldPos.z + (Math.random() - 0.5) * 1.5;

      this.wakeLife[idx] = this.wakeMaxLife[idx];
      this.wakeIndex = (this.wakeIndex + 1) % this.wakeCount;
    }
  }

  emitBowSpray(bowWorldPos, shipForward, speedKnots) {
    if (speedKnots < 4.0) return;

    const count = Math.min(Math.floor(speedKnots * 0.4), 4);
    for (let i = 0; i < count; i++) {
      const idx = this.sprayIndex;
      const side = Math.random() > 0.5 ? 1 : -1;

      this.sprayPositions[idx * 3] = bowWorldPos.x + side * (0.8 + Math.random() * 0.6);
      this.sprayPositions[idx * 3 + 1] = bowWorldPos.y + 0.2;
      this.sprayPositions[idx * 3 + 2] = bowWorldPos.z + (Math.random() - 0.5) * 1.0;

      // Burst outward and slightly upward
      this.sprayVelocities[idx * 3] = side * (2.5 + Math.random() * 3.0);
      this.sprayVelocities[idx * 3 + 1] = 2.0 + Math.random() * 3.2;
      this.sprayVelocities[idx * 3 + 2] = shipForward.z * speedKnots * 0.25;

      this.sprayLife[idx] = 1.2;
      this.sprayIndex = (this.sprayIndex + 1) % this.sprayCount;
    }
  }

  update(dt, ship, physics, isStorm) {
    // 1. Emit from ship
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion);
    const sternPos = ship.position.clone().add(forward.clone().multiplyScalar(-8.2));
    const bowPos = ship.position.clone().add(forward.clone().multiplyScalar(9.0));

    this.emitWake(sternPos, physics.speedKnots);
    this.emitBowSpray(bowPos, forward, physics.speedKnots);

    // 2. Age wake particles
    for (let i = 0; i < this.wakeCount; i++) {
      if (this.wakeLife[i] > 0) {
        this.wakeLife[i] -= dt;
        if (this.wakeLife[i] <= 0) {
          this.wakePositions[i * 3 + 1] = -100;
        }
      }
    }
    this.wakeGeo.attributes.position.needsUpdate = true;

    // 3. Age & move spray particles
    for (let i = 0; i < this.sprayCount; i++) {
      if (this.sprayLife[i] > 0) {
        this.sprayLife[i] -= dt;
        this.sprayPositions[i * 3] += this.sprayVelocities[i * 3] * dt;
        this.sprayPositions[i * 3 + 1] += this.sprayVelocities[i * 3 + 1] * dt;
        this.sprayPositions[i * 3 + 2] += this.sprayVelocities[i * 3 + 2] * dt;

        // Gravity
        this.sprayVelocities[i * 3 + 1] -= 9.81 * dt;

        if (this.sprayLife[i] <= 0) {
          this.sprayPositions[i * 3 + 1] = -100;
        }
      }
    }
    this.sprayGeo.attributes.position.needsUpdate = true;

    // 4. Update rain box relative to ship
    if (this.rainMat.opacity > 0.05) {
      const pos = this.rainPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.rainCount; i++) {
        pos[i * 3 + 1] -= 55.0 * dt; // Fall speed
        pos[i * 3] -= 12.0 * dt;     // Wind slant
        if (pos[i * 3 + 1] < -5) {
          pos[i * 3 + 1] = 55;
          pos[i * 3] = (Math.random() - 0.5) * 120 + ship.position.x;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 120 + ship.position.z;
        }
      }
      this.rainPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Update lightning in storm
    if (isStorm) {
      this.lightningTimer += dt;
      if (this.lightningTimer > this.nextFlash) {
        this.lightningLight.intensity = 4.5;
        setTimeout(() => { this.lightningLight.intensity = 0; }, 80);
        setTimeout(() => { this.lightningLight.intensity = 3.2; }, 160);
        setTimeout(() => { this.lightningLight.intensity = 0; }, 260);

        this.lightningTimer = 0;
        this.nextFlash = 4.0 + Math.random() * 8.0;
      }
    } else {
      this.lightningLight.intensity = 0;
    }
  }
}
