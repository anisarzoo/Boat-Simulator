// High-fidelity wake foam trails, dynamic bow crest sprays, atmospheric rain, and lightning
import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    // Wake and bow spray particles
    this.wakeCount = 750;
    this.sprayCount = 450;
    this.rainCount = 2500;

    this.initWake();
    this.initSpray();
    this.initRain();
    this.initLightning();
  }

  initWake() {
    this.wakeGeo = new THREE.BufferGeometry();
    this.wakePositions = new Float32Array(this.wakeCount * 3);
    this.wakeVelocities = new Float32Array(this.wakeCount * 3);
    this.wakeLife = new Float32Array(this.wakeCount);
    this.wakeMaxLife = new Float32Array(this.wakeCount);

    for (let i = 0; i < this.wakeCount; i++) {
      this.wakeLife[i] = 0;
      this.wakeMaxLife[i] = 5.0; // 5 seconds wake trail persistence
      this.wakePositions[i * 3 + 1] = -100;
    }

    this.wakeGeo.setAttribute('position', new THREE.BufferAttribute(this.wakePositions, 3));

    // Circular soft foam texture
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.45, 'rgba(225,248,255,0.6)');
    grad.addColorStop(1, 'rgba(225,248,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    this.wakeMat = new THREE.PointsMaterial({
      color: 0xf0faff,
      size: 3.8,
      map: texture,
      transparent: true,
      opacity: 0.72,
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
      size: 1.8,
      transparent: true,
      opacity: 0.85,
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
      rainPositions[i * 3] = (Math.random() - 0.5) * 140;
      rainPositions[i * 3 + 1] = Math.random() * 70;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    this.rainMat = new THREE.PointsMaterial({
      color: 0x9cb5c9,
      size: 0.85,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });

    this.rainPoints = new THREE.Points(rainGeo, this.rainMat);
    this.scene.add(this.rainPoints);
  }

  initLightning() {
    this.lightningLight = new THREE.DirectionalLight(0xb5d4ff, 0);
    this.lightningLight.position.set(-100, 250, -80);
    this.scene.add(this.lightningLight);

    this.lightningTimer = 0;
    this.nextFlash = 4.0 + Math.random() * 6.0;
  }

  setWeather(weather) {
    if (weather.bioluminescence) {
      this.wakeMat.color.setHex(0x32ffd5);
      this.wakeMat.opacity = 0.95;
    } else {
      this.wakeMat.color.setHex(0xf0faff);
      this.wakeMat.opacity = 0.72;
    }

    this.rainMat.opacity = weather.rain ? 0.8 : 0.0;
  }

  emitWake(sternWorldPos, speedKnots, shipRight) {
    if (Math.abs(speedKnots) < 0.8) return;

    // Twin propeller churning streams
    for (const offsetSign of [-1.15, 1.15]) {
      const idx = this.wakeIndex;
      const propPos = sternWorldPos.clone().add(shipRight.clone().multiplyScalar(offsetSign));

      this.wakePositions[idx * 3] = propPos.x + (Math.random() - 0.5) * 0.8;
      this.wakePositions[idx * 3 + 1] = propPos.y + 0.12;
      this.wakePositions[idx * 3 + 2] = propPos.z + (Math.random() - 0.5) * 0.8;

      // Slow lateral expansion of the wake
      this.wakeVelocities[idx * 3] = shipRight.x * offsetSign * 0.45;
      this.wakeVelocities[idx * 3 + 1] = 0;
      this.wakeVelocities[idx * 3 + 2] = shipRight.z * offsetSign * 0.45;

      this.wakeLife[idx] = this.wakeMaxLife[idx];
      this.wakeIndex = (this.wakeIndex + 1) % this.wakeCount;
    }
  }

  emitBowSpray(bowWorldPos, shipForward, shipRight, speedKnots) {
    if (speedKnots < 3.5) return;

    const count = Math.min(Math.floor(speedKnots * 0.5), 6);
    for (let i = 0; i < count; i++) {
      const idx = this.sprayIndex;
      const side = Math.random() > 0.5 ? 1 : -1;

      this.sprayPositions[idx * 3] = bowWorldPos.x + (shipRight.x * side * (0.9 + Math.random() * 0.8));
      this.sprayPositions[idx * 3 + 1] = bowWorldPos.y + 0.15;
      this.sprayPositions[idx * 3 + 2] = bowWorldPos.z + (shipRight.z * side * (0.9 + Math.random() * 0.8));

      // Burst outward and up
      this.sprayVelocities[idx * 3] = shipRight.x * side * (3.0 + Math.random() * 3.5);
      this.sprayVelocities[idx * 3 + 1] = 2.2 + Math.random() * 3.8;
      this.sprayVelocities[idx * 3 + 2] = shipRight.z * side * (3.0 + Math.random() * 3.5) + (shipForward.z * speedKnots * 0.2);

      this.sprayLife[idx] = 1.35;
      this.sprayIndex = (this.sprayIndex + 1) % this.sprayCount;
    }
  }

  update(dt, ship, physics, isStorm) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.quaternion);
    const sternPos = ship.position.clone().add(forward.clone().multiplyScalar(-8.6));
    const bowPos = ship.position.clone().add(forward.clone().multiplyScalar(9.2));

    this.emitWake(sternPos, physics.speedKnots, right);
    this.emitBowSpray(bowPos, forward, right, physics.speedKnots);

    // Age wake and expand
    for (let i = 0; i < this.wakeCount; i++) {
      if (this.wakeLife[i] > 0) {
        this.wakeLife[i] -= dt;
        this.wakePositions[i * 3] += this.wakeVelocities[i * 3] * dt;
        this.wakePositions[i * 3 + 2] += this.wakeVelocities[i * 3 + 2] * dt;

        if (this.wakeLife[i] <= 0) {
          this.wakePositions[i * 3 + 1] = -100;
        }
      }
    }
    this.wakeGeo.attributes.position.needsUpdate = true;

    // Age & simulate ballistic spray
    for (let i = 0; i < this.sprayCount; i++) {
      if (this.sprayLife[i] > 0) {
        this.sprayLife[i] -= dt;
        this.sprayPositions[i * 3] += this.sprayVelocities[i * 3] * dt;
        this.sprayPositions[i * 3 + 1] += this.sprayVelocities[i * 3 + 1] * dt;
        this.sprayPositions[i * 3 + 2] += this.sprayVelocities[i * 3 + 2] * dt;

        this.sprayVelocities[i * 3 + 1] -= 9.81 * dt; // Gravity

        if (this.sprayLife[i] <= 0) {
          this.sprayPositions[i * 3 + 1] = -100;
        }
      }
    }
    this.sprayGeo.attributes.position.needsUpdate = true;

    // Rain simulation in storm
    if (this.rainMat.opacity > 0.05) {
      const pos = this.rainPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.rainCount; i++) {
        pos[i * 3 + 1] -= 60.0 * dt;
        pos[i * 3] -= 15.0 * dt;
        if (pos[i * 3 + 1] < -5) {
          pos[i * 3 + 1] = 65;
          pos[i * 3] = (Math.random() - 0.5) * 140 + ship.position.x;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 140 + ship.position.z;
        }
      }
      this.rainPoints.geometry.attributes.position.needsUpdate = true;
    }

    // Lightning flash in storm
    if (isStorm) {
      this.lightningTimer += dt;
      if (this.lightningTimer > this.nextFlash) {
        this.lightningLight.intensity = 5.0;
        setTimeout(() => { this.lightningLight.intensity = 0; }, 70);
        setTimeout(() => { this.lightningLight.intensity = 3.5; }, 140);
        setTimeout(() => { this.lightningLight.intensity = 0; }, 240);

        this.lightningTimer = 0;
        this.nextFlash = 4.0 + Math.random() * 8.0;
      }
    } else {
      this.lightningLight.intensity = 0;
    }
  }
}
