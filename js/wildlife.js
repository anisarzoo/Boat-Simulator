// Dynamic Marine Wildlife System: Bow-Riding Dolphins & Breaching Humpback Whales
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sampleOcean } from './gerstner.js';

export class MarineWildlife {
  constructor(scene) {
    this.scene = scene;
    this.dolphins = [];
    this.whales = [];
    this.spoutParticles = [];

    this.initDolphins();
    this.initWhales();
    this.initSpoutParticles();
    this.initSplashParticles();

    // Load ultra-realistic anatomical Blender dolphin & humpback whale models
    this.loadBlenderWildlife();
  }

  loadBlenderWildlife() {
    const loader = new GLTFLoader();

    // 1. Load Blender Bottlenose Dolphin
    loader.load(
      'assets/models/dolphin.glb',
      (gltf) => {
        const dolphinTemplate = gltf.scene;
        dolphinTemplate.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        for (const d of this.dolphins) {
          const clone = dolphinTemplate.clone();
          clone.name = `BlenderDolphin_${d.id}`;
          while (d.group.children.length > 0) {
            d.group.remove(d.group.children[0]);
          }
          d.group.add(clone);
          // Dedicated tail articulation node so fluke strokes don't pitch the entire body
          const tailPivot = new THREE.Group();
          tailPivot.position.set(0, 0, -1.6);
          d.group.add(tailPivot);
          d.tailStock = tailPivot;
        }
        console.log('Nautilus 3D: Anatomical Blender dolphin model successfully loaded.');
      },
      undefined,
      (err) => console.warn('Nautilus 3D: Dolphin GLB fallback to procedural:', err)
    );

    // 2. Load Blender Humpback Whale
    loader.load(
      'assets/models/whale.glb',
      (gltf) => {
        const whaleTemplate = gltf.scene;
        whaleTemplate.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        for (const w of this.whales) {
          const clone = whaleTemplate.clone();
          clone.name = `BlenderWhale_${w.id}`;
          while (w.group.children.length > 0) {
            w.group.remove(w.group.children[0]);
          }
          w.group.add(clone);
          // Articulation sub-node for subtle tail flex
          const tailPivot = new THREE.Group();
          tailPivot.position.set(0, 0, -10.5);
          w.group.add(tailPivot);
          w.tailStock = tailPivot;
        }
        console.log('Nautilus 3D: Anatomical Blender humpback whale model successfully loaded.');
      },
      undefined,
      (err) => console.warn('Nautilus 3D: Whale GLB fallback to procedural:', err)
    );
  }

  // ── 1. HIGH-DETAIL ANATOMICAL BOTTLENOSE DOLPHIN ──
  createDolphinModel() {
    const group = new THREE.Group();

    // ── PBR Materials ──
    const matDorsal = new THREE.MeshStandardMaterial({
      color: 0x2a3d52,
      roughness: 0.18,
      metalness: 0.12
    });

    const matBelly = new THREE.MeshStandardMaterial({
      color: 0xd8dfe8,
      roughness: 0.22,
      metalness: 0.08
    });

    const matEye = new THREE.MeshStandardMaterial({
      color: 0x0a0d12,
      roughness: 0.05,
      metalness: 0.8
    });

    const matEyeGlint = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // ── 1. Streamlined Fusiform Body via multi-ring loft ──
    // Bottlenose dolphin: ~2.5m long, body built along +Z = forward
    const rings = [
      { z:  2.50, rx: 0.020, ry: 0.015, y: -0.02 }, // Rostrum tip (beak point)
      { z:  2.30, rx: 0.042, ry: 0.032, y: -0.01 }, // Rostrum mid
      { z:  2.05, rx: 0.065, ry: 0.050, y:  0.00 }, // Rostrum base / jaw hinge
      { z:  1.75, rx: 0.155, ry: 0.170, y:  0.06 }, // Melon forehead (prominent bulge)
      { z:  1.40, rx: 0.240, ry: 0.270, y:  0.05 }, // Cranium
      { z:  1.00, rx: 0.310, ry: 0.340, y:  0.03 }, // Shoulder / pectoral insert
      { z:  0.50, rx: 0.350, ry: 0.380, y:  0.00 }, // Max girth mid-torso
      { z:  0.00, rx: 0.340, ry: 0.365, y: -0.01 }, // Dorsal fin base
      { z: -0.50, rx: 0.300, ry: 0.330, y: -0.02 }, // Aft torso
      { z: -1.00, rx: 0.230, ry: 0.260, y: -0.03 }, // Lumbar taper
      { z: -1.50, rx: 0.145, ry: 0.170, y: -0.03 }, // Caudal peduncle start
      { z: -1.85, rx: 0.080, ry: 0.110, y: -0.02 }, // Peduncle narrow
    ];

    const radialSegs = 20;
    const numRings = rings.length;
    const bodyPositions = [];
    const bodyNormals = [];
    const bodyColors = [];

    for (let r = 0; r < numRings; r++) {
      const ring = rings[r];
      for (let s = 0; s <= radialSegs; s++) {
        const theta = (s / radialSegs) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        bodyPositions.push(cosT * ring.rx, ring.y + sinT * ring.ry, ring.z);
        bodyNormals.push(cosT, sinT, 0);

        // Counter-shading: dorsal (top) = dark, flank = grey, belly = white
        const dorsalFactor = (sinT + 1) * 0.5; // 0=belly, 1=dorsal
        if (dorsalFactor > 0.62) {
          bodyColors.push(0.16, 0.24, 0.32); // Dark steel-blue dorsal cape
        } else if (dorsalFactor > 0.35) {
          bodyColors.push(0.38, 0.46, 0.54); // Mid-grey flank
        } else {
          bodyColors.push(0.88, 0.92, 0.95); // Pearl white belly
        }
      }
    }

    const bodyIndices = [];
    for (let r = 0; r < numRings - 1; r++) {
      for (let s = 0; s < radialSegs; s++) {
        const a = r * (radialSegs + 1) + s;
        const b = (r + 1) * (radialSegs + 1) + s;
        const c = b + 1;
        const d = a + 1;
        bodyIndices.push(a, b, d);
        bodyIndices.push(b, c, d);
      }
    }

    const bodyGeo = new THREE.BufferGeometry();
    bodyGeo.setIndex(bodyIndices);
    bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(bodyPositions, 3));
    bodyGeo.setAttribute('normal', new THREE.Float32BufferAttribute(bodyNormals, 3));
    bodyGeo.setAttribute('color', new THREE.Float32BufferAttribute(bodyColors, 3));
    bodyGeo.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.10
    }));
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // ── 2. Prominent Curved Dorsal Fin (falcate) ──
    const dorsalFin = new THREE.Group();
    dorsalFin.position.set(0, 0.36, -0.05);

    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.bezierCurveTo(-0.02, 0.15, -0.05, 0.32, -0.12, 0.52);
    finShape.bezierCurveTo(-0.08, 0.46, -0.04, 0.28, 0.10, 0.08);
    finShape.lineTo(0.28, 0);
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.012,
      bevelThickness: 0.010
    });
    finGeo.rotateY(Math.PI / 2);
    finGeo.translate(0.018, 0, 0);
    dorsalFin.add(new THREE.Mesh(finGeo, matDorsal));
    dorsalFin.castShadow = true;
    group.add(dorsalFin);

    // ── 3. Swept Pectoral Flippers ──
    for (const side of [-1, 1]) {
      const flipGroup = new THREE.Group();
      flipGroup.position.set(side * 0.32, -0.12, 0.85);
      flipGroup.rotation.set(0.15, side * 0.25, side * -0.65);

      const fShape = new THREE.Shape();
      fShape.moveTo(0, 0);
      fShape.bezierCurveTo(side * 0.10, -0.04, side * 0.30, -0.14, side * 0.52, -0.32);
      fShape.bezierCurveTo(side * 0.38, -0.28, side * 0.18, -0.20, 0, -0.12);
      fShape.closePath();

      const fGeo = new THREE.ExtrudeGeometry(fShape, {
        depth: 0.022,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.008,
        bevelThickness: 0.006
      });
      flipGroup.add(new THREE.Mesh(fGeo, matDorsal));
      group.add(flipGroup);
    }

    // ── 4. Expressive Eyes ──
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 8, 8),
        matEye
      );
      eye.position.set(side * 0.14, 0.065, 1.82);
      group.add(eye);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 4, 4),
        matEyeGlint
      );
      glint.position.set(side * 0.15, 0.075, 1.84);
      group.add(glint);
    }

    // ── 5. Mouth Line (jaw crease) ──
    const jawLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, 0.008, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.9 })
    );
    jawLine.position.set(0, -0.01, 2.15);
    group.add(jawLine);

    // ── 6. Blowhole ──
    const blowhole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, 0.015, 6),
      matDorsal
    );
    blowhole.position.set(0, 0.28, 1.50);
    group.add(blowhole);

    // ── 7. Articulated Tail Stock (Peduncle) & Horizontal Flukes ──
    const peduncleGroup = new THREE.Group();
    peduncleGroup.position.set(0, -0.02, -1.85);

    // Tapered peduncle
    const pedGeo = new THREE.CylinderGeometry(0.035, 0.08, 0.95, 12);
    pedGeo.rotateX(-Math.PI / 2);
    pedGeo.scale(1.0, 1.4, 1.0); // vertically compressed
    pedGeo.translate(0, 0, -0.48);
    peduncleGroup.add(new THREE.Mesh(pedGeo, matDorsal));

    // Crescent Tail Flukes
    const flukeShape = new THREE.Shape();
    flukeShape.moveTo(0, 0);
    flukeShape.bezierCurveTo(-0.12, 0.06, -0.32, 0.10, -0.48, 0.02);
    flukeShape.bezierCurveTo(-0.36, -0.10, -0.14, -0.14, -0.03, -0.12);
    flukeShape.lineTo(0, -0.08);
    flukeShape.lineTo(0.03, -0.12);
    flukeShape.bezierCurveTo(0.14, -0.14, 0.36, -0.10, 0.48, 0.02);
    flukeShape.bezierCurveTo(0.32, 0.10, 0.12, 0.06, 0, 0);
    flukeShape.closePath();

    const flukeGeo = new THREE.ExtrudeGeometry(flukeShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.006,
      bevelThickness: 0.005
    });
    flukeGeo.rotateX(Math.PI / 2);
    flukeGeo.translate(0, 0.009, -0.92);
    peduncleGroup.add(new THREE.Mesh(flukeGeo, matDorsal));

    group.add(peduncleGroup);

    // Scale the whole dolphin up for visibility (final ~2.5m body length)
    group.scale.setScalar(1.15);

    return {
      group,
      tailStock: peduncleGroup
    };
  }

  // ── 2. PROCEDURAL ANATOMICAL HUMPBACK WHALE MODEL ──
  createWhaleModel() {
    const group = new THREE.Group();

    const matWhale = new THREE.MeshStandardMaterial({
      color: 0x181f28, // Deep slate marine mammal skin
      roughness: 0.30,
      metalness: 0.08
    });

    const matVentral = new THREE.MeshStandardMaterial({
      color: 0x82929e, // Pleated ventral throat grooves
      roughness: 0.42,
      metalness: 0.04
    });

    // 1. Contoured Multi-Ring Fuselage Loft (14m anatomical humpback whale)
    const rings = [
      { z:  7.5, rx: 0.35, ry: 0.25, oy: -0.10 }, // Rostrum tip
      { z:  5.8, rx: 1.35, ry: 0.95, oy:  0.15 }, // Head & blowhole splash guard
      { z:  3.5, rx: 2.05, ry: 1.65, oy:  0.05 }, // Cranial throat
      { z:  0.0, rx: 2.35, ry: 2.10, oy: -0.15 }, // Mid torso max girth (4.7m wide)
      { z: -3.8, rx: 1.85, ry: 1.70, oy: -0.15 }, // Ventral groove termination
      { z: -7.5, rx: 1.15, ry: 1.20, oy: -0.05 }, // Dorsal fin ridge
      { z: -10.8, rx: 0.60, ry: 0.70, oy:  0.00 }, // Caudal peduncle
      { z: -13.5, rx: 0.25, ry: 0.30, oy:  0.00 }  // Fluke insertion
    ];

    const numSegs = 18;
    const positions = [];
    const indices = [];

    // Ring vertices
    for (const r of rings) {
      for (let s = 0; s < numSegs; s++) {
        const theta = (s / numSegs) * Math.PI * 2.0;
        const x = Math.cos(theta) * r.rx;
        const y = r.oy + Math.sin(theta) * r.ry;
        positions.push(x, y, r.z);
      }
    }

    // Connect rings
    for (let r = 0; r < rings.length - 1; r++) {
      const row1 = r * numSegs;
      const row2 = (r + 1) * numSegs;
      for (let s = 0; s < numSegs; s++) {
        const sNext = (s + 1) % numSegs;
        const a = row1 + s;
        const b = row2 + s;
        const c = row2 + sNext;
        const d = row1 + sNext;
        indices.push(a, b, d);
        indices.push(d, b, c);
      }
    }

    // Cap rostrum tip
    for (let s = 0; s < numSegs - 2; s++) {
      indices.push(0, s + 1, s + 2);
    }

    const bodyGeo = new THREE.BufferGeometry();
    bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bodyGeo.setIndex(indices);
    bodyGeo.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(bodyGeo, matWhale);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // 2. Ventral Grooves Pleat Underbelly
    const bellyGeo = new THREE.CylinderGeometry(1.6, 2.1, 7.0, 12, 1, false, 0, Math.PI);
    bellyGeo.rotateX(-Math.PI / 2);
    bellyGeo.rotateZ(Math.PI);
    bellyGeo.scale(0.92, 0.45, 1.0);
    const belly = new THREE.Mesh(bellyGeo, matVentral);
    belly.position.set(0, -0.65, 1.8);
    belly.receiveShadow = true;
    group.add(belly);

    // 3. Knobby Wing-Like Pectoral Flippers (4.8m long)
    for (const sx of [-1.0, 1.0]) {
      const flipperGeo = new THREE.BufferGeometry();
      const flipperVerts = new Float32Array([
        sx * 1.95, -0.3,  2.2,
        sx * 4.85, -1.6,  0.3,
        sx * 4.60, -1.5, -0.4,
        sx * 1.85, -0.4,  0.8
      ]);
      flipperGeo.setAttribute('position', new THREE.BufferAttribute(flipperVerts, 3));
      flipperGeo.setIndex([0, 1, 2, 0, 2, 3, 2, 1, 0, 3, 2, 0]);
      flipperGeo.computeVertexNormals();
      const flipper = new THREE.Mesh(flipperGeo, matWhale);
      flipper.castShadow = true;
      group.add(flipper);
    }

    // 4. Low Stepped Dorsal Hump
    const dorsalGeo = new THREE.ConeGeometry(0.35, 1.1, 5);
    dorsalGeo.rotateX(-0.55);
    const dorsal = new THREE.Mesh(dorsalGeo, matWhale);
    dorsal.position.set(0, 1.45, -7.5);
    dorsal.castShadow = true;
    group.add(dorsal);

    // 5. Articulated Tail Peduncle & Flukes
    const tailStock = new THREE.Group();
    tailStock.position.set(0, 0, -10.8);

    const flukeGeo = new THREE.BufferGeometry();
    const flukeVerts = new Float32Array([
       0.0,  0.0, -2.7,
      -2.4,  0.0, -4.4,
      -2.1,  0.0, -5.0,
       0.0,  0.0, -4.3,
       2.1,  0.0, -5.0,
       2.4,  0.0, -4.4
    ]);
    flukeGeo.setAttribute('position', new THREE.BufferAttribute(flukeVerts, 3));
    flukeGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4, 0]);
    flukeGeo.computeVertexNormals();
    const flukes = new THREE.Mesh(flukeGeo, matWhale);
    flukes.castShadow = true;
    tailStock.add(flukes);

    group.add(tailStock);

    return {
      group,
      tailStock,
      blowholePos: new THREE.Vector3(0, 1.5, 5.8)
    };
  }

  initDolphins() {
    // Dynamic companion pair of 2 autonomous oceanic dolphins (Echo & Cascade)
    // Never fixed to ship; fully dynamic momentum & parabolic ballistic physics!
    this.podCount = 2;
    this.dolphins = [];

    for (let i = 0; i < this.podCount; i++) {
      const model = this.createDolphinModel();
      const isPort = (i === 0);
      const latSign = isPort ? -1 : 1;

      const dolphin = {
        id: i,
        name: i === 0 ? 'Echo' : 'Cascade',
        ...model,
        pos: new THREE.Vector3(latSign * 6.5, -1.2, 11.0),
        vel: new THREE.Vector3(latSign * 1.0, 0, 6.0),
        preferredSide: latSign * 3.8, // dynamic lateral corridor (-3.8m port, +3.8m stbd)
        phase: i * Math.PI, // alternating rhythmic swimming stroke
        jumpTimer: 3.5 + i * 4.2, // initial staggered jump cadence
        state: 'swim', // 'swim' | 'jump' | 'dive'
        diveTimer: 0,
        hasSplashedUp: false,
        hasSplashedDown: false,
        pitch: 0,
        yaw: 0,
        roll: 0
      };
      this.dolphins.push(dolphin);
      this.scene.add(model.group);
    }
  }

  initWhales() {
    // 2 majestic humpback whales in the surrounding ocean
    const whaleOffsets = [
      { x: 130, z: 90, heading: 0.8 },
      { x: -160, z: -120, heading: -2.1 }
    ];

    for (let i = 0; i < whaleOffsets.length; i++) {
      const model = this.createWhaleModel();
      const wData = {
        id: i,
        ...model,
        pos: new THREE.Vector3(whaleOffsets[i].x, -3.2, whaleOffsets[i].z),
        heading: whaleOffsets[i].heading,
        state: 'surface', // 'surface' | 'spout' | 'dive' | 'deep'
        timer: 3.0 + Math.random() * 6.0,
        pitch: 0,
        swimCycle: Math.random() * 10
      };
      this.whales.push(wData);
      this.scene.add(model.group);
    }
  }

  // ── 3. VOLUMETRIC BLOWHOLE MIST SPOUT PARTICLES ──
  initSpoutParticles() {
    const count = 350;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      alphas[i] = 0.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xd8e8f8) }
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (18.0 / -mvPos.z) * (1.0 + (1.0 - alpha) * 2.5);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float falloff = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor, falloff * vAlpha * 0.45);
        }
      `
    });

    this.spoutMesh = new THREE.Points(geo, mat);
    this.scene.add(this.spoutMesh);

    this.spoutPool = [];
    for (let i = 0; i < count; i++) {
      this.spoutPool.push({
        idx: i,
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 2.5
      });
    }
  }

  // ── 4. DYNAMIC DOLPHIN WATER SPLASH & FOAM PARTICLES ──
  initSplashParticles() {
    const count = 160;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      alphas[i] = 0.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xf2f8ff) }
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (15.0 / -mvPos.z) * (1.0 + (1.0 - alpha) * 2.2);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float falloff = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor, falloff * vAlpha * 0.7);
        }
      `
    });

    this.splashMesh = new THREE.Points(geo, mat);
    this.scene.add(this.splashMesh);

    this.splashPool = [];
    for (let i = 0; i < count; i++) {
      this.splashPool.push({
        idx: i,
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1.2
      });
    }
  }

  triggerSplash(worldPos, count = 20) {
    let triggered = 0;
    for (const p of this.splashPool) {
      if (!p.active) {
        p.active = true;
        p.pos.copy(worldPos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.1, (Math.random() - 0.5) * 0.5));
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * 2.4;
        p.vel.set(Math.cos(angle) * speed, 2.8 + Math.random() * 3.2, Math.sin(angle) * speed);
        p.life = 0;
        p.maxLife = 0.75 + Math.random() * 0.45;
        triggered++;
        if (triggered >= count) break;
      }
    }
  }

  triggerBlowholeSpout(worldOrigin) {
    let triggered = 0;
    for (const p of this.spoutPool) {
      if (!p.active) {
        p.active = true;
        p.pos.copy(worldOrigin).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8));
        p.vel.set(
          (Math.random() - 0.5) * 2.2,
          7.5 + Math.random() * 4.5,
          (Math.random() - 0.5) * 2.2
        );
        p.life = 0;
        p.maxLife = 1.8 + Math.random() * 0.8;
        triggered++;
        if (triggered >= 45) break;
      }
    }
  }

  // ── 5. COMPREHENSIVE OBSTACLE AVOIDANCE & HULL PENETRATION RESOLUTION ──
  resolveObstacles(d, dt, shipPosition, shipQuaternion, shipForward, shipRight, shipSpeedKnots, archipelago, traffic, buoys) {
    if (!shipPosition) return;

    // ── A. PLAYER SHIP HULL & SUPERSTRUCTURE AVOIDANCE ──
    const shipQuat = shipQuaternion || new THREE.Quaternion();
    const shipQuatInv = shipQuat.clone().invert();
    const relPos = d.pos.clone().sub(shipPosition).applyQuaternion(shipQuatInv);

    // Ship hull geometry dimensions (length 18.5m, beam 5.2m, draft 2.2m, freeboard/bridge 4.8m)
    // Local coords: Z+ = Bow, Z- = Stern, X+ = Starboard, X- = Port, Y = Height relative to waterline center
    const zMin = -10.5; // Stern swim platform / transom boundary
    const zMax = 10.6;  // Bow pulpit / anchor stem boundary

    // 1. Hard Hull Penetration Check
    if (relPos.y > -2.4 && relPos.y < 5.2) {
      if (relPos.z >= zMin && relPos.z <= zMax) {
        // Compute tapering hull half-beam at this local longitudinal coordinate
        let halfBeam;
        if (relPos.z <= 1.8) {
          halfBeam = 2.6; // Midbody and aft parallel body
        } else {
          const zFrac = Math.min(1.0, (relPos.z - 1.8) / 8.8);
          halfBeam = 2.6 * Math.pow(1.0 - zFrac, 0.88) + 0.18; // Tapering clipper bow
        }

        // Safe clearance margin (0.95m for dolphin body width + pectoral fins)
        const safeW = halfBeam + 0.95;

        // Predictive steering push before touching hull
        const steerZone = safeW + 2.4;
        if (Math.abs(relPos.x) < steerZone) {
          const sideDir = relPos.x !== 0 ? Math.sign(relPos.x) : (d.preferredSide >= 0 ? 1 : -1);
          const pushFraction = (steerZone - Math.abs(relPos.x)) / 2.4;
          d.vel.addScaledVector(shipRight, sideDir * pushFraction * 9.5 * dt);
        }

        // Hard penetration resolution: force dolphin strictly outside hull boundary!
        if (Math.abs(relPos.x) < safeW) {
          const sideDir = relPos.x !== 0 ? Math.sign(relPos.x) : (d.preferredSide >= 0 ? 1 : -1);
          relPos.x = sideDir * safeW;

          // Re-project hard-clamped coordinate back to world coordinates
          d.pos.copy(relPos.clone().applyQuaternion(shipQuat).add(shipPosition));

          // Deflect lateral velocity outward away from hull so dolphin glides along topsides
          const vLocal = d.vel.clone().applyQuaternion(shipQuatInv);
          if ((sideDir > 0 && vLocal.x < 1.0) || (sideDir < 0 && vLocal.x > -1.0)) {
            vLocal.x = sideDir * Math.max(Math.abs(vLocal.x) * 0.7, 2.5);
            d.vel.copy(vLocal.applyQuaternion(shipQuat));
          }
        }
      }

      // 2. Bow Wave High-Pressure Cushion Deflection (Ahead of stem knife-edge: Z in [10.5, 17.5])
      if (relPos.z > zMax && relPos.z < 17.5 && Math.abs(relPos.x) < 3.4) {
        const bowDir = relPos.x !== 0 ? Math.sign(relPos.x) : (d.preferredSide >= 0 ? 1 : -1);
        const bowT = 1.0 - (relPos.z - zMax) / 6.9;
        const forwardSpeed = Math.max(shipSpeedKnots * 0.514, 1.2);
        const bowPushForce = bowT * (forwardSpeed * 1.8 + 2.5) * dt;
        d.vel.addScaledVector(shipRight, bowDir * bowPushForce);

        // Stem collision prevention: if directly in front of the knife-edge bow stem
        if (relPos.z < 12.2 && Math.abs(relPos.x) < 1.35) {
          relPos.x = bowDir * 1.45;
          d.pos.copy(relPos.clone().applyQuaternion(shipQuat).add(shipPosition));
        }
      }

      // 3. Stern Propeller Wash & Screw Turbulence Rejection (Z in [-14.5, -9.5])
      if (relPos.z > -14.5 && relPos.z < zMin && Math.abs(relPos.x) < 3.6 && relPos.y > -2.8 && relPos.y < 0.6) {
        const sternSide = relPos.x !== 0 ? Math.sign(relPos.x) : (d.preferredSide >= 0 ? 1 : -1);
        d.vel.addScaledVector(shipForward, -4.2 * dt);
        d.vel.addScaledVector(shipRight, sternSide * 4.5 * dt);
        if (relPos.z > -10.8 && Math.abs(relPos.x) < 2.8) {
          relPos.z = -10.9;
          d.pos.copy(relPos.clone().applyQuaternion(shipQuat).add(shipPosition));
        }
      }
    }

    // ── B. AI MARINE TRAFFIC VESSELS AVOIDANCE & HARD CLAMP ──
    if (traffic && traffic.vessels) {
      for (const v of traffic.vessels) {
        const dx = d.pos.x - v.pos.x;
        const dz = d.pos.z - v.pos.z;
        const quickDist = Math.hypot(dx, dz);
        const maxCheckDist = ((v.length || 30) * 0.5) + 32.0;

        if (quickDist < maxCheckDist) {
          const vHeading = v.heading || 0;
          const sinH = Math.sin(vHeading);
          const cosH = Math.cos(vHeading);

          // Project into AI vessel's local coordinate frame
          const localZ = dx * sinH + dz * cosH;
          const localX = dx * cosH - dz * sinH;

          const halfL = (v.length || 30) * 0.5 + 2.8; // Safe half length
          const halfB = (v.beam || 8) * 0.5 + 2.2;   // Safe half beam

          const avoidZ = halfL + 18.0;
          const avoidX = halfB + 14.0;

          const absZ = Math.abs(localZ);
          const absX = Math.abs(localX);

          if (absZ < avoidZ && absX < avoidX) {
            const signX = localX >= 0 ? 1 : -1;
            const signZ = localZ >= 0 ? 1 : -1;
            const penX = Math.max(0, avoidX - absX) / 14.0;
            const penZ = Math.max(0, avoidZ - absZ) / 18.0;

            const vRightX = cosH;
            const vRightZ = -sinH;

            const steerForce = (penX * 7.5 + penZ * 3.5) * dt;
            d.vel.x += (vRightX * signX) * steerForce;
            d.vel.z += (vRightZ * signX) * steerForce;

            // Hard clamp: if inside vessel hull bounding box
            if (absZ < halfL && absX < halfB) {
              const overZ = halfL - absZ;
              const overX = halfB - absX;

              if (overX <= overZ) {
                const exitX = signX * (halfB + 0.6);
                d.pos.x = v.pos.x + exitX * cosH + localZ * sinH;
                d.pos.z = v.pos.z - exitX * sinH + localZ * cosH;
              } else {
                const exitZ = signZ * (halfL + 1.2);
                d.pos.x = v.pos.x + localX * cosH + exitZ * sinH;
                d.pos.z = v.pos.z - localX * sinH + exitZ * cosH;
              }

              if (quickDist > 0.05) {
                const onx = dx / quickDist;
                const onz = dz / quickDist;
                const vDotO = d.vel.x * onx + d.vel.z * onz;
                if (vDotO < 0) {
                  d.vel.x -= onx * vDotO * 1.8;
                  d.vel.z -= onz * vDotO * 1.8;
                }
              }
            }
          }
        }
      }
    }

    // ── C. NAVIGATION CHANNEL BUOYS AVOIDANCE & HARD CLAMP ──
    if (buoys && buoys.buoys) {
      for (const b of buoys.buoys) {
        const bdx = d.pos.x - b.baseX;
        const bdz = d.pos.z - b.baseZ;
        const bDist = Math.hypot(bdx, bdz);
        const buoySafeR = 4.2;  // 1.6m collar radius + 2.6m safety margin
        const buoyAvoidR = 10.0;

        if (bDist < buoyAvoidR && bDist > 0.01) {
          const bnx = bdx / bDist;
          const bnz = bdz / bDist;

          // Echolocation avoidance steering
          const steer = ((buoyAvoidR - bDist) / buoyAvoidR) * 6.5 * dt;
          d.vel.x += bnx * steer;
          d.vel.z += bnz * steer;

          // Hard perimeter clamp
          if (bDist < buoySafeR) {
            d.pos.x = b.baseX + bnx * buoySafeR;
            d.pos.z = b.baseZ + bnz * buoySafeR;
            const vDotB = d.vel.x * bnx + d.vel.z * bnz;
            if (vDotB < 0) {
              d.vel.x -= bnx * vDotB * 1.6;
              d.vel.z -= bnz * vDotB * 1.6;
            }
          }
        }
      }
    }

    // ── D. HUMPBACK WHALES ACOUSTIC AVOIDANCE & HARD SEPARATION ──
    if (this.whales) {
      for (const w of this.whales) {
        const wdx = d.pos.x - w.pos.x;
        const wdz = d.pos.z - w.pos.z;
        const wDist = Math.hypot(wdx, wdz);
        const whaleSafeR = 11.0; // Whale LOA ~14m, max beam ~4.7m
        const whaleAvoidR = 25.0;

        if (wDist < whaleAvoidR && wDist > 0.01) {
          const wnx = wdx / wDist;
          const wnz = wdz / wDist;

          const steer = ((whaleAvoidR - wDist) / whaleAvoidR) * 5.5 * dt;
          d.vel.x += wnx * steer;
          d.vel.z += wnz * steer;

          if (wDist < whaleSafeR) {
            d.pos.x = w.pos.x + wnx * whaleSafeR;
            d.pos.z = w.pos.z + wnz * whaleSafeR;
            const vDotW = d.vel.x * wnx + d.vel.z * wnz;
            if (vDotW < 0) {
              d.vel.x -= wnx * vDotW * 1.6;
              d.vel.z -= wnz * vDotW * 1.6;
            }
          }
        }
      }
    }

    // ── E. ISLANDS, REEFS & SEA STACKS BARRIER ──
    if (archipelago && archipelago.islands) {
      for (const isle of archipelago.islands) {
        const ddx = d.pos.x - isle.pos.x;
        const ddz = d.pos.z - isle.pos.z;
        const dDist = Math.hypot(ddx, ddz);
        const minClearance = isle.radius + 20.0;
        const lookahead = minClearance + 35.0;

        if (dDist < lookahead && dDist > 0.01) {
          const inx = ddx / dDist;
          const inz = ddz / dDist;

          // Coastal reef avoidance steering
          const steer = ((lookahead - dDist) / 35.0) * 8.5 * dt;
          d.vel.x += inx * steer;
          d.vel.z += inz * steer;

          // Hard reef shoreline barrier: never penetrate landmass
          if (dDist < minClearance) {
            d.pos.x = isle.pos.x + inx * minClearance;
            d.pos.z = isle.pos.z + inz * minClearance;

            const vDotN = d.vel.x * inx + d.vel.z * inz;
            if (vDotN < 0) {
              d.vel.x -= inx * vDotN * 1.8;
              d.vel.z -= inz * vDotN * 1.8;
            }
          }
        }
      }
    }
  }

  update(dt, time, shipPosition, shipQuaternion, shipSpeedKnots = 0, archipelago = null, traffic = null, buoys = null) {
    if (!shipPosition) return;

    const shipForward = new THREE.Vector3(0, 0, 1);
    const shipRight = new THREE.Vector3(1, 0, 0);
    if (shipQuaternion) {
      shipForward.applyQuaternion(shipQuaternion);
      shipRight.applyQuaternion(shipQuaternion);
    }

    // ── 1. UPDATE DOLPHINS (AUTONOMOUS STEERING & BALLISTIC PARABOLIC JUMPING) ──
    const isSailing = shipSpeedKnots > 3.5;

    for (const d of this.dolphins) {
      const prevY = d.pos.y;

      // 1. Horizontal position integrates from velocity
      d.pos.x += d.vel.x * dt;
      d.pos.z += d.vel.z * dt;

      // Initial dynamic obstacle avoidance pass (predictive steering + boundaries)
      this.resolveObstacles(d, dt, shipPosition, shipQuaternion, shipForward, shipRight, shipSpeedKnots, archipelago, traffic, buoys);

      // Sample exact wave elevation beneath dolphin
      const waveSample = sampleOcean(d.pos.x, d.pos.z, time, 1.0);
      const waterSurfaceY = waveSample.height;

      if (d.state === 'jump') {
        // True ballistic parabolic trajectory governed by realistic oceanic gravity
        d.pos.y += d.vel.y * dt;
        d.vel.y -= 18.0 * dt; // Crisp natural gravity

        // Breach splash
        if (!d.hasSplashedUp && d.pos.y > waterSurfaceY - 0.1) {
          d.hasSplashedUp = true;
          this.triggerSplash(d.pos, 16);
        }

        // Ocean re-entry
        if (d.vel.y < 0 && d.pos.y <= waterSurfaceY) {
          d.hasSplashedDown = true;
          this.triggerSplash(d.pos, 22);
          d.state = 'dive';
          d.diveTimer = 0.85 + Math.random() * 0.35;
          d.jumpTimer = 9.0 + Math.random() * 7.0; // Staggered next jump (9-16 seconds)
          d.pos.y = waterSurfaceY - 0.25; // Submerge immediately
          d.vel.y = -2.8; // Downward dive momentum
          d.vel.multiplyScalar(0.85); // Hydrodynamic entry drag
        }

        // Natural ballistic arching: nose up on ascent, arched at peak, nose down diving into sea
        const horizSpeed = Math.hypot(d.vel.x, d.vel.z);
        const targetYaw = Math.atan2(d.vel.x, d.vel.z);
        const targetPitch = Math.atan2(d.vel.y, Math.max(horizSpeed, 0.1));
        const bankRoll = (d.preferredSide > 0 ? 0.14 : -0.14);

        d.yaw = THREE.MathUtils.lerp(d.yaw, targetYaw, Math.min(1.0, 9.0 * dt));
        d.pitch = THREE.MathUtils.lerp(d.pitch, targetPitch, Math.min(1.0, 10.0 * dt));
        d.roll = THREE.MathUtils.lerp(d.roll, bankRoll, Math.min(1.0, 6.0 * dt));
        d.group.rotation.set(d.pitch, d.yaw, d.roll);

      } else if (d.state === 'dive') {
        // Smooth subsurface recovery transition after ocean re-entry
        d.diveTimer -= dt;
        d.phase += dt * 4.8;

        // Smooth guidance back to cruise depth (~1.1m beneath wave surface)
        const targetCruiseDepth = waterSurfaceY - 1.1;
        d.pos.y = THREE.MathUtils.lerp(d.pos.y, targetCruiseDepth, Math.min(1.0, 6.5 * dt));
        // Hard surface ceiling: never pop out into the air during dive!
        d.pos.y = Math.min(d.pos.y, waterSurfaceY - 0.22);
        d.vel.y = (d.pos.y - prevY) / Math.max(dt, 0.001);

        d.pitch = THREE.MathUtils.lerp(d.pitch, 0.04, 5.0 * dt);
        d.yaw = THREE.MathUtils.lerp(d.yaw, Math.atan2(d.vel.x, d.vel.z), Math.min(1.0, 6.0 * dt));
        d.roll = THREE.MathUtils.lerp(d.roll, 0.0, 4.0 * dt);
        d.group.rotation.set(d.pitch, d.yaw, d.roll);

        if (d.diveTimer <= 0) {
          d.state = 'swim';
        }

      } else {
        // ── 'swim' state: Autonomous hydrodynamic cruising tightly coupled to wave surface ──
        d.jumpTimer -= dt;
        const swimSpeedMult = isSailing ? 5.6 : 3.4;
        d.phase += dt * swimSpeedMult;

        if (isSailing) {
          // Dynamic bow wave surfing corridor (dynamic sweet spot outside hull)
          const fwdDist = 12.0 + Math.sin(time * 0.65 + d.id * 1.6) * 2.2;
          let latDist = d.preferredSide + Math.sin(time * 0.42 + d.id * 2.1) * 1.4;
          // Ensure sweet spot corridor stays safely in the open water bow wave crest outside the hull
          if (d.preferredSide > 0) {
            latDist = Math.max(latDist, 3.8);
          } else {
            latDist = Math.min(latDist, -3.8);
          }

          let sweetSpot = shipPosition.clone()
            .addScaledVector(shipForward, fwdDist)
            .addScaledVector(shipRight, latDist);

          // Avoid sweet spot projecting inside island
          if (archipelago && archipelago.islands) {
            for (const isle of archipelago.islands) {
              const ssDist = Math.hypot(sweetSpot.x - isle.pos.x, sweetSpot.z - isle.pos.z);
              const minClearance = isle.radius + 24.0;
              if (ssDist < minClearance && ssDist > 0.01) {
                const snx = (sweetSpot.x - isle.pos.x) / ssDist;
                const snz = (sweetSpot.z - isle.pos.z) / ssDist;
                sweetSpot.x = isle.pos.x + snx * minClearance;
                sweetSpot.z = isle.pos.z + snz * minClearance;
              }
            }
          }

          // Hydrodynamic attraction & velocity matching
          const toSweetSpot = sweetSpot.clone().sub(d.pos);
          toSweetSpot.y = 0;
          const distToSpot = toSweetSpot.length();

          const shipSpeedMps = shipSpeedKnots * 0.514;
          const desiredSpeed = Math.max(shipSpeedMps * 1.06 + 1.2, 5.0);

          // Blend forward direction with gentle attraction vector
          const steerHeading = shipForward.clone().multiplyScalar(0.72)
            .add(toSweetSpot.normalize().multiplyScalar(Math.min(distToSpot * 0.12, 0.48)))
            .normalize();

          const desiredVel = steerHeading.multiplyScalar(desiredSpeed);
          const steerAccel = desiredVel.sub(d.vel).clampLength(0, 14.0 * dt);
          d.vel.add(steerAccel);

          // Initiate bow wave breach ONLY when sailing fast and timer expires
          if (d.jumpTimer <= 0 && shipSpeedKnots >= 5.0) {
            d.state = 'jump';
            d.hasSplashedUp = false;
            d.hasSplashedDown = false;
            const horizDir = new THREE.Vector3(d.vel.x, 0, d.vel.z).normalize();
            d.vel.y = 5.8 + Math.random() * 1.2; // Natural playful bow breach (1.2m apex)
            d.vel.addScaledVector(horizDir, 2.2);
            // Ensure ballistic arc angles diagonally AWAY from ship hull
            const outwardDir = (d.preferredSide >= 0 ? 1 : -1);
            d.vel.addScaledVector(shipRight, outwardDir * 1.8);
          }

        } else {
          // Idle swimming in wide, peaceful orbits around vessel
          const orbitAngle = time * 0.24 + (d.id * Math.PI);
          const orbitRadius = 18.0 + Math.sin(time * 0.16 + d.id) * 6.5;
          let orbitTarget = shipPosition.clone().add(
            new THREE.Vector3(Math.cos(orbitAngle) * orbitRadius, 0, Math.sin(orbitAngle) * orbitRadius)
          );

          // Avoid orbit target projecting inside island
          if (archipelago && archipelago.islands) {
            for (const isle of archipelago.islands) {
              const otDist = Math.hypot(orbitTarget.x - isle.pos.x, orbitTarget.z - isle.pos.z);
              const minClearance = isle.radius + 22.0;
              if (otDist < minClearance && otDist > 0.01) {
                const onx = (orbitTarget.x - isle.pos.x) / otDist;
                const onz = (orbitTarget.z - isle.pos.z) / otDist;
                orbitTarget.x = isle.pos.x + onx * minClearance;
                orbitTarget.z = isle.pos.z + onz * minClearance;
              }
            }
          }

          const toOrbit = orbitTarget.clone().sub(d.pos);
          toOrbit.y = 0;
          const desiredVel = toOrbit.normalize().multiplyScalar(3.8);
          const steerAccel = desiredVel.sub(d.vel).clampLength(0, 7.5 * dt);
          d.vel.add(steerAccel);
        }

        // Mutual pod separation steering: companion dolphins maintain natural breathing space
        const otherDolphin = this.dolphins[1 - d.id];
        if (otherDolphin) {
          const sepVec = d.pos.clone().sub(otherDolphin.pos);
          sepVec.y = 0;
          const sepDist = sepVec.length();
          if (sepDist < 3.4 && sepDist > 0.05) {
            const sepForce = sepVec.normalize().multiplyScalar((3.4 - sepDist) * 3.8 * dt);
            d.vel.add(sepForce);
          }
        }

        // Subsurface cruising depth following wave profile snugly (0.7m to 0.95m depth)
        const targetSwimY = waterSurfaceY - 0.78 + Math.sin(d.phase) * 0.18;
        // Fast responsive vertical lerp ensures dolphin never gets left behind floating above wave troughs!
        d.pos.y = THREE.MathUtils.lerp(d.pos.y, targetSwimY, Math.min(1.0, 11.0 * dt));
        // Strict physical surface ceiling: NEVER float in the air while swimming!
        d.pos.y = Math.min(d.pos.y, waterSurfaceY - 0.18);
        d.vel.y = (d.pos.y - prevY) / Math.max(dt, 0.001);

        // Fluid undulating swimming orientation
        const targetYaw = Math.atan2(d.vel.x, d.vel.z);
        const waveSlopePitch = Math.cos(d.phase) * 0.16 + THREE.MathUtils.clamp(d.vel.y * 0.08, -0.22, 0.22);
        const targetRoll = THREE.MathUtils.clamp(-d.vel.x * 0.03, -0.18, 0.18);

        d.yaw = THREE.MathUtils.lerp(d.yaw, targetYaw, Math.min(1.0, 6.0 * dt));
        d.pitch = THREE.MathUtils.lerp(d.pitch, waveSlopePitch, Math.min(1.0, 7.0 * dt));
        d.roll = THREE.MathUtils.lerp(d.roll, targetRoll, Math.min(1.0, 5.0 * dt));
        d.group.rotation.set(d.pitch, d.yaw, d.roll);
      }

      // Final airtight obstacle resolution & hard clamp pass (prevents any frame-end penetration)
      this.resolveObstacles(d, dt, shipPosition, shipQuaternion, shipForward, shipRight, shipSpeedKnots, archipelago, traffic, buoys);

      // Propulsive fluke stroke (only articulates the tail pivot, never tilts the whole body!)
      if (d.tailStock) {
        d.tailStock.rotation.x = Math.sin(d.phase * 2.0) * 0.42;
      }
      d.group.position.copy(d.pos);
    }

    // ── 2. UPDATE HUMPBACK WHALES ──
    for (const w of this.whales) {
      w.swimCycle += dt * 0.8;
      w.timer -= dt;

      // Island & Shoal Reef Avoidance Steering
      if (archipelago && archipelago.islands) {
        for (const isle of archipelago.islands) {
          const wdx = w.pos.x - isle.pos.x;
          const wdz = w.pos.z - isle.pos.z;
          const wDist = Math.hypot(wdx, wdz);
          const safeWhaleRadius = isle.radius + 45.0;

          // Forward lookahead avoidance: turn smoothly away from island
          const lookaheadZone = safeWhaleRadius + 75.0;
          if (wDist < lookaheadZone) {
            const toIsleAngle = Math.atan2(isle.pos.x - w.pos.x, isle.pos.z - w.pos.z);
            let angleDiff = w.heading - toIsleAngle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            const turnSign = angleDiff > 0 ? 1 : -1;
            w.heading += turnSign * 0.75 * dt;
          }

          // Hard reef barrier: never swim under or through island landmass
          if (wDist < safeWhaleRadius && wDist > 0.01) {
            const wnx = wdx / wDist;
            const wnz = wdz / wDist;
            w.pos.x = isle.pos.x + wnx * (safeWhaleRadius + 1.0);
            w.pos.z = isle.pos.z + wnz * (safeWhaleRadius + 1.0);
            w.heading = Math.atan2(wnx, wnz) + (w.id % 2 === 0 ? 0.35 : -0.35);
          }
        }
      }

      const wForward = new THREE.Vector3(Math.sin(w.heading), 0, Math.cos(w.heading));
      w.pos.addScaledVector(wForward, 3.2 * dt);

      const distFromShip = w.pos.distanceTo(shipPosition);
      if (distFromShip > 480) {
        // Smooth oceanic re-centering far out of view (deep underwater)
        const spawnAngle = Math.random() * Math.PI * 2;
        let newWx = shipPosition.x + Math.cos(spawnAngle) * 320;
        let newWz = shipPosition.z + Math.sin(spawnAngle) * 320;

        // Ensure spawn is in deep open water, not inside an island
        if (archipelago && archipelago.islands) {
          for (const isle of archipelago.islands) {
            const dIsle = Math.hypot(newWx - isle.pos.x, newWz - isle.pos.z);
            if (dIsle < isle.radius + 60.0) {
              const awayAngle = Math.atan2(newWz - isle.pos.z, newWx - isle.pos.x);
              newWx = isle.pos.x + Math.cos(awayAngle) * (isle.radius + 75.0);
              newWz = isle.pos.z + Math.sin(awayAngle) * (isle.radius + 75.0);
            }
          }
        }

        w.pos.set(newWx, -14.0, newWz);
        w.heading = spawnAngle + Math.PI + (Math.random() - 0.5) * 0.8;
        w.state = 'deep';
        w.timer = 8.0 + Math.random() * 6.0;
      }

      if (w.state === 'surface') {
        w.pos.y = THREE.MathUtils.lerp(w.pos.y, -0.6, 1.2 * dt);
        w.pitch = THREE.MathUtils.lerp(w.pitch, 0.08, 1.5 * dt);

        if (w.timer <= 0) {
          w.state = 'spout';
          w.timer = 2.4;
          const blowholeWorld = w.pos.clone().add(w.blowholePos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), w.heading));
          this.triggerBlowholeSpout(blowholeWorld);
        }
      } else if (w.state === 'spout') {
        w.pos.y = THREE.MathUtils.lerp(w.pos.y, -0.4, 1.5 * dt);
        if (w.timer <= 0) {
          w.state = 'dive';
          w.timer = 5.0;
        }
      } else if (w.state === 'dive') {
        w.pos.y = THREE.MathUtils.lerp(w.pos.y, -4.8, 1.0 * dt);
        w.pitch = THREE.MathUtils.lerp(w.pitch, -0.45, 1.8 * dt);
        w.tailStock.rotation.x = THREE.MathUtils.lerp(w.tailStock.rotation.x, 0.75, 2.0 * dt);

        if (w.timer <= 0) {
          w.state = 'deep';
          w.timer = 12.0 + Math.random() * 10.0;
        }
      } else if (w.state === 'deep') {
        w.pos.y = -7.5;
        w.pitch = THREE.MathUtils.lerp(w.pitch, 0.0, 1.0 * dt);
        w.tailStock.rotation.x = Math.sin(w.swimCycle) * 0.25;

        if (w.timer <= 0) {
          w.state = 'surface';
          w.timer = 6.0;
        }
      }

      w.group.position.copy(w.pos);
      w.group.rotation.set(w.pitch, w.heading, 0);
    }

    // ── 3. UPDATE VOLUMETRIC SPOUT MIST PARTICLES ──
    const positions = this.spoutMesh.geometry.attributes.position.array;
    const alphas = this.spoutMesh.geometry.attributes.alpha.array;

    for (const p of this.spoutPool) {
      if (p.active) {
        p.life += dt;
        p.vel.y -= 3.5 * dt; // Gravity
        p.pos.addScaledVector(p.vel, dt);

        const normLife = p.life / p.maxLife;
        const alpha = Math.max(0, 1.0 - normLife);

        positions[p.idx * 3] = p.pos.x;
        positions[p.idx * 3 + 1] = p.pos.y;
        positions[p.idx * 3 + 2] = p.pos.z;
        alphas[p.idx] = alpha;

        if (p.life >= p.maxLife || p.pos.y < -0.2) {
          p.active = false;
          positions[p.idx * 3 + 1] = -100;
          alphas[p.idx] = 0.0;
        }
      }
    }

    this.spoutMesh.geometry.attributes.position.needsUpdate = true;
    this.spoutMesh.geometry.attributes.alpha.needsUpdate = true;

    // ── 4. UPDATE DOLPHIN SPLASH PARTICLES ──
    if (this.splashMesh) {
      const splashPos = this.splashMesh.geometry.attributes.position.array;
      const splashAlpha = this.splashMesh.geometry.attributes.alpha.array;

      for (const p of this.splashPool) {
        if (p.active) {
          p.life += dt;
          p.vel.y -= 7.8 * dt; // Splash droplet gravity
          p.pos.addScaledVector(p.vel, dt);

          const normLife = p.life / p.maxLife;
          const alpha = Math.max(0, 1.0 - normLife);

          splashPos[p.idx * 3] = p.pos.x;
          splashPos[p.idx * 3 + 1] = p.pos.y;
          splashPos[p.idx * 3 + 2] = p.pos.z;
          splashAlpha[p.idx] = alpha;

          if (p.life >= p.maxLife || p.pos.y < -0.4) {
            p.active = false;
            splashPos[p.idx * 3 + 1] = -100;
            splashAlpha[p.idx] = 0.0;
          }
        }
      }

      this.splashMesh.geometry.attributes.position.needsUpdate = true;
      this.splashMesh.geometry.attributes.alpha.needsUpdate = true;
    }
  }
}
