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
    // Glowing Fresnel Lantern Lens Core
    const fresnelCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfffaea })
    );
    fresnelCore.position.y = galleryY + 2.4;
    group.add(fresnelCore);

    // Warm radiant lantern flare halo
    const lensHalo = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffdd88,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      })
    );
    lensHalo.position.y = galleryY + 2.4;
    group.add(lensHalo);

    // Omnidirectional lantern glow light
    const lanternPoint = new THREE.PointLight(0xffe8a0, 4.0, 80, 1.2);
    lanternPoint.position.y = galleryY + 2.4;
    group.add(lanternPoint);

    // ── ROTATING DUAL VOLUMETRIC FRESNEL LIGHT BEAMS ──
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0, galleryY + 2.4, 0);

    // Custom soft volumetric beam shader (fades with distance and at grazing edges)
    const beamShaderMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(0xffeed0) },
        uLength: { value: 260.0 }
      },
      vertexShader: `
        varying vec3 vLocalPos;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        void main() {
          vLocalPos = position;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uLength;
        varying vec3 vLocalPos;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        void main() {
          // Longitudinal falloff: bright at lens, gently fading out
          float progress = clamp(vLocalPos.y / uLength, 0.0, 1.0);
          float distFade = pow(1.0 - progress, 2.0) * smoothstep(0.0, 0.04, progress);
          
          // Soft radial edge falloff (smooth gaussian-like edge instead of hard polygon line)
          float edge = abs(dot(vWorldNormal, vViewDir));
          float rimFade = pow(1.0 - edge, 1.6);
          
          float alpha = 0.085 * distFade * rimFade;
          if (alpha < 0.001) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    });

    for (const angle of [0, Math.PI]) {
      // Natural maritime spotlight
      const spot = new THREE.SpotLight(0xfff5e0, 8.0, 480, Math.PI / 18, 0.85, 1.2);
      spot.position.set(0, 0, 0);

      const target = new THREE.Object3D();
      target.position.set(Math.sin(angle) * 180, -12.0, Math.cos(angle) * 180);
      beamPivot.add(target);
      spot.target = target;
      beamPivot.add(spot);
      this.lighthouseBeams.push(spot);

      // Smooth volumetric light beam cone
      const beamConeGeo = new THREE.ConeGeometry(18, 260, 32, 1, true);
      beamConeGeo.rotateX(Math.PI / 2);
      // Center cone origin at apex (lantern room)
      beamConeGeo.translate(0, 0, 130);

      const coneMesh = new THREE.Mesh(beamConeGeo, beamShaderMat);
      coneMesh.rotation.y = angle;
      beamPivot.add(coneMesh);
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
