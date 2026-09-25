// High-detail procedural 3D Exploration Mega-Yacht model
import * as THREE from 'three';

export class Ship {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Ship';

    // Interactive animated parts
    this.propellers = [];
    this.rudders = [];
    this.radarAntennas = [];
    this.flag = null;
    this.interiorLights = [];

    this.buildShip();
    this.scene.add(this.group);
  }

  buildShip() {
    // 1. Premium Materials
    const matHullDark = new THREE.MeshStandardMaterial({
      color: 0x0c1520, // Midnight blue / anthracite marine hull
      roughness: 0.22,
      metalness: 0.35
    });

    const matHullWhite = new THREE.MeshStandardMaterial({
      color: 0xf4f7fa, // Lustrous off-white gelcoat
      roughness: 0.18,
      metalness: 0.2
    });

    const matStripe = new THREE.MeshStandardMaterial({
      color: 0xcc291f, // Classic yacht red boot-topping stripe
      roughness: 0.3
    });

    const matDeckTeak = new THREE.MeshStandardMaterial({
      color: 0xa2784b, // Warm golden teak wood planking
      roughness: 0.72,
      metalness: 0.05
    });

    const matGlass = new THREE.MeshStandardMaterial({
      color: 0x071524,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.85
    });

    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xe8eef5,
      metalness: 0.95,
      roughness: 0.12
    });

    const matBrass = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.25
    });

    const matConsoleGlow = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });

    const hullGroup = new THREE.Group();

    // 2. MODERN HYDRODYNAMIC HULL
    // Lower hull keel section
    const keelGeo = new THREE.BoxGeometry(3.6, 0.9, 16.5);
    const keel = new THREE.Mesh(keelGeo, matHullDark);
    keel.position.set(0, -0.65, -0.4);
    keel.castShadow = true;
    keel.receiveShadow = true;
    hullGroup.add(keel);

    // Knife Bow entry
    const bowEntryGeo = new THREE.ConeGeometry(2.0, 5.8, 8);
    bowEntryGeo.rotateX(-Math.PI / 2);
    bowEntryGeo.scale(1.0, 0.45, 1.0);
    const bowEntry = new THREE.Mesh(bowEntryGeo, matHullDark);
    bowEntry.position.set(0, -0.65, 8.8);
    bowEntry.castShadow = true;
    hullGroup.add(bowEntry);

    // Red Waterline accent band
    const waterlineGeo = new THREE.BoxGeometry(4.75, 0.18, 17.6);
    const waterline = new THREE.Mesh(waterlineGeo, matStripe);
    waterline.position.set(0, -0.15, -0.2);
    hullGroup.add(waterline);

    // Main Upper Hull / Flared Topsides
    const upperHullGeo = new THREE.BoxGeometry(4.85, 1.25, 17.5);
    const upperHull = new THREE.Mesh(upperHullGeo, matHullWhite);
    upperHull.position.set(0, 0.55, -0.2);
    upperHull.castShadow = true;
    hullGroup.add(upperHull);

    // Flared bow overhang
    const bowFlaredGeo = new THREE.ConeGeometry(2.45, 5.2, 8);
    bowFlaredGeo.rotateX(-Math.PI / 2);
    bowFlaredGeo.scale(1.0, 0.55, 1.0);
    const bowFlared = new THREE.Mesh(bowFlaredGeo, matHullWhite);
    bowFlared.position.set(0, 0.65, 9.2);
    bowFlared.castShadow = true;
    hullGroup.add(bowFlared);

    // Transom & Aft Swim Platform
    const swimPlatformGeo = new THREE.BoxGeometry(4.4, 0.22, 1.8);
    const swimPlatform = new THREE.Mesh(swimPlatformGeo, matDeckTeak);
    swimPlatform.position.set(0, 0.05, -9.4);
    hullGroup.add(swimPlatform);

    // 3. TEAK DECK & BULWARKS
    const mainDeckGeo = new THREE.BoxGeometry(4.65, 0.12, 17.0);
    const mainDeck = new THREE.Mesh(mainDeckGeo, matDeckTeak);
    mainDeck.position.set(0, 1.2, -0.2);
    mainDeck.receiveShadow = true;
    hullGroup.add(mainDeck);

    // Bow teak foredeck
    const foredeckGeo = new THREE.ConeGeometry(2.35, 4.8, 8);
    foredeckGeo.rotateX(-Math.PI / 2);
    foredeckGeo.scale(1.0, 0.06, 1.0);
    const foredeck = new THREE.Mesh(foredeckGeo, matDeckTeak);
    foredeck.position.set(0, 1.2, 9.0);
    hullGroup.add(foredeck);

    // 4. SUPERSTRUCTURE (Tier 1 Saloon)
    const saloonGeo = new THREE.BoxGeometry(3.7, 1.6, 9.6);
    const saloon = new THREE.Mesh(saloonGeo, matHullWhite);
    saloon.position.set(0, 2.05, -1.2);
    saloon.castShadow = true;
    hullGroup.add(saloon);

    // Saloon dark panoramic flush glazing
    const saloonGlassGeo = new THREE.BoxGeometry(3.78, 0.8, 8.4);
    const saloonGlass = new THREE.Mesh(saloonGlassGeo, matGlass);
    saloonGlass.position.set(0, 2.15, -1.2);
    hullGroup.add(saloonGlass);

    // 5. WHEELHOUSE / FLYBRIDGE (Tier 2)
    const bridgeGeo = new THREE.BoxGeometry(3.2, 1.35, 4.6);
    const bridge = new THREE.Mesh(bridgeGeo, matHullWhite);
    bridge.position.set(0, 3.45, 0.5);
    bridge.castShadow = true;
    hullGroup.add(bridge);

    // Forward Raked Bridge Windshield (Aero angle)
    const bridgeGlassGeo = new THREE.BoxGeometry(3.28, 0.75, 3.6);
    const bridgeGlass = new THREE.Mesh(bridgeGlassGeo, matGlass);
    bridgeGlass.position.set(0, 3.55, 0.6);
    hullGroup.add(bridgeGlass);

    // Glowing interior navigation screens inside the bridge
    const mfdConsole = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.1), matConsoleGlow);
    mfdConsole.position.set(0, 3.4, 1.8);
    hullGroup.add(mfdConsole);

    // 6. RADAR ARCH & COMMS TOWER
    const radarArchGeo = new THREE.BoxGeometry(2.7, 1.2, 0.55);
    const radarArch = new THREE.Mesh(radarArchGeo, matHullWhite);
    radarArch.position.set(0, 4.65, -1.1);
    radarArch.castShadow = true;
    hullGroup.add(radarArch);

    // Main rotating radar scanner bar
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.25), matChrome);
    radarBar.position.set(0, 5.4, -1.1);
    hullGroup.add(radarBar);
    this.radarAntennas.push(radarBar);

    // Satellite communications domes (Dual KVH domes)
    const satDomeGeo = new THREE.SphereGeometry(0.42, 16, 16);
    for (const sx of [-0.95, 0.95]) {
      const satDome = new THREE.Mesh(satDomeGeo, matHullWhite);
      satDome.position.set(sx, 5.2, -1.1);
      hullGroup.add(satDome);
    }

    // Communication mast & aerials
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 2.8, 8), matChrome);
    mast.position.set(0, 5.5, 0.2);
    hullGroup.add(mast);

    // Dual Searchlights on brow
    for (const sx of [-0.65, 0.65]) {
      const searchLight = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 12), matChrome);
      searchLight.rotation.x = Math.PI / 2;
      searchLight.position.set(sx, 4.25, 2.7);
      hullGroup.add(searchLight);
    }

    // 7. NAVIGATION LIGHTS
    const navRed = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.0 }));
    navRed.position.set(-1.68, 3.8, 0.5);
    hullGroup.add(navRed);

    const navGreen = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff22, emissiveIntensity: 3.0 }));
    navGreen.position.set(1.68, 3.8, 0.5);
    hullGroup.add(navGreen);

    const navWhite = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.8 }));
    navWhite.position.set(0, 6.8, 0.2);
    hullGroup.add(navWhite);

    // Warm deck courtesy lighting dots
    const courtesyMat = new THREE.MeshBasicMaterial({ color: 0xffb86c });
    for (let z = -6.0; z <= 6.0; z += 3.0) {
      for (const sx of [-2.25, 2.25]) {
        const lightDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), courtesyMat);
        lightDot.position.set(sx, 1.32, z);
        hullGroup.add(lightDot);
      }
    }

    // 8. DECK RAILS & HARDWARE
    // Stainless steel stanchions around the foredeck
    const railMat = matChrome;
    for (let z = 2.0; z <= 8.5; z += 1.8) {
      for (const sx of [-2.28, 2.28]) {
        const taper = 1.0 - Math.max(0, (z - 5.0) / 4.0) * 0.45;
        const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85), railMat);
        stanchion.position.set(sx * taper, 1.62, z);
        hullGroup.add(stanchion);
      }
    }

    // Anchor & Windlass on foredeck
    const windlass = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.32, 12), matChrome);
    windlass.position.set(0, 1.4, 7.8);
    hullGroup.add(windlass);

    const anchor = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 8, 12), matHullDark);
    anchor.rotation.y = Math.PI / 2;
    anchor.position.set(-2.45, 0.85, 8.4);
    hullGroup.add(anchor);

    // 9. PROPULSION & TWIN HIGH-SPEED PROPELLERS
    for (const sx of [-1.15, 1.15]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), matBrass);
      shaft.rotation.x = Math.PI / 2.25;
      shaft.position.set(sx, -1.0, -7.5);
      hullGroup.add(shaft);

      const propGroup = new THREE.Group();
      propGroup.position.set(sx, -1.2, -8.6);
      const hub = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 8), matBrass);
      hub.rotation.x = -Math.PI / 2;
      propGroup.add(hub);

      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.04), matBrass);
        blade.rotation.z = (b * Math.PI) / 2;
        blade.rotation.y = 0.38;
        blade.position.y = 0.28 * Math.sin((b * Math.PI) / 2);
        blade.position.x = 0.28 * Math.cos((b * Math.PI) / 2);
        propGroup.add(blade);
      }
      hullGroup.add(propGroup);
      this.propellers.push(propGroup);

      // Hydraulic Rudders
      const rudderGroup = new THREE.Group();
      rudderGroup.position.set(sx, -1.1, -9.1);
      const rudderBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.75), matChrome);
      rudderBlade.position.set(0, -0.45, -0.22);
      rudderGroup.add(rudderBlade);
      hullGroup.add(rudderGroup);
      this.rudders.push(rudderGroup);
    }

    // 10. ENSIGN / YACHT FLAG
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2), matChrome);
    staff.rotation.x = -0.25;
    staff.position.set(0, 1.85, -8.8);
    hullGroup.add(staff);

    const flagGeo = new THREE.PlaneGeometry(1.2, 0.75, 8, 4);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0x1f4e79,
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    this.flag = new THREE.Mesh(flagGeo, flagMat);
    this.flag.position.set(0.6, 2.15, -8.9);
    hullGroup.add(this.flag);

    this.group.add(hullGroup);
  }

  update(dt, throttle, rudderInput, speedKnots, time) {
    // 1. Dynamic propeller rotation proportional to engine power
    const propSpeed = throttle * 45.0;
    for (const prop of this.propellers) {
      prop.rotation.z += propSpeed * dt;
    }

    // 2. Rudder hydraulic steering deflection
    for (const rudder of this.rudders) {
      rudder.rotation.y = -rudderInput * 0.58;
    }

    // 3. Continuous radar sweeps
    for (const radar of this.radarAntennas) {
      radar.rotation.y += 4.2 * dt;
    }

    // 4. Cloth flutter on aft ensign flag
    if (this.flag) {
      const flutter = Math.sin(time * 10.0 + this.group.position.z * 0.2) * 0.22;
      this.flag.rotation.y = flutter + (rudderInput * 0.25);
    }
  }
}
