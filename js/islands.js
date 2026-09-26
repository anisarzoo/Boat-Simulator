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
    // Load high-detail Blender tropical palms and coastal boulders
    this.loadBlenderFoliage();
  }

  // ── 1. PROCEDURAL ORGANIC ISLAND GEOMETRY GENERATOR ──
  createOrganicIslandGeometry(radius, height, seed = 0, isStack = false) {
    const numRings = isStack ? 24 : 36;
    const numSlices = isStack ? 32 : 48;
    const positions = [];
    const colors = [];
    const indices = [];

    // Continuous analytical elevation function for the island landmass
    const evalElevation = (r, theta) => {
      const u = r / radius; // 0.0 at summit peak, 1.0 at beach line, 1.25 at submerged shoal
      // Natural asymmetric perimeter lobes & coastal coves
      const lobe1 = Math.cos(theta * 2.0 + seed) * 0.12;
      const lobe2 = Math.sin(theta * 3.0 + seed * 1.5) * 0.07;
      const lobe3 = Math.cos(theta * 5.0) * 0.04;
      const radMod = 1.0 + lobe1 + lobe2 + lobe3;
      const effU = u / Math.max(0.4, radMod);

      if (isStack) {
        // Dramatic jagged oceanic sea stack (needle spire with columnar basalt facets)
        if (effU < 0.22) {
          // Sharp jagged needle pinnacle summit
          const t = effU / 0.22;
          const peakCrest = height * (1.0 - 0.28 * Math.pow(t, 1.4));
          const pinnacleSpire = Math.abs(Math.cos(theta * 2.0 + seed)) * 4.2 * (1.0 - t);
          return peakCrest + pinnacleSpire;
        } else if (effU < 0.78) {
          // Sheer near-vertical columnar basalt cliff faces with deep wave-cut fissures
          const cliffT = (effU - 0.22) / (0.78 - 0.22);
          const baseCliffY = height * 0.72 * Math.pow(1.0 - cliffT, 0.75);
          // Vertical columnar basalt fluting & sharp craggy buttresses
          const columnarCrags = (Math.sin(theta * 8.0 + seed) * 3.8 + Math.cos(theta * 16.0) * 1.8) * Math.sin(cliffT * Math.PI);
          return Math.max(0.4, baseCliffY + columnarCrags);
        } else if (effU <= 1.0) {
          // Wave-battered rocky coastal shelf
          const shelfT = (effU - 0.78) / (1.0 - 0.78);
          return 0.4 * (1.0 - shelfT) + 0.15;
        } else {
          // Submerged sea stack reef base
          const footT = (effU - 1.0) / 0.25;
          return Math.max(-12.0, 0.15 - footT * 8.5);
        }
      }

      // Island profile:
      // 1. Naturally rounded mountain dome crest: effU in [0, 0.42] (dY/du -> 0 at center!)
      // 2. Craggy basalt slopes & ravines: effU in [0.42, 0.85]
      // 3. Gentle golden sand coastal apron: effU in [0.85, 1.0]
      // 4. Submerged wave-cut coral reef shoal: effU in [1.0, 1.25]
      let y = 0;
      if (effU < 0.42) {
        // Paraboloid dome crest - smooth rounded summit, NO tabletop disc!
        const t = effU / 0.42;
        y = height * (1.0 - 0.18 * Math.pow(t, 1.8));
      } else if (effU < 0.85) {
        const t = (effU - 0.42) / (0.85 - 0.42);
        // Smooth Hermite S-curve connecting summit to beach
        const s = 1.0 - (t * t * (3.0 - 2.0 * t));
        y = 2.4 + (height * 0.82 - 2.4) * s;
        // Natural mountain crags & gullies
        const crag = (Math.sin(theta * 5.0 + effU * 4.0) * 2.5 + Math.cos(theta * 11.0) * 1.2) * Math.sin(t * Math.PI);
        y += crag;
      } else if (effU <= 1.0) {
        // Gentle sandy beach slope from 2.4m down to 0.15m at surf
        const t = (effU - 0.85) / (1.0 - 0.85);
        y = 2.4 * (1.0 - t) + 0.15;
      } else {
        // Submerged wave-cut reef shelf dipping into deep water
        const t = (effU - 1.0) / 0.25;
        y = 0.15 - t * 7.5;
      }

      // Subtle natural ridgeline across the entire landmass
      const ridge = Math.sin(theta * 3.0 + seed) * 1.6 * Math.max(0.0, 1.0 - effU);
      return y + ridge;
    };

    // Center summit apex vertex (index 0)
    const apexY = evalElevation(0, 0);
    positions.push(0, apexY, 0);
    colors.push(0.18, 0.38, 0.18); // Apex color: lush plateau green

    // Grid of concentric rings
    for (let rIdx = 1; rIdx <= numRings; rIdx++) {
      const ringFrac = rIdx / numRings;
      const r = radius * (ringFrac * 1.25);

      for (let sIdx = 0; sIdx < numSlices; sIdx++) {
        const theta = (sIdx / numSlices) * Math.PI * 2.0;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = evalElevation(r, theta);

        positions.push(x, y, z);
        colors.push(0.2, 0.2, 0.2); // Placeholder, colored in pass 2 with normals
      }
    }

    // Connect apex (index 0) to Ring 1
    for (let sIdx = 0; sIdx < numSlices; sIdx++) {
      const sNext = (sIdx + 1) % numSlices;
      const v1 = 1 + sIdx;
      const v2 = 1 + sNext;
      indices.push(0, v1, v2);
    }

    // Connect rings together
    for (let rIdx = 1; rIdx < numRings; rIdx++) {
      const rowStart = 1 + (rIdx - 1) * numSlices;
      const nextRowStart = 1 + rIdx * numSlices;

      for (let sIdx = 0; sIdx < numSlices; sIdx++) {
        const sNext = (sIdx + 1) % numSlices;
        const a = rowStart + sIdx;
        const b = nextRowStart + sIdx;
        const c = nextRowStart + sNext;
        const d = rowStart + sNext;

        indices.push(a, b, d);
        indices.push(d, b, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // Pass 2: Slope & Elevation-aware vertex coloring
    const normAttr = geo.attributes.normal;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;

    const colGrassPeak = new THREE.Color(0x356630); // Bright emerald summit turf
    const colGrassMid  = new THREE.Color(0x274e24); // Coastal turf
    const colRock      = new THREE.Color(0x38332d); // Weathered basalt/granite
    const colRockDark  = new THREE.Color(0x23201d); // Deep cliff shadows
    const colSand      = new THREE.Color(0xd2be92); // Warm golden beach sand
    const colWetSand   = new THREE.Color(0x6a5e4c); // Wet sand at waterline
    const colShoal     = new THREE.Color(0x2d3a33); // Submerged marine reef

    const tempCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const ny = normAttr.getY(i); // 1 = horizontal, 0 = vertical cliff

      if (isStack) {
        // Pure oceanic sea stack rock coloring (100% natural stone, zero grass)
        if (y < 0.25) {
          tempCol.copy(colShoal);
        } else if (y < 1.4) {
          // Wet wave-battered tide line with dark marine kelp
          const t = (y - 0.25) / 1.15;
          tempCol.copy(colShoal).lerp(new THREE.Color(0x182018), t);
        } else {
          // Geological basalt & granite strata banding with weathered salt/guano crests
          const strata = Math.sin(y * 0.48) * 0.08 + Math.cos(y * 1.05) * 0.04;
          const colDeepBasalt = new THREE.Color(0x201d1b);
          const colGranite = new THREE.Color(0x3a342e);
          const colGuanoCrest = new THREE.Color(0x7c756b);
          const heightFrac = Math.min(1.0, (y - 1.4) / (height - 1.4));

          if (ny < 0.45) {
            // Sheer vertical cliff shadows & fissure recesses
            tempCol.copy(colDeepBasalt);
          } else {
            // Weathered rock face with horizontal sedimentary strata and lighter bird-roosting pinnacle crests
            tempCol.copy(colGranite).lerp(colGuanoCrest, heightFrac * 0.8 + strata);
          }
        }
      } else {
        // Mountain body with grass, rock, and sandy beach
        if (y < 0.2) {
          // Submerged wave-cut shoal
          tempCol.copy(colShoal);
        } else if (y < 1.2) {
          // Wet beach shoreline
          const t = (y - 0.2) / 1.0;
          tempCol.copy(colShoal).lerp(colWetSand, t);
        } else if (y < 3.2 && ny > 0.55) {
          // Golden sandy beach apron
          const t = (y - 1.2) / 2.0;
          tempCol.copy(colWetSand).lerp(colSand, t);
        } else {
          // Mountain body: slope determines grass vs rock
          if (ny > 0.68) {
            // Gentle plateau or ridge: rich green grass
            const peakT = Math.min(1.0, (y - 3.2) / (height - 3.2));
            tempCol.copy(colGrassMid).lerp(colGrassPeak, peakT);
          } else if (ny > 0.45) {
            // Transition slope: mixed rock and mossy turf
            const t = (ny - 0.45) / (0.68 - 0.45);
            tempCol.copy(colRock).lerp(colGrassMid, t);
          } else {
            // Steep cliff wall: rugged dark basalt crags
            const darkT = Math.min(1.0, (0.45 - ny) / 0.45);
            tempCol.copy(colRock).lerp(colRockDark, darkT);
          }
        }
      }

      colAttr.setXYZ(i, tempCol.r, tempCol.g, tempCol.b);
    }
    colAttr.needsUpdate = true;

    return {
      geometry: geo,
      apexY: apexY,
      getElevation: (x, z) => {
        const r = Math.sqrt(x * x + z * z);
        const theta = Math.atan2(z, x);
        return evalElevation(r, theta);
      }
    };
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
          clone.rotation.x = item.curveZ * 0.25;
          clone.rotation.z = -item.curveX * 0.25;

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
          clone.rotation.y = Math.random() * Math.PI * 2;

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
    const matIsland = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05
    });

    const surfMat = new THREE.MeshBasicMaterial({
      color: 0xdff0fa,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });

    // ── ISLAND 1: LIGHTHOUSE ATOLL (Cape Horizon Island: 480m, 650m) ──
    const mainIslandGroup = new THREE.Group();
    mainIslandGroup.position.set(480, 0, 650);

    // Continuous organic mountain terrain (smooth rounded dome crest, basalt cliffs, golden sand beach)
    const mainTerrain = this.createOrganicIslandGeometry(125, 39, 0.65, false);
    const mainMesh = new THREE.Mesh(mainTerrain.geometry, matIsland);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    mainIslandGroup.add(mainMesh);

    // Shoreline surf breaker foam ring
    const surfRingGeo = new THREE.RingGeometry(116, 142, 48);
    surfRingGeo.rotateX(-Math.PI / 2);
    const surfRing = new THREE.Mesh(surfRingGeo, surfMat);
    surfRing.position.y = 0.35;
    mainIslandGroup.add(surfRing);

    // Record summit apex height for lighthouse placement
    this.lighthouseSummitY = mainTerrain.apexY;

    // ── FOREST & VEGETATION FOR CAPE HORIZON ISLAND ──
    // 1. Highland Grove: Ground-anchored to the organic rounded dome crest & slopes
    const numPlateauPines = 22;
    for (let i = 0; i < numPlateauPines; i++) {
      const ang = (i / numPlateauPines) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.2);
      const rad = 20.0 + (i % 5) * 5.2; // 20m to 40.8m from center
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const py = mainTerrain.getElevation(px, pz);
      const h = 7.5 + (i % 4) * 1.8;
      const pine = this.createPineTree(h, (Math.sin(i * 2.1) * 0.12));
      pine.position.set(px, py, pz);
      mainIslandGroup.add(pine);
    }

    const numPlateauPalms = 12;
    for (let i = 0; i < numPlateauPalms; i++) {
      const ang = (i / numPlateauPalms) * Math.PI * 2 + 0.25;
      const rad = 28.0 + (i % 3) * 5.5;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const py = mainTerrain.getElevation(px, pz);
      const h = 9.5 + (i % 3) * 1.5;
      const palm = this.createPalmTree(h, Math.cos(ang) * 0.28, Math.sin(ang) * 0.28);
      palm.position.set(px, py, pz);
      mainIslandGroup.add(palm);
    }

    // Highland shrubs
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 18.0 + Math.random() * 26.0;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const py = mainTerrain.getElevation(px, pz);
      const bush = this.createCoastalBush(1.8 + Math.random() * 1.2);
      bush.position.set(px, py, pz);
      mainIslandGroup.add(bush);
    }

    // 2. Beach Apron Palms & Coastal Boulders
    const numBeachPalms = 16;
    for (let i = 0; i < numBeachPalms; i++) {
      const ang = (i / numBeachPalms) * Math.PI * 2 + 0.15;
      const rad = 112.0 + (i % 3) * 5.5;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const py = mainTerrain.getElevation(px, pz);
      const h = 10.0 + (i % 4) * 1.8;
      const leanOutX = Math.cos(ang) * 0.38;
      const leanOutZ = Math.sin(ang) * 0.38;
      const palm = this.createPalmTree(h, leanOutX, leanOutZ);
      palm.position.set(px, py, pz);
      mainIslandGroup.add(palm);
    }

    // Coastal Breaker Rocks: Rooted in the water, half-submerged in surf
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + (Math.sin(i * 1.9) * 0.3);
      const rad = 116.0 + (i % 4) * 8.0;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const rockSize = 2.8 + (i % 3) * 1.6;
      const boulder = this.createCoastalRock(rockSize);
      boulder.position.set(px, -0.35 + (i % 3) * 0.1, pz);
      boulder.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      mainIslandGroup.add(boulder);
    }

    this.scene.add(mainIslandGroup);
    this.islands.push({ pos: mainIslandGroup.position, radius: 135, name: 'Cape Horizon Island' });

    // ── ISLAND 2: OFFSHORE SEA STACK ARCHIPELAGO ("THE NEEDLES" -520m, 380m) ──
    // Pure oceanic rock formation carved by heavy seas: NO trees on sea stacks!
    const stackGroup = new THREE.Group();
    stackGroup.position.set(-520, 0, 380);

    // Primary Needle Stack: sheer jagged spire with columnar basalt fluting
    const stack1Terrain = this.createOrganicIslandGeometry(44, 38, 1.4, true);
    const stack1Mesh = new THREE.Mesh(stack1Terrain.geometry, matIsland);
    stack1Mesh.castShadow = true;
    stack1Mesh.receiveShadow = true;
    stackGroup.add(stack1Mesh);

    // Secondary Needle Spire (natural twin companion stack)
    const stack2Terrain = this.createOrganicIslandGeometry(26, 26, 2.7, true);
    const stack2Mesh = new THREE.Mesh(stack2Terrain.geometry, matIsland);
    stack2Mesh.position.set(42, 0, -32);
    stack2Mesh.castShadow = true;
    stack2Mesh.receiveShadow = true;
    stackGroup.add(stack2Mesh);

    // Tertiary Jagged Reef Rock
    const stack3Terrain = this.createOrganicIslandGeometry(18, 17, 4.1, true);
    const stack3Mesh = new THREE.Mesh(stack3Terrain.geometry, matIsland);
    stack3Mesh.position.set(-36, 0, 26);
    stack3Mesh.castShadow = true;
    stack3Mesh.receiveShadow = true;
    stackGroup.add(stack3Mesh);

    // Foaming white breaker surf ring around sea stacks
    const stackSurfGeo = new THREE.RingGeometry(38, 56, 40);
    stackSurfGeo.rotateX(-Math.PI / 2);
    const stackSurf = new THREE.Mesh(stackSurfGeo, surfMat);
    stackSurf.position.y = 0.35;
    stackGroup.add(stackSurf);

    // Breaker rocks around stacks: half-submerged in the surf line
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const rad = 46.0 + (i % 3) * 7.5;
      const boulder = this.createCoastalRock(3.0 + (i % 3) * 1.4);
      boulder.position.set(Math.cos(ang) * rad, -0.42, Math.sin(ang) * rad);
      stackGroup.add(boulder);
    }

    this.scene.add(stackGroup);
    this.islands.push({ pos: stackGroup.position, radius: 80, name: 'The Needles Sea Stacks' });

    // ── ISLAND 3: EMERALD SANCTUARY ATOLL (-340m, -420m) ──
    const emeraldGroup = new THREE.Group();
    emeraldGroup.position.set(-340, 0, -420);

    const emeraldTerrain = this.createOrganicIslandGeometry(92, 26, 3.2, false);
    const emeraldMesh = new THREE.Mesh(emeraldTerrain.geometry, matIsland);
    emeraldMesh.castShadow = true;
    emeraldMesh.receiveShadow = true;
    emeraldGroup.add(emeraldMesh);

    // Turquoise surf foam ring
    const emeraldSurfGeo = new THREE.RingGeometry(86, 108, 36);
    emeraldSurfGeo.rotateX(-Math.PI / 2);
    const emeraldSurf = new THREE.Mesh(emeraldSurfGeo, surfMat);
    emeraldSurf.position.y = 0.35;
    emeraldGroup.add(emeraldSurf);

    // Dense tropical palms on Emerald Island
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2 + (i % 3) * 0.4;
      const rad = 10.0 + (i % 4) * 7.0;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const py = emeraldTerrain.getElevation(px, pz);
      const h = 8.5 + (i % 3) * 2.2;
      const palm = this.createPalmTree(h, Math.cos(ang) * 0.35, Math.sin(ang) * 0.35);
      palm.position.set(px, py, pz);
      emeraldGroup.add(palm);
    }

    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const rad = 82.0 + (i % 3) * 4.5;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const py = emeraldTerrain.getElevation(px, pz);
      const palm = this.createPalmTree(10.0, Math.cos(ang) * 0.42, Math.sin(ang) * 0.42);
      palm.position.set(px, py, pz);
      emeraldGroup.add(palm);
    }

    // Coastal rocks around Emerald Atoll: half-submerged in the surf
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const rad = 84.0 + (i % 3) * 6.5;
      const rock = this.createCoastalRock(2.8 + (i % 3) * 1.6);
      rock.position.set(Math.cos(ang) * rad, -0.35, Math.sin(ang) * rad);
      emeraldGroup.add(rock);
    }

    this.scene.add(emeraldGroup);
    this.islands.push({ pos: emeraldGroup.position, radius: 105, name: 'Emerald Sanctuary Atoll' });
  }

  // ── 2. HISTORIC COASTAL LIGHTHOUSE WITH ROTATING FRESNEL BEAM ──
  initLighthouse() {
    const group = new THREE.Group();
    // Placed on Cape Horizon Island summit crest
    group.position.set(480, this.lighthouseSummitY !== undefined ? this.lighthouseSummitY : 39.0, 650);

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

    // Procedural fallback tower group
    const proceduralTower = new THREE.Group();
    group.add(proceduralTower);

    // Load ultra-detailed Blender historic coastal lighthouse
    const lLoader = new GLTFLoader();
    lLoader.load(
      'assets/models/lighthouse.glb',
      (gltf) => {
        const lModel = gltf.scene;
        lModel.name = 'Blender_Lighthouse';
        lModel.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            if (c.name.includes('Glass') || c.material?.name?.includes('Glass')) {
              c.material = new THREE.MeshPhysicalMaterial({
                color: 0xdaeffa,
                transparent: true,
                opacity: 0.22,
                roughness: 0.05,
                transmission: 0.95,
                depthWrite: false
              });
            }
          }
        });
        proceduralTower.visible = false;
        group.add(lModel);
        console.log('Nautilus 3D: Ultra-realistic Blender historic lighthouse model loaded.');
      },
      undefined,
      (err) => console.warn('Nautilus 3D: Lighthouse GLB loading fallback to procedural:', err)
    );

    // Octagonal masonry foundation base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.8, 3.5, 8),
      matWhiteStone
    );
    base.position.y = 1.75;
    base.castShadow = true;
    proceduralTower.add(base);

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
      proceduralTower.add(section);
    }

    // Gallery Balcony & Railing
    const galleryY = 3.5 + 5 * bandHeight;
    const gallery = new THREE.Mesh(
      new THREE.CylinderGeometry(4.8, 4.4, 0.6, 16),
      matLanternBlack
    );
    gallery.position.y = galleryY + 0.3;
    proceduralTower.add(gallery);

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
    proceduralTower.add(lanternGlass);

    // Dome Roof & Lightning Rod
    const domeRoof = new THREE.Mesh(
      new THREE.SphereGeometry(3.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      matLanternBlack
    );
    domeRoof.position.y = galleryY + 4.2;
    proceduralTower.add(domeRoof);

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 4.5),
      matLanternBlack
    );
    rod.position.y = galleryY + 7.5;
    proceduralTower.add(rod);

    // Glowing Fresnel Lantern Core
    // ── GLOWING FRESNEL LANTERN CORE ──
    const lanternY = galleryY + 2.4;

    // Incandescent Fresnel lens cylinder housed cleanly inside the glass lantern room
    const fresnelCore = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 2.2, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff8eb })
    );
    fresnelCore.position.y = lanternY;
    proceduralTower.add(fresnelCore);

    // High-power omnidirectional lantern light (illuminates tower & stormy sea around island)
    const lanternPoint = new THREE.PointLight(0xffe290, 8.5, 280, 1.0);
    lanternPoint.position.y = lanternY;
    group.add(lanternPoint);
    this.lanternPoint = lanternPoint;

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
    // 4. Dynamic daylight dimming: in full daylight, beam fades to subtle atmospheric wisp (NO solid white daylight laser beam!)
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
      mat.baseOpacity = opacityVal;
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

    // Dynamic daylight / twilight / night / storm adaptive illumination:
    // In daylight (Clear Sunrise, Sunny Noon, Overcast), the beam is faint (0.015 opacity) so it doesn't blast like a laser across the blue sky.
    // In dark tempest, twilight sunset, or starry night, it cuts powerfully through the mist!
    if (this.beamMaterials && this.beamMaterials.length > 0) {
      const sunY = (weatherPreset && weatherPreset.sunPosition) ? weatherPreset.sunPosition[1] : 160;
      const isStorm = weatherPreset && (weatherPreset.id === 'storm' || weatherPreset.rain);
      const isNight = weatherPreset && (weatherPreset.id === 'aurora');
      const isSunset = weatherPreset && (weatherPreset.id === 'sunset');

      let visibilityFactor = 0.015; // Natural faint daylight shimmer
      if (isStorm) {
        visibilityFactor = 1.0;
      } else if (isNight || sunY < 15) {
        visibilityFactor = 0.85;
      } else if (isSunset || (sunY >= 15 && sunY < 55)) {
        const t = (55 - sunY) / 40.0;
        visibilityFactor = 0.015 + t * 0.50;
      }

      for (const mat of this.beamMaterials) {
        if (mat.uniforms && mat.uniforms.uOpacity) {
          const targetOpacity = mat.baseOpacity * visibilityFactor;
          mat.uniforms.uOpacity.value = THREE.MathUtils.lerp(
            mat.uniforms.uOpacity.value,
            targetOpacity,
            Math.min(1.0, 5.0 * dt)
          );
        }
        if (mat.uniforms && mat.uniforms.uStormBoost) {
          const targetBoost = isStorm ? 1.65 : (isNight ? 1.35 : 1.0);
          mat.uniforms.uStormBoost.value = THREE.MathUtils.lerp(
            mat.uniforms.uStormBoost.value,
            targetBoost,
            Math.min(1.0, 4.0 * dt)
          );
        }
      }

      // Spotlight wave sweep adjustment
      for (const spot of this.lighthouseBeams) {
        const targetIntensity = isStorm ? 28.0 : (isNight || sunY < 15 ? 22.0 : (visibilityFactor > 0.1 ? 6.0 : 0.0));
        spot.intensity = THREE.MathUtils.lerp(spot.intensity, targetIntensity, Math.min(1.0, 5.0 * dt));
      }

      // Lantern point light
      if (this.lanternPoint) {
        const targetPoint = isStorm ? 12.0 : (isNight || sunY < 15 ? 9.5 : (visibilityFactor > 0.1 ? 4.0 : 1.5));
        this.lanternPoint.intensity = THREE.MathUtils.lerp(this.lanternPoint.intensity, targetPoint, Math.min(1.0, 5.0 * dt));
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
