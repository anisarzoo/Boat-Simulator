// Realistic Navigation Channel Buoys that bob, pitch, and roll on Gerstner waves
import * as THREE from 'three';
import { sampleOcean } from './gerstner.js';

export class BuoyManager {
  constructor(scene) {
    this.scene = scene;
    this.buoys = [];

    this.initBuoys();
  }

  initBuoys() {
    // Port (Green) and Starboard (Red) channel marker positions
    const buoyConfigs = [
      { x: 45, z: 120, type: 'green' },
      { x: -45, z: 140, type: 'red' },
      { x: 65, z: 320, type: 'green' },
      { x: -65, z: 340, type: 'red' },
      { x: 85, z: 580, type: 'green' },
      { x: -85, z: 600, type: 'red' },
      { x: 120, z: 880, type: 'green' },
      { x: -110, z: 900, type: 'red' }
    ];

    const matRed = new THREE.MeshStandardMaterial({ color: 0xee2222, roughness: 0.35, metalness: 0.3 });
    const matGreen = new THREE.MeshStandardMaterial({ color: 0x00cc44, roughness: 0.35, metalness: 0.3 });
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x333c48, roughness: 0.5, metalness: 0.7 });
    const matRust = new THREE.MeshStandardMaterial({ color: 0x221812, roughness: 0.8 });

    const beaconRedMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const beaconGreenMat = new THREE.MeshBasicMaterial({ color: 0x33ff66 });

    for (const cfg of buoyConfigs) {
      const group = new THREE.Group();
      const isGreen = cfg.type === 'green';
      const bodyMat = isGreen ? matGreen : matRed;
      const beaconMat = isGreen ? beaconGreenMat : beaconRedMat;

      // 1. Torus float collar / hull
      const collar = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.55, 10, 20), bodyMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.2;
      collar.castShadow = true;
      group.add(collar);

      // Underwater ballast skirt
      const ballast = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.8, 1.8, 12), matRust);
      ballast.position.y = -0.9;
      group.add(ballast);

      // 2. Daymark tower superstructure
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, 2.8, 4), bodyMat);
      tower.position.y = 1.6;
      tower.castShadow = true;
      group.add(tower);

      // Cage stanchions
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.0, 6, 1, true), matMetal);
      cage.position.y = 3.2;
      group.add(cage);

      // 3. Strobe Beacon lantern on top
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), beaconMat);
      beacon.position.y = 3.6;
      group.add(beacon);

      // Point light for nighttime illumination
      const beaconLight = new THREE.PointLight(isGreen ? 0x00ff44 : 0xff2222, 1.5, 45);
      beaconLight.position.y = 3.8;
      group.add(beaconLight);

      this.buoys.push({
        group,
        baseX: cfg.x,
        baseZ: cfg.z,
        beaconMat,
        beaconLight,
        isGreen,
        flashTimer: Math.random() * 2.0
      });

      this.scene.add(group);
    }
  }

  update(dt, time, waveScale, shipPosition) {
    for (const b of this.buoys) {
      // Loop buoys infinitely along with the ship so there are always markers ahead
      let dz = b.baseZ - shipPosition.z;
      while (dz < -400) { b.baseZ += 900; dz = b.baseZ - shipPosition.z; }
      while (dz > 500) { b.baseZ -= 900; dz = b.baseZ - shipPosition.z; }

      // Query ocean height and surface normal for natural buoy pitching
      const sample = sampleOcean(b.baseX, b.baseZ, time, waveScale);
      b.group.position.set(b.baseX, sample.height + 0.1, b.baseZ);

      // Tilt buoy with wave normal
      const targetUp = new THREE.Vector3(sample.normal.x, sample.normal.y, sample.normal.z);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetUp);
      b.group.quaternion.slerp(quat, 6.0 * dt);

      // Strobe beacon flash (Morse rhythmic maritime blink)
      b.flashTimer += dt;
      const flashCycle = b.flashTimer % 2.5;
      const isFlashing = flashCycle < 0.25 || (flashCycle > 0.45 && flashCycle < 0.7);

      b.beaconLight.intensity = isFlashing ? 3.5 : 0.05;
      b.beaconMat.color.setHex(isFlashing ? (b.isGreen ? 0x33ff77 : 0xff4444) : 0x112211);
    }
  }
}
