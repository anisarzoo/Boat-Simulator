// Archipelago Islands, Sea Stacks, and Historic Coastal Lighthouse with Rotating Fresnel Light Beam
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Archipelago {
  constructor(scene) {
    this.scene = scene;
    this.islands = [];
    this.lighthouseBeams = [];
    this.lighthouseTower = null;
    this.palmInstances = [];
    this.rockInstances = [];

    this.initIslands();
    this.initLighthouse();
    this.loadBlenderFoliage();
  }

  // ── 1. PROCEDURAL ROCKY ISLAND GEOMETRY GENERATOR ──
  createIslandGeometry(radius, height, segments) {
    const geo = new THREE.CylinderGeometry(radius * 0.45, radius, height, segments, 8);
    const pos = geo.attributes.position;

    // Organic mountain/cliff sculpting using multi-frequency displacement
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      const angle = Math.atan2(z, x);
      const dist = Math.sqrt(x * x + z * z);

      // Craggy cliff facets
      const crag1 = Math.sin(angle * 5.0) * Math.cos(y * 0.25) * 6.0;
      const crag2 = Math.cos(angle * 9.0 + y * 0.4) * 3.5;
      const crag3 = Math.sin(angle * 17.0) * 1.8;

      if (dist > 1.0) {
        const factor = 1.0 + (crag1 + crag2 + crag3) / radius;
        pos.setX(i, x * factor);
        pos.setZ(i, z * factor);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }

  // ── PROCEDURAL COASTAL PINE TREE GENERATOR ──
  createPineTree(height = 9.0, lean = 0.08) {
    const group = new THREE.Group();

    const matTrunk = new THREE.MeshStandardMaterial({
      color: 0x3d2b1f,
      roughness: 0.9,
      metalness: 0.05
    });

    const matNeedles = new THREE.MeshStandardMaterial({
      color: 0x1e3f24, // Deep coastal pine green
      roughness: 0.85
    });

    const matNeedlesTop = new THREE.MeshStandardMaterial({
      color: 0x2b5532, // Fresh needle tip green
      roughness: 0.8
    });

    // Tapered trunk
    const trunkH = height * 0.45;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.48, trunkH, 7);
    trunkGeo.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeo, matTrunk);
    trunk.castShadow = true;
    group.add(trunk);

    // 4 Layered Conical Needle Canopies
    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const frac = t / (tiers - 1);
      const tierH = (height * 0.3) * (1.1 - frac * 0.35);
      const tierR = (height * 0.28) * (1.0 - frac * 0.65);
      const coneGeo = new THREE.ConeGeometry(tierR, tierH, 8);
      coneGeo.translate(0, tierH * 0.45, 0);
      const cone = new THREE.Mesh(coneGeo, t === tiers - 1 ? matNeedlesTop : matNeedles);
      cone.position.y = trunkH * 0.65 + t * (height * 0.17);
      cone.rotation.y = (t * 1.6);
      cone.castShadow = true;
      group.add(cone);
    }

    group.rotation.z = lean;
    return group;
  }

  // ── PROCEDURAL TROPICAL COCONUT PALM GENERATOR ──
  createPalmTree(height = 11.0, curveX = 0.3, curveZ = 0.2) {
    const group = new THREE.Group();

    const matTrunk = new THREE.MeshStandardMaterial({
      color: 0x6e5238, // Ringed palm trunk bark
      roughness: 0.85
    });

    const matFrond = new THREE.MeshStandardMaterial({
      color: 0x256a28, // Tropical palm frond emerald
      roughness: 0.75,
      side: THREE.DoubleSide
    });

    const matCoconut = new THREE.MeshStandardMaterial({
      color: 0x48321d,
      roughness: 0.9
    });

    // Segmented curved trunk
    const segments = 6;
    const segH = height / segments;
    let currX = 0, currY = 0, currZ = 0;

    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const rBot = THREE.MathUtils.lerp(0.42, 0.24, t);
      const rTop = THREE.MathUtils.lerp(0.38, 0.22, (s + 1) / segments);

      const segGeo = new THREE.CylinderGeometry(rTop, rBot, segH, 7);
      segGeo.translate(0, segH / 2, 0);
      const segMesh = new THREE.Mesh(segGeo, matTrunk);
      segMesh.position.set(currX, currY, currZ);
      segMesh.rotation.x = curveZ * (t + 0.2);
      segMesh.rotation.z = -curveX * (t + 0.2);
      segMesh.castShadow = true;
      group.add(segMesh);

      currX += curveX * segH * (t + 0.3);
      currY += segH * 0.96;
      currZ += curveZ * segH * (t + 0.3);
    }

    // Crown of Coconuts
    for (let c = 0; c < 4; c++) {
      const angle = (c / 4) * Math.PI * 2;
      const coco = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), matCoconut);
      coco.scale.set(1.0, 1.25, 1.0);
      coco.position.set(currX + Math.cos(angle) * 0.35, currY - 0.2, currZ + Math.sin(angle) * 0.35);
      group.add(coco);
    }

    // Radiating Drooping Palm Fronds
    const numFronds = 8;
    for (let f = 0; f < numFronds; f++) {
      const fAngle = (f / numFronds) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const frondGroup = new THREE.Group();
      frondGroup.position.set(currX, currY, currZ);
      frondGroup.rotation.y = fAngle;
      frondGroup.rotation.x = 0.45 + (f % 2) * 0.2; // Drooping tilt

      // Sculpted curving leaf blade
      const leafGeo = new THREE.BufferGeometry();
      const w = 0.85;
      const l = 4.8;
      const verts = new Float32Array([
         0.0,  0.0,  0.0,
        -w*0.5, 0.2,  l*0.4,
         w*0.5, 0.2,  l*0.4,
        -w*0.7, -0.4, l*0.75,
         w*0.7, -0.4, l*0.75,
         0.0,  -1.2, l
      ]);
      leafGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      leafGeo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4]);
      leafGeo.computeVertexNormals();

      const leafMesh = new THREE.Mesh(leafGeo, matFrond);
      leafMesh.castShadow = true;
      frondGroup.add(leafMesh);
      group.add(frondGroup);
    }

    this.palmInstances.push({ group, height, curveX, curveZ });
    return group;
  }

  // ── PROCEDURAL COASTAL BOULDER GENERATOR ──
  createCoastalRock(size = 3.5) {
    const group = new THREE.Group();
    const geo = new THREE.DodecahedronGeometry(size, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.x += (Math.sin(v.y * 3.0) + Math.cos(v.z * 2.0)) * (size * 0.12);
      v.y *= 0.65; // Weathered flat profile
      v.z += (Math.cos(v.x * 2.5)) * (size * 0.12);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();

    const matRock = new THREE.MeshStandardMaterial({
      color: 0x48423b, // Weathered marine granite
      roughness: 0.92,
      metalness: 0.08
    });

    const mesh = new THREE.Mesh(geo, matRock);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    this.rockInstances.push({ group, size });
    return group;
  }

  loadBlenderFoliage() {
    const loader = new GLTFLoader();

    // 1. Upgrade Palms to Blender model
    loader.load(
      'assets/models/palm_tree.glb',
      (gltf) => {
        const palmTemplate = gltf.scene;
        palmTemplate.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        for (const item of this.palmInstances) {
          const clone = palmTemplate.clone();
          const s = item.height / 10.5;
          clone.scale.set(s, s, s);
          clone.rotation.x = item.curveZ * 0.35;
          clone.rotation.z = -item.curveX * 0.35;

          while (item.group.children.length > 0) {
            item.group.remove(item.group.children[0]);
          }
          item.group.add(clone);
        }
        console.log('Nautilus 3D: Blender palm trees successfully populated across archipelago.');
      },
      undefined,
      (err) => console.warn('Nautilus 3D: Palm GLB fallback to procedural:', err)
    );

    // 2. Upgrade Coastal Boulders to Blender model
    loader.load(
      'assets/models/coastal_rock.glb',
      (gltf) => {
        const rockTemplate = gltf.scene;
        rockTemplate.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        for (const item of this.rockInstances) {
          const clone = rockTemplate.clone();
          const s = item.size / 2.5;
          clone.scale.set(s, s, s);

          while (item.group.children.length > 0) {
            item.group.remove(item.group.children[0]);
          }
          item.group.add(clone);
        }
        console.log('Nautilus 3D: Blender coastal rocks successfully placed along beaches.');
      },
      undefined,
      (err) => console.warn('Nautilus 3D: Rock GLB fallback to procedural:', err)
    );
  }

  // ── PROCEDURAL COASTAL BUSH / SHRUB GENERATOR ──
  createCoastalBush(size = 2.2) {
    const group = new THREE.Group();
    const matBush = new THREE.MeshStandardMaterial({
      color: 0x224825,
      roughness: 0.88
    });

    for (let b = 0; b < 3; b++) {
      const r = size * (0.6 + b * 0.2);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), matBush);
      sphere.scale.set(1.1, 0.7, 1.2);
      sphere.position.set(
        (b - 1) * size * 0.4,
        r * 0.45,
        (Math.random() - 0.5) * size * 0.4
      );
      sphere.castShadow = true;
      group.add(sphere);
    }
    return group;
  }

  initIslands() {
    const matRock = new THREE.MeshStandardMaterial({
      color: 0x3d352e, // Basalt & granite crags
      roughness: 0.9,
      metalness: 0.05
    });

    const matGreenTurf = new THREE.MeshStandardMaterial({
      color: 0x2e4a28, // Coastal plateau grass
      roughness: 0.85
    });

    const matBeachSand = new THREE.MeshStandardMaterial({
      color: 0xc8b28a, // Shoreline sand
      roughness: 0.75
    });

    // ── ISLAND 1: LIGHTHOUSE ATOLL (Cape Horizon Island: 480m, 650m) ──
    const mainIslandGroup = new THREE.Group();
    mainIslandGroup.position.set(480, 0, 650);

    // Rocky foundation
    const mainRockGeo = this.createIslandGeometry(110, 42, 32);
    const mainRock = new THREE.Mesh(mainRockGeo, matRock);
    mainRock.position.y = 16;
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    mainIslandGroup.add(mainRock);

    // Green grassy plateau top
    const plateauGeo = new THREE.CylinderGeometry(52, 60, 4, 24);
    const plateau = new THREE.Mesh(plateauGeo, matGreenTurf);
    plateau.position.y = 37.5;
    plateau.receiveShadow = true;
    mainIslandGroup.add(plateau);

    // Sandy waterline apron / beach
    const beachGeo = new THREE.CylinderGeometry(115, 135, 3.5, 32);
    const beach = new THREE.Mesh(beachGeo, matBeachSand);
    beach.position.y = 0.5;
    beach.receiveShadow = true;
    mainIslandGroup.add(beach);

    // Shoreline surf breaker foam ring
    const surfRingGeo = new THREE.RingGeometry(112, 142, 36);
    surfRingGeo.rotateX(-Math.PI / 2);
    const surfMat = new THREE.MeshBasicMaterial({
      color: 0xdff0fa,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const surfRing = new THREE.Mesh(surfRingGeo, surfMat);
    surfRing.position.y = 0.4;
    mainIslandGroup.add(surfRing);

    // ── FOREST & VEGETATION FOR CAPE HORIZON ISLAND ──
    // 1. Plateau Grove (Ringed around lighthouse at radius 22m to 48m)
    const numPlateauPines = 22;
    for (let i = 0; i < numPlateauPines; i++) {
      const ang = (i / numPlateauPines) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.2);
      const rad = 24.0 + (i % 5) * 4.8;
      const h = 7.5 + (i % 4) * 1.8;
      const pine = this.createPineTree(h, (Math.sin(i * 2.1) * 0.12));
      pine.position.set(Math.cos(ang) * rad, 39.5, Math.sin(ang) * rad);
      mainIslandGroup.add(pine);
    }

    const numPlateauPalms = 12;
    for (let i = 0; i < numPlateauPalms; i++) {
      const ang = (i / numPlateauPalms) * Math.PI * 2 + 0.25;
      const rad = 34.0 + (i % 3) * 5.5;
      const h = 9.5 + (i % 3) * 1.5;
      const palm = this.createPalmTree(h, Math.cos(ang) * 0.28, Math.sin(ang) * 0.28);
      palm.position.set(Math.cos(ang) * rad, 39.5, Math.sin(ang) * rad);
      mainIslandGroup.add(palm);
    }

    // Plateau shrubs
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 22.0 + Math.random() * 26.0;
      const bush = this.createCoastalBush(1.8 + Math.random() * 1.2);
      bush.position.set(Math.cos(ang) * rad, 39.5, Math.sin(ang) * rad);
      mainIslandGroup.add(bush);
    }

    // 2. Beach Apron Palms & Coastal Boulders
    const numBeachPalms = 16;
    for (let i = 0; i < numBeachPalms; i++) {
      const ang = (i / numBeachPalms) * Math.PI * 2 + 0.15;
      const rad = 114.0 + (i % 3) * 6.5;
      const h = 10.0 + (i % 4) * 1.8;
      // Leaning towards the sea
      const leanOutX = Math.cos(ang) * 0.42;
      const leanOutZ = Math.sin(ang) * 0.42;
      const palm = this.createPalmTree(h, leanOutX, leanOutZ);
      palm.position.set(Math.cos(ang) * rad, 1.2, Math.sin(ang) * rad);
      mainIslandGroup.add(palm);
    }

    // Beach & Surf Boulders
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + (Math.sin(i * 1.9) * 0.3);
      const rad = 108.0 + (i % 4) * 9.0;
      const rockSize = 2.5 + (i % 3) * 1.8;
      const boulder = this.createCoastalRock(rockSize);
      boulder.position.set(Math.cos(ang) * rad, 1.0, Math.sin(ang) * rad);
      boulder.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      mainIslandGroup.add(boulder);
    }

    this.scene.add(mainIslandGroup);
    this.islands.push({ pos: mainIslandGroup.position, radius: 130, name: 'Cape Horizon Island' });

    // ── ISLAND 2: SEA STACK ARCHIPELAGO (-520m, 380m) ──
    const stackGroup = new THREE.Group();
    stackGroup.position.set(-520, 0, 380);

    const stackGeo1 = this.createIslandGeometry(45, 32, 20);
    const stack1 = new THREE.Mesh(stackGeo1, matRock);
    stack1.position.y = 14;
    stack1.castShadow = true;
    stackGroup.add(stack1);

    const stackGeo2 = this.createIslandGeometry(28, 22, 16);
    const stack2 = new THREE.Mesh(stackGeo2, matRock);
    stack2.position.set(45, 9, -35);
    stack2.castShadow = true;
    stackGroup.add(stack2);

    // Weather-beaten cliffside pines on sea stacks
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const rad = 14.0 + (i % 3) * 6.0;
      const pine = this.createPineTree(6.5 + (i % 3) * 1.5, 0.22);
      pine.position.set(Math.cos(ang) * rad, 28.0, Math.sin(ang) * rad);
      stackGroup.add(pine);
    }

    // Jagged sea boulders around stacks
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const rad = 42.0 + (i % 3) * 8.0;
      const boulder = this.createCoastalRock(3.0 + (i % 3) * 1.5);
      boulder.position.set(Math.cos(ang) * rad, 0.8, Math.sin(ang) * rad);
      stackGroup.add(boulder);
    }

    this.scene.add(stackGroup);
    this.islands.push({ pos: stackGroup.position, radius: 75, name: 'The Needles Sea Stacks' });

    // ── ISLAND 3: EMERALD SANCTUARY ATOLL (-340m, -420m) ──
    const emeraldGroup = new THREE.Group();
    emeraldGroup.position.set(-340, 0, -420);

    const emeraldRockGeo = this.createIslandGeometry(75, 26, 24);
    const emeraldRock = new THREE.Mesh(emeraldRockGeo, matRock);
    emeraldRock.position.y = 10;
    emeraldRock.castShadow = true;
    emeraldGroup.add(emeraldRock);

    // Lush green tropical canopy mound
    const emeraldTurfGeo = new THREE.CylinderGeometry(40, 52, 5, 20);
    const emeraldTurf = new THREE.Mesh(emeraldTurfGeo, matGreenTurf);
    emeraldTurf.position.y = 21.0;
    emeraldTurf.receiveShadow = true;
    emeraldGroup.add(emeraldTurf);

    // White tropical sand beach apron
    const emeraldBeachGeo = new THREE.CylinderGeometry(80, 95, 3.2, 28);
    const emeraldBeach = new THREE.Mesh(emeraldBeachGeo, matBeachSand);
    emeraldBeach.position.y = 0.6;
    emeraldBeach.receiveShadow = true;
    emeraldGroup.add(emeraldBeach);

    // Turquoise surf foam ring
    const emeraldSurfGeo = new THREE.RingGeometry(78, 102, 32);
    emeraldSurfGeo.rotateX(-Math.PI / 2);
    const emeraldSurf = new THREE.Mesh(emeraldSurfGeo, surfMat);
    emeraldSurf.position.y = 0.4;
    emeraldGroup.add(emeraldSurf);

    // Dense tropical palm forest on Emerald Island (32 palms & pines)
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2 + (i % 3) * 0.4;
      const rad = 12.0 + (i % 4) * 7.5;
      const h = 8.5 + (i % 3) * 2.2;
      const palm = this.createPalmTree(h, Math.cos(ang) * 0.35, Math.sin(ang) * 0.35);
      palm.position.set(Math.cos(ang) * rad, 23.5, Math.sin(ang) * rad);
      emeraldGroup.add(palm);
    }

    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const rad = 78.0 + (i % 3) * 5.0;
      const palm = this.createPalmTree(10.0, Math.cos(ang) * 0.45, Math.sin(ang) * 0.45);
      palm.position.set(Math.cos(ang) * rad, 1.2, Math.sin(ang) * rad);
      emeraldGroup.add(palm);
    }

    // Coastal rocks around Emerald Atoll
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const rad = 76.0 + (i % 3) * 7.0;
      const rock = this.createCoastalRock(2.8 + (i % 3) * 1.6);
      rock.position.set(Math.cos(ang) * rad, 0.9, Math.sin(ang) * rad);
      emeraldGroup.add(rock);
    }

    this.scene.add(emeraldGroup);
    this.islands.push({ pos: emeraldGroup.position, radius: 95, name: 'Emerald Sanctuary Atoll' });
  }

  // ── 2. HISTORIC COASTAL LIGHTHOUSE WITH ROTATING FRESNEL BEAM ──
  initLighthouse() {
    const group = new THREE.Group();
    // Placed on Cape Horizon Island plateau
    group.position.set(480, 39.5, 650);

    const matWhiteStone = new THREE.MeshStandardMaterial({
      color: 0xf4f6f8,
      roughness: 0.45
    });

    const matRedBand = new THREE.MeshStandardMaterial({
      color: 0xcc2216,
      roughness: 0.4
    });

    const matLanternBlack = new THREE.MeshStandardMaterial({
      color: 0x111418,
      roughness: 0.3,
      metalness: 0.7
    });

    // Octagonal masonry foundation base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.8, 3.5, 8),
      matWhiteStone
    );
    base.position.y = 1.75;
    base.castShadow = true;
    group.add(base);

    // Tapering cylindrical tower with alternating red & white horizontal bands (24m tall)
    const bandHeight = 4.2;
    for (let b = 0; b < 5; b++) {
      const rTop = 4.8 - b * 0.32;
      const rBottom = 4.8 - (b - 1) * 0.32;
      const sectionMat = (b % 2 === 0) ? matWhiteStone : matRedBand;

      const section = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBottom, bandHeight, 16),
        sectionMat
      );
      section.position.y = 3.5 + b * bandHeight + bandHeight / 2;
      section.castShadow = true;
      group.add(section);
    }

    // Gallery Balcony & Railing
    const galleryY = 3.5 + 5 * bandHeight;
    const gallery = new THREE.Mesh(
      new THREE.CylinderGeometry(4.8, 4.4, 0.6, 16),
      matLanternBlack
    );
    gallery.position.y = galleryY + 0.3;
    group.add(gallery);

    // Glass Lantern Room
    const lanternGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 3.6, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.4
      })
    );
    lanternGlass.position.y = galleryY + 2.4;
    group.add(lanternGlass);

    // Dome Roof & Lightning Rod
    const domeRoof = new THREE.Mesh(
      new THREE.SphereGeometry(3.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      matLanternBlack
    );
    domeRoof.position.y = galleryY + 4.2;
    group.add(domeRoof);

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 4.5),
      matLanternBlack
    );
    rod.position.y = galleryY + 7.5;
    group.add(rod);

    // Glowing Fresnel Lantern Core
    // ── GLOWING FRESNEL LANTERN CORE ──
    const lanternY = galleryY + 2.4;

    // Incandescent Fresnel lens cylinder housed cleanly inside the glass lantern room
    const fresnelCore = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 2.2, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff8eb })
    );
    fresnelCore.position.y = lanternY;
    group.add(fresnelCore);

    // High-power omnidirectional lantern light (illuminates tower & stormy sea around island)
    const lanternPoint = new THREE.PointLight(0xffe290, 8.5, 280, 1.0);
    lanternPoint.position.y = lanternY;
    group.add(lanternPoint);

    // ── ROTATING DUAL VOLUMETRIC EXPANDING FRESNEL LIGHT BEAMS ──
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0, lanternY, 0);

    // 860m maritime sweep: reaches all the way across the archipelago and over the player's vessel
    const beamLength = 860.0;
    const rStart = 1.6;
    const rEnd = 52.0;

    this.beamMaterials = [];

    // Advanced volumetric light beam shader:
    // 1. Naturally EXPANDS outward from lantern aperture across the entire ocean
    // 2. Continuous solid optical density with Gaussian falloff (no hollow shell)
    // 3. Gentle Beer-Lambert atmospheric attenuation with smooth end feathering
    // 4. Dynamic storm boost: dramatically cuts through tempest rain and dark clouds
    const createBeamMaterial = (opacityVal, coreConcentration) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uLength: { value: beamLength },
          uRadiusStart: { value: rStart },
          uRadiusEnd: { value: rEnd },
          uOpacity: { value: opacityVal },
          uCoreConcentration: { value: coreConcentration },
          uStormBoost: { value: 1.0 }
        },
        vertexShader: `
          varying vec3 vLocalPos;
          varying vec3 vWorldPos;
          varying vec3 vViewDir;
          varying vec3 vNormal;
          varying vec3 vBeamDir;

          void main() {
            vLocalPos = position;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            vBeamDir = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uLength;
          uniform float uRadiusStart;
          uniform float uRadiusEnd;
          uniform float uOpacity;
          uniform float uCoreConcentration;
          uniform float uStormBoost;

          varying vec3 vLocalPos;
          varying vec3 vWorldPos;
          varying vec3 vViewDir;
          varying vec3 vNormal;
          varying vec3 vBeamDir;

          void main() {
            // Longitudinal progress along the beam (0.0 at lantern, 1.0 at far ocean reach)
            float t = clamp(vLocalPos.z / uLength, 0.0, 1.0);

            // Atmospheric extinction / Beer-Lambert distance fade (tuned for 800m+ maritime reach)
            float distFade = exp(-1.12 * t);
            // Quadratic end-feathering so beam dissolves seamlessly into distant horizon
            float endFeather = (1.0 - t * t);
            // Intense focal radiance near the lantern aperture
            float sourceBoost = 1.0 + 3.4 * exp(-18.0 * t);
            float longitudinal = distFade * endFeather * sourceBoost;

            // Radius of the expanding beam at distance z
            float radiusAtZ = mix(uRadiusStart, uRadiusEnd, t);
            float radialDist = length(vLocalPos.xy);
            float rho = clamp(radialDist / max(radiusAtZ, 0.01), 0.0, 1.0);

            // Volumetric profile: solid optical core blended with smooth Gaussian edge
            float coreGlow = exp(-uCoreConcentration * rho * rho);
            float solidBase = max(0.0, 1.0 - rho * rho);
            float softEdge = smoothstep(1.0, 0.18, rho);
            float radialProfile = mix(coreGlow, solidBase, 0.42) * softEdge;

            // Forward Mie scattering (beam looks intensely radiant when aimed near the observer)
            vec3 beamDir = normalize(vBeamDir);
            float forwardScatter = pow(max(0.0, dot(vViewDir, -beamDir)), 2.8) * 0.45 + 0.65;

            // View-angle thickness accumulation: reinforces solid presence from all camera angles
            float cosAngle = abs(dot(vNormal, vViewDir));
            float depthWeight = mix(0.72, 1.18, sqrt(max(0.0, 1.0 - cosAngle * cosAngle)));

            // Realistic maritime incandescent color gradient (white-hot core -> golden amber -> warm fog haze)
            vec3 coreColor = vec3(1.0, 0.98, 0.93);
            vec3 amberBeam = vec3(1.0, 0.88, 0.62);
            vec3 fogScatter = vec3(0.96, 0.76, 0.48);

            vec3 finalColor = mix(coreColor, amberBeam, clamp(rho * 1.25 + t * 0.4, 0.0, 1.0));
            finalColor = mix(finalColor, fogScatter, clamp(t * 0.7, 0.0, 1.0));

            float alpha = uOpacity * uStormBoost * longitudinal * radialProfile * forwardScatter * depthWeight;
            if (alpha < 0.001) discard;

            gl_FragColor = vec4(finalColor, alpha);
          }
        `
      });
      this.beamMaterials.push(mat);
      return mat;
    };

    // Layer 1: Dense inner blazing core
    const coreBeamMat = createBeamMaterial(0.78, 5.0);
    // Layer 2: Main dense beam body
    const midBeamMat = createBeamMaterial(0.52, 2.8);
    // Layer 3: Outer atmospheric fog scatter shroud
    const outerBeamMat = createBeamMaterial(0.28, 1.6);
    // Layer 4: Interior axial cross-fins (ensures central line is 100% solid from any side angle)
    const finMat = createBeamMaterial(0.68, 3.2);

    // Cylindrical expanding shell generator
    const createExpandingConeGeo = (radiusStart, radiusEnd, length) => {
      const geo = new THREE.CylinderGeometry(radiusStart, radiusEnd, length, 32, 24, true);
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0, length / 2);
      return geo;
    };

    // Interior axial cross-fin geometry (vertical and horizontal quad fins along centerline)
    const createAxialCrossGeo = (radiusStart, radiusEnd, length, segments = 20) => {
      const geo = new THREE.BufferGeometry();
      const positions = [];
      const indices = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const z = t * length;
        const r = radiusStart + (radiusEnd - radiusStart) * t;

        // Vertices 0 & 1: Vertical fin (X=0)
        positions.push(0, r, z);
        positions.push(0, -r, z);
        // Vertices 2 & 3: Horizontal fin (Y=0)
        positions.push(r, 0, z);
        positions.push(-r, 0, z);

        if (i < segments) {
          const b = i * 4;
          // Vertical fin quad (double-sided via 2 triangles)
          indices.push(b, b + 1, b + 5);
          indices.push(b, b + 5, b + 4);
          // Horizontal fin quad
          indices.push(b + 2, b + 3, b + 7);
          indices.push(b + 2, b + 7, b + 6);
        }
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    const coreGeo = createExpandingConeGeo(rStart * 0.65, rEnd * 0.38, beamLength * 0.98);
    const midGeo = createExpandingConeGeo(rStart, rEnd * 0.72, beamLength);
    const outerGeo = createExpandingConeGeo(rStart * 1.6, rEnd, beamLength);
    const crossFinGeo = createAxialCrossGeo(rStart * 0.8, rEnd * 0.55, beamLength * 0.96);

    for (const angle of [0, Math.PI]) {
      const beamGroup = new THREE.Group();
      beamGroup.rotation.y = angle;
      // Authentic 1.5° downward pitch toward the ocean horizon
      beamGroup.rotation.x = 0.026;

      // 1. Interior axial cross-fins for solid volumetric core
      const finMesh = new THREE.Mesh(crossFinGeo, finMat);
      beamGroup.add(finMesh);

      // 2. Dense white-hot inner core
      const coreMesh = new THREE.Mesh(coreGeo, coreBeamMat);
      beamGroup.add(coreMesh);

      // 3. Main golden beam body
      const midMesh = new THREE.Mesh(midGeo, midBeamMat);
      beamGroup.add(midMesh);

      // 4. Outer misty dispersion shroud
      const outerMesh = new THREE.Mesh(outerGeo, outerBeamMat);
      beamGroup.add(outerMesh);

      // 5. Long-range spotlight for ocean wave illumination
      const spot = new THREE.SpotLight(0xffeed0, 22.0, 950, Math.PI / 14, 0.7, 1.05);
      spot.position.set(0, 0, 0);

      const target = new THREE.Object3D();
      target.position.set(0, -22.0, 650.0);
      beamGroup.add(target);
      spot.target = target;
      beamGroup.add(spot);
      this.lighthouseBeams.push(spot);

      beamPivot.add(beamGroup);
    }

    group.add(beamPivot);
    this.lighthouseTower = beamPivot;

    this.scene.add(group);
  }

  update(dt, weatherPreset = null) {
    // Continuous 360° sweeping Fresnel lighthouse rotation (10.5 RPM)
    if (this.lighthouseTower) {
      this.lighthouseTower.rotation.y += 0.72 * dt;
    }

    // Dynamic storm & darkness volumetric boost: in tempest / night, light scatters more solidly through mist
    if (this.beamMaterials && this.beamMaterials.length > 0) {
      const isStorm = weatherPreset && weatherPreset.id === 'storm';
      const isNight = weatherPreset && (weatherPreset.id === 'aurora' || weatherPreset.id === 'sunset');
      const targetBoost = isStorm ? 1.65 : (isNight ? 1.35 : 1.0);

      for (const mat of this.beamMaterials) {
        if (mat.uniforms && mat.uniforms.uStormBoost) {
          mat.uniforms.uStormBoost.value = THREE.MathUtils.lerp(mat.uniforms.uStormBoost.value, targetBoost, Math.min(1.0, 4.0 * dt));
        }
      }
    }
  }

  // Live depth sounder computation: returns water depth beneath vessel taking into account island shoals
  getWaterDepthAt(pos) {
    let minDepth = 65.0; // Ocean deep seabed floor depth

    for (const isle of this.islands) {
      const d = Math.sqrt((pos.x - isle.pos.x) ** 2 + (pos.z - isle.pos.z) ** 2);
      if (d < isle.radius + 80) {
        // Shoal slope from beach up to island
        const slope = THREE.MathUtils.clamp((d - isle.radius) / 80.0, 0.0, 1.0);
        const shoalDepth = slope * 60.0 + 1.2;
        minDepth = Math.min(minDepth, shoalDepth);
      }
    }

    return minDepth;
  }
}
