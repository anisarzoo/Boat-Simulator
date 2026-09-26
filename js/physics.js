// Multi-point Buoyancy & Hydrodynamics Physics Engine
import * as THREE from 'three';
import { SHIP_CONFIG, GRAVITY } from './constants.js';
import { sampleOcean } from './gerstner.js';

export class ShipPhysics {
  constructor(shipObject) {
    this.ship = shipObject;

    // Physical state
    this.position = new THREE.Vector3(0, 0, 0);
    this.linearVelocity = new THREE.Vector3(0, 0, 0);
    
    this.quaternion = new THREE.Quaternion();
    this.angularVelocity = new THREE.Vector3(0, 0, 0); // pitch, yaw, roll rates

    // Control state
    this.throttle = 0;       // -1.0 to 1.0
    this.rudder = 0;         // -1.0 to 1.0
    this.targetThrottle = 0;
    this.targetRudder = 0;

    // Output telemetry
    this.speedKnots = 0;
    this.headingDeg = 0;
    this.currentWaveHeight = 0;
    this.rollDeg = 0;
    this.pitchDeg = 0;

    // Bow Thruster (-1.0 Port, +1.0 Starboard)
    this.bowThruster = 0;
    this.targetBowThruster = 0;

    // Navigation & Waypoint Autopilot
    this.autopilot = false;
    this.waypoints = [
      { name: 'Channel Marker 1', x: 0, z: 160 },
      { name: 'Cape Horizon Approach', x: 280, z: 420 },
      { name: 'Lighthouse Anchorage', x: 440, z: 580 },
      { name: 'The Needles Passage', x: -380, z: 320 },
      { name: 'Open Ocean Patrol', x: 0, z: 0 }
    ];
    this.activeWaypointIndex = 0;
    this.distToWaypoint = 0;
    this.bearingToWaypoint = 0;
    this.currentDepthMeters = 58.0;
    this.shallowAlarm = false;

    // Collision alert & telemetry
    this.collisionAlert = null;
    this.collisionTimer = 0;
  }

  setControls(throttleInput, rudderInput) {
    this.targetThrottle = THREE.MathUtils.clamp(throttleInput, -0.6, 1.0);
    this.targetRudder = THREE.MathUtils.clamp(rudderInput, -1.0, 1.0);
  }

  setBowThruster(val) {
    this.targetBowThruster = THREE.MathUtils.clamp(val, -1.0, 1.0);
  }

  setAutopilot(active) {
    this.autopilot = active;
  }

  update(dt, time, waveScale = 1.0, archipelago = null, traffic = null, audio = null) {
    if (this.collisionTimer > 0) {
      this.collisionTimer -= dt;
      if (this.collisionTimer <= 0) this.collisionAlert = null;
    }
    // 0. Waypoint Autopilot Navigation
    if (this.autopilot) {
      const wp = this.waypoints[this.activeWaypointIndex];
      const toWp = new THREE.Vector3(wp.x - this.position.x, 0, wp.z - this.position.z);
      this.distToWaypoint = toWp.length();
      const targetHeading = Math.atan2(toWp.x, toWp.z);
      this.bearingToWaypoint = Math.round(((targetHeading * 180) / Math.PI + 360) % 360);

      const currentHeadingRad = (this.headingDeg * Math.PI) / 180;
      let headingError = targetHeading - currentHeadingRad;
      while (headingError > Math.PI) headingError -= Math.PI * 2;
      while (headingError < -Math.PI) headingError += Math.PI * 2;

      this.targetRudder = THREE.MathUtils.clamp(-headingError * 2.2, -1.0, 1.0);
      this.targetThrottle = 0.85;

      if (this.distToWaypoint < 42.0) {
        this.activeWaypointIndex = (this.activeWaypointIndex + 1) % this.waypoints.length;
      }
    }

    // 1. Smooth control inputs (engine throttle lag, hydraulic rudder, electric bow thruster)
    this.throttle = THREE.MathUtils.damp(this.throttle, this.targetThrottle, 2.2, dt);
    this.rudder = THREE.MathUtils.damp(this.rudder, this.targetRudder, 4.5, dt);
    this.bowThruster = THREE.MathUtils.damp(this.bowThruster, this.targetBowThruster, 6.0, dt);

    // Ship local orientation vectors
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion).normalize();

    // 2. Accumulate Forces & Torques
    const totalForce = new THREE.Vector3(0, -SHIP_CONFIG.mass * GRAVITY, 0); // Gravity
    const totalTorque = new THREE.Vector3(0, 0, 0);

    // Multi-point probe buoyancy calculation
    let submergedCount = 0;
    let avgWaterHeight = 0;

    for (const probe of SHIP_CONFIG.probes) {
      // World position of the probe on the hull
      const localProbe = new THREE.Vector3(probe.x, probe.y, probe.z);
      const worldProbe = localProbe.clone().applyQuaternion(this.quaternion).add(this.position);

      // Probe velocity
      const r = localProbe.clone().applyQuaternion(this.quaternion);
      const probeVel = this.linearVelocity.clone().add(this.angularVelocity.clone().cross(r));

      // Query wave height & normal at probe position
      const oceanSample = sampleOcean(worldProbe.x, worldProbe.z, time, waveScale);
      const submersion = oceanSample.height - worldProbe.y;
      avgWaterHeight += oceanSample.height;

      if (submersion > 0) {
        submergedCount++;
        // Spring + Damping buoyancy force
        const fUp = (SHIP_CONFIG.buoyancyStiffness * submersion - SHIP_CONFIG.buoyancyDamping * probeVel.y) * probe.weight;
        const clampedFUp = Math.max(0, fUp);

        const forceVec = new THREE.Vector3(0, clampedFUp, 0);
        totalForce.add(forceVec);

        // Torque generated by this hull probe: tau = r x F
        const torque = r.clone().cross(forceVec);
        totalTorque.add(torque);
      }
    }

    avgWaterHeight /= SHIP_CONFIG.probes.length;
    this.currentWaveHeight = Math.abs(avgWaterHeight);

    // 3. Propulsion & Rudder Steering
    const thrustMagnitude = this.throttle >= 0
      ? this.throttle * SHIP_CONFIG.maxEnginePower
      : this.throttle * SHIP_CONFIG.maxReversePower;

    const thrustForce = forward.clone().multiplyScalar(thrustMagnitude);
    totalForce.add(thrustForce);

    // Rudder creates turning torque only when ship is moving through water (around local UP axis)
    const forwardSpeed = this.linearVelocity.dot(forward);
    this.speedKnots = forwardSpeed * 1.94384; // m/s to knots

    const rudderTorqueMagnitude = -this.rudder * SHIP_CONFIG.maxRudderAngle * forwardSpeed * 4500.0;
    totalTorque.addScaledVector(up, rudderTorqueMagnitude);

    // Centrifugal rolling moment (ship heels outward during turns around local FORWARD axis)
    const heelTorque = this.rudder * forwardSpeed * 4200.0;
    totalTorque.addScaledVector(forward, heelTorque);

    // 3b. Electric Bow Thruster Force & Turning Moment (360° spin & crab docking around local UP axis)
    if (Math.abs(this.bowThruster) > 0.01) {
      const thrusterMag = this.bowThruster * 34000.0;
      totalForce.add(right.clone().multiplyScalar(thrusterMag));
      // Moment arm at bow (7.2m forward of center of gravity)
      totalTorque.addScaledVector(up, -thrusterMag * 7.2);
    }

    // 4. Hydrodynamic Resistance (Linear & Angular Drag in World Space)
    // Lateral drag (ships resist sideways sliding heavily)
    const lateralSpeed = this.linearVelocity.dot(right);
    const lateralDragForce = right.clone().multiplyScalar(-lateralSpeed * SHIP_CONFIG.dragLinear * 4.5);
    totalForce.add(lateralDragForce);

    // Forward drag (increases with square of speed)
    const forwardDragForce = forward.clone().multiplyScalar(-forwardSpeed * Math.abs(forwardSpeed) * 320.0);
    totalForce.add(forwardDragForce);

    // Vertical drag (damping heave oscillations)
    totalForce.y -= this.linearVelocity.y * 14000.0;

    // Angular damping against water in world coordinates
    totalTorque.addScaledVector(this.angularVelocity, -SHIP_CONFIG.dragAngular * 3.2);

    // 5. Hydrostatic Righting Moment (Coordinate-free Ballast Keel Stabilization)
    // Computes restoring torque vector that rotates ship's local UP back to world UP
    const worldUp = new THREE.Vector3(0, 1, 0);
    const rightingAxis = new THREE.Vector3().crossVectors(up, worldUp);
    const sinTilt = rightingAxis.length();
    if (sinTilt > 0.0001) {
      rightingAxis.normalize();
      const tiltAngle = Math.asin(Math.min(1.0, sinTilt));
      // Deep keel ballast provides sharp restoring torque preventing capsize
      const stiffness = SHIP_CONFIG.rightingTorque * (1.0 + Math.pow(tiltAngle / 0.35, 2.0) * 3.5);
      totalTorque.addScaledVector(rightingAxis, tiltAngle * stiffness);
    }

    // 6. Integrate Motion (Newton-Euler)
    const acceleration = totalForce.divideScalar(SHIP_CONFIG.mass);
    this.linearVelocity.addScaledVector(acceleration, dt);

    // Island Shore Grounding / Collision (Prevents sailing through islands and cliff tumbling)
    if (archipelago && archipelago.islands) {
      for (const isle of archipelago.islands) {
        const dx = this.position.x - isle.pos.x;
        const dz = this.position.z - isle.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minClearance = isle.radius + 14.0;
        if (dist < minClearance && dist > 0.1) {
          const nx = dx / dist;
          const nz = dz / dist;
          const penetration = minClearance - dist;
          this.position.x += nx * penetration * 0.95;
          this.position.z += nz * penetration * 0.95;

          // Kill velocity heading into shore & rebound slightly
          const vDotN = this.linearVelocity.x * nx + this.linearVelocity.z * nz;
          if (vDotN < 0) {
            this.linearVelocity.x -= nx * vDotN * 1.5;
            this.linearVelocity.z -= nz * vDotN * 1.5;
            if (audio && Math.abs(vDotN) > 0.8) {
              audio.playWaveImpact(Math.min(3.2, 1.2 + Math.abs(vDotN) * 0.5));
            }
            this.collisionAlert = `GROUNDING: Shoal reef contact at ${isle.name || 'Island'}!`;
            this.collisionTimer = 2.5;
          }
        }
      }
    }

    // AI Traffic Vessels Mutual Collision Response
    this.checkTrafficCollisions(traffic, dt, audio);

    this.position.addScaledVector(this.linearVelocity, dt);

    // World angular acceleration
    const angularAcceleration = totalTorque.divideScalar(SHIP_CONFIG.mass * 18.0);
    this.angularVelocity.addScaledVector(angularAcceleration, dt);
    this.angularVelocity.multiplyScalar(Math.exp(-2.5 * dt)); // Viscous rotational decay
    this.angularVelocity.clampLength(0, 1.6); // Prevent catastrophic rotational spin

    // Update quaternion in WORLD space
    const angSpeed = this.angularVelocity.length();
    if (angSpeed > 0.0001) {
      const rotDelta = new THREE.Quaternion().setFromAxisAngle(
        this.angularVelocity.clone().normalize(),
        angSpeed * dt
      );
      this.quaternion.premultiply(rotDelta).normalize();
    }

    // 7. Apply state to 3D Ship object
    this.ship.position.copy(this.position);
    this.ship.quaternion.copy(this.quaternion);

    // 8. Robust Attitude & Heading Telemetry (Coordinate-free, No Gimbal Lock)
    // Pitch: bow inclination relative to horizon
    this.pitchDeg = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(forward.y, -1.0, 1.0)));
    // Roll: starboard rail inclination relative to horizon
    this.rollDeg = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(right.y, -1.0, 1.0)));
    
    // Heading in nautical degrees (0 to 360, where 0=N, 90=E, 180=S, 270=W)
    let heading = THREE.MathUtils.radToDeg(Math.atan2(forward.x, forward.z));
    if (heading < 0) heading += 360;
    this.headingDeg = Math.round(heading) % 360;

    // 9. Live Marine Depth Sounder
    if (archipelago) {
      this.currentDepthMeters = archipelago.getWaterDepthAt(this.position);
      this.shallowAlarm = (this.currentDepthMeters < 8.0);
    }
  }

  // 10. AI Marine Traffic Vessels Mutual Rigid-Body Collision Resolution (2D OBB SAT)
  checkTrafficCollisions(traffic, dt, audio = null) {
    if (!traffic || !traffic.vessels || traffic.vessels.length === 0) return;

    // Player Hull Extents: Length 14.5m, Beam 4.6m
    const pL = 14.5;
    const pW = 4.6;
    const playerHalfL = pL * 0.5;
    const playerHalfW = pW * 0.5;
    const playerMass = SHIP_CONFIG.mass; // 12,000 kg
    const playerI = playerMass * (playerHalfL * playerHalfL + playerHalfW * playerHalfW) / 12.0;

    // Player Orientation & Unit Axes in X-Z
    const pFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    const pHead = Math.atan2(pFwd.x, pFwd.z);
    const a1 = { x: Math.sin(pHead), z: Math.cos(pHead) };
    const a2 = { x: Math.cos(pHead), z: -Math.sin(pHead) };

    for (const v of traffic.vessels) {
      const vL = v.length || 24.0;
      const vW = v.beam || (vL > 50 ? 19.0 : (vL > 22 ? 7.5 : 5.0));
      const aiHalfL = vL * 0.5;
      const aiHalfW = vW * 0.5;
      const aiMass = v.mass || (vL > 50 ? 45000000 : (vL > 22 ? 220000 : 35000));
      const aiI = aiMass * (aiHalfL * aiHalfL + aiHalfW * aiHalfW) / 12.0;

      // Broadphase distance rejection
      const dx = this.position.x - v.pos.x;
      const dz = this.position.z - v.pos.z;
      const distSq = dx * dx + dz * dz;
      const maxColDist = playerHalfL + aiHalfL + 4.0;
      if (distSq > maxColDist * maxColDist) continue;

      // AI Orientation Axes
      const aiHead = v.heading || 0;
      const b1 = { x: Math.sin(aiHead), z: Math.cos(aiHead) };
      const b2 = { x: Math.cos(aiHead), z: -Math.sin(aiHead) };

      // Separating Axis Theorem (SAT) on 4 candidate axes
      const axes = [a1, a2, b1, b2];
      let minOverlap = Infinity;
      let minAxis = null;
      let separated = false;

      for (let i = 0; i < 4; i++) {
        const u = axes[i];
        const centerDist = Math.abs(dx * u.x + dz * u.z);
        const rA = playerHalfL * Math.abs(a1.x * u.x + a1.z * u.z) +
                   playerHalfW * Math.abs(a2.x * u.x + a2.z * u.z);
        const rB = aiHalfL * Math.abs(b1.x * u.x + b1.z * u.z) +
                   aiHalfW * Math.abs(b2.x * u.x + b2.z * u.z);

        const overlap = (rA + rB) - centerDist;
        if (overlap <= 0) {
          separated = true;
          break;
        }
        if (overlap < minOverlap) {
          minOverlap = overlap;
          minAxis = u;
        }
      }

      if (separated || !minAxis) continue;

      // Contact normal pointing from AI vessel to player
      let nx = minAxis.x;
      let nz = minAxis.z;
      if (dx * nx + dz * nz < 0) {
        nx = -nx;
        nz = -nz;
      }

      // 1. Positional Separation (Displace according to mass ratio)
      const totalMass = playerMass + aiMass;
      const playerWeight = Math.min(0.98, aiMass / totalMass);
      const aiWeight = Math.max(0.02, playerMass / totalMass);

      this.position.x += nx * minOverlap * playerWeight * 1.05;
      this.position.z += nz * minOverlap * playerWeight * 1.05;
      v.pos.x -= nx * minOverlap * aiWeight * 1.05;
      v.pos.z -= nz * minOverlap * aiWeight * 1.05;

      // 2. Exact Contact Points on Both Hulls (Relative to centers of mass)
      // Vector from player center to AI center projected onto player's local axes
      const toAiX = v.pos.x - this.position.x;
      const toAiZ = v.pos.z - this.position.z;
      const localZ = toAiX * a1.x + toAiZ * a1.z; // Bow (+) / Stern (-)
      const localX = toAiX * a2.x + toAiZ * a2.z; // Starboard (+) / Port (-)
      const cpLocalZ = THREE.MathUtils.clamp(localZ, -playerHalfL, playerHalfL);
      const cpLocalX = THREE.MathUtils.clamp(localX, -playerHalfW, playerHalfW);
      const rx = a1.x * cpLocalZ + a2.x * cpLocalX;
      const rz = a1.z * cpLocalZ + a2.z * cpLocalX;

      // Vector from AI center to player center projected onto AI's local axes
      const toPlayerX = this.position.x - v.pos.x;
      const toPlayerZ = this.position.z - v.pos.z;
      const aiLocalZ = toPlayerX * b1.x + toPlayerZ * b1.z;
      const aiLocalX = toPlayerX * b2.x + toPlayerZ * b2.z;
      const aiCpLocalZ = THREE.MathUtils.clamp(aiLocalZ, -aiHalfL, aiHalfL);
      const aiCpLocalX = THREE.MathUtils.clamp(aiLocalX, -aiHalfW, aiHalfW);
      const aiRx = b1.x * aiCpLocalZ + b2.x * aiCpLocalX;
      const aiRz = b1.z * aiCpLocalZ + b2.z * aiCpLocalX;

      // 3. Velocities at Contact Points
      const aiSpeedMps = (v.speed || 0) * 0.514444;
      const aiVelX = Math.sin(aiHead) * aiSpeedMps + (v.driftVel ? v.driftVel.x : 0);
      const aiVelZ = Math.cos(aiHead) * aiSpeedMps + (v.driftVel ? v.driftVel.z : 0);
      const aiOmega = v.impactAngularVel || 0;

      const ptVelPlayerX = this.linearVelocity.x - this.angularVelocity.y * rz;
      const ptVelPlayerZ = this.linearVelocity.z + this.angularVelocity.y * rx;
      const ptVelAiX = aiVelX - aiOmega * aiRz;
      const ptVelAiZ = aiVelZ + aiOmega * aiRx;

      const vRelX = ptVelPlayerX - ptVelAiX;
      const vRelZ = ptVelPlayerZ - ptVelAiZ;
      const normRelVel = vRelX * nx + vRelZ * nz;

      // 4. Moment Arms: r x n (2D cross product rx * nz - rz * nx)
      const rCrossN_player = rx * nz - rz * nx;
      // Normal acting on AI vessel is -n
      const rCrossN_ai = aiRx * (-nz) - aiRz * (-nx);

      // Contact spring impulse for persistent overlap penetration
      const penImpulse = minOverlap * 4500.0 * Math.min(1.0, totalMass / 40000.0);
      let impulseMag = 0;

      if (normRelVel < 0) {
        const restitution = 0.45;
        const effMassInv = (1.0 / playerMass) + (1.0 / aiMass) +
                           (rCrossN_player * rCrossN_player) / playerI +
                           (rCrossN_ai * rCrossN_ai) / aiI;
        impulseMag = -(1.0 + restitution) * normRelVel / effMassInv + penImpulse;
      } else if (minOverlap > 0.05) {
        impulseMag = penImpulse;
      }

      if (impulseMag > 150.0) {
        // ── A. LINEAR IMPULSE TO PLAYER (Directional deflection away from contact normal) ──
        this.linearVelocity.x += (nx * impulseMag) / playerMass;
        this.linearVelocity.z += (nz * impulseMag) / playerMass;

        // Recalculate forward speed immediately
        const fwdSpeedMps = this.linearVelocity.x * a1.x + this.linearVelocity.z * a1.z;
        this.speedKnots = fwdSpeedMps * 1.94384;

        // ── B. ROTATIONAL YAW TORQUE (Pivots ship away from where it was struck) ──
        // Hitting bow pushes bow away; hitting stern pushes stern away
        const torqueYaw = (rCrossN_player * impulseMag) / playerI;
        this.angularVelocity.y += THREE.MathUtils.clamp(torqueYaw, -2.4, 2.4);

        // ── C. ROLL HEELING SHOCK (Ship heels violently into water along longitudinal forward axis) ──
        const lateralImpact = nx * a2.x + nz * a2.z; // Lateral component against starboard beam
        const rollKick = -lateralImpact * Math.min(2.2, impulseMag / (playerMass * 1.4));
        this.angularVelocity.x += pFwd.x * rollKick;
        this.angularVelocity.z += pFwd.z * rollKick;

        // ── D. TANGENTIAL HULL FRICTION SCRUB ──
        const tx = -nz;
        const tz = nx;
        const tangRelVel = vRelX * tx + vRelZ * tz;
        const frictionImpulse = -tangRelVel * 0.45 * Math.min(1.0, impulseMag / 15000.0);
        this.linearVelocity.x += tx * frictionImpulse;
        this.linearVelocity.z += tz * frictionImpulse;

        // ── E. PHYSICAL REACTION ON AI VESSEL ──
        if (!v.driftVel) v.driftVel = { x: 0, z: 0 };
        v.driftVel.x -= (nx * impulseMag) / aiMass;
        v.driftVel.z -= (nz * impulseMag) / aiMass;

        if (v.impactAngularVel !== undefined) {
          const aiYawTorque = (rCrossN_ai * impulseMag) / aiI;
          v.impactAngularVel += THREE.MathUtils.clamp(aiYawTorque, -0.9, 0.9);
        }

        // AI vessel rolls from impact
        if (v.rollVelocity !== undefined) {
          const aiLateralImpact = (-nx) * b2.x + (-nz) * b2.z;
          v.rollVelocity -= THREE.MathUtils.clamp(aiLateralImpact * (impulseMag / (aiMass * 0.08)), -1.2, 1.2);
        }

        // Sudden reduction in AI forward speed & emergency astern throttle
        v.speed = Math.max(-2.5, v.speed - (impulseMag / (aiMass * 0.45)));
        v.targetSpeed = -2.5; // Back propellers away from collision
        v.evading = true;
        v.evasionTimer = 6.0;

        // ── F. AUDIO & COLLISION ALERTS ──
        if (audio) {
          const intensity = Math.min(2.5, 0.8 + impulseMag / 35000.0);
          audio.playHeavyImpact(intensity);
        }

        const forceKn = (impulseMag / 1000.0).toFixed(0);
        this.collisionAlert = `COLLISION: Impact with ${v.name}! Force: ${forceKn} kN`;
        this.collisionTimer = 3.0;
      }
    }
  }
}
