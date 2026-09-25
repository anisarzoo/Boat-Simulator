// High-detail procedural 3D Exploration Mega-Yacht model with curved hull geometry
import * as THREE from 'three';

// ── Procedural Teak Deck Textures ──
function createTeakTextures() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bctx = bumpCanvas.getContext('2d');

  ctx.fillStyle = '#a8794c';
  ctx.fillRect(0, 0, 512, 512);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 512, 512);

  const plankCount = 16;
  const plankWidth = 512 / plankCount;

  for (let i = 0; i < plankCount; i++) {
    const x = i * plankWidth;
    const hueOffset = (Math.random() - 0.5) * 8;
    const lumOffset = (Math.random() - 0.5) * 10;
    ctx.fillStyle = `hsl(${32 + hueOffset}, 44%, ${45 + lumOffset}%)`;
    ctx.fillRect(x + 1.5, 0, plankWidth - 3, 512);

    for (let g = 0; g < 16; g++) {
      const gx = x + 2 + Math.random() * (plankWidth - 5);
      const alpha = 0.05 + Math.random() * 0.08;
      ctx.strokeStyle = Math.random() > 0.5 ? `rgba(60, 35, 15, ${alpha})` : `rgba(220, 180, 130, ${alpha})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(
        gx + (Math.random() - 0.5) * 2, 170,
        gx + (Math.random() - 0.5) * 2, 340,
        gx + (Math.random() - 0.5) * 2, 512
      );
      ctx.stroke();
    }

    // Black polyurethane caulking seam
    ctx.fillStyle = '#14181c';
    ctx.fillRect(x - 1.5, 0, 3, 512);

    // Bump map: recessed groove
    bctx.fillStyle = '#101010';
    bctx.fillRect(x - 1.5, 0, 3, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 4.0);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(1.5, 4.0);

  return { texture, bumpMap };
}

// ── Create a smooth hull cross-section using LatheGeometry ──
function createHullGeometry(length, beam, depth, segments) {
  // Define the hull cross-section profile (half-section: keel to sheer)
  // This creates a realistic curved hull shape via revolution
  const points = [];
  const profileSteps = 24;

  for (let i = 0; i <= profileSteps; i++) {
    const t = i / profileSteps; // 0 = keel bottom, 1 = sheer top
    const y = -depth * (1.0 - t) + depth * 0.15; // vertical from keel to deck

    // Hull beam profile: narrow at keel, widest at waterline, slight tumblehome at sheer
    let halfBeam;
    if (t < 0.4) {
      // Below waterline: wine-glass section shape
      halfBeam = (beam / 2) * Math.pow(t / 0.4, 0.6);
    } else if (t < 0.85) {
      // Waterline to bulwark: full beam with slight flare
      const localT = (t - 0.4) / 0.45;
      halfBeam = (beam / 2) * (1.0 + localT * 0.05);
    } else {
      // Tumblehome at sheer (slight inward curve at top)
      const localT = (t - 0.85) / 0.15;
      halfBeam = (beam / 2) * 1.05 * (1.0 - localT * 0.04);
    }

    points.push(new THREE.Vector2(halfBeam, y));
  }

  // Create a proper 3D hull by extruding the profile along the length
  const hullGeo = new THREE.BufferGeometry();
  const lengthSteps = segments;
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= lengthSteps; j++) {
    const zT = j / lengthSteps; // 0 = stern, 1 = bow
    const z = (zT - 0.5) * length;

    // Longitudinal hull form: taper at bow and stern
    let longitudinalScale = 1.0;
    if (zT > 0.65) {
      // Bow taper (fine entry)
      const bowT = (zT - 0.65) / 0.35;
      longitudinalScale = 1.0 - Math.pow(bowT, 1.8) * 0.92;
    } else if (zT < 0.15) {
      // Stern taper (transom)
      const sternT = (0.15 - zT) / 0.15;
      longitudinalScale = 1.0 - Math.pow(sternT, 2.5) * 0.35;
    }

    for (let i = 0; i <= profileSteps; i++) {
      const pt = points[i];
      // Both sides of hull (port & starboard mirrored)
      const x = pt.x * longitudinalScale;
      const y = pt.y;

      vertices.push(x, y, z);
      vertices.push(-x, y, z);

      // Approximate normals
      const nx = pt.x > 0.01 ? 1.0 : 0.0;
      normals.push(nx, 0.3, 0.0);
      normals.push(-nx, 0.3, 0.0);

      uvs.push(zT, i / profileSteps);
      uvs.push(zT, i / profileSteps);
    }
  }

  // Build triangle indices
  const vertsPerRing = (profileSteps + 1) * 2;
  for (let j = 0; j < lengthSteps; j++) {
    for (let i = 0; i < profileSteps; i++) {
      const a = j * vertsPerRing + i * 2;
      const b = a + 2;
      const c = a + vertsPerRing;
      const d = c + 2;

      // Starboard side
      indices.push(a, c, b);
      indices.push(b, c, d);

      // Port side
      const ap = a + 1;
      const bp = b + 1;
      const cp = c + 1;
      const dp = d + 1;
      indices.push(ap, bp, cp);
      indices.push(bp, dp, cp);
    }
  }

  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  hullGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  hullGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  hullGeo.setIndex(indices);
  hullGeo.computeVertexNormals();

  return hullGeo;
}

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
    // 1. Ultra-Realistic PBR Materials
    const teak = createTeakTextures();

    const matHullDark = new THREE.MeshStandardMaterial({
      color: 0x0a1420,
      roughness: 0.16,
      metalness: 0.35
    });

    const matHullWhite = new THREE.MeshStandardMaterial({
      color: 0xf6f9fc,
      roughness: 0.12,
      metalness: 0.22
    });

    const matStripe = new THREE.MeshStandardMaterial({
      color: 0xc8251a,
      roughness: 0.25,
      metalness: 0.1
    });

    const matDeckTeak = new THREE.MeshStandardMaterial({
      map: teak.texture,
      bumpMap: teak.bumpMap,
      bumpScale: 0.035,
      roughness: 0.58,
      metalness: 0.04
    });

    const matGlass = new THREE.MeshStandardMaterial({
      color: 0x05101a,
      roughness: 0.03,
      metalness: 0.9,
      transparent: true,
      opacity: 0.78
    });

    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xf2f6fa,
      metalness: 0.98,
      roughness: 0.08
    });

    const matBrass = new THREE.MeshStandardMaterial({
      color: 0xdfb443,
      metalness: 0.94,
      roughness: 0.2
    });

    const matConsoleGlow = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });

    const hullGroup = new THREE.Group();

    // ── 2. CURVED HYDRODYNAMIC HULL (LatheGeometry-based) ──
    const hullGeo = createHullGeometry(17.5, 4.8, 1.8, 32);
    const hull = new THREE.Mesh(hullGeo, matHullDark);
    hull.castShadow = true;
    hull.receiveShadow = true;
    hullGroup.add(hull);

    // Upper hull white topsides (above waterline)
    const upperHullGeo = createHullGeometry(17.0, 4.9, 0.6, 28);
    const upperHull = new THREE.Mesh(upperHullGeo, matHullWhite);
    upperHull.position.y = 0.85;
    upperHull.castShadow = true;
    hullGroup.add(upperHull);

    // Red waterline boot-topping stripe
    const waterlineGeo = new THREE.BoxGeometry(5.0, 0.12, 17.2);
    const waterline = new THREE.Mesh(waterlineGeo, matStripe);
    waterline.position.set(0, -0.08, 0.2);
    hullGroup.add(waterline);

    // Bow clipper / knife edge
    const bowGeo = new THREE.ConeGeometry(0.35, 4.5, 6);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, matHullWhite);
    bow.position.set(0, 0.3, 9.8);
    bow.castShadow = true;
    hullGroup.add(bow);

    // Transom & Aft Swim Platform
    const swimPlatformGeo = new THREE.BoxGeometry(4.4, 0.22, 1.8);
    const swimPlatform = new THREE.Mesh(swimPlatformGeo, matDeckTeak);
    swimPlatform.position.set(0, 0.05, -9.0);
    hullGroup.add(swimPlatform);

    // ── 3. TEAK DECK & BULWARKS ──
    const mainDeckGeo = new THREE.BoxGeometry(4.65, 0.12, 17.0);
    const mainDeck = new THREE.Mesh(mainDeckGeo, matDeckTeak);
    mainDeck.position.set(0, 1.2, -0.2);
    mainDeck.receiveShadow = true;
    hullGroup.add(mainDeck);

    // Bow teak foredeck (curved using ConeGeometry)
    const foredeckGeo = new THREE.ConeGeometry(2.35, 4.8, 12);
    foredeckGeo.rotateX(-Math.PI / 2);
    foredeckGeo.scale(1.0, 0.06, 1.0);
    const foredeck = new THREE.Mesh(foredeckGeo, matDeckTeak);
    foredeck.position.set(0, 1.2, 9.0);
    hullGroup.add(foredeck);

    // Deck bulwark cap rails (chrome)
    for (const sx of [-2.32, 2.32]) {
      const capRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 14.0, 8),
        matChrome
      );
      capRail.rotation.x = Math.PI / 2;
      capRail.position.set(sx, 1.35, 0);
      hullGroup.add(capRail);
    }

    // ── 4. SUPERSTRUCTURE (Tier 1 Saloon) ──
    // Rounded saloon with chamfered edges
    const saloonGeo = new THREE.BoxGeometry(3.6, 1.6, 9.2, 4, 1, 1);
    const saloon = new THREE.Mesh(saloonGeo, matHullWhite);
    saloon.position.set(0, 2.05, -1.2);
    saloon.castShadow = true;
    hullGroup.add(saloon);

    // Chamfer strips on saloon corners
    for (const sx of [-1.82, 1.82]) {
      const chamfer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.55, 8),
        matHullWhite
      );
      chamfer.position.set(sx, 2.05, 3.4);
      hullGroup.add(chamfer);

      const chamferR = chamfer.clone();
      chamferR.position.set(sx, 2.05, -5.8);
      hullGroup.add(chamferR);
    }

    // Saloon dark panoramic flush glazing
    const saloonGlassGeo = new THREE.BoxGeometry(3.68, 0.8, 8.4);
    const saloonGlass = new THREE.Mesh(saloonGlassGeo, matGlass);
    saloonGlass.position.set(0, 2.15, -1.2);
    hullGroup.add(saloonGlass);

    // ── 5. WHEELHOUSE / FLYBRIDGE (Tier 2) ──
    const bridgeGeo = new THREE.BoxGeometry(3.1, 1.35, 4.4, 3, 1, 1);
    const bridge = new THREE.Mesh(bridgeGeo, matHullWhite);
    bridge.position.set(0, 3.45, 0.5);
    bridge.castShadow = true;
    hullGroup.add(bridge);

    // Forward Raked Bridge Windshield (Aero angle)
    const bridgeGlassGeo = new THREE.BoxGeometry(3.18, 0.75, 3.4);
    const bridgeGlass = new THREE.Mesh(bridgeGlassGeo, matGlass);
    bridgeGlass.position.set(0, 3.55, 0.6);
    hullGroup.add(bridgeGlass);

    // Windshield frame mullions
    for (let i = -1; i <= 1; i++) {
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.78, 0.04),
        matChrome
      );
      mullion.position.set(i * 0.85, 3.55, 2.31);
      hullGroup.add(mullion);
    }

    // Glowing interior navigation screens
    const mfdConsole = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.1), matConsoleGlow);
    mfdConsole.position.set(0, 3.4, 1.8);
    hullGroup.add(mfdConsole);

    // Flybridge hardtop overhang
    const hardtopGeo = new THREE.BoxGeometry(3.4, 0.1, 5.0);
    const hardtop = new THREE.Mesh(hardtopGeo, matHullWhite);
    hardtop.position.set(0, 4.15, 0.3);
    hardtop.castShadow = true;
    hullGroup.add(hardtop);

    // ── 6. RADAR ARCH & COMMS TOWER ──
    const radarArchGeo = new THREE.BoxGeometry(2.5, 1.0, 0.5);
    const radarArch = new THREE.Mesh(radarArchGeo, matHullWhite);
    radarArch.position.set(0, 4.55, -1.1);
    radarArch.castShadow = true;
    hullGroup.add(radarArch);

    // Radar arch support pillars
    for (const sx of [-1.1, 1.1]) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8),
        matChrome
      );
      pillar.position.set(sx, 4.25, -1.1);
      hullGroup.add(pillar);
    }

    // Main rotating radar scanner bar
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 0.2), matChrome);
    radarBar.position.set(0, 5.2, -1.1);
    hullGroup.add(radarBar);
    this.radarAntennas.push(radarBar);

    // Satellite communications domes (Dual KVH domes)
    const satDomeGeo = new THREE.SphereGeometry(0.42, 16, 16);
    for (const sx of [-0.85, 0.85]) {
      const satDome = new THREE.Mesh(satDomeGeo, matHullWhite);
      satDome.position.set(sx, 5.0, -1.1);
      hullGroup.add(satDome);
    }

    // Communication mast & aerials
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.10, 3.0, 8), matChrome);
    mast.position.set(0, 5.5, 0.2);
    hullGroup.add(mast);

    // VHF whip antennas
    for (const sx of [-0.5, 0.5]) {
      const whip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.025, 1.8, 4),
        matChrome
      );
      whip.position.set(sx, 6.4, -0.5);
      whip.rotation.z = sx * 0.15;
      hullGroup.add(whip);
    }

    // Dual High-Power Searchlights
    this.searchlights = [];
    for (const sx of [-0.75, 0.75]) {
      const slHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 12), matChrome);
      slHousing.rotation.x = Math.PI / 2;
      slHousing.position.set(sx, 4.25, 2.7);
      hullGroup.add(slHousing);

      const spot = new THREE.SpotLight(0xfffaee, 6.0, 160, Math.PI / 6, 0.45, 1.2);
      spot.position.set(sx, 4.3, 2.8);
      const spotTarget = new THREE.Object3D();
      spotTarget.position.set(sx * 0.4, -0.6, 50);
      hullGroup.add(spotTarget);
      spot.target = spotTarget;
      hullGroup.add(spot);
      this.searchlights.push(spot);
    }

    // Underwater Stern Transom Lights
    this.underwaterLights = [];
    for (const sx of [-1.6, 0, 1.6]) {
      const underGlow = new THREE.PointLight(0x00e5ff, 3.2, 16);
      underGlow.position.set(sx, -0.6, -9.0);
      hullGroup.add(underGlow);
      this.underwaterLights.push(underGlow);
    }
    this.lightsOn = true;

    // ── 7. NAVIGATION LIGHTS ──
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
    for (let z = -6.0; z <= 6.0; z += 2.5) {
      for (const sx of [-2.25, 2.25]) {
        const lightDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), courtesyMat);
        lightDot.position.set(sx, 1.32, z);
        hullGroup.add(lightDot);
      }
    }

    // ── 8. DECK RAILS & HARDWARE ──
    const railMat = matChrome;
    // Foredeck stanchions with horizontal wire rail
    for (let z = 2.0; z <= 8.5; z += 1.4) {
      for (const sx of [-2.28, 2.28]) {
        const taper = 1.0 - Math.max(0, (z - 5.0) / 4.0) * 0.45;
        const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85), railMat);
        stanchion.position.set(sx * taper, 1.62, z);
        hullGroup.add(stanchion);
      }
    }

    // Horizontal rail wires (port & starboard)
    for (const sx of [-2.28, 2.28]) {
      for (const yOff of [0.3, 0.6]) {
        const wire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 6.5, 4),
          railMat
        );
        wire.rotation.x = Math.PI / 2;
        wire.position.set(sx * 0.85, 1.25 + yOff, 5.2);
        hullGroup.add(wire);
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

    // Bow cleats
    for (const sx of [-1.2, 1.2]) {
      const cleat = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.5),
        matChrome
      );
      cleat.position.set(sx, 1.3, 7.2);
      hullGroup.add(cleat);
    }

    // ── 9. PROPULSION & TWIN PROPELLERS ──
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

      // 5-blade propeller for realism
      for (let b = 0; b < 5; b++) {
        const angle = (b * Math.PI * 2) / 5;
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.6, 0.03),
          matBrass
        );
        blade.rotation.z = angle;
        blade.rotation.y = 0.35;
        blade.position.y = 0.26 * Math.sin(angle);
        blade.position.x = 0.26 * Math.cos(angle);
        propGroup.add(blade);
      }
      hullGroup.add(propGroup);
      this.propellers.push(propGroup);

      // Hydraulic Rudders with proper spade shape
      const rudderGroup = new THREE.Group();
      rudderGroup.position.set(sx, -1.1, -9.1);

      // Rudder stock (vertical shaft)
      const rudderStock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6),
        matChrome
      );
      rudderStock.position.set(0, -0.3, 0);
      rudderGroup.add(rudderStock);

      // Rudder blade (tapered spade)
      const rudderBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.0, 0.65),
        matChrome
      );
      rudderBlade.position.set(0, -0.5, -0.22);
      rudderGroup.add(rudderBlade);

      hullGroup.add(rudderGroup);
      this.rudders.push(rudderGroup);
    }

    // Trim tabs at transom
    for (const sx of [-1.5, 1.5]) {
      const trimTab = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.05, 0.5),
        matChrome
      );
      trimTab.position.set(sx, -0.3, -8.9);
      hullGroup.add(trimTab);
    }

    // ── 10. ENSIGN / YACHT FLAG ──
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

    // ── 11. FENDER LINES ──
    for (const z of [-3, 0, 3]) {
      for (const sx of [-2.42, 2.42]) {
        const fender = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
        );
        fender.position.set(sx, 0.6, z);
        hullGroup.add(fender);
      }
    }

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

  toggleLights() {
    this.lightsOn = !this.lightsOn;
    for (const l of this.searchlights) {
      l.intensity = this.lightsOn ? 6.0 : 0.0;
    }
    for (const l of this.underwaterLights) {
      l.intensity = this.lightsOn ? 3.2 : 0.0;
    }
    return this.lightsOn;
  }
}
