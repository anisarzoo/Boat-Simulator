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
    // ── GLOWING FRESNEL LANTERN CORE & RADIANT HALO ──
    const lanternY = galleryY + 2.4;

    // Incandescent filament / arc core
    const fresnelCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfffff2 })
    );
    fresnelCore.position.y = lanternY;
    group.add(fresnelCore);

    // Warm radiant lantern flare halo (golden incandescent beacon bloom)
    const lensHalo = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffd988,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending
      })
    );
    lensHalo.position.y = lanternY;
    group.add(lensHalo);

    // Outer atmospheric fog dispersal halo around lantern room
    const outerHalo = new THREE.Mesh(
      new THREE.SphereGeometry(6.8, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffb855,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending
      })
    );
    outerHalo.position.y = lanternY;
    group.add(outerHalo);

    // Omnidirectional lantern glow light (illuminates tower & gallery)
    const lanternPoint = new THREE.PointLight(0xffdf95, 6.5, 120, 1.1);
    lanternPoint.position.y = lanternY;
    group.add(lanternPoint);

    // ── ROTATING DUAL VOLUMETRIC EXPANDING FRESNEL LIGHT BEAMS ──
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0, lanternY, 0);

    const beamLength = 360.0;
    const rStart = 1.35; // Narrow at lantern aperture
    const rEnd = 30.0;   // Naturally expands into the sea mist

    // Advanced volumetric light beam shader:
    // 1. Naturally EXPANDS outward from lantern aperture into the ocean
    // 2. FADES smoothly with distance (Beer-Lambert atmospheric attenuation + smooth end feathering)
    // 3. Dense, solid, glowing core with soft Gaussian radial edge falloff (NO hollow shell)
    // 4. Mie forward-scattering enhancement when looking along beam
    const createBeamMaterial = (opacityVal, coreConcentration) => new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uLength: { value: beamLength },
        uRadiusStart: { value: rStart },
        uRadiusEnd: { value: rEnd },
        uOpacity: { value: opacityVal },
        uCoreConcentration: { value: coreConcentration }
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

        varying vec3 vLocalPos;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying vec3 vNormal;

        void main() {
          // Longitudinal progress along the beam (0.0 at lantern, 1.0 at far end)
          float t = clamp(vLocalPos.z / uLength, 0.0, 1.0);

          // Atmospheric extinction / Beer-Lambert distance fade
          // Dazzlingly intense at lantern, exponentially decaying with distance
          float distFade = exp(-2.3 * t);
          // Quadratic end-feathering to 0.0 so there is never an abrupt geometry cutoff
          float endFeather = (1.0 - t * t);
          // Intense focal boost right at the lantern aperture
          float sourceBoost = 1.0 + 3.8 * exp(-24.0 * t);
          float longitudinal = distFade * endFeather * sourceBoost;

          // Radius of the expanding beam at distance z
          float radiusAtZ = mix(uRadiusStart, uRadiusEnd, t);
          float radialDist = length(vLocalPos.xy);
          float rho = clamp(radialDist / max(radiusAtZ, 0.01), 0.0, 1.0);

          // Volumetric Gaussian radial profile: solid, bright core, softly feathering to perimeter
          float coreGlow = exp(-uCoreConcentration * rho * rho);
          float softEdge = smoothstep(1.0, 0.28, rho);
          float radialProfile = coreGlow * softEdge;

          // Forward Mie scattering (beam looks brighter when looking toward the lighthouse)
          vec3 beamDir = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
          float forwardScatter = pow(max(0.0, dot(vViewDir, -beamDir)), 3.0) * 0.4 + 0.65;

          // Thickness accumulation when viewing through the cone volume
          float cosAngle = abs(dot(vNormal, vViewDir));
          float depthWeight = mix(0.55, 1.0, sqrt(max(0.0, 1.0 - cosAngle * cosAngle)));

          // Realistic incandescent color gradient (white-hot core -> golden amber beam -> warm fog scatter)
          vec3 coreColor = vec3(1.0, 0.98, 0.92);
          vec3 amberBeam = vec3(1.0, 0.85, 0.58);
          vec3 fogScatter = vec3(0.96, 0.72, 0.42);

          vec3 finalColor = mix(coreColor, amberBeam, clamp(rho * 1.35 + t * 0.45, 0.0, 1.0));
          finalColor = mix(finalColor, fogScatter, clamp(t * 0.75, 0.0, 1.0));

          float alpha = uOpacity * longitudinal * radialProfile * forwardScatter * depthWeight;
          if (alpha < 0.001) discard;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    });

    // Material 1: Outer atmospheric fog scatter cone
    const outerBeamMat = createBeamMaterial(0.24, 3.2);
    // Material 2: Inner concentrated hot core beam
    const innerCoreMat = createBeamMaterial(0.42, 6.5);

    // Geometry: Cylinder expanding from rStart at Z=0 to rEnd at Z=beamLength
    const createExpandingConeGeo = (radiusStart, radiusEnd, length) => {
      const geo = new THREE.CylinderGeometry(radiusStart, radiusEnd, length, 32, 24, true);
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0, length / 2);
      return geo;
    };

    const outerGeo = createExpandingConeGeo(rStart, rEnd, beamLength);
    const innerGeo = createExpandingConeGeo(rStart * 0.65, rEnd * 0.48, beamLength * 0.95);

    for (const angle of [0, Math.PI]) {
      const beamGroup = new THREE.Group();
      beamGroup.rotation.y = angle;
      // Authentic 1.8° downward pitch toward the sea horizon
      beamGroup.rotation.x = 0.032;

      // Outer atmospheric fog cone
      const outerMesh = new THREE.Mesh(outerGeo, outerBeamMat);
      beamGroup.add(outerMesh);

      // Inner intense core beam
      const innerMesh = new THREE.Mesh(innerGeo, innerCoreMat);
      beamGroup.add(innerMesh);

      // Spotlight for direct ocean surface illumination
      const spot = new THREE.SpotLight(0xffeed0, 9.0, 520, Math.PI / 16, 0.8, 1.15);
      spot.position.set(0, 0, 0);

      const target = new THREE.Object3D();
      target.position.set(0, -18.0, 320.0);
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

  update(dt) {
    // Continuous 360° sweeping Fresnel lighthouse rotation (12 RPM)
    if (this.lighthouseTower) {
      this.lighthouseTower.rotation.y += 0.85 * dt;
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
