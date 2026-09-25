// Animated flock of soaring marine seagulls
import * as THREE from 'three';

export class SeagullFlock {
  constructor(scene) {
    this.scene = scene;
    this.birds = [];
    this.count = 14;

    this.initFlock();
  }

  initFlock() {
    const matFeather = new THREE.MeshBasicMaterial({ color: 0xf5f8fa, side: THREE.DoubleSide });
    const matWingTips = new THREE.MeshBasicMaterial({ color: 0x242d38, side: THREE.DoubleSide });
    const matBeak = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < this.count; i++) {
      const bird = new THREE.Group();

      // Fuselage / body
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 6), matFeather);
      body.rotation.x = Math.PI / 2;
      bird.add(body);

      // Beak
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 4), matBeak);
      beak.rotation.x = -Math.PI / 2;
      beak.position.set(0, 0, 0.7);
      bird.add(beak);

      // Left wing
      const leftWingGroup = new THREE.Group();
      leftWingGroup.position.set(-0.15, 0.05, 0.1);
      const leftWingMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.45), matFeather);
      leftWingMesh.rotation.x = -Math.PI / 2;
      leftWingMesh.position.set(-0.7, 0, 0);
      leftWingGroup.add(leftWingMesh);

      // Left wingtip
      const leftTip = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.35), matWingTips);
      leftTip.rotation.x = -Math.PI / 2;
      leftTip.position.set(-1.25, 0.01, 0);
      leftWingGroup.add(leftTip);

      bird.add(leftWingGroup);

      // Right wing
      const rightWingGroup = new THREE.Group();
      rightWingGroup.position.set(0.15, 0.05, 0.1);
      const rightWingMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.45), matFeather);
      rightWingMesh.rotation.x = -Math.PI / 2;
      rightWingMesh.position.set(0.7, 0, 0);
      rightWingGroup.add(rightWingMesh);

      // Right wingtip
      const rightTip = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.35), matWingTips);
      rightTip.rotation.x = -Math.PI / 2;
      rightTip.position.set(1.25, 0.01, 0);
      rightWingGroup.add(rightTip);

      bird.add(rightWingGroup);

      // Random flight trajectory parameters
      this.birds.push({
        group: bird,
        leftWing: leftWingGroup,
        rightWing: rightWingGroup,
        angle: (i / this.count) * Math.PI * 2,
        radius: 28 + Math.random() * 32,
        altitude: 18 + Math.random() * 14,
        speed: 0.35 + Math.random() * 0.25,
        flapOffset: Math.random() * 10,
        flapRate: 6.0 + Math.random() * 2.5
      });

      this.scene.add(bird);
    }
  }

  update(dt, time, shipPosition) {
    if (!shipPosition) return;

    for (const b of this.birds) {
      b.angle += b.speed * dt;

      // Circular soaring trajectory following the ship
      const targetX = shipPosition.x + Math.sin(b.angle) * b.radius;
      const targetZ = shipPosition.z + Math.cos(b.angle) * b.radius;
      const waveHeave = Math.sin(time * 0.8 + b.angle) * 1.8;
      const targetY = shipPosition.y + b.altitude + waveHeave;

      b.group.position.set(targetX, targetY, targetZ);

      // Face direction of flight
      const forwardAngle = b.angle + Math.PI / 2;
      b.group.rotation.y = forwardAngle;
      // Banking into circle turn
      b.group.rotation.z = -0.32;
      b.group.rotation.x = Math.sin(time * 1.5 + b.flapOffset) * 0.08;

      // Wing flapping with intermittent soaring glides
      const glideCycle = Math.sin(time * 0.6 + b.flapOffset);
      const isGliding = glideCycle > 0.3;

      if (!isGliding) {
        const flap = Math.sin(time * b.flapRate + b.flapOffset) * 0.45;
        b.leftWing.rotation.z = flap;
        b.rightWing.rotation.z = -flap;
      } else {
        // Wings held flat in glide
        b.leftWing.rotation.z = 0.05;
        b.rightWing.rotation.z = -0.05;
      }
    }
  }
}
