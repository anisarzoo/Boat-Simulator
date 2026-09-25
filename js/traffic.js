// AI Marine Traffic System: Container Ships, Commercial Fishing Trawlers, and Sailing Yachts
// with COLREGs Navigation Lighting, Radar Target Telemetry, and Horn Echo Responses
import * as THREE from 'three';

export class MarineTraffic {
  constructor(scene) {
    this.scene = scene;
    this.vessels = [];
    this.initVessels();
  }

    // ── 1. PROCEDURAL CONTAINER CARGO SHIP (110m LOA) ──
  createContainerShip() {
    const group = new THREE.Group();

    const matHull = new THREE.MeshStandardMaterial({
      color: 0x161a20, // Dark commercial cargo hull
      roughness: 0.55,
      metalness: 0.25
    });
    const matSuperstructure = new THREE.MeshStandardMaterial({
      color: 0xf0f2f5,
      roughness: 0.35
    });
    const matBridgeGlass = new THREE.MeshStandardMaterial({
      color: 0x0a1c28,
      roughness: 0.08,
      metalness: 0.9
    });
    const matRedPrimer = new THREE.MeshStandardMaterial({
      color: 0x8a1c14,
      roughness: 0.6
    });
    const matBootStripe = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4
    });
    const matCraneYellow = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      roughness: 0.4
    });

    // Hull topsides (110m x 18m x 9m) - properly immersed at laden draft
    const hullBase = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 105), matHull);
    hullBase.position.set(0, 1.5, 0);
    group.add(hullBase);

    // White waterline boot-topping stripe
    const bootStripe = new THREE.Mesh(new THREE.BoxGeometry(18.15, 0.45, 104), matBootStripe);
    bootStripe.position.set(0, 0.2, 0);
    group.add(bootStripe);

    // Red underwater keel & bulbous bow (deeply submerged at y = -4.5m)
    const keel = new THREE.Mesh(new THREE.BoxGeometry(17.8, 5.5, 102), matRedPrimer);
    keel.position.set(0, -4.5, 0);
    group.add(keel);

    const bulbousBow = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 8), matRedPrimer);
    bulbousBow.scale.set(1.0, 1.2, 2.2);
    bulbousBow.position.set(0, -4.2, 54);
    group.add(bulbousBow);

    // Raked bow forecastle with marine sheer
    const bowWedge = new THREE.Mesh(new THREE.ConeGeometry(9.0, 18.0, 4), matHull);
    bowWedge.rotation.y = Math.PI / 4;
    bowWedge.rotation.x = -Math.PI / 2;
    bowWedge.position.set(0, 2.2, 52);
    group.add(bowWedge);

    // Multi-colored container stacks
    const containerColors = [0x1976d2, 0xd32f2f, 0x2e7d32, 0xf57c00, 0x37474f, 0x4e342e];
    const containerMats = containerColors.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));

    for (let bay = -28; bay <= 32; bay += 13) {
      // Deck gantry crane between bays
      if (bay === -2 || bay === 24) {
        const craneTower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9.5, 1.6), matCraneYellow);
        craneTower.position.set(0, 10.5, bay - 6.5);
        const craneArm = new THREE.Mesh(new THREE.BoxGeometry(19.0, 1.0, 1.2), matCraneYellow);
        craneArm.position.set(0, 15.0, bay - 6.5);
        group.add(craneTower);
        group.add(craneArm);
      }

      for (const rx of [-5.5, 0, 5.5]) {
        const tiers = 3 + Math.floor(Math.random() * 2);
        for (let t = 0; t < tiers; t++) {
          const cMat = containerMats[Math.floor(Math.random() * containerMats.length)];
          const container = new THREE.Mesh(
            new THREE.BoxGeometry(5.0, 2.8, 12.0),
            cMat
          );
          container.position.set(rx, 6.0 + t * 2.8 + 1.4, bay);
          container.castShadow = true;
          group.add(container);
        }
      }
    }

    // Aft Bridge Superstructure (Deckhouse)
    const deckhouse = new THREE.Mesh(new THREE.BoxGeometry(16, 14, 16), matSuperstructure);
    deckhouse.position.set(0, 12.5, -38);
    deckhouse.castShadow = true;
    group.add(deckhouse);

    // Panoramic navigation bridge windows
    const bridgeWindows = new THREE.Mesh(new THREE.BoxGeometry(16.3, 1.6, 4.2), matBridgeGlass);
    bridgeWindows.position.set(0, 18.2, -31);
    group.add(bridgeWindows);

    // Bridge wings
    const bridgeWings = new THREE.Mesh(new THREE.BoxGeometry(22, 2.2, 4), matSuperstructure);
    bridgeWings.position.set(0, 18.5, -38);
    group.add(bridgeWings);

    // Exhaust Funnel (Smokestack)
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 10, 8), matRedPrimer);
    funnel.position.set(0, 20.0, -46);
    group.add(funnel);

    // Main Radar Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 16, 6), matHull);
    mast.position.set(0, 25.0, -38);
    group.add(mast);

    // COLREGs Commercial Navigation Lights
    const addNavLight = (pos, colorHex, intensity = 4.0) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 6, 6),
        new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: intensity })
      );
      dot.position.copy(pos);
      group.add(dot);
    };

    addNavLight(new THREE.Vector3(-11.1, 18.5, -38), 0xff0000); // Port Red
    addNavLight(new THREE.Vector3(11.1, 18.5, -38), 0x00ff33);  // Starboard Green
    addNavLight(new THREE.Vector3(0, 29.0, -38), 0xffffff);     // Forward Masthead White
    addNavLight(new THREE.Vector3(0, 32.5, -46), 0xffffff);     // Aft Masthead White
    addNavLight(new THREE.Vector3(0, 5.5, -52.6), 0xffffff);    // Stern White

    return group;
  }

  // ── 2. PROCEDURAL COMMERCIAL FISHING TRAWLER (26m LOA) ──
  createFishingTrawler() {
    const group = new THREE.Group();

    const matHull = new THREE.MeshStandardMaterial({
      color: 0x1f3a52, // Deep sea blue workboat hull
      roughness: 0.65,
      metalness: 0.1
    });
    const matCabin = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.5
    });
    const matWoodDeck = new THREE.MeshStandardMaterial({
      color: 0x8d6e63,
      roughness: 0.8
    });
    const matGantry = new THREE.MeshStandardMaterial({
      color: 0xff9800, // Safety orange crane/gantry
      roughness: 0.4
    });

    // Hull (26m x 7.2m x 4m)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.8, 25), matHull);
    hull.position.set(0, 1.9, 0);
    group.add(hull);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.2, 24.6), matWoodDeck);
    deck.position.set(0, 3.8, 0);
    group.add(deck);

    // Forward Wheelhouse & Crew Quarters
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4.2, 8.5), matCabin);
    cabin.position.set(0, 5.8, 4.5);
    group.add(cabin);

    // Trawl Net Winch Gantry A-Frame (Aft)
    for (const sx of [-2.8, 2.8]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5), matGantry);
      leg.rotation.x = -0.15;
      leg.position.set(sx, 7.2, -8.5);
      group.add(leg);
    }
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5.8), matGantry);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 10.5, -9.1);
    group.add(crossbar);

    // Outrigger Stabilizer Booms
    for (const sx of [-1, 1]) {
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 9.5), matGantry);
      boom.rotation.z = sx * 0.75;
      boom.rotation.x = 0.2;
      boom.position.set(sx * 4.8, 6.5, 2.0);
      group.add(boom);
    }

    // Halogen Deck Floodlights
    const floodlight = new THREE.PointLight(0xfffaed, 2.8, 25);
    floodlight.position.set(0, 8.5, -4.0);
    group.add(floodlight);

    // COLREGs: Trawling Lights (Green over White 360° all-round mast lights)
    const addDot = (pos, colorHex) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 6, 6),
        new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 3.5 })
      );
      m.position.copy(pos);
      group.add(m);
    };
    addDot(new THREE.Vector3(0, 10.8, 4.5), 0x00ff33); // Green (upper)
    addDot(new THREE.Vector3(0, 9.8, 4.5), 0xffffff);  // White (lower)
    addDot(new THREE.Vector3(-3.65, 6.0, 4.5), 0xff0000); // Port Red
    addDot(new THREE.Vector3(3.65, 6.0, 4.5), 0x00ff33);  // Starboard Green

    return group;
  }

  // ── 3. PROCEDURAL RACING SAILING YACHT (20m LOA) ──
  createSailingYacht() {
    const group = new THREE.Group();

    const matHull = new THREE.MeshStandardMaterial({
      color: 0xf5f7fa, // Gloss white composite
      roughness: 0.15,
      metalness: 0.2
    });
    const matDeck = new THREE.MeshStandardMaterial({
      color: 0xaf804d, // Teak deck
      roughness: 0.6
    });
    const matSail = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    const matCarbon = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.3,
      metalness: 0.8
    });

    // Sleek racing monohull (20m x 4.8m x 2.2m)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.2, 20), matHull);
    hull.position.set(0, 1.1, 0);
    group.add(hull);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 19.6), matDeck);
    deck.position.set(0, 2.2, 0);
    group.add(deck);

    // Deep Lead Bulb Keel
    const keelFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 1.4), matCarbon);
    keelFin.position.set(0, -1.4, -0.5);
    group.add(keelFin);

    const keelBulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), matCarbon);
    keelBulb.scale.set(0.9, 0.9, 3.2);
    keelBulb.position.set(0, -3.0, -0.5);
    group.add(keelBulb);

    // Tall Carbon Fiber Mast (26m high)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 26, 8), matCarbon);
    mast.position.set(0, 14.5, 1.5);
    group.add(mast);

    // Mainsail Boom
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 10.5), matCarbon);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 3.6, -3.6);
    group.add(boom);

    // Billowing Mainsail (Curved triangle)
    const sailGeo = new THREE.BufferGeometry();
    const sailVerts = new Float32Array([
       0.0,  3.6,  1.5, // Tack
       0.0, 25.5,  1.2, // Head
       1.4,  3.8, -8.6  // Clew (belly curve out)
    ]);
    sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
    sailGeo.setIndex([0, 1, 2, 0, 2, 1]);
    sailGeo.computeVertexNormals();
    const sail = new THREE.Mesh(sailGeo, matSail);
    group.add(sail);

    // Fore Jib Sail
    const jibGeo = new THREE.BufferGeometry();
    const jibVerts = new Float32Array([
       0.0,  2.4,  9.8, // Tack
       0.0, 21.0,  1.5, // Head
       0.8,  2.8,  1.8  // Clew
    ]);
    jibGeo.setAttribute('position', new THREE.BufferAttribute(jibVerts, 3));
    jibGeo.setIndex([0, 1, 2, 0, 2, 1]);
    jibGeo.computeVertexNormals();
    const jib = new THREE.Mesh(jibGeo, matSail);
    group.add(jib);

    // Heel angle into the wind
    group.rotation.z = 0.22;

    return group;
  }

  initVessels() {
    // 3 distinct AI vessels cruising in the maritime zone
    const container = this.createContainerShip();
    const trawler = this.createFishingTrawler();
    const sailboat = this.createSailingYacht();

    this.vessels = [
      {
        name: 'MV ATLANTIC PHOENIX',
        type: 'Container Carrier',
        group: container,
        pos: new THREE.Vector3(280, 0, 380),
        heading: 2.35, // Heading SW
        speed: 15.0,   // Knots
        length: 110,
        hornCooldown: 0
      },
      {
        name: 'FV NORTHERN SEAS',
        type: 'Commercial Trawler',
        group: trawler,
        pos: new THREE.Vector3(-340, 0, 180),
        heading: -0.6,
        speed: 9.5,
        length: 26,
        hornCooldown: 0
      },
      {
        name: 'SY AURA OCEANIS',
        type: 'Sailing Yacht',
        group: sailboat,
        pos: new THREE.Vector3(190, 0, -280),
        heading: 3.1,
        speed: 12.0,
        length: 20,
        hornCooldown: 0
      }
    ];

    for (const v of this.vessels) {
      v.group.position.copy(v.pos);
      v.group.rotation.y = v.heading;
      this.scene.add(v.group);
    }
  }

  // Answer player's horn blast with an echoing acoustic response from nearest ship
  respondToPlayerHorn(playerPos, audioManager) {
    let nearest = null;
    let minDist = 1200;

    for (const v of this.vessels) {
      const d = v.pos.distanceTo(playerPos);
      if (d < minDist && v.hornCooldown <= 0) {
        minDist = d;
        nearest = v;
      }
    }

    if (nearest && audioManager) {
      nearest.hornCooldown = 15.0; // Prevent spamming
      // Acoustic travel time delay: ~340 m/s
      const delayMs = Math.min(2800, (minDist / 340) * 1000 + 400);

      setTimeout(() => {
        audioManager.playAIFogHorn(minDist);
      }, delayMs);

      return nearest.name;
    }
    return null;
  }

  update(dt, time, shipPosition) {
    for (const v of this.vessels) {
      v.hornCooldown -= dt;

      // Cruising forward locomotion along course
      const speedMps = v.speed * 0.514444; // Knots to m/s
      v.pos.x += Math.sin(v.heading) * speedMps * dt;
      v.pos.z += Math.cos(v.heading) * speedMps * dt;

      // Sea heave and pitch on waves
      const heave = Math.sin(time * 0.8 + v.pos.x * 0.05) * (v.length > 50 ? 0.35 : 0.85);
      const pitch = Math.cos(time * 0.6 + v.pos.z * 0.04) * (v.length > 50 ? 0.02 : 0.06);
      v.pos.y = heave;

      // Keep vessels patrolling within range of the active simulation space
      if (shipPosition) {
        const dx = v.pos.x - shipPosition.x;
        const dz = v.pos.z - shipPosition.z;
        if (Math.sqrt(dx * dx + dz * dz) > 1600) {
          // Respawn on opposite perimeter boundary
          v.pos.x = shipPosition.x - dx * 0.9;
          v.pos.z = shipPosition.z - dz * 0.9;
        }
      }

      v.group.position.copy(v.pos);
      v.group.rotation.set(pitch, v.heading, v.type === 'Sailing Yacht' ? 0.22 : 0);
    }
  }

  // Get active radar contacts within scanning range for MFD & HUD display
  getRadarTargets(shipPos, maxRangeMeters = 1400) {
    const targets = [];
    for (const v of this.vessels) {
      const d = v.pos.distanceTo(shipPos);
      if (d <= maxRangeMeters) {
        const relX = v.pos.x - shipPos.x;
        const relZ = v.pos.z - shipPos.z;
        targets.push({
          name: v.name,
          type: v.type,
          distanceMeters: Math.round(d),
          distanceNM: (d / 1852).toFixed(1),
          relX,
          relZ,
          speedKnots: v.speed,
          headingDeg: Math.round(((v.heading * 180) / Math.PI + 360) % 360)
        });
      }
    }
    return targets;
  }
}
