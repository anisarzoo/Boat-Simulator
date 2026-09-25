// Cloud controller (Atmospheric clouds are rendered in the high-fidelity Sky Dome shader)
import * as THREE from 'three';

export class CloudManager {
  constructor(scene, initialWeather) {
    this.scene = scene;
    this.weather = initialWeather;
    this.cloudGroup = new THREE.Group();
    this.scene.add(this.cloudGroup);
  }

  setWeather(weather) {
    this.weather = weather;
  }

  update(dt, time, shipPosition) {
    if (shipPosition) {
      this.cloudGroup.position.x = shipPosition.x;
      this.cloudGroup.position.z = shipPosition.z;
    }
  }
}
