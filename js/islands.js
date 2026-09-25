// Archipelago Islands, Sea Stacks, and Historic Coastal Lighthouse with Rotating Fresnel Light Beam
import * as THREE from 'three';

export class Archipelago {
  constructor(scene) {
    this.scene = scene;
    this.islands = [];
    this.lighthouseBeams = [];
    this.lighthouseTower = null;

    this.initIslands();
    this.initLighthouse();
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

    // ── ISLAND 1: LIGHTHOUSE ATOLL (Main Island: 450m, 620m) ──
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

    this.scene.add(mainIslandGroup);
    this.islands.push({ pos: mainIslandGroup.position, radius: 130, name: 'Cape Horizon Island' });

    // ── ISLAND 2: SEA STACK ARCHIPELAGO (-520m, 380m) ──
    const stackGroup = new THREE.Group();
    stackGroup.position.set(-520, 0, 380);

    const stackGeo1 = this.createIslandGeometry(45, 32, 20);
    const stack1 = new THREE.Mesh(stackGeo1, matRock);
    stack1.position.set(0, 14, 0);
    stack1.castShadow = true;
    stackGroup.add(stack1);

    const stackGeo2 = this.createIslandGeometry(28, 22, 16);
    const stack2 = new THREE.Mesh(stackGeo2, matRock);
    stack2.position.set(45, 9, -35);
    stack2.castShadow = true;
    stackGroup.add(stack2);

    this.scene.add(stackGroup);
    this.islands.push({ pos: stackGroup.position, radius: 75, name: 'The Needles Sea Stacks' });
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

          void main() {
            vLocalPos = position;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
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
            vec3 beamDir = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
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
