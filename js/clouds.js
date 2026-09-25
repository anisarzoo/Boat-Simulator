// Procedural layered 3D clouds that drift across the sky and react to atmospheric lighting
import * as THREE from 'three';

export class CloudManager {
  constructor(scene, initialWeather) {
    this.scene = scene;
    this.weather = initialWeather;
    this.cloudGroup = new THREE.Group();
    this.clouds = [];
    this.count = 28;

    this.initClouds();
    this.scene.add(this.cloudGroup);
  }

  initClouds() {
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    });

    const puffGeo = new THREE.SphereGeometry(1, 8, 8);

    for (let i = 0; i < this.count; i++) {
      const cluster = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 4);

      // Generate cloud puff cluster
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(puffGeo, this.cloudMat);
        const scaleX = 25 + Math.random() * 35;
        const scaleY = 12 + Math.random() * 16;
        const scaleZ = 20 + Math.random() * 30;
        puff.scale.set(scaleX, scaleY, scaleZ);

        puff.position.set(
          (p - puffCount / 2) * 18 + (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 20
        );
        cluster.add(puff);
      }

      // Distribute in a wide ring above the ocean
      const angle = (i / this.count) * Math.PI * 2 + Math.random() * 0.2;
      const radius = 350 + Math.random() * 450;
      const altitude = 160 + Math.random() * 80;

      cluster.position.set(
        Math.sin(angle) * radius,
        altitude,
        Math.cos(angle) * radius
      );

      this.clouds.push({
        group: cluster,
        baseAngle: angle,
        radius,
        altitude,
        driftSpeed: 0.008 + Math.random() * 0.012
      });

      this.cloudGroup.add(cluster);
    }

    this.setWeather(this.weather);
  }

  setWeather(weather) {
    this.weather = weather;
    if (!this.cloudMat) return;

    if (weather.id === 'sunny') {
      this.cloudMat.color.setHex(0xffffff);
      this.cloudMat.opacity = 0.78;
    } else if (weather.id === 'sunset') {
      this.cloudMat.color.setHex(0xffaa77); // Golden amber rim lighting
      this.cloudMat.opacity = 0.88;
    } else if (weather.id === 'storm') {
      this.cloudMat.color.setHex(0x1a222c); // Dark heavy brooding thunderheads
      this.cloudMat.opacity = 0.95;
    } else if (weather.id === 'aurora') {
      this.cloudMat.color.setHex(0x0a1c26); // Ethereal moon-lit night clouds
      this.cloudMat.opacity = 0.45;
    }
  }

  update(dt, time, shipPosition) {
    if (shipPosition) {
      this.cloudGroup.position.x = shipPosition.x;
      this.cloudGroup.position.z = shipPosition.z;
    }

    // Slowly drift clouds across the sky
    for (const c of this.clouds) {
      c.baseAngle += c.driftSpeed * dt;
      c.group.position.x = Math.sin(c.baseAngle) * c.radius;
      c.group.position.z = Math.cos(c.baseAngle) * c.radius;
    }
  }
}
