// Ultra-Realistic Exploration Mega-Yacht with High-Detail Hydrodynamic Hull,
// Luxury Teak Decking, Fully Equipped Glass Bridge Helm, and Interactive Nautical Systems
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── 1. PROCEDURAL TEXTURE GENERATORS ──

// Golden Honey Teak Decking with Caulking Seams and Grain Relief
function createTeakTextures() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bctx = bumpCanvas.getContext('2d');

  ctx.fillStyle = '#a67746';
  ctx.fillRect(0, 0, 512, 512);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 512, 512);

  const plankCount = 20;
  const plankWidth = 512 / plankCount;

  for (let i = 0; i < plankCount; i++) {
    const x = i * plankWidth;
    const hueOffset = (Math.random() - 0.5) * 8;
    const lumOffset = (Math.random() - 0.5) * 12;
    ctx.fillStyle = `hsl(${34 + hueOffset}, 46%, ${46 + lumOffset}%)`;
    ctx.fillRect(x + 1.2, 0, plankWidth - 2.4, 512);

    // Natural wood grain filaments
    for (let g = 0; g < 18; g++) {
      const gx = x + 2 + Math.random() * (plankWidth - 5);
      const alpha = 0.04 + Math.random() * 0.08;
      ctx.strokeStyle = Math.random() > 0.5 ? `rgba(55, 30, 12, ${alpha})` : `rgba(230, 195, 140, ${alpha})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(
        gx + (Math.random() - 0.5) * 2, 170,
        gx + (Math.random() - 0.5) * 2, 340,
        gx + (Math.random() - 0.5) * 2, 512
      );
      ctx.stroke();
    }

    // Black polyurethane waterproof caulking seam
    ctx.fillStyle = '#101316';
    ctx.fillRect(x - 1.2, 0, 2.4, 512);

    // Recessed seam for normal/bump map
    bctx.fillStyle = '#080808';
    bctx.fillRect(x - 1.2, 0, 2.4, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.0, 5.0);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2.0, 5.0);

  return { texture, bumpMap };
}

// Triple Glass Bridge Multi-Function Display (MFD) Screens (ECDIS Chart, 360° Radar, Engine VMS)
function createMFDDisplayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  // Background frame
  ctx.fillStyle = '#050a10';
  ctx.fillRect(0, 0, 1024, 384);

  // ── SCREEN 1 (LEFT): ECDIS Electronic Navigational Chart ──
  ctx.fillStyle = '#071626';
  ctx.fillRect(16, 16, 310, 352);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 16, 310, 352);

  // Depth contours
  ctx.strokeStyle = '#005b82';
  ctx.lineWidth = 1.0;
  for (let y = 60; y < 350; y += 45) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.bezierCurveTo(90, y + 15, 200, y - 20, 320, y + 10);
    ctx.stroke();
  }

  // Coastline & Shoals
  ctx.fillStyle = '#1b3b28';
  ctx.beginPath();
  ctx.moveTo(20, 40);
  ctx.lineTo(120, 40);
  ctx.lineTo(80, 160);
  ctx.lineTo(20, 120);
  ctx.closePath();
  ctx.fill();

  // Active Waypoint Course Track
  ctx.strokeStyle = '#ffb300';
  ctx.lineWidth = 2.0;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(170, 320);
  ctx.lineTo(170, 80);
  ctx.stroke();
  ctx.setLineDash([]);

  // Vessel icon on chart
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.moveTo(170, 240);
  ctx.lineTo(162, 260);
  ctx.lineTo(178, 260);
  ctx.closePath();
  ctx.fill();

  // Header & Telemetry Text
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('ECDIS NAV 1', 28, 38);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#b0bec5';
  ctx.fillText('HDG: 358° T   SOG: 16.4 KT', 28, 60);
  ctx.fillText('POS: 43°44.2N  007°25.8E', 28, 76);
  ctx.fillText('DEPTH: 58.4 M', 28, 345);

  // ── SCREEN 2 (CENTER): 360° Marine Radar PPI ──
  ctx.fillStyle = '#040d14';
  ctx.fillRect(357, 16, 310, 352);
  ctx.strokeStyle = '#00ff66';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(357, 16, 310, 352);

  const cx = 357 + 155;
  const cy = 16 + 176;

  // Radar range rings (0.5NM, 1.0NM, 2.0NM, 3.0NM)
  ctx.strokeStyle = 'rgba(0, 255, 100, 0.25)';
  ctx.lineWidth = 1.0;
  for (const r of [35, 70, 105, 135]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(cx - 140, cy); ctx.lineTo(cx + 140, cy);
  ctx.moveTo(cx, cy - 140); ctx.lineTo(cx, cy + 140);
  ctx.stroke();

  // Radar phosphor sweep beam
  const sweepAngle = -Math.PI / 4;
  const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
  sweepGrad.addColorStop(0, 'rgba(0, 255, 100, 0.55)');
  sweepGrad.addColorStop(1, 'rgba(0, 255, 100, 0.0)');
  ctx.fillStyle = sweepGrad;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 135, sweepAngle - 0.35, sweepAngle);
  ctx.closePath();
  ctx.fill();

  // Radar target blips
  ctx.fillStyle = '#00ff66';
  ctx.shadowColor = '#00ff66';
  ctx.shadowBlur = 6;
  ctx.fillRect(cx + 45, cy - 65, 5, 5);
  ctx.fillRect(cx - 80, cy + 30, 6, 6);
  ctx.fillRect(cx + 60, cy + 85, 4, 4);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#00ff66';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('RADAR 3NM', 370, 38);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#a5d6a7';
  ctx.fillText('GAIN: 82%   SEA: AUTO', 370, 60);
  ctx.fillText('TARGETS: 3 ACQUIRED', 370, 345);

  // ── SCREEN 3 (RIGHT): Engine Telemetry & Vessel Management ──
  ctx.fillStyle = '#08101a';
  ctx.fillRect(698, 16, 310, 352);
  ctx.strokeStyle = '#ff9100';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(698, 16, 310, 352);

  ctx.fillStyle = '#ff9100';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('ENGINE VMS', 712, 38);

  // Dual Tachometer Dials (PORT & STBD)
  const drawTacho = (tx, ty, label, rpm) => {
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(tx, ty, 42, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();

    // Active RPM arc
    const pct = rpm / 2500;
    ctx.strokeStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(tx, ty, 42, Math.PI * 0.75, Math.PI * 0.75 + pct * Math.PI * 1.5);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${rpm}`, tx, ty + 4);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#90a4ae';
    ctx.fillText('RPM', tx, ty + 16);
    ctx.fillText(label, tx, ty + 56);
    ctx.textAlign = 'left';
  };

  drawTacho(768, 120, 'PORT MTU', 1850);
  drawTacho(938, 120, 'STBD MTU', 1850);

  // Digital status bars
  const drawBar = (by, label, val, unit, color) => {
    ctx.fillStyle = '#b0bec5';
    ctx.font = '11px monospace';
    ctx.fillText(label, 712, by);
    ctx.fillStyle = color;
    ctx.fillText(`${val} ${unit}`, 940, by);
    ctx.fillStyle = '#263238';
    ctx.fillRect(712, by + 4, 280, 6);
    ctx.fillStyle = color;
    ctx.fillRect(712, by + 4, 280 * 0.72, 6);
  };

  drawBar(210, 'COOLANT TEMP', '82', '°C', '#4caf50');
  drawBar(245, 'OIL PRESSURE', '5.4', 'BAR', '#4caf50');
  drawBar(280, 'TURBO BOOST', '2.2', 'BAR', '#ff9800');
  drawBar(315, 'FUEL CONSUMPTION', '174', 'L/H', '#00e5ff');

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Yacht Name & Port of Registry Transom Livery
function createTransomNameTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 128);

  // Polished gold leaf lettering
  ctx.fillStyle = '#dfb443';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.font = '800 42px "Cinzel", "Outfit", serif';
  ctx.textAlign = 'center';
  ctx.fillText('NAUTILUS', 256, 62);

  ctx.font = '600 18px "Outfit", sans-serif';
  ctx.fillStyle = '#c5a036';
  ctx.fillText('MONACO', 256, 96);

  return new THREE.CanvasTexture(canvas);
}

// SOLAS Lifebuoy Ring Texture
function createLifeRingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f4511e'; // Safety orange
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(128, 128, 56, 0, Math.PI * 2);
  ctx.fill();

  // White retro-reflective bands
  ctx.fillStyle = '#ffffff';
  for (let a = 0; a < 4; a++) {
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate((a * Math.PI) / 2);
    ctx.fillRect(-16, -122, 32, 28);
    ctx.restore();
  }

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NAUTILUS', 128, 48);

  return new THREE.CanvasTexture(canvas);
}

// ── 2. ADVANCED HYDRODYNAMIC HULL GENERATOR ──
// Constructs a continuous, smooth curved hull with flared clipper bow,
// hard spray rails, wineglass deadrise, and tumblehome sheer
function createHydrodynamicHullGeometry(length, beam, depth, segments) {
  const profileSteps = 28;
  const lengthSteps = segments;

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= lengthSteps; j++) {
    const zT = j / lengthSteps; // 0 = stern, 1 = bow
    const baseZ = (zT - 0.5) * length;

    // Longitudinal tapering & bow flare
    let beamScale = 1.0;
    let bowFlare = 0.0;

    if (zT > 0.60) {
      // Forward section to clipper bow - tapers smoothly to EXACTLY 0 at bow
      const bT = (zT - 0.60) / 0.40;
      beamScale = Math.max(0.0, (1.0 - Math.pow(bT, 1.4)) * (1.0 - bT));
      bowFlare = Math.pow(bT, 2.0) * 0.45; // Flares topsides outward
    } else if (zT < 0.12) {
      // Aft transom taper
      const sT = (0.12 - zT) / 0.12;
      beamScale = 1.0 - Math.pow(sT, 2.4) * 0.18;
    }

    for (let i = 0; i <= profileSteps; i++) {
      const pT = i / profileSteps; // 0 = keel, 1 = sheer cap

      // Vertical coordinate: keel to deck
      const y = -depth * (1.0 - pT) + depth * 0.12;

      // Clipper bow rake: topsides extend forward gracefully at the bow tip
      const bowRake = zT > 0.65 ? Math.pow((zT - 0.65) / 0.35, 1.8) * (0.12 + pT * 0.38) : 0.0;
      const z = baseZ + bowRake;

      // Deadrise cross-section
      let halfBeam;
      if (pT < 0.35) {
        // Deep V keel to turn of the bilge
        halfBeam = (beam / 2) * Math.pow(pT / 0.35, 0.7) * beamScale;
      } else if (pT < 0.82) {
        // Bilge to main waterline
        const midT = (pT - 0.35) / 0.47;
        halfBeam = (beam / 2) * (0.88 + midT * 0.12) * beamScale;
      } else {
        // Topsides with flare or tumblehome
        const topT = (pT - 0.82) / 0.18;
        halfBeam = (beam / 2) * (1.0 + topT * (bowFlare - 0.03)) * beamScale;
      }

      // Starboard vertex
      vertices.push(halfBeam, y, z);
      normals.push(1.0, 0.25, 0.0);
      uvs.push(zT, pT);

      // Port vertex
      vertices.push(-halfBeam, y, z);
      normals.push(-1.0, 0.25, 0.0);
      uvs.push(zT, pT);
    }
  }

  // Generate triangle mesh faces
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

    // Connect starboard and port along the bottom keel line (i = 0)
    const sk0 = j * vertsPerRing;
    const sk1 = (j + 1) * vertsPerRing;
    const pk0 = j * vertsPerRing + 1;
    const pk1 = (j + 1) * vertsPerRing + 1;
    indices.push(sk0, pk0, sk1);
    indices.push(pk0, pk1, sk1);
  }

  // Transom stern cap (j = 0)
  for (let i = 0; i < profileSteps; i++) {
    const s = i * 2;
    const s_next = (i + 1) * 2;
    const p = i * 2 + 1;
    const p_next = (i + 1) * 2 + 1;
    indices.push(s, s_next, p);
    indices.push(p, s_next, p_next);
  }

  // Bow knife-edge cap (j = lengthSteps)
  const lastRing = lengthSteps * vertsPerRing;
  for (let i = 0; i < profileSteps; i++) {
    const s = lastRing + i * 2;
    const s_next = lastRing + (i + 1) * 2;
    const p = lastRing + i * 2 + 1;
    const p_next = lastRing + (i + 1) * 2 + 1;
    indices.push(s, p, s_next);
    indices.push(p, p_next, s_next);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

function createYachtDeckGeometry(length, beam) {
  const steps = 36;
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= steps; j++) {
    const zT = j / steps;
    const baseZ = (zT - 0.5) * length;
    const bowRake = zT > 0.65 ? Math.pow((zT - 0.65) / 0.35, 1.8) * 0.50 : 0.0;
    const z = baseZ + bowRake;

    let beamScale = 1.0;
    if (zT > 0.60) {
      const bT = (zT - 0.60) / 0.40;
      beamScale = Math.max(0.0, (1.0 - Math.pow(bT, 1.4)) * (1.0 - bT));
    } else if (zT < 0.12) {
      const sT = (0.12 - zT) / 0.12;
      beamScale = 1.0 - Math.pow(sT, 2.4) * 0.18;
    }
    const halfBeam = (beam / 2) * beamScale;

    // Cross section: port sheer, center, starboard sheer
    vertices.push(-halfBeam, 1.30, z); // 0: port
    vertices.push(0.0, 1.32, z);       // 1: center camber
    vertices.push(halfBeam, 1.30, z);  // 2: starboard

    uvs.push(0.0, zT);
    uvs.push(0.5, zT);
    uvs.push(1.0, zT);
  }

  for (let j = 0; j < steps; j++) {
    const r0 = j * 3;
    const r1 = (j + 1) * 3;

    // Port quad
    indices.push(r0, r1, r0 + 1);
    indices.push(r0 + 1, r1, r1 + 1);

    // Starboard quad
    indices.push(r0 + 1, r1 + 1, r0 + 2);
    indices.push(r0 + 2, r1 + 1, r1 + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export class Ship {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'LuxuryExplorerYacht';

    // Interactive animated parts
    this.propellers = [];
    this.rudders = [];
    this.radarAntennas = [];
    this.flag = null;
    this.searchlights = [];
    this.underwaterLights = [];
    this.helmWheel = null;
    this.throttleLevers = [];
    this.wipers = [];
    this.anemometer = null;
    this.lightsOn = true;

    // Procedural fallback root
    this.proceduralRoot = new THREE.Group();
    this.buildShip();
    this.group.add(this.proceduralRoot);
    this.scene.add(this.group);

    // Load high-detail Blender yacht model (procedural hull serves as instant fallback)
    this.loadBlenderModel();
  }

  buildShip() {
    this.teak = createTeakTextures();
    this.mfdTexture = createMFDDisplayTexture();
    const teak = this.teak;
    const mfdTexture = this.mfdTexture;
    const transomTexture = createTransomNameTexture();
    const lifeRingTexture = createLifeRingTexture();

    // ── PBR ULTRA-REALISTIC MATERIALS ──
    const matHullDark = new THREE.MeshStandardMaterial({
      color: 0x091422, // Deep metallic oceanic navy
      roughness: 0.14,
      metalness: 0.38,
      side: THREE.DoubleSide
    });

    const matHullWhite = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Crisp yacht gelcoat
      roughness: 0.12,
      metalness: 0.18,
      side: THREE.DoubleSide
    });

    const matBootStripeRed = new THREE.MeshStandardMaterial({
      color: 0xb51c14, // Crimson boot-stripe
      roughness: 0.22,
      metalness: 0.15
    });

    const matGoldAccent = new THREE.MeshStandardMaterial({
      color: 0xd6ad42,
      roughness: 0.25,
      metalness: 0.85
    });

    const matDeckTeak = new THREE.MeshStandardMaterial({
      map: teak.texture,
      bumpMap: teak.bumpMap,
      bumpScale: 0.035,
      roughness: 0.62,
      metalness: 0.02
    });

    const matGlassTint = new THREE.MeshStandardMaterial({
      color: 0x06111a,
      roughness: 0.02,
      metalness: 0.95,
      transparent: true,
      opacity: 0.72
    });

    const matGlassClear = new THREE.MeshStandardMaterial({
      color: 0xdaeffa,
      roughness: 0.05,
      metalness: 0.12,
      transparent: true,
      opacity: 0.18
    });

    const matChrome316 = new THREE.MeshStandardMaterial({
      color: 0xf0f4f8,
      metalness: 0.98,
      roughness: 0.08
    });

    const matBrassMarine = new THREE.MeshStandardMaterial({
      color: 0xddb042,
      metalness: 0.92,
      roughness: 0.24
    });

    const matConsoleLeather = new THREE.MeshStandardMaterial({
      color: 0x14181d, // Anti-reflective charcoal dashboard
      roughness: 0.88,
      metalness: 0.05
    });

    const matMFD = new THREE.MeshBasicMaterial({
      map: mfdTexture
    });

    const matUpholstery = new THREE.MeshStandardMaterial({
      color: 0xf1efe9, // Marine cream sunpad fabric
      roughness: 0.85,
      metalness: 0.02
    });

    const matNavyPiping = new THREE.MeshStandardMaterial({
      color: 0x0f2338,
      roughness: 0.75
    });

    const root = new THREE.Group();

    // ── 1. LOWER HULL & RUNNING SURFACE (Watertight Hydrodynamic Monohull) ──
    const hullGeo = createHydrodynamicHullGeometry(18.5, 5.2, 2.0, 36);
    const hull = new THREE.Mesh(hullGeo, matHullDark);
    hull.castShadow = true;
    hull.receiveShadow = true;
    root.add(hull);

    // Upper topsides (pure yacht gelcoat, perfectly matching the hull taper)
    const upperHullGeo = createHydrodynamicHullGeometry(18.5, 5.2, 0.85, 36);
    const upperHull = new THREE.Mesh(upperHullGeo, matHullWhite);
    upperHull.position.y = 0.85;
    upperHull.castShadow = true;
    root.add(upperHull);

    // Continuous stainless steel rub-rail along sheerline
    for (const sx of [-2.60, 2.60]) {
      const rubRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 15.6, 8),
        matChrome316
      );
      rubRail.rotation.x = Math.PI / 2;
      rubRail.position.set(sx, 1.38, -0.6);
      root.add(rubRail);
    }

    // Recessed bow anchor pockets (Hawse pipes) positioned right on the bow flare
    for (const sx of [-0.68, 0.68]) {
      const hawsePocket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.22, 0.16, 12),
        matHullDark
      );
      hawsePocket.rotation.z = (sx > 0 ? -1 : 1) * Math.PI / 2;
      hawsePocket.position.set(sx, 0.88, 8.1);
      root.add(hawsePocket);

      // Stainless anchor fluke and shank
      const anchorShank = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.52, 0.08),
        matChrome316
      );
      anchorShank.rotation.x = 0.45;
      anchorShank.position.set(sx * 0.98, 0.88, 8.1);
      root.add(anchorShank);

      const anchorFluke = new THREE.Mesh(
        new THREE.ConeGeometry(0.20, 0.44, 3),
        matChrome316
      );
      anchorFluke.rotation.x = -0.55;
      anchorFluke.position.set(sx * 1.01, 0.72, 8.22);
      root.add(anchorFluke);
    }

    // ── 2. AFT BEACH CLUB & TEAK SWIM PLATFORM (Firmly Attached to Transom) ──
    const swimPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.20, 1.25),
      matDeckTeak
    );
    swimPlatform.position.set(0, 0.12, -9.65);
    swimPlatform.receiveShadow = true;
    root.add(swimPlatform);

    // Heavy-duty stainless steel transom cantilever support knees
    for (const bx of [-1.5, -0.5, 0.5, 1.5]) {
      const knee = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.45, 1.15),
        matChrome316
      );
      knee.position.set(bx, -0.15, -9.6);
      root.add(knee);
    }

    // Aft transom nameplate
    const transomPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.9),
      new THREE.MeshBasicMaterial({ map: transomTexture, transparent: true })
    );
    transomPlate.rotation.y = Math.PI;
    transomPlate.position.set(0, 0.85, -9.08);
    root.add(transomPlate);

    // Twin companionway teak stairs firmly linking main deck (Y=1.2) to swim platform (Y=0.12)
    for (const sx of [-1.85, 1.85]) {
      for (let s = 0; s < 4; s++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(0.68, 0.16, 0.32),
          matDeckTeak
        );
        step.position.set(sx, 0.22 + s * 0.24, -9.45 + s * 0.25);
        step.castShadow = true;
        root.add(step);

        // Recessed blue LED step courtesy light
        const stepLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 4, 4),
          new THREE.MeshBasicMaterial({ color: 0x00e5ff })
        );
        stepLight.position.set(sx + (sx > 0 ? 0.30 : -0.30), 0.32 + s * 0.24, -9.45 + s * 0.25);
        root.add(stepLight);
      }
    }

    // ── 3. MAIN TEAK DECK (Seamless cambered deck matching yacht sheerline) ──
    const mainDeckGeo = createYachtDeckGeometry(18.5, 5.2);
    const mainDeck = new THREE.Mesh(mainDeckGeo, matDeckTeak);
    mainDeck.receiveShadow = true;
    root.add(mainDeck);

    // Foredeck Sunpad Lounge Upholstery
    const sunpadBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.24, 3.2),
      matUpholstery
    );
    sunpadBase.position.set(0, 1.44, 5.8);
    sunpadBase.castShadow = true;
    root.add(sunpadBase);

    // Sunpad headrest bolster with navy piping
    const bolster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 2.38, 12),
      matNavyPiping
    );
    bolster.rotation.z = Math.PI / 2;
    bolster.position.set(0, 1.62, 7.25);
    root.add(bolster);

    // Foredeck Chain Locker Flush Hatch
    const chainHatch = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.05, 0.9),
      matChrome316
    );
    chainHatch.position.set(0, 1.34, 8.8);
    root.add(chainHatch);

    // Heavy-Duty Hydraulic Anchor Windlass Winch
    const windlassBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.28, 0.65),
      matChrome316
    );
    windlassBase.position.set(0, 1.42, 8.1);
    root.add(windlassBase);

    const windlassDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.75, 12),
      matChrome316
    );
    windlassDrum.rotation.z = Math.PI / 2;
    windlassDrum.position.set(0, 1.62, 8.1);
    root.add(windlassDrum);

    // Heavy-duty stainless mooring bollards (bow, midships, stern)
    const bollardPositions = [
      [-1.3, 1.42, 8.4], [1.3, 1.42, 8.4],
      [-2.35, 1.42, 2.5], [2.35, 1.42, 2.5],
      [-2.35, 1.42, -5.5], [2.35, 1.42, -5.5],
      [-2.1, 0.22, -9.6], [2.1, 0.22, -9.6]
    ];
    for (const [bx, by, bz] of bollardPositions) {
      const bBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.32), matChrome316);
      bBase.position.set(bx, by, bz);
      root.add(bBase);

      for (const dz of [-0.08, 0.08]) {
        const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8), matChrome316);
        horn.position.set(bx, by + 0.09, bz + dz);
        root.add(horn);
      }
    }

    // Foredeck safety pulpit rail with precision stanchions
    for (let z = 3.2; z <= 9.0; z += 1.3) {
      for (const sx of [-2.35, 2.35]) {
        const taper = 1.0 - Math.max(0, (z - 5.5) / 4.0) * 0.52;
        const stanchion = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.78, 6),
          matChrome316
        );
        stanchion.position.set(sx * taper, 1.75, z);
        root.add(stanchion);
      }
    }
    // Double lifeline cables
    for (const sx of [-2.35, 2.35]) {
      for (const hy of [1.68, 2.05]) {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 6.2, 4),
          matChrome316
        );
        cable.rotation.x = Math.PI / 2;
        cable.position.set(sx * 0.78, hy, 6.0);
        root.add(cable);
      }
    }

    // ── 4. SUPERSTRUCTURE: LOWER SALOON ──
    const saloon = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 1.7, 9.6),
      matHullWhite
    );
    saloon.position.set(0, 2.12, -1.0);
    saloon.castShadow = true;
    root.add(saloon);

    // Flush dark panoramic saloon windows
    const saloonWindows = new THREE.Mesh(
      new THREE.BoxGeometry(3.88, 0.85, 8.6),
      matGlassTint
    );
    saloonWindows.position.set(0, 2.22, -1.0);
    root.add(saloonWindows);

    // Lateral engine room ventilation air-intake grilles
    for (const sx of [-1.92, 1.92]) {
      const grille = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.55, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.9 })
      );
      grille.position.set(sx, 1.75, -4.5);
      root.add(grille);

      // Horizontal intake slats
      for (let sl = -0.22; sl <= 0.22; sl += 0.08) {
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.02, 2.15),
          matChrome316
        );
        slat.position.set(sx, 1.75 + sl, -4.5);
        root.add(slat);
      }
    }

    // Aft cockpit dining table & seating
    const aftTable = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.08, 1.1),
      matDeckTeak
    );
    aftTable.position.set(0, 1.85, -6.6);
    aftTable.castShadow = true;
    root.add(aftTable);

    for (const tx of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55), matChrome316);
      leg.position.set(tx, 1.55, -6.6);
      root.add(leg);
    }

    const aftSettee = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.45, 0.9),
      matUpholstery
    );
    aftSettee.position.set(0, 1.55, -7.6);
    aftSettee.castShadow = true;
    root.add(aftSettee);

    // ── 5. WHEELHOUSE / BRIDGE & FIRST-PERSON HELM COCKPIT ──
    // Lower bridge base coaming (below dashboard, stops at Y=3.00)
    const bridgeBase = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 0.65, 4.0),
      matHullWhite
    );
    bridgeBase.position.set(0, 2.70, 0.4);
    bridgeBase.castShadow = true;
    root.add(bridgeBase);

    // Aft cabin bulkhead with entry door
    const aftBridgeWall = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 1.15, 0.12),
      matHullWhite
    );
    aftBridgeWall.position.set(0, 3.60, -1.55);
    aftBridgeWall.castShadow = true;
    root.add(aftBridgeWall);

    // Side coamings / waist-level bulwarks with continuous framing, A/B pillars, and wing mirrors
    for (const sx of [-1.60, 1.60]) {
      const sideCoaming = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.55, 3.8),
        matHullWhite
      );
      sideCoaming.position.set(sx, 3.30, 0.35);
      root.add(sideCoaming);

      // Continuous side panoramic glass windows (connecting to front windscreen at Z = 2.22)
      const sideGlass = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.65, 2.65),
        matGlassClear
      );
      sideGlass.position.set(sx, 3.82, 0.95);
      root.add(sideGlass);

      // Top and bottom chrome window trim
      for (const ty of [3.50, 4.14]) {
        const trim = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.03, 2.65),
          matChrome316
        );
        trim.position.set(sx, ty, 0.95);
        root.add(trim);
      }

      // Structural A-Pillar (connects windscreen corner Y=3.0 to hardtop Y=4.22)
      const aPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.15, 0.08),
        matHullWhite
      );
      aPillar.position.set(sx, 3.65, 2.22);
      aPillar.rotation.x = 0.22;
      root.add(aPillar);

      // Structural B-Pillar (connects mid coaming Y=3.3 to hardtop Y=4.22)
      const bPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.85, 0.07),
        matHullWhite
      );
      bPillar.position.set(sx, 3.75, -0.35);
      root.add(bPillar);

      // Contoured Chrome Marine Rear-View Wing Mirrors (firmly mounted on A-pillars)
      const mirrorStalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.22),
        matChrome316
      );
      mirrorStalk.rotation.z = Math.PI / 2;
      mirrorStalk.position.set(sx > 0 ? sx + 0.11 : sx - 0.11, 3.65, 2.15);
      root.add(mirrorStalk);

      const mirrorHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.22, 0.14),
        matChrome316
      );
      mirrorHousing.position.set(sx > 0 ? sx + 0.22 : sx - 0.22, 3.65, 2.15);
      root.add(mirrorHousing);

      const mirrorGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.20),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.98, roughness: 0.02 })
      );
      mirrorGlass.rotation.y = Math.PI;
      mirrorGlass.position.set(sx > 0 ? sx + 0.22 : sx - 0.22, 3.65, 2.08);
      root.add(mirrorGlass);
    }

    // Panoramic forward windscreen: 15° forward rake (reverse sheer)
    // Crystal clear glass allowing 100% unobstructed view of foredeck and sea
    const frontWindscreen = new THREE.Mesh(
      new THREE.BoxGeometry(3.18, 0.88, 0.03),
      matGlassClear
    );
    frontWindscreen.rotation.x = 0.22;
    frontWindscreen.position.set(0, 3.65, 2.22);
    root.add(frontWindscreen);

    // Dual Pantograph Windshield Wipers (resting at base of windshield)
    this.wipers = [];
    for (const wx of [-0.75, 0.75]) {
      const wiperGroup = new THREE.Group();
      wiperGroup.position.set(wx, 3.22, 2.12);
      wiperGroup.rotation.x = 0.22;

      const wiperArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.42, 0.012),
        new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.6 })
      );
      wiperArm.position.y = 0.21;
      wiperGroup.add(wiperArm);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.40, 0.008),
        new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.9 })
      );
      blade.position.set(0, 0.21, 0.01);
      wiperGroup.add(blade);

      root.add(wiperGroup);
      this.wipers.push(wiperGroup);
    }

    // ── HIGH-TECH GLASS BRIDGE HELM CONSOLE (Visible in Bridge Camera Mode) ──
    const helmDashboard = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.28, 0.90),
      matConsoleLeather
    );
    helmDashboard.position.set(0, 2.92, 1.88);
    helmDashboard.rotation.x = -0.22;
    helmDashboard.castShadow = true;
    root.add(helmDashboard);

    // Triple Glass Bridge MFD Screens
    const mfdScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 0.28),
      matMFD
    );
    mfdScreenMesh.rotation.x = -0.22;
    mfdScreenMesh.position.set(0, 3.02, 1.82);
    root.add(mfdScreenMesh);

    // Angled steering column mounting hub
    const steerColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.22, 12),
      matChrome316
    );
    steerColumn.rotation.x = -0.55;
    steerColumn.position.set(-0.45, 3.12, 1.68);
    root.add(steerColumn);

    // 3-Spoke Marine Steering Wheel (Rotates with Rudder Input - fully elevated & visible!)
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(-0.45, 3.28, 1.56);
    wheelGroup.rotation.x = -0.55;

    const wheelRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.022, 12, 24),
      matChrome316
    );
    wheelGroup.add(wheelRim);

    const wheelHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12),
      matBrassMarine
    );
    wheelHub.rotation.x = Math.PI / 2;
    wheelGroup.add(wheelHub);

    for (let sp = 0; sp < 3; sp++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.17, 0.015),
        matChrome316
      );
      spoke.rotation.z = (sp * Math.PI * 2) / 3;
      spoke.position.set(Math.sin((sp * Math.PI * 2) / 3) * 0.08, Math.cos((sp * Math.PI * 2) / 3) * 0.08, 0);
      wheelGroup.add(spoke);
    }
    root.add(wheelGroup);
    this.helmWheel = wheelGroup;

    // Twin Chrome Engine Throttle Quadrant (Levers move forward together with throttle)
    const throttleBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.22),
      matChrome316
    );
    throttleBase.position.set(0.22, 3.06, 1.68);
    root.add(throttleBase);

    this.throttleLevers = [];
    for (const lx of [-0.042, 0.042]) {
      const leverGroup = new THREE.Group();
      leverGroup.position.set(0.22 + lx, 3.10, 1.68);

      const leverStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.14),
        matChrome316
      );
      leverStem.position.y = 0.07;
      leverGroup.add(leverStem);

      // Ergonomic teardrop marine throttle handle
      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 8, 8),
        new THREE.MeshStandardMaterial({ color: lx < 0 ? 0xd32f2f : 0x1976d2, roughness: 0.3 })
      );
      knob.scale.set(1.0, 1.3, 1.6);
      knob.position.y = 0.14;
      leverGroup.add(knob);

      root.add(leverGroup);
      this.throttleLevers.push(leverGroup);
    }

    // Lighted Magnetic Steering Compass in Chrome Binnacle Dome
    const compassBinnacle = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 12),
      matChrome316
    );
    compassBinnacle.position.set(0, 3.16, 1.95);
    root.add(compassBinnacle);

    const compassCard = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    compassCard.rotation.x = -Math.PI / 2;
    compassCard.position.set(0, 3.21, 1.95);
    root.add(compassCard);

    // Twin High-Back Captain & Co-Pilot Helm Bucket Chairs
    for (const cx of [-0.55, 0.55]) {
      const seatPedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.65, 8),
        matChrome316
      );
      seatPedestal.position.set(cx, 2.65, 0.85);
      root.add(seatPedestal);

      const seatBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.14, 0.55),
        matConsoleLeather
      );
      seatBase.position.set(cx, 2.98, 0.85);
      root.add(seatBase);

      const seatBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.72, 0.14),
        matConsoleLeather
      );
      seatBack.position.set(cx, 3.38, 0.62);
      root.add(seatBack);
    }

    // ── 6. FLYBRIDGE HARDTOP, RADAR ARCH & COMMS TOWER ──
    const hardtop = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.12, 4.8),
      matHullWhite
    );
    hardtop.position.set(0, 4.22, 0.35);
    hardtop.castShadow = true;
    root.add(hardtop);

    // Recessed warm LED flybridge downlights
    for (let z = -1.2; z <= 1.8; z += 1.4) {
      for (const hx of [-1.2, 1.2]) {
        const downlight = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xffe0b2 })
        );
        downlight.position.set(hx, 4.15, z);
        root.add(downlight);
      }
    }

    // Raked aerodynamic radar arch
    const arch = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.95, 0.45),
      matHullWhite
    );
    arch.position.set(0, 4.65, -0.9);
    arch.castShadow = true;
    root.add(arch);

    // Twin Rotating Open-Array Marine Radars (Furuno 6ft Antenna style)
    for (const rx of [-0.85, 0.85]) {
      const radarPedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.35, 12),
        matHullWhite
      );
      radarPedestal.position.set(rx, 5.25, -0.9);
      root.add(radarPedestal);

      const scannerGroup = new THREE.Group();
      scannerGroup.position.set(rx, 5.5, -0.9);

      const scannerBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.12, 0.18),
        matChrome316
      );
      scannerGroup.add(scannerBar);

      // Blue accent stripe on radar bar
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.58, 0.03, 0.19),
        new THREE.MeshBasicMaterial({ color: 0x0055ff })
      );
      scannerGroup.add(stripe);

      root.add(scannerGroup);
      this.radarAntennas.push(scannerGroup);
    }

    // Dual KVH Satellite Communications Domes
    const domeGeo = new THREE.SphereGeometry(0.42, 16, 16);
    for (const dx of [-0.95, 0.95]) {
      const domeBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.42, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0x212529, roughness: 0.8 })
      );
      domeBase.position.set(dx, 4.95, 0.8);
      root.add(domeBase);

      const dome = new THREE.Mesh(domeGeo, matHullWhite);
      dome.position.set(dx, 5.35, 0.8);
      root.add(dome);
    }

    // Central Communications & Lighting Mast
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.09, 2.8, 8),
      matChrome316
    );
    mast.position.set(0, 5.75, 0.2);
    root.add(mast);

    // Dual Chrome Marine Air Horn Trumpets
    for (const hx of [-0.22, 0.22]) {
      const trumpet = new THREE.Mesh(
        new THREE.ConeGeometry(0.10, 0.55, 12),
        matChrome316
      );
      trumpet.rotation.x = -Math.PI / 2;
      trumpet.position.set(hx, 5.85, 0.45);
      root.add(trumpet);
    }

    // Dual VHF Whip Aerials (angled 15° aft)
    for (const ax of [-0.55, 0.55]) {
      const whip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.022, 2.2, 4),
        matChrome316
      );
      whip.position.set(ax, 6.7, -0.2);
      whip.rotation.x = -0.22;
      whip.rotation.z = ax * 0.12;
      root.add(whip);
    }

    // Spinning Wind Anemometer
    const anemometerGroup = new THREE.Group();
    anemometerGroup.position.set(0, 7.25, 0.2);
    const anemVane = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), matChrome316);
    anemVane.rotation.x = Math.PI / 2;
    anemometerGroup.add(anemVane);
    root.add(anemometerGroup);
    this.anemometer = anemometerGroup;

    // Dual High-Power Motorized Searchlights
    this.searchlights = [];
    for (const sx of [-0.95, 0.95]) {
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.32, 12),
        matChrome316
      );
      housing.rotation.x = Math.PI / 2;
      housing.position.set(sx, 4.35, 2.65);
      root.add(housing);

      const spot = new THREE.SpotLight(0xfffaee, 6.0, 180, Math.PI / 6, 0.45, 1.2);
      spot.position.set(sx, 4.35, 2.75);
      const spotTarget = new THREE.Object3D();
      spotTarget.position.set(sx * 0.3, -0.6, 60);
      root.add(spotTarget);
      spot.target = spotTarget;
      root.add(spot);
      this.searchlights.push(spot);
    }

    // Underwater Transom Wake Lights (Turquoise Glow)
    this.underwaterLights = [];
    for (const sx of [-1.8, 0, 1.8]) {
      const underGlow = new THREE.PointLight(0x00e5ff, 3.5, 18);
      underGlow.position.set(sx, -0.5, -9.5);
      root.add(underGlow);
      this.underwaterLights.push(underGlow);
    }

    // ── 7. NAVIGATION LIGHTS (PORT, STARBOARD, MASTHEAD, STERN) ──
    const navRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.5 })
    );
    navRed.position.set(-1.75, 3.85, 0.8);
    root.add(navRed);

    const navGreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x00ff33, emissive: 0x00ff22, emissiveIntensity: 3.5 })
    );
    navGreen.position.set(1.75, 3.85, 0.8);
    root.add(navGreen);

    const navMasthead = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.0 })
    );
    navMasthead.position.set(0, 7.15, 0.2);
    root.add(navMasthead);

    // ── 8. LIFESAVING & SAFETY EQUIPMENT ──
    // Dual SOLAS Lifebuoy Rings in quick-release bridge wing brackets
    for (const sx of [-1.82, 1.82]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.065, 8, 16),
        new THREE.MeshStandardMaterial({ map: lifeRingTexture, roughness: 0.6 })
      );
      ring.position.set(sx, 3.45, -0.4);
      ring.rotation.y = Math.PI / 2;
      root.add(ring);
    }

    // Dual 12-Person SOLAS Liferaft Canisters on quick-release cradles
    for (const sx of [-1.45, 1.45]) {
      const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.95), matChrome316);
      cradle.position.set(sx, 4.35, -1.8);
      root.add(cradle);

      const canister = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.85, 12),
        matHullWhite
      );
      canister.rotation.x = Math.PI / 2;
      canister.position.set(sx, 4.52, -1.8);
      root.add(canister);
    }

    // ── 9. TWIN PROPULSION, 5-BLADE BRONZE PROPS & HYDRAULIC SPADE RUDDERS ──
    this.propellers = [];
    this.rudders = [];

    for (const sx of [-1.20, 1.20]) {
      // 1. Bronze Shaft Log / Hull penetration collar (Z = -5.80, Y = -0.85)
      const shaftLog = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 0.35, 12),
        matBrassMarine
      );
      shaftLog.rotation.x = Math.PI / 2 + 0.1685;
      shaftLog.position.set(sx, -0.85, -5.80);
      root.add(shaftLog);

      // 2. Continuous 316 Stainless / Monel Propeller Shaft (sloping down from hull to Z = -8.15)
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 2.38, 12),
        matBrassMarine
      );
      shaft.rotation.x = Math.PI / 2 + 0.1685;
      shaft.position.set(sx, -1.05, -6.975);
      root.add(shaft);

      // 3. Heavy-Duty Bronze P-Bracket Strut holding the cutless bearing firmly to the hull
      const strutHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.38, 12),
        matBrassMarine
      );
      strutHub.rotation.x = Math.PI / 2 + 0.1685;
      strutHub.position.set(sx, -1.24, -8.05);
      root.add(strutHub);

      // Vertical V-Strut arm connecting hub directly UP to the hull deadrise at Y = -0.70
      const strutArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.54, 10),
        matBrassMarine
      );
      strutArm.position.set(sx, -0.97, -8.05);
      root.add(strutArm);

      // Rudder port collar on hull deadrise at Y = -0.62
      const rudderCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.10, 0.12, 12),
        matBrassMarine
      );
      rudderCollar.position.set(sx, -0.62, -8.80);
      root.add(rudderCollar);

      // 4. 5-Blade Hydrodynamic Bronze Propeller firmly mounted onto the shaft hub
      const propGroup = new THREE.Group();
      propGroup.position.set(sx, -1.26, -8.22);

      const hub = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 12), matBrassMarine);
      hub.rotation.x = -Math.PI / 2;
      propGroup.add(hub);

      // 5 skewed bronze blades
      for (let b = 0; b < 5; b++) {
        const angle = (b * Math.PI * 2) / 5;
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.44, 0.025),
          matBrassMarine
        );
        blade.rotation.z = angle;
        blade.rotation.y = 0.35;
        blade.position.y = 0.20 * Math.sin(angle);
        blade.position.x = 0.20 * Math.cos(angle);
        propGroup.add(blade);
      }
      root.add(propGroup);
      this.propellers.push(propGroup);

      // 5. Hydraulic Spade Rudder directly behind propeller wash, stock entering hull collar at Y = -0.62
      const rudderGroup = new THREE.Group();
      rudderGroup.position.set(sx, -0.62, -8.80); // Pivot at hull collar

      const rudderStock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 0.75, 8),
        matChrome316
      );
      rudderStock.position.set(0, -0.375, 0);
      rudderGroup.add(rudderStock);

      const rudderBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.75, 0.55),
        matChrome316
      );
      rudderBlade.position.set(0, -0.55, -0.14);
      rudderGroup.add(rudderBlade);

      root.add(rudderGroup);
      this.rudders.push(rudderGroup);
    }

    // Stainless hydraulic trim tabs at transom
    for (const sx of [-1.6, 1.6]) {
      const trimTab = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.045, 0.52),
        matChrome316
      );
      trimTab.position.set(sx, -0.22, -9.10);
      root.add(trimTab);
    }

    // ── 10. AFT ENSIGN YACHT FLAG ──
    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 2.3),
      matChrome316
    );
    staff.rotation.x = -0.26;
    staff.position.set(0, 1.88, -9.2);
    root.add(staff);

    const flagGeo = new THREE.PlaneGeometry(1.35, 0.85, 8, 4);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0x1f4e79,
      roughness: 0.75,
      side: THREE.DoubleSide
    });
    this.flag = new THREE.Mesh(flagGeo, flagMat);
    this.flag.position.set(0.68, 2.22, -9.3);
    root.add(this.flag);

    this.proceduralRoot.add(root);
  }

  loadBlenderModel() {
    const loader = new GLTFLoader();
    loader.load(
      'assets/models/yacht.glb',
      (gltf) => {
        const model = gltf.scene;
        model.name = 'Blender_Yacht_Model';

        // Clear procedural arrays so only the Blender model's components receive updates
        this.propellers = [];
        this.rudders = [];
        this.radarAntennas = [];
        this.throttleLevers = [];

        // Traverse and enhance PBR materials & link animated components
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // 1. Crystal-Clear Forward Windscreen
            if (child.name.includes('Windscreen') || (child.material && child.material.name.includes('Marine_Glass_Clear'))) {
              child.material = new THREE.MeshPhysicalMaterial({
                color: 0xdaeffa,
                transparent: true,
                opacity: 0.16,
                roughness: 0.04,
                metalness: 0.06,
                transmission: 0.94,
                ior: 1.52,
                depthWrite: false,
                side: THREE.DoubleSide
              });
            }
            // 2. High-Tech Glass Bridge MFD Displays (ECDIS Chart, Radar, Engine VMS)
            else if (child.name.includes('MFD') || (child.material && child.material.name.includes('MFD'))) {
              if (this.mfdTexture) {
                child.material = new THREE.MeshBasicMaterial({
                  map: this.mfdTexture
                });
              }
            }
            // 3. Burmese Teak Decking with Caulking Seams
            else if (child.name.includes('Deck') || (child.material && child.material.name.includes('Teak'))) {
              if (this.teak) {
                child.material = new THREE.MeshStandardMaterial({
                  map: this.teak.texture,
                  bumpMap: this.teak.bumpMap,
                  bumpScale: 0.035,
                  roughness: 0.65,
                  metalness: 0.02
                });
              }
            }
            // 4. Tinted Side Privacy Glass
            else if (child.material && child.material.name.includes('Marine_Glass_Tint')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x050e16,
                roughness: 0.05,
                metalness: 0.92,
                transparent: true,
                opacity: 0.72
              });
            }
          }

          // Link interactive sub-assemblies (Empty pivots or meshes)
          if (child.name === 'Propeller_L' || child.name === 'Propeller_R') {
            this.propellers.push(child);
          }
          if (child.name === 'Rudder_L' || child.name === 'Rudder_R') {
            this.rudders.push(child);
          }
          if (child.name === 'Radar_Scanner') {
            this.radarAntennas.push(child);
          }
          if (child.name === 'Helm_Wheel') {
            this.helmWheel = child;
          }
          if (child.name === 'Throttle_Levers') {
            this.throttleLevers.push(child);
          }
        });

        // Hide procedural fallback geometry now that high-detail Blender model is active
        if (this.proceduralRoot) {
          this.proceduralRoot.visible = false;
        }

        this.group.add(model);
        console.log('Nautilus 3D: High-detail Blender sport yacht model successfully loaded with PBR optics.');
      },
      undefined,
      (err) => {
        console.warn('Nautilus 3D: Blender yacht.glb loading fallback to procedural hull:', err);
      }
    );
  }

  update(dt, throttle, rudderInput, speedKnots, time) {
    // 1. Dynamic propeller rotation proportional to engine power
    const propSpeed = throttle * 48.0;
    for (const prop of this.propellers) {
      prop.rotation.z += propSpeed * dt;
    }

    // 2. Rudder hydraulic steering deflection
    for (const rudder of this.rudders) {
      rudder.rotation.y = -rudderInput * 0.58;
    }

    // 3. Continuous radar antenna sweeps
    for (const radar of this.radarAntennas) {
      radar.rotation.y += 4.5 * dt;
    }

    // 4. Anemometer spinning with wind speed
    if (this.anemometer) {
      this.anemometer.rotation.y += (speedKnots * 0.35 + 2.0) * dt;
    }

    // 5. Interactive bridge steering wheel turning with rudder
    if (this.helmWheel) {
      this.helmWheel.rotation.z = -rudderInput * 2.4;
    }

    // 6. Interactive engine throttle levers moving with throttle (both levers move forward together)
    for (const lever of this.throttleLevers) {
      lever.rotation.x = throttle * 0.72;
    }

    // 7. Windshield wipers oscillation
    for (const wiper of this.wipers) {
      const sweep = Math.sin(time * 3.5) * 0.45;
      wiper.rotation.z = sweep;
    }

    // 8. Cloth flutter on aft ensign flag
    if (this.flag) {
      const flutter = Math.sin(time * 11.0 + this.group.position.z * 0.25) * 0.24;
      this.flag.rotation.y = flutter + (rudderInput * 0.25);
    }
  }

  toggleLights() {
    this.lightsOn = !this.lightsOn;
    for (const l of this.searchlights) {
      l.intensity = this.lightsOn ? 6.0 : 0.0;
    }
    for (const l of this.underwaterLights) {
      l.intensity = this.lightsOn ? 3.5 : 0.0;
    }
    return this.lightsOn;
  }
}
