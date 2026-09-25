// Dynamic Marine Wildlife System: Bow-Riding Dolphins & Breaching Humpback Whales
import * as THREE from 'three';
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
  }

  // ── 1. HIGH-DETAIL ANATOMICAL PROCEDURAL DOLPHIN MODEL ──
  createDolphinModel() {
    const group = new THREE.Group();

    // Materials
    const matDorsal = new THREE.MeshStandardMaterial({
      color: 0x1e2c3a, // Deep slate ocean navy
      roughness: 0.2,
      metalness: 0.15
    });

    const matEye = new THREE.MeshStandardMaterial({
      color: 0x0c0f14,
      roughness: 0.1,
      metalness: 0.7
    });

    const matEyeGlint = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // 1. Smooth contoured fusiform body using multi-ring loft
    const rings = [
      { z:  1.38, rx: 0.045, ry: 0.035, y: -0.05 }, // Beak tip
      { z:  1.18, rx: 0.095, ry: 0.075, y: -0.04 }, // Beak base
      { z:  0.88, rx: 0.23,  ry: 0.26,  y:  0.06 }, // Melon forehead
      { z:  0.50, rx: 0.33,  ry: 0.36,  y:  0.03 }, // Thoracic cranial
      { z:  0.08, rx: 0.36,  ry: 0.38,  y:  0.00 }, // Mid torso
      { z: -0.38, rx: 0.32,  ry: 0.35,  y: -0.02 }, // Dorsal base
      { z: -0.85, rx: 0.23,  ry: 0.28,  y: -0.03 }  // Lumbar trunk
    ];

    const radialSegs = 22;
    const numRings = rings.length;
    const bodyGeo = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const colors = [];

    for (let r = 0; r < numRings; r++) {
      const ring = rings[r];
      for (let s = 0; s <= radialSegs; s++) {
        const theta = (s / radialSegs) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const px = cosT * ring.rx;
        const py = ring.y + sinT * ring.ry;
        const pz = ring.z;

        positions.push(px, py, pz);
        normals.push(cosT, sinT, 0.15);

        // Counter-shaded vertex coloring:
        // sinT = 1 (dorsal), sinT = -1 (belly)
        const t = (sinT + 1) * 0.5;
        if (t > 0.58) {
          // Deep slate ocean navy cape
          colors.push(0.12, 0.17, 0.23);
        } else if (t > 0.34) {
          // Soft blue-grey flank stripe
          colors.push(0.32, 0.40, 0.48);
        } else {
          // Clean pearl white underbelly
          colors.push(0.92, 0.95, 0.98);
        }
      }
    }

    const indices = [];
    for (let r = 0; r < numRings - 1; r++) {
      for (let s = 0; s < radialSegs; s++) {
        const a = r * (radialSegs + 1) + s;
        const b = (r + 1) * (radialSegs + 1) + s;
        const c = (r + 1) * (radialSegs + 1) + (s + 1);
        const d = r * (radialSegs + 1) + (s + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    bodyGeo.setIndex(indices);
    bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bodyGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    bodyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    bodyGeo.computeVertexNormals();

    const bodyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.22,
      metalness: 0.12
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // 2. Realistic curved Falcate Dorsal Fin with airfoil thickness
    const dorsalFin = new THREE.Group();
    dorsalFin.position.set(0, 0.34, -0.32);
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.bezierCurveTo(-0.02, 0.18, -0.06, 0.38, -0.16, 0.52);
    finShape.bezierCurveTo(-0.14, 0.44, -0.08, 0.28, -0.32, 0.0);
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.038,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.014,
      bevelThickness: 0.012
    });
    finGeo.rotateY(Math.PI / 2);
    finGeo.translate(0.019, 0, 0);
    const finMesh = new THREE.Mesh(finGeo, matDorsal);
    dorsalFin.add(finMesh);
    group.add(dorsalFin);

    // 3. Anatomical Hydrofoil Pectoral Flippers (Port & Starboard)
    for (const side of [-1, 1]) {
      const flipGroup = new THREE.Group();
      flipGroup.position.set(side * 0.31, -0.08, 0.52);
      flipGroup.rotation.set(0.18, side * 0.35, side * -0.55);

      const flipShape = new THREE.Shape();
      flipShape.moveTo(0, 0);
      flipShape.bezierCurveTo(side * 0.22, -0.08, side * 0.48, -0.22, side * 0.62, -0.38);
      flipShape.bezierCurveTo(side * 0.46, -0.32, side * 0.26, -0.24, 0, -0.16);
      flipShape.closePath();

      const flipGeo = new THREE.ExtrudeGeometry(flipShape, {
        depth: 0.026,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.01,
        bevelThickness: 0.008
      });
      const flipMesh = new THREE.Mesh(flipGeo, matDorsal);
      flipGroup.add(flipMesh);
      group.add(flipGroup);
    }

    // 4. Expressive Eyes with Gloss Highlights
    for (const side of [-1, 1]) {
      const eyeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 8, 8),
        matEye
      );
      eyeMesh.position.set(side * 0.225, 0.045, 0.96);
      group.add(eyeMesh);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 4, 4),
        matEyeGlint
      );
      glint.position.set(side * 0.24, 0.055, 0.975);
      group.add(glint);
    }

    // 5. Blowhole on dorsal cranium
    const blowholeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.02, 6),
      matDorsal
    );
    blowholeMesh.position.set(0, 0.31, 0.72);
    group.add(blowholeMesh);

    // 6. Two-Segment Articulated Tail Stock (Peduncle) & Horizontal Flukes
    const peduncleGroup = new THREE.Group();
    peduncleGroup.position.set(0, -0.03, -0.85);

    const pedGeo = new THREE.CylinderGeometry(0.065, 0.22, 0.85, 14);
    pedGeo.rotateX(-Math.PI / 2);
    pedGeo.scale(1.0, 1.35, 1.0);
    pedGeo.translate(0, 0, -0.42);
    const pedMesh = new THREE.Mesh(pedGeo, matDorsal);
    peduncleGroup.add(pedMesh);

    // Wide Crescent Horizontal Flukes with central notch
    const flukeShape = new THREE.Shape();
    flukeShape.moveTo(0, -0.02);
    flukeShape.bezierCurveTo(-0.18, 0.08, -0.38, 0.12, -0.52, 0.02);
    flukeShape.bezierCurveTo(-0.42, -0.12, -0.18, -0.18, -0.04, -0.16);
    flukeShape.lineTo(0, -0.11);
    flukeShape.lineTo(0.04, -0.16);
    flukeShape.bezierCurveTo(0.18, -0.18, 0.42, -0.12, 0.52, 0.02);
    flukeShape.bezierCurveTo(0.38, 0.12, 0.18, 0.08, 0, -0.02);
    flukeShape.closePath();

    const flukeGeo = new THREE.ExtrudeGeometry(flukeShape, {
      depth: 0.024,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.008,
      bevelThickness: 0.008
    });
    flukeGeo.rotateX(Math.PI / 2);
    flukeGeo.translate(0, 0.012, -0.85);
    const flukeMesh = new THREE.Mesh(flukeGeo, matDorsal);
    peduncleGroup.add(flukeMesh);

    group.add(peduncleGroup);

    return {
      group,
      tailStock: peduncleGroup
    };
  }

  // ── 2. PROCEDURAL HUMPBACK WHALE MODEL ──
  createWhaleModel() {
    const group = new THREE.Group();

    const matWhale = new THREE.MeshStandardMaterial({
      color: 0x141b24, // Slate black whale skin
      roughness: 0.35,
      metalness: 0.1
    });

    const matVentral = new THREE.MeshStandardMaterial({
      color: 0x8a9ba8, // Light pleated ventral grooves
      roughness: 0.5,
      metalness: 0.05
    });

    // Massive whale torso (14m scale)
    const bodyGeo = new THREE.CylinderGeometry(1.4, 2.1, 8.5, 12);
    bodyGeo.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, matWhale);
    group.add(body);

    // Ventral throat pleats
    const bellyGeo = new THREE.CylinderGeometry(1.3, 2.0, 7.5, 8, 1, false, 0, Math.PI);
    bellyGeo.rotateX(-Math.PI / 2);
    bellyGeo.rotateZ(Math.PI);
    const belly = new THREE.Mesh(bellyGeo, matVentral);
    belly.position.set(0, -0.3, 0.5);
    group.add(belly);

    // Broad rostrum head with tubercles (bumps)
    const headGeo = new THREE.SphereGeometry(1.9, 10, 8);
    headGeo.scale(0.85, 0.75, 1.8);
    const head = new THREE.Mesh(headGeo, matWhale);
    head.position.set(0, 0.15, 5.2);
    group.add(head);

    // Blowhole on top of head
    const blowhole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.15, 8),
      matWhale
    );
    blowhole.position.set(0, 1.48, 4.4);
    group.add(blowhole);

    // Long knobby pectoral flippers (1/3 of body length!)
    for (const sx of [-1.8, 1.8]) {
      const flipperGeo = new THREE.BufferGeometry();
      const flipperVerts = new Float32Array([
        0, 0, 0.8,
        0, 0, -0.8,
        sx * 3.2, -1.2, -2.2
      ]);
      flipperGeo.setAttribute('position', new THREE.BufferAttribute(flipperVerts, 3));
      flipperGeo.setIndex([0, 1, 2, 0, 2, 1]);
      flipperGeo.computeVertexNormals();
      const flipper = new THREE.Mesh(flipperGeo, matWhale);
      flipper.position.set(sx * 1.05, -0.4, 2.5);
      group.add(flipper);
    }

    // Small dorsal fin hump
    const dorsalGeo = new THREE.ConeGeometry(0.35, 0.95, 4);
    dorsalGeo.rotateX(-0.55);
    const dorsal = new THREE.Mesh(dorsalGeo, matWhale);
    dorsal.position.set(0, 2.15, -2.6);
    group.add(dorsal);

    // Whale Tail Flukes Group
    const tailStock = new THREE.Group();
    tailStock.position.set(0, 0, -4.2);

    const peduncleGeo = new THREE.ConeGeometry(1.35, 5.5, 8);
    peduncleGeo.rotateX(Math.PI / 2);
    const peduncle = new THREE.Mesh(peduncleGeo, matWhale);
    peduncle.position.set(0, 0, -2.75);
    tailStock.add(peduncle);

    // Massive serrated tail flukes
    const flukeGeo = new THREE.BufferGeometry();
    const flukeVerts = new Float32Array([
       0.0,  0.0, -5.4,
      -3.4,  0.0, -6.8,
       3.4,  0.0, -6.8,
       0.0,  0.0, -6.1
    ]);
    flukeGeo.setAttribute('position', new THREE.BufferAttribute(flukeVerts, 3));
    flukeGeo.setIndex([0, 1, 3, 0, 3, 2, 1, 0, 3, 2, 0, 3]);
    flukeGeo.computeVertexNormals();
    const flukes = new THREE.Mesh(flukeGeo, matWhale);
    tailStock.add(flukes);

    group.add(tailStock);
    group.scale.setScalar(0.9);

    return {
      group,
      tailStock,
      blowholePos: new THREE.Vector3(0, 1.5, 4.4)
    };
  }

  initDolphins() {
    // Pod of 4 playful bow-riding dolphins with choreographed predictable jumping
    this.podCount = 4;
    this.dolphins = [];

    for (let i = 0; i < this.podCount; i++) {
      const model = this.createDolphinModel();
      // 2 on port bow wave (-2.8m, -1.4m), 2 on starboard bow wave (+1.4m, +2.8m)
      const isPort = (i % 2 === 0);
      const tier = Math.floor(i / 2); // 0 = lead pair, 1 = trail pair
      const latSign = isPort ? -1 : 1;
      const latDist = (tier === 0) ? 2.4 : 3.8;
      const fwdDist = (tier === 0) ? 13.2 : 10.5;

      const dolphin = {
        id: i,
        ...model,
        pos: new THREE.Vector3(0, -1.2, 0),
        vel: new THREE.Vector3(),
        offsetLateral: latSign * latDist,
        offsetForward: fwdDist,
        phase: i * 1.57, // Smooth phased swimming undulation
        jumpTimer: 1.2 + i * 2.2, // Predictable staggered jump cadence (1.2s, 3.4s, 5.6s, 7.8s)
        jumpDuration: 1.4,
        isJumping: false,
        jumpProgress: 0,
        hasSplashedUp: false,
        hasSplashedDown: false
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

  update(dt, time, shipPosition, shipQuaternion, shipSpeedKnots = 0) {
    if (!shipPosition) return;

    const shipForward = new THREE.Vector3(0, 0, 1);
    const shipRight = new THREE.Vector3(1, 0, 0);
    if (shipQuaternion) {
      shipForward.applyQuaternion(shipQuaternion);
      shipRight.applyQuaternion(shipQuaternion);
    }

    // ── 1. UPDATE DOLPHINS (PREDICTABLE DYNAMIC CHOREOGRAPHY) ──
    const isSailing = shipSpeedKnots > 3.0;

    for (const d of this.dolphins) {
      d.phase += dt * (isSailing ? 5.2 : 3.0);
      d.jumpTimer -= dt;

      // Predictable jump cadence: activates on cadence both when sailing and idling!
      if (!d.isJumping && d.jumpTimer <= 0) {
        d.isJumping = true;
        d.jumpProgress = 0;
        d.jumpDuration = isSailing ? 1.4 : 1.25;
        d.hasSplashedUp = false;
        d.hasSplashedDown = false;
      }

      if (d.isJumping) {
        d.jumpProgress += dt / d.jumpDuration;
        const jp = d.jumpProgress;

        // Dynamic water splash triggers
        if (jp > 0.08 && !d.hasSplashedUp) {
          d.hasSplashedUp = true;
          this.triggerSplash(d.pos, 16);
        }
        if (jp > 0.88 && !d.hasSplashedDown) {
          d.hasSplashedDown = true;
          this.triggerSplash(d.pos, 22);
        }

        if (isSailing) {
          // Dynamic bow wave tracking with advance surge
          const bowTarget = shipPosition.clone()
            .addScaledVector(shipForward, d.offsetForward + jp * 2.2)
            .addScaledVector(shipRight, d.offsetLateral);

          const waveSample = sampleOcean(bowTarget.x, bowTarget.z, time, 1.0);
          const jumpHeight = Math.sin(jp * Math.PI) * 2.75;
          d.pos.x = THREE.MathUtils.lerp(d.pos.x, bowTarget.x, 0.16);
          d.pos.z = THREE.MathUtils.lerp(d.pos.z, bowTarget.z, 0.16);
          d.pos.y = waveSample.height + jumpHeight - 0.72;

          // Realistic dynamic jump arching: nose up on ascent, arched at crest, nose down on entry
          const jumpPitch = (0.5 - jp) * 1.6;
          const shipYaw = Math.atan2(shipForward.x, shipForward.z);
          const bankRoll = (d.offsetLateral > 0 ? 0.24 : -0.24);
          d.group.rotation.set(jumpPitch, shipYaw, bankRoll);
        } else {
          // Idle porpoise rolling jump alongside the boat
          const orbitAngle = time * 0.42 + (d.id * Math.PI * 0.5);
          const radius = 14.0 + (d.id % 2) * 4.0;
          const targetX = shipPosition.x + Math.sin(orbitAngle) * radius;
          const targetZ = shipPosition.z + Math.cos(orbitAngle) * radius;
          const waveSample = sampleOcean(targetX, targetZ, time, 1.0);

          const jumpHeight = Math.sin(jp * Math.PI) * 1.65;
          d.pos.x = THREE.MathUtils.lerp(d.pos.x, targetX, 0.14);
          d.pos.z = THREE.MathUtils.lerp(d.pos.z, targetZ, 0.14);
          d.pos.y = waveSample.height + jumpHeight - 0.55;

          const tangentYaw = orbitAngle + Math.PI / 2;
          const jumpPitch = (0.5 - jp) * 1.25;
          d.group.rotation.set(jumpPitch, tangentYaw, 0.22);
        }

        if (d.jumpProgress >= 1.0) {
          d.isJumping = false;
          // Predictable rhythmic loop: resets timer to 8.8 seconds
          // With 4 dolphins, jumps occur every 2.2 seconds!
          d.jumpTimer = 8.8;
        }
      } else if (isSailing) {
        // Submerged cruising riding the bow pressure wave (0.8m to 1.4m depth)
        const bowTarget = shipPosition.clone()
          .addScaledVector(shipForward, d.offsetForward)
          .addScaledVector(shipRight, d.offsetLateral + Math.sin(time * 1.4 + d.id) * 0.85);

        const waveSample = sampleOcean(bowTarget.x, bowTarget.z, time, 1.0);
        const swimY = waveSample.height - 1.1 + Math.sin(d.phase) * 0.25;

        d.pos.lerp(new THREE.Vector3(bowTarget.x, swimY, bowTarget.z), Math.min(1.0, 5.5 * dt));

        const undulationPitch = Math.cos(d.phase) * 0.22;
        const shipYaw = Math.atan2(shipForward.x, shipForward.z);
        d.group.rotation.set(undulationPitch, shipYaw, Math.sin(d.phase * 0.5) * 0.1);
      } else {
        // Idle swimming around stationary / drifting vessel
        const orbitAngle = time * 0.32 + (d.id * Math.PI * 0.5);
        const radius = 15.0 + (d.id % 2) * 5.0;
        const targetX = shipPosition.x + Math.sin(orbitAngle) * radius;
        const targetZ = shipPosition.z + Math.cos(orbitAngle) * radius;
        const waveSample = sampleOcean(targetX, targetZ, time, 1.0);
        const swimY = waveSample.height - 1.05 + Math.sin(d.phase) * 0.3;

        d.pos.lerp(new THREE.Vector3(targetX, swimY, targetZ), Math.min(1.0, 3.5 * dt));

        const tangentYaw = orbitAngle + Math.PI / 2;
        d.group.rotation.set(Math.cos(d.phase) * 0.18, tangentYaw, 0.12);
      }

      // Propulsive tail fluke strokes
      d.tailStock.rotation.x = Math.sin(d.phase * 2.0) * 0.48;
      d.group.position.copy(d.pos);
    }

    // ── 2. UPDATE HUMPBACK WHALES ──
    for (const w of this.whales) {
      w.swimCycle += dt * 0.8;
      w.timer -= dt;

      const wForward = new THREE.Vector3(Math.sin(w.heading), 0, Math.cos(w.heading));
      w.pos.addScaledVector(wForward, 3.2 * dt);

      const distFromShip = w.pos.distanceTo(shipPosition);
      if (distFromShip > 420) {
        w.pos.copy(shipPosition).add(new THREE.Vector3((Math.random() - 0.5) * 260, -3.0, (Math.random() - 0.5) * 260));
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
