// Animated dynamic flock of soaring marine seagulls with multi-joint wing kinematics and behavioral AI
import * as THREE from 'three';

export class SeagullFlock {
  constructor(scene) {
    this.scene = scene;
    this.birds = [];
    this.count = 6;

    this.initSharedMaterials();
    this.initFlock();
  }

  initSharedMaterials() {
    // Herring gull plumage materials
    this.matWhiteFeather = new THREE.MeshStandardMaterial({
      color: 0xf4f6fb,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    this.matGreyMantle = new THREE.MeshStandardMaterial({
      color: 0x768394,
      roughness: 0.78,
      metalness: 0.04,
      side: THREE.DoubleSide
    });

    this.matBlackPrimaries = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.72,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    this.matBeakYellow = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      roughness: 0.42,
      metalness: 0.12
    });

    this.matBeakRed = new THREE.MeshStandardMaterial({
      color: 0xdb2b1b,
      roughness: 0.38,
      metalness: 0.1
    });

    this.matEye = new THREE.MeshStandardMaterial({
      color: 0x0f1318,
      roughness: 0.15,
      metalness: 0.5
    });
  }

  // Create an anatomically sculpted marine gull with 2-stage articulated wings and tail rudder
  createSeagullModel() {
    const bird = new THREE.Group();

    // ── 1. Aerodynamic Fuselage (Body, Breast & Abdomen) ──
    const bodyGroup = new THREE.Group();

    // Breast & forward torso (streamlined ellipsoid)
    const breastGeo = new THREE.SphereGeometry(0.14, 8, 8);
    breastGeo.scale(1.0, 1.15, 1.45);
    const breastMesh = new THREE.Mesh(breastGeo, this.matWhiteFeather);
    breastMesh.position.set(0, 0.02, 0.1);
    bodyGroup.add(breastMesh);

    // Abdomen tapering to tail root
    const abdomenGeo = new THREE.ConeGeometry(0.13, 0.52, 7);
    abdomenGeo.rotateX(-Math.PI / 2);
    const abdomenMesh = new THREE.Mesh(abdomenGeo, this.matWhiteFeather);
    abdomenMesh.position.set(0, 0.01, -0.28);
    bodyGroup.add(abdomenMesh);

    // ── 2. Neck, Cranial Head, Beak & Eyes ──
    // Arching neck
    const neckGeo = new THREE.CylinderGeometry(0.075, 0.11, 0.22, 6);
    neckGeo.rotateX(0.42);
    const neckMesh = new THREE.Mesh(neckGeo, this.matWhiteFeather);
    neckMesh.position.set(0, 0.08, 0.26);
    bodyGroup.add(neckMesh);

    // Cranial head
    const headGeo = new THREE.SphereGeometry(0.092, 8, 8);
    headGeo.scale(0.92, 1.05, 1.25);
    const headMesh = new THREE.Mesh(headGeo, this.matWhiteFeather);
    headMesh.position.set(0, 0.15, 0.38);
    bodyGroup.add(headMesh);

    // Marine yellow hooked beak
    const beakGeo = new THREE.ConeGeometry(0.038, 0.24, 5);
    beakGeo.rotateX(-Math.PI / 2);
    const beakMesh = new THREE.Mesh(beakGeo, this.matBeakYellow);
    beakMesh.position.set(0, 0.13, 0.54);
    bodyGroup.add(beakMesh);

    // Iconic red gonys spot on lower bill tip
    const redSpotGeo = new THREE.SphereGeometry(0.018, 5, 5);
    redSpotGeo.scale(0.8, 1.1, 1.4);
    const redSpotMesh = new THREE.Mesh(redSpotGeo, this.matBeakRed);
    redSpotMesh.position.set(0, 0.112, 0.52);
    bodyGroup.add(redSpotMesh);

    // Lateral gull eyes
    const eyeGeo = new THREE.SphereGeometry(0.018, 5, 5);
    const leftEye = new THREE.Mesh(eyeGeo, this.matEye);
    leftEye.position.set(-0.082, 0.165, 0.39);
    bodyGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, this.matEye);
    rightEye.position.set(0.082, 0.165, 0.39);
    bodyGroup.add(rightEye);

    bird.add(bodyGroup);

    // ── 3. Fan-shaped Tail (Rudder) ──
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.02, -0.52);

    const tailGeo = new THREE.BufferGeometry();
    const tailVertices = new Float32Array([
      -0.05, 0.0, 0.0,
       0.05, 0.0, 0.0,
      -0.14, 0.0, -0.32,
       0.14, 0.0, -0.32
    ]);
    const tailIndices = [0, 1, 2, 2, 1, 3];
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
    tailGeo.setIndex(tailIndices);
    tailGeo.computeVertexNormals();
    const tailMesh = new THREE.Mesh(tailGeo, this.matWhiteFeather);
    tailGroup.add(tailMesh);
    bird.add(tailGroup);

    // ── 4. Articulated 2-Stage Wings (Inner Arm + Outer Primary Wing) ──
    // LEFT WING HIERARCHY
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.11, 0.05, 0.12);

    // Inner arm aerofoil mesh (slate grey mantle plumage)
    const leftInnerGeo = new THREE.BufferGeometry();
    const leftInnerVerts = new Float32Array([
       0.00,  0.01,  0.10, // Shoulder leading edge
       0.00, -0.01, -0.18, // Shoulder trailing edge
      -0.58,  0.02,  0.06, // Carpal / elbow leading edge
      -0.58, -0.01, -0.13  // Carpal / elbow trailing edge
    ]);
    leftInnerGeo.setAttribute('position', new THREE.BufferAttribute(leftInnerVerts, 3));
    leftInnerGeo.setIndex([0, 1, 2, 2, 1, 3]);
    leftInnerGeo.computeVertexNormals();
    const leftInnerMesh = new THREE.Mesh(leftInnerGeo, this.matGreyMantle);
    leftArmGroup.add(leftInnerMesh);

    // Left outer hand / primary flight feathers (hinged at carpal elbow)
    const leftForearmGroup = new THREE.Group();
    leftForearmGroup.position.set(-0.58, 0.01, 0.0);

    const leftOuterGeo = new THREE.BufferGeometry();
    const leftOuterVerts = new Float32Array([
       0.00,  0.01,  0.06, // Elbow leading edge
       0.00, -0.01, -0.13, // Elbow trailing edge
      -0.42,  0.01, -0.01, // Mid primary leading edge
      -0.42, -0.01, -0.15, // Mid primary trailing edge
      -0.74,  0.00, -0.10  // Tapered primary tip
    ]);
    leftOuterGeo.setAttribute('position', new THREE.BufferAttribute(leftOuterVerts, 3));
    leftOuterGeo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
    leftOuterGeo.computeVertexNormals();
    const leftOuterMesh = new THREE.Mesh(leftOuterGeo, this.matBlackPrimaries);
    leftForearmGroup.add(leftOuterMesh);

    // White apical spots on outer wingtip
    const leftTipGeo = new THREE.BufferGeometry();
    const leftTipVerts = new Float32Array([
      -0.58,  0.005, -0.06,
      -0.58, -0.005, -0.13,
      -0.74,  0.000, -0.10
    ]);
    leftTipGeo.setAttribute('position', new THREE.BufferAttribute(leftTipVerts, 3));
    leftTipGeo.setIndex([0, 1, 2]);
    leftTipGeo.computeVertexNormals();
    const leftTipMesh = new THREE.Mesh(leftTipGeo, this.matWhiteFeather);
    leftForearmGroup.add(leftTipMesh);

    leftArmGroup.add(leftForearmGroup);
    bird.add(leftArmGroup);

    // RIGHT WING HIERARCHY
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.11, 0.05, 0.12);

    const rightInnerGeo = new THREE.BufferGeometry();
    const rightInnerVerts = new Float32Array([
      0.00,  0.01,  0.10, // Shoulder leading edge
      0.00, -0.01, -0.18, // Shoulder trailing edge
      0.58,  0.02,  0.06, // Carpal / elbow leading edge
      0.58, -0.01, -0.13  // Carpal / elbow trailing edge
    ]);
    rightInnerGeo.setAttribute('position', new THREE.BufferAttribute(rightInnerVerts, 3));
    rightInnerGeo.setIndex([0, 2, 1, 2, 3, 1]);
    rightInnerGeo.computeVertexNormals();
    const rightInnerMesh = new THREE.Mesh(rightInnerGeo, this.matGreyMantle);
    rightArmGroup.add(rightInnerMesh);

    // Right outer hand / primary flight feathers
    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0.58, 0.01, 0.0);

    const rightOuterGeo = new THREE.BufferGeometry();
    const rightOuterVerts = new Float32Array([
      0.00,  0.01,  0.06,
      0.00, -0.01, -0.13,
      0.42,  0.01, -0.01,
      0.42, -0.01, -0.15,
      0.74,  0.00, -0.10
    ]);
    rightOuterGeo.setAttribute('position', new THREE.BufferAttribute(rightOuterVerts, 3));
    rightOuterGeo.setIndex([0, 2, 1, 2, 3, 1, 2, 4, 3]);
    rightOuterGeo.computeVertexNormals();
    const rightOuterMesh = new THREE.Mesh(rightOuterGeo, this.matBlackPrimaries);
    rightForearmGroup.add(rightOuterMesh);

    // White apical spots on right outer wingtip
    const rightTipGeo = new THREE.BufferGeometry();
    const rightTipVerts = new Float32Array([
      0.58,  0.005, -0.06,
      0.58, -0.005, -0.13,
      0.74,  0.000, -0.10
    ]);
    rightTipGeo.setAttribute('position', new THREE.BufferAttribute(rightTipVerts, 3));
    rightTipGeo.setIndex([0, 2, 1]);
    rightTipGeo.computeVertexNormals();
    const rightTipMesh = new THREE.Mesh(rightTipGeo, this.matWhiteFeather);
    rightForearmGroup.add(rightTipMesh);

    rightArmGroup.add(rightForearmGroup);
    bird.add(rightArmGroup);

    return {
      group: bird,
      leftArm: leftArmGroup,
      leftForearm: leftForearmGroup,
      rightArm: rightArmGroup,
      rightForearm: rightForearmGroup,
      tail: tailGroup
    };
  }

  initFlock() {
    // 4 Distinct Natural Roles for 6 birds (Spacious, cinematic oceanic dispersal):
    // 2 Wake Followers (soaring far behind stern in wake updrafts)
    // 2 High Thermal Soarers (wide atmospheric spirals)
    // 1 Wave Skimmer (roaming distant ocean swells)
    // 1 Swoop & Dive Forager (distant surface foraging)
    const roles = ['wake', 'thermal', 'skimmer', 'wake', 'thermal', 'diver'];

    for (let i = 0; i < this.count; i++) {
      const model = this.createSeagullModel();
      const role = roles[i % roles.length];

      // Natural morphological scale variance (1.1m to 1.6m wingspan)
      const scale = 0.88 + Math.random() * 0.32;
      model.group.scale.setScalar(scale);

      const birdData = {
        id: i,
        ...model,
        role,
        pos: new THREE.Vector3(0, 30, 0),
        vel: new THREE.Vector3(0, 0, 1),
        currentYaw: 0,
        currentPitch: 0,
        currentRoll: 0,

        // Flapping kinematics
        flapPhase: Math.random() * 10,
        flapRate: 4.8 + Math.random() * 1.8,
        isGliding: false,
        glideTimer: Math.random() * 4.0,

        // Role-specific flight parameters (Spacious non-clutter corridors)
        // Wake follower parameters (well behind stern: 45m to 85m)
        wakeDist: 48 + Math.random() * 36, // distance behind stern
        wakeWidth: 16 + Math.random() * 22,
        wakeHeight: 18.0 + Math.random() * 14.0, // High majestic altitude
        wakeCycleSpeed: 0.28 + Math.random() * 0.22,
        wakePhaseOffset: (i * 2.1) + Math.random(),

        // Wave skimmer parameters (distant swell gliding: 55m to 100m)
        skimmerRadius: 60 + Math.random() * 45,
        skimmerAltitude: 2.2 + Math.random() * 2.5,
        skimmerSpeed: 0.55 + Math.random() * 0.25,
        skimmerAngle: (i / this.count) * Math.PI * 2,

        // Thermal soarer parameters (high ocean thermals: 80m to 145m radius, 45m to 80m alt)
        thermalRadius: 85 + Math.random() * 60,
        thermalAltitude: 48 + Math.random() * 32,
        thermalSpeed: 0.18 + Math.random() * 0.12,
        thermalAngle: (i / this.count) * Math.PI * 2,

        // Swoop & Dive state machine (distant forage patrol)
        diveState: 'cruise', // 'cruise' | 'dive' | 'skim' | 'climb'
        diveTimer: 4 + Math.random() * 8,
        diveTarget: new THREE.Vector3()
      };

      this.birds.push(birdData);
      this.scene.add(model.group);
    }
  }

  update(dt, time, shipPosition, shipQuaternion = null, shipSpeedKnots = 14) {
    if (!shipPosition) return;

    // Determine ship orientation vectors for relative formation flying
    const shipForward = new THREE.Vector3(0, 0, 1);
    const shipRight = new THREE.Vector3(1, 0, 0);
    if (shipQuaternion) {
      shipForward.applyQuaternion(shipQuaternion);
      shipRight.applyQuaternion(shipQuaternion);
    }

    for (const b of this.birds) {
      let targetX = shipPosition.x;
      let targetY = shipPosition.y + 15;
      let targetZ = shipPosition.z;

      // ── BEHAVIORAL FLIGHT COMPUTATION ──
      if (b.role === 'wake') {
        // ── 1. WAKE FOLLOWERS: Stern Slipstream & Wake Surfing ──
        // Oscillate back and forth across the bubbling wake behind the vessel
        const wakeCycle = time * b.wakeCycleSpeed + b.wakePhaseOffset;
        const lateralOffset = Math.sin(wakeCycle) * b.wakeWidth;
        const longitudinalOffset = -b.wakeDist - Math.cos(wakeCycle * 0.5) * 6.0;
        const verticalBob = Math.sin(wakeCycle * 1.8) * 1.6;

        targetX = shipPosition.x + shipForward.x * longitudinalOffset + shipRight.x * lateralOffset;
        targetZ = shipPosition.z + shipForward.z * longitudinalOffset + shipRight.z * lateralOffset;
        targetY = Math.max(3.0, shipPosition.y + b.wakeHeight + verticalBob);

        // Flapping vs effortless slipstream glide
        b.glideTimer -= dt;
        if (b.glideTimer <= 0) {
          b.isGliding = !b.isGliding;
          b.glideTimer = b.isGliding ? (3.5 + Math.random() * 4.5) : (1.2 + Math.random() * 2.0);
        }

      } else if (b.role === 'skimmer') {
        // ── 2. WAVE SKIMMERS: Dynamic Low-Altitude Swell Carving ──
        b.skimmerAngle += b.skimmerSpeed * dt;
        const xOffset = Math.sin(b.skimmerAngle) * b.skimmerRadius;
        const zOffset = Math.cos(b.skimmerAngle * 1.3) * (b.skimmerRadius * 0.85);

        targetX = shipPosition.x + xOffset;
        targetZ = shipPosition.z + zOffset;

        // Periodic zoom-climb over wave crests then swoop back down to water
        const swellZoom = Math.sin(b.skimmerAngle * 2.0);
        const climb = swellZoom > 0.6 ? (swellZoom - 0.6) * 7.0 : 0.0;
        targetY = Math.max(1.4, b.skimmerAltitude + climb);

        // Wave skimmers mostly glide on ground-effect air cushions, with rapid bursts
        b.isGliding = climb <= 0.2;

      } else if (b.role === 'thermal') {
        // ── 3. THERMAL SOARERS: High-Altitude Atmospheric Patrol ──
        b.thermalAngle += b.thermalSpeed * dt;
        targetX = shipPosition.x + Math.sin(b.thermalAngle) * b.thermalRadius;
        targetZ = shipPosition.z + Math.cos(b.thermalAngle) * b.thermalRadius;
        const thermalLift = Math.sin(time * 0.4 + b.id) * 3.5;
        targetY = b.thermalAltitude + thermalLift;

        // Thermals are 90% gliding on updrafts with dihedral wings
        b.glideTimer -= dt;
        if (b.glideTimer <= 0) {
          b.isGliding = !b.isGliding;
          b.glideTimer = b.isGliding ? (7.0 + Math.random() * 8.0) : (1.2 + Math.random() * 1.5);
        }

      } else if (b.role === 'diver') {
        // ── 4. SWOOP & DIVE FORAGERS: Autonomous Foraging State Machine ──
        b.diveTimer -= dt;

        if (b.diveState === 'cruise') {
          // Circle at high altitude in wider patrol perimeter
          const cruiseAngle = time * 0.32 + b.id * 2.0;
          targetX = shipPosition.x + Math.sin(cruiseAngle) * 65;
          targetZ = shipPosition.z + Math.cos(cruiseAngle) * 65;
          targetY = 28 + Math.sin(time * 0.8) * 4.0;
          b.isGliding = true;

          if (b.diveTimer <= 0) {
            // Spot distant sea surface target! Initiate dive
            b.diveState = 'dive';
            b.diveTimer = 2.6;
            const diveAngle = Math.random() * Math.PI * 2;
            const diveDist = 45 + Math.random() * 40;
            b.diveTarget.set(
              shipPosition.x + Math.sin(diveAngle) * diveDist,
              1.2,
              shipPosition.z + Math.cos(diveAngle) * diveDist
            );
          }
        } else if (b.diveState === 'dive') {
          // Plunge towards water surface at high speed
          targetX = b.diveTarget.x;
          targetZ = b.diveTarget.z;
          targetY = 1.2;
          b.isGliding = true; // Wings tucked into dive

          if (b.pos.y <= 2.8 || b.diveTimer <= 0) {
            b.diveState = 'skim';
            b.diveTimer = 1.8;
          }
        } else if (b.diveState === 'skim') {
          // Skim right above distant sea spray
          targetX = b.diveTarget.x + shipForward.x * 20;
          targetZ = b.diveTarget.z + shipForward.z * 20;
          targetY = 1.6;
          b.isGliding = false;

          if (b.diveTimer <= 0) {
            b.diveState = 'climb';
            b.diveTimer = 3.5;
          }
        } else if (b.diveState === 'climb') {
          // Steep power-climb back to cruising altitude
          targetX = shipPosition.x + (Math.random() - 0.5) * 60;
          targetZ = shipPosition.z + (Math.random() - 0.5) * 60;
          targetY = 30;
          b.isGliding = false; // Energetic power flaps!

          if (b.diveTimer <= 0) {
            b.diveState = 'cruise';
            b.diveTimer = 8 + Math.random() * 14;
          }
        }
      }

      // ── PHYSICAL TRAJECTORY & FLIGHT DYNAMICS ──
      // Calculate desired trajectory vector
      const toTarget = new THREE.Vector3(targetX - b.pos.x, targetY - b.pos.y, targetZ - b.pos.z);
      const dist = toTarget.length();
      const steerSpeed = Math.min(dist * 2.5, 32.0);

      // Smooth velocity interpolation with inertia
      const desiredVel = toTarget.clone().normalize().multiplyScalar(steerSpeed);
      b.vel.lerp(desiredVel, Math.min(1.0, 3.2 * dt));

      // Advance position
      b.pos.addScaledVector(b.vel, dt);
      b.group.position.copy(b.pos);

      // ── ATTITUDE ORIENTATION (YAW, PITCH, BANKING ROLL) ──
      const horizSpeed = Math.sqrt(b.vel.x * b.vel.x + b.vel.z * b.vel.z);
      const totalSpeed = b.vel.length();

      if (horizSpeed > 0.05) {
        const targetYaw = Math.atan2(b.vel.x, b.vel.z);

        // Shortest-path angle delta for smooth yaw interpolation
        let yawDelta = targetYaw - b.currentYaw;
        while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        b.currentYaw += yawDelta * Math.min(1.0, 5.0 * dt);

        // Aerodynamic bank angle proportional to turn rate and speed
        const turnRate = yawDelta / Math.max(dt, 0.001);
        const bankTarget = THREE.MathUtils.clamp(-turnRate * horizSpeed * 0.016, -1.05, 1.05);
        b.currentRoll = THREE.MathUtils.lerp(b.currentRoll, bankTarget, Math.min(1.0, 6.0 * dt));

        // Pitch angle coupled with climb/dive angle
        const pitchTarget = THREE.MathUtils.clamp(-b.vel.y / (totalSpeed + 0.1), -0.75, 0.65);
        b.currentPitch = THREE.MathUtils.lerp(b.currentPitch, pitchTarget, Math.min(1.0, 7.0 * dt));

        b.group.rotation.set(b.currentPitch, b.currentYaw, b.currentRoll, 'YXZ');

        // Dynamic tail ruddering (counteracts roll and trims pitch)
        b.tail.rotation.z = -b.currentRoll * 0.45;
        b.tail.rotation.x = -b.currentPitch * 0.55;
      }

      // ── 2-STAGE ARTICULATED WING KINEMATICS ──
      if (!b.isGliding) {
        b.flapPhase += b.flapRate * dt * (b.diveState === 'climb' ? 1.4 : 1.0);

        // Multi-joint kinematics: inner arm lifts up and down, outer forearm flexes with phase lag
        const innerFlap = Math.sin(b.flapPhase) * 0.44;
        const outerFlap = Math.sin(b.flapPhase - 0.58) * 0.68;

        // Inner arm flap
        b.leftArm.rotation.z = innerFlap;
        b.rightArm.rotation.z = -innerFlap;

        // Outer forearm flex with sweep on upstroke (reducing aerodynamic drag)
        b.leftForearm.rotation.z = outerFlap;
        b.rightForearm.rotation.z = -outerFlap;

        const sweep = innerFlap < 0 ? 0.05 : -0.22;
        b.leftForearm.rotation.y = sweep;
        b.rightForearm.rotation.y = -sweep;

      } else {
        // Locked into aerodynamic dihedral "V" glide pose with subtle aero turbulence
        const turbulence = Math.sin(time * 18.0 + b.id * 1.5) * 0.025;

        // Inner wing positive dihedral angle
        b.leftArm.rotation.z = 0.12 + turbulence;
        b.rightArm.rotation.z = -0.12 - turbulence;

        // Outer forearm flat dihedral extension
        b.leftForearm.rotation.z = -0.06;
        b.rightForearm.rotation.z = 0.06;
        b.leftForearm.rotation.y = 0.0;
        b.rightForearm.rotation.y = 0.0;
      }
    }
  }
}
