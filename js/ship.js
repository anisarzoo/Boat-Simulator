// High-detail procedural 3D Exploration Vessel / Cruiser model
import * as THREE from 'three';

export class Ship {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Ship';

    // Interactive animated parts
    this.propellers = [];
    this.rudders = [];
    this.radarAntenna = null;
    this.flag = null;

    this.buildShip();
    this.scene.add(this.group);
  }

  buildShip() {
    // Materials
    const matHullDark = new THREE.MeshStandardMaterial({
      color: 0x111c26, // Deep nautical navy
      roughness: 0.35,
      metalness: 0.25
    });

    const matHullWhite = new THREE.MeshStandardMaterial({
      color: 0xf5f8fa, // Crisp marine white
      roughness: 0.25,
      metalness: 0.15
    });

    const matStripe = new THREE.MeshStandardMaterial({
      color: 0xd93829, // Nautical red boot-topping stripe
      roughness: 0.4
    });

    const matDeckTeak = new THREE.MeshStandardMaterial({
      color: 0x9e7247, // Teak deck planking
      roughness: 0.65,
      metalness: 0.05
    });

    const matGlass = new THREE.MeshStandardMaterial({
      color: 0x0f2333,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.82
    });

    const matMetal = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.85,
      roughness: 0.2
    });

    const matBrass = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.3
    });

    // 1. LOWER HULL (hydrodynamic boat shape)
    const hullGroup = new THREE.Group();
    
    // Main lower hull (tapered wedge)
    const hullGeo = new THREE.CylinderGeometry(2.4, 1.3, 17.5, 12, 1);
    hullGeo.rotateZ(Math.PI / 2);
    hullGeo.scale(1.0, 0.48, 1.0);
    const lowerHull = new THREE.Mesh(hullGeo, matHullDark);
    lowerHull.position.set(0, -0.4, 0);
    lowerHull.castShadow = true;
    lowerHull.receiveShadow = true;
    hullGroup.add(lowerHull);

    // Sharp Bow entry wedge
    const bowConeGeo = new THREE.ConeGeometry(2.2, 5.0, 8);
    bowConeGeo.rotateX(-Math.PI / 2);
    bowConeGeo.scale(1.0, 0.48, 1.0);
    const bowCone = new THREE.Mesh(bowConeGeo, matHullDark);
    bowCone.position.set(0, -0.4, 9.5);
    bowCone.castShadow = true;
    hullGroup.add(bowCone);

    // Red Waterline stripe
    const stripeGeo = new THREE.BoxGeometry(4.7, 0.22, 18.2);
    const waterlineStripe = new THREE.Mesh(stripeGeo, matStripe);
    waterlineStripe.position.set(0, -0.05, 0);
    hullGroup.add(waterlineStripe);

    // Upper sheer strake / white topsides
    const upperHullGeo = new THREE.BoxGeometry(4.8, 1.2, 17.8);
    const upperHull = new THREE.Mesh(upperHullGeo, matHullWhite);
    upperHull.position.set(0, 0.65, 0);
    upperHull.castShadow = true;
    hullGroup.add(upperHull);

    // Tapered bow bulwark
    const bowUpperGeo = new THREE.ConeGeometry(2.35, 4.8, 8);
    bowUpperGeo.rotateX(-Math.PI / 2);
    bowUpperGeo.scale(1.0, 0.5, 1.0);
    const bowUpper = new THREE.Mesh(bowUpperGeo, matHullWhite);
    bowUpper.position.set(0, 0.65, 9.3);
    bowUpper.castShadow = true;
    hullGroup.add(bowUpper);

    // 2. MAIN DECK (Teak Wood)
    const deckGeo = new THREE.BoxGeometry(4.6, 0.12, 17.2);
    const deck = new THREE.Mesh(deckGeo, matDeckTeak);
    deck.position.set(0, 1.25, 0);
    deck.receiveShadow = true;
    hullGroup.add(deck);

    // Bow teak triangle
    const bowDeckGeo = new THREE.ConeGeometry(2.25, 4.5, 8);
    bowDeckGeo.rotateX(-Math.PI / 2);
    bowDeckGeo.scale(1.0, 0.05, 1.0);
    const bowDeck = new THREE.Mesh(bowDeckGeo, matDeckTeak);
    bowDeck.position.set(0, 1.25, 9.1);
    hullGroup.add(bowDeck);

    // 3. CABIN SUPERSTRUCTURE (Tier 1 - Saloon & Galley)
    const cabinTier1Geo = new THREE.BoxGeometry(3.6, 1.5, 9.8);
    const cabinTier1 = new THREE.Mesh(cabinTier1Geo, matHullWhite);
    cabinTier1.position.set(0, 2.05, -0.8);
    cabinTier1.castShadow = true;
    hullGroup.add(cabinTier1);

    // Tier 1 Panoramic Windows (Black tinted glass)
    const winTier1Geo = new THREE.BoxGeometry(3.68, 0.65, 8.2);
    const winTier1 = new THREE.Mesh(winTier1Geo, matGlass);
    winTier1.position.set(0, 2.15, -0.8);
    hullGroup.add(winTier1);

    // 4. WHEELHOUSE / BRIDGE (Tier 2)
    const bridgeGeo = new THREE.BoxGeometry(3.1, 1.3, 4.8);
    const bridge = new THREE.Mesh(bridgeGeo, matHullWhite);
    bridge.position.set(0, 3.45, 0.6);
    bridge.castShadow = true;
    hullGroup.add(bridge);

    // Forward Raked Wheelhouse Windshield
    const windshieldGeo = new THREE.BoxGeometry(3.18, 0.72, 3.6);
    const windshield = new THREE.Mesh(windshieldGeo, matGlass);
    windshield.position.set(0, 3.55, 0.7);
    hullGroup.add(windshield);

    // 5. RADAR ARCH & COMMS MAST
    const archGeo = new THREE.BoxGeometry(2.6, 1.1, 0.45);
    const radarArch = new THREE.Mesh(archGeo, matHullWhite);
    radarArch.position.set(0, 4.65, -0.9);
    radarArch.castShadow = true;
    hullGroup.add(radarArch);

    // Rotating Radar Scanner
    const radarBarGeo = new THREE.BoxGeometry(1.6, 0.16, 0.22);
    this.radarAntenna = new THREE.Mesh(radarBarGeo, matMetal);
    this.radarAntenna.position.set(0, 5.35, -0.9);
    hullGroup.add(this.radarAntenna);

    // Satellite Comms Domes (Radomes)
    const domeGeo = new THREE.SphereGeometry(0.38, 12, 12);
    for (const sx of [-0.9, 0.9]) {
      const dome = new THREE.Mesh(domeGeo, matHullWhite);
      dome.position.set(sx, 5.15, -0.9);
      hullGroup.add(dome);
    }

    // Main Masthead
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.1, 2.4, 8);
    const mast = new THREE.Mesh(mastGeo, matMetal);
    mast.position.set(0, 5.3, 0.2);
    hullGroup.add(mast);

    // Navigation Lights (Port = Red, Starboard = Green, Masthead = White)
    const redLightMat = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0000, emissiveIntensity: 2.5 });
    const greenLightMat = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff22, emissiveIntensity: 2.5 });
    const whiteLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 });

    const portLight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), redLightMat);
    portLight.position.set(-1.62, 3.8, 0.5);
    hullGroup.add(portLight);

    const stbdLight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), greenLightMat);
    stbdLight.position.set(1.62, 3.8, 0.5);
    hullGroup.add(stbdLight);

    const mastLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), whiteLightMat);
    mastLight.position.set(0, 6.45, 0.2);
    hullGroup.add(mastLight);

    // 6. TWIN PROPELLERS & DUAL RUDDERS
    for (const sx of [-1.1, 1.1]) {
      // Propeller shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8), matBrass);
      shaft.rotation.x = Math.PI / 2.2;
      shaft.position.set(sx, -0.85, -7.2);
      hullGroup.add(shaft);

      // 4-blade propeller
      const propGroup = new THREE.Group();
      propGroup.position.set(sx, -1.05, -8.1);
      const hub = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 8), matBrass);
      hub.rotation.x = -Math.PI / 2;
      propGroup.add(hub);

      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.04), matBrass);
        blade.rotation.z = (b * Math.PI) / 2;
        blade.rotation.y = 0.35;
        blade.position.y = 0.25 * Math.sin((b * Math.PI) / 2);
        blade.position.x = 0.25 * Math.cos((b * Math.PI) / 2);
        propGroup.add(blade);
      }
      hullGroup.add(propGroup);
      this.propellers.push(propGroup);

      // Rudder
      const rudderGroup = new THREE.Group();
      rudderGroup.position.set(sx, -0.95, -8.6);
      const rudderBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.7), matMetal);
      rudderBlade.position.set(0, -0.4, -0.2);
      rudderGroup.add(rudderBlade);
      hullGroup.add(rudderGroup);
      this.rudders.push(rudderGroup);
    }

    // 7. ENSIGN / FLAG ON AFT STAFF
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0), matMetal);
    staff.rotation.x = -0.25;
    staff.position.set(0, 1.9, -8.4);
    hullGroup.add(staff);

    const flagGeo = new THREE.PlaneGeometry(1.1, 0.68, 6, 3);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0x1f4e79,
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    this.flag = new THREE.Mesh(flagGeo, flagMat);
    this.flag.position.set(0.55, 2.2, -8.5);
    hullGroup.add(this.flag);

    // 8. DECK HARDWARE (Cleats, Anchor, Lifebuoys)
    const buoyMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.4 });
    const ringGeo = new THREE.TorusGeometry(0.28, 0.09, 8, 16);
    for (const sx of [-1.85, 1.85]) {
      const buoy = new THREE.Mesh(ringGeo, buoyMat);
      buoy.position.set(sx, 2.4, -1.2);
      buoy.rotation.y = Math.PI / 2;
      hullGroup.add(buoy);
    }

    this.group.add(hullGroup);
  }

  update(dt, throttle, rudderInput, speedKnots, time) {
    // 1. Spin propellers according to engine throttle
    const propSpeed = throttle * 35.0;
    for (const prop of this.propellers) {
      prop.rotation.z += propSpeed * dt;
    }

    // 2. Turn rudders with steering input
    for (const rudder of this.rudders) {
      rudder.rotation.y = -rudderInput * 0.55;
    }

    // 3. Rotate radar scanner
    if (this.radarAntenna) {
      this.radarAntenna.rotation.y += 3.8 * dt;
    }

    // 4. Flutter flag with ship movement and wind
    if (this.flag) {
      const flutter = Math.sin(time * 9.0 + this.group.position.z) * 0.18;
      this.flag.rotation.y = flutter + (rudderInput * 0.2);
    }
  }
}
