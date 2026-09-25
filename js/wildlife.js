// Dynamic Marine Wildlife System: Bow-Riding Dolphins & Breaching Humpback Whales
import * as THREE from 'three';

export class MarineWildlife {
  constructor(scene) {
    this.scene = scene;
    this.dolphins = [];
    this.whales = [];
    this.spoutParticles = [];

    this.initDolphins();
    this.initWhales();
    this.initSpoutParticles();
  }

  // ── 1. PROCEDURAL DOLPHIN MODEL ──
  createDolphinModel() {
    const group = new THREE.Group();

    const matBack = new THREE.MeshStandardMaterial({
      color: 0x2e3b48, // Oceanic slate grey
      roughness: 0.25,
      metalness: 0.15
    });

    const matBelly = new THREE.MeshStandardMaterial({
      color: 0xe8ecf2, // Cream white underbelly
      roughness: 0.35,
      metalness: 0.05
    });

    // Torso (Streamlined spindle)
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.38, 2.2, 10);
    torsoGeo.rotateX(-Math.PI / 2);
    const torso = new THREE.Mesh(torsoGeo, matBack);
    torso.position.set(0, 0, 0);
    group.add(torso);

    // White belly underside patch
    const bellyGeo = new THREE.CylinderGeometry(0.22, 0.36, 2.15, 8, 1, false, 0, Math.PI);
    bellyGeo.rotateX(-Math.PI / 2);
    bellyGeo.rotateZ(Math.PI);
    const belly = new THREE.Mesh(bellyGeo, matBelly);
    belly.position.set(0, -0.04, 0);
    group.add(belly);

    // Melon forehead & curved rostrum beak
    const headGeo = new THREE.SphereGeometry(0.32, 8, 8);
    headGeo.scale(0.85, 0.95, 1.35);
    const head = new THREE.Mesh(headGeo, matBack);
    head.position.set(0, 0.04, 1.25);
    group.add(head);

    const beakGeo = new THREE.ConeGeometry(0.12, 0.55, 6);
    beakGeo.rotateX(-Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, matBack);
    beak.position.set(0, -0.05, 1.95);
    group.add(beak);

    // Falcate dorsal fin
    const dorsalGeo = new THREE.BufferGeometry();
    const dorsalVerts = new Float32Array([
       0.02, 0.35,  0.2,
      -0.02, 0.35,  0.2,
       0.02, 0.35, -0.25,
      -0.02, 0.35, -0.25,
       0.00, 0.88, -0.15
    ]);
    dorsalGeo.setAttribute('position', new THREE.BufferAttribute(dorsalVerts, 3));
    dorsalGeo.setIndex([0, 2, 4, 1, 4, 3, 0, 4, 1, 2, 3, 4]);
    dorsalGeo.computeVertexNormals();
    const dorsal = new THREE.Mesh(dorsalGeo, matBack);
    group.add(dorsal);

    // Pectoral flippers (Port & Starboard)
    for (const sx of [-0.34, 0.34]) {
      const flipperGeo = new THREE.BufferGeometry();
      const flipperVerts = new Float32Array([
        0, 0, 0.2,
        0, 0, -0.2,
        sx * 1.5, -0.25, -0.15
      ]);
      flipperGeo.setAttribute('position', new THREE.BufferAttribute(flipperVerts, 3));
      flipperGeo.setIndex([0, 1, 2, 0, 2, 1]);
      flipperGeo.computeVertexNormals();
      const flipper = new THREE.Mesh(flipperGeo, matBack);
      flipper.position.set(sx * 0.95, -0.12, 0.65);
      group.add(flipper);
    }

    // Articulated tail stock & horizontal flukes
    const tailStock = new THREE.Group();
    tailStock.position.set(0, 0, -1.1);

    const peduncleGeo = new THREE.ConeGeometry(0.18, 1.1, 7);
    peduncleGeo.rotateX(Math.PI / 2);
    const peduncle = new THREE.Mesh(peduncleGeo, matBack);
    peduncle.position.set(0, 0, -0.55);
    tailStock.add(peduncle);

    const flukeGeo = new THREE.BufferGeometry();
    const flukeVerts = new Float32Array([
       0.0,  0.0, -1.05,
      -0.55, 0.0, -1.35,
       0.55, 0.0, -1.35,
       0.0,  0.0, -1.25
    ]);
    flukeGeo.setAttribute('position', new THREE.BufferAttribute(flukeVerts, 3));
    flukeGeo.setIndex([0, 1, 3, 0, 3, 2, 1, 0, 3, 2, 0, 3]);
    flukeGeo.computeVertexNormals();
    const flukes = new THREE.Mesh(flukeGeo, matBack);
    tailStock.add(flukes);

    group.add(tailStock);

    return {
      group,
      tailStock
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
    // Pod of 4 playful bow-riding dolphins
    this.podCount = 4;
    for (let i = 0; i < this.podCount; i++) {
      const model = this.createDolphinModel();
      const dolphin = {
        id: i,
        ...model,
        pos: new THREE.Vector3(0, -1.5, 0),
        vel: new THREE.Vector3(),
        offsetLateral: (i - 1.5) * 2.8, // Port / starboard spread around bow
        offsetForward: 11.5 + (i % 2) * 3.5, // 11m to 15m ahead of yacht bow
        phase: i * 1.6,
        jumpTimer: 2.0 + Math.random() * 5.0,
        isJumping: false,
        jumpProgress: 0,
        swimSpeed: 8.0
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

  triggerBlowholeSpout(worldOrigin) {
    let triggered = 0;
    for (const p of this.spoutPool) {
      if (!p.active) {
        p.active = true;
        p.pos.copy(worldOrigin).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8));
        // Upward misty jet (7-10 m/s) with outward spray divergence
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

    // ── 1. UPDATE DOLPHINS (BOW-RIDING DYNAMICS) ──
    const isSailing = shipSpeedKnots > 3.0;

    for (const d of this.dolphins) {
      d.phase += dt * (isSailing ? 4.5 : 1.8);

      // Bow pressure wave target position
      const bowTarget = shipPosition.clone()
        .addScaledVector(shipForward, d.offsetForward)
        .addScaledVector(shipRight, d.offsetLateral + Math.sin(time * 1.2 + d.id) * 1.2);

      d.jumpTimer -= dt;

      if (!d.isJumping && d.jumpTimer <= 0 && isSailing) {
        // Trigger graceful breach jump!
        d.isJumping = true;
        d.jumpProgress = 0;
        d.jumpDuration = 1.6 + Math.random() * 0.6;
      }

      if (d.isJumping) {
        d.jumpProgress += dt / d.jumpDuration;
        const jp = d.jumpProgress;

        // Parabolic ballistic trajectory out of water and back
        const jumpY = Math.sin(jp * Math.PI) * 2.6 - 0.4;
        d.pos.x = THREE.MathUtils.lerp(d.pos.x, bowTarget.x, 0.12);
        d.pos.z = THREE.MathUtils.lerp(d.pos.z, bowTarget.z, 0.12);
        d.pos.y = jumpY;

        // Dynamic pitch arch: head up on ascent, head down on re-entry
        const jumpPitch = (jp - 0.5) * 1.5;
        d.group.rotation.set(jumpPitch, Math.atan2(shipForward.x, shipForward.z), (d.id % 2 === 0 ? -0.25 : 0.25));

        if (d.jumpProgress >= 1.0) {
          d.isJumping = false;
          d.jumpTimer = 5.0 + Math.random() * 8.0;
        }
      } else {
        // Swimming submerged just below surface riding the bow wave
        const swimY = -0.55 + Math.sin(d.phase) * 0.35;
        d.pos.lerp(new THREE.Vector3(bowTarget.x, swimY, bowTarget.z), Math.min(1.0, 4.5 * dt));

        // Spine undulation
        const undulationPitch = Math.cos(d.phase) * 0.28;
        d.group.rotation.set(undulationPitch, Math.atan2(shipForward.x, shipForward.z), Math.sin(d.phase * 0.5) * 0.15);
      }

      // Tail flukes propulsion stroke
      d.tailStock.rotation.x = Math.sin(d.phase * 1.8) * 0.45;
      d.group.position.copy(d.pos);
    }

    // ── 2. UPDATE HUMPBACK WHALES ──
    for (const w of this.whales) {
      w.swimCycle += dt * 0.8;
      w.timer -= dt;

      // Slow forward locomotion
      const wForward = new THREE.Vector3(Math.sin(w.heading), 0, Math.cos(w.heading));
      w.pos.addScaledVector(wForward, 3.2 * dt);

      // Loop position to stay in the world surrounding the player
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
          // Trigger water spout mist jet from blowhole!
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
        // Arch back, lift tail flukes high out of water, plunge deep
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
  }
}
