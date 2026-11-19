import * as THREE from 'three';
import { createLogoTextureAndFallback } from '../core/textures.js';
import { LOGO_ASSET_URL, CUBE_SIZE } from '../config/constants.js';

export function createBalancedSpace(scene, isMobile) {
  const spaceGroup = new THREE.Group();

  const starCount = 2200;
  const sPos = new Float32Array(starCount * 3);
  const sCol = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xc4b5fd),
    new THREE.Color(0x93c5fd),
    new THREE.Color(0xe879f9),
  ];
  for (let i = 0; i < starCount; i++) {
    const r = 28 + Math.random() * 78;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    sPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    sPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 8;
    sPos[i * 3 + 2] = r * Math.cos(phi) - 10;
    const col = palette[i % palette.length];
    sCol[i * 3] = col.r; sCol[i * 3 + 1] = col.g; sCol[i * 3 + 2] = col.b;
  }

  const starOrbTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0.5, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(240,248,255,0.92)');
    g.addColorStop(0.5, 'rgba(186,230,253,0.32)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  const nebulaCoreTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 1, 64, 64, 63);
    g.addColorStop(0, 'rgba(255,252,244,0.96)');
    g.addColorStop(0.22, 'rgba(226,232,255,0.58)');
    g.addColorStop(0.55, 'rgba(148,163,255,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  spaceGroup.add(new THREE.Points(sGeo, new THREE.PointsMaterial({
    size: 0.24, map: starOrbTex, alphaTest: 0.01, vertexColors: true,
    transparent: true, opacity: 0.88, depthWrite: false,
  })));

  const createRealisticGalaxy = (cfg) => {
    const galaxyGroup = new THREE.Group();
    const count = cfg.count;
    const gPos = new Float32Array(count * 3);
    const gCol = new Float32Array(count * 3);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const arm = i % cfg.arms;
      const radialT = Math.pow(Math.random(), cfg.radialPow);
      const dist = radialT * cfg.radius;
      const isCoreBulge = radialT < 0.16;

      let px, py, pz;
      if (isCoreBulge) {
        const theta = Math.random() * Math.PI * 2;
        const bulgeR = Math.pow(Math.random(), 0.7) * cfg.radius * 0.18;
        px = Math.cos(theta) * bulgeR * cfg.barStretch;
        py = (Math.random() - 0.5) * 0.72 * (1 - bulgeR / (cfg.radius * 0.25));
        pz = Math.sin(theta) * bulgeR;
      } else {
        const logAngle = Math.log(1 + dist * cfg.twist) * cfg.armTightness;
        const scatter = (Math.random() - 0.5) * (0.28 + radialT * cfg.scatterScale);
        const angle = logAngle + (arm * Math.PI * 2) / cfg.arms + scatter;
        px = Math.cos(angle) * dist;
        py = (Math.random() - 0.5) * (0.42 / (1 + dist * 0.45));
        pz = Math.sin(angle) * dist;
      }

      gPos[i * 3] = px;
      gPos[i * 3 + 1] = py;
      gPos[i * 3 + 2] = pz;

      if (radialT < 0.18) {
        tmpCol.copy(cfg.coreColor).lerp(cfg.midColor, radialT / 0.18);
      } else if (radialT < 0.65) {
        tmpCol.copy(cfg.midColor).lerp(cfg.outerColor, (radialT - 0.18) / 0.47);
      } else {
        tmpCol.copy(cfg.outerColor).lerp(cfg.haloColor, (radialT - 0.65) / 0.35);
      }
      const lum = 0.68 + Math.random() * 0.32;
      gCol[i * 3] = tmpCol.r * lum;
      gCol[i * 3 + 1] = tmpCol.g * lum;
      gCol[i * 3 + 2] = tmpCol.b * lum;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
    galaxyGroup.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: cfg.starSize,
      map: starOrbTex,
      alphaTest: 0.008,
      vertexColors: true,
      transparent: true,
      opacity: cfg.starOpacity || 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })));

    const coreSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaCoreTex,
      color: cfg.coreGlowHex,
      transparent: true,
      opacity: cfg.coreGlowOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    coreSprite.scale.set(...cfg.coreGlowScale);
    galaxyGroup.add(coreSprite);

    const haloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaCoreTex,
      color: cfg.haloGlowHex,
      transparent: true,
      opacity: cfg.haloGlowOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    haloSprite.scale.set(...cfg.haloGlowScale);
    galaxyGroup.add(haloSprite);

    galaxyGroup.position.set(...cfg.pos);
    galaxyGroup.rotation.set(...cfg.rot);
    galaxyGroup.scale.setScalar(cfg.scale);
    spaceGroup.add(galaxyGroup);
    return galaxyGroup;
  };

  const gLeftSpiral = createRealisticGalaxy({
    pos: isMobile ? [-13.2, 18.8, -47] : [-23.0, 20.6, -47],
    rot: [0.64, 0.28, 0.34],
    scale: isMobile ? 0.94 : 1.24,
    count: 2200,
    arms: 2,
    radius: 10.5,
    radialPow: 1.48,
    barStretch: 1.0,
    twist: 1.35,
    armTightness: 2.85,
    scatterScale: 0.62,
    starSize: 0.26,
    starOpacity: 0.90,
    coreColor: new THREE.Color(0xfffbeb),
    midColor: new THREE.Color(0x93c5fd),
    outerColor: new THREE.Color(0x6366f1),
    haloColor: new THREE.Color(0xc084fc),
    coreGlowHex: 0xfff7ed,
    coreGlowOpacity: 0.46,
    coreGlowScale: [6.5, 4.4, 1],
    haloGlowHex: 0x60a5fa,
    haloGlowOpacity: 0.20,
    haloGlowScale: [13.5, 8.8, 1],
  });

  const gRightBarred = createRealisticGalaxy({
    pos: isMobile ? [14.0, 20.4, -51] : [24.2, 22.8, -51],
    rot: [1.08, -0.46, -0.42],
    scale: isMobile ? 0.98 : 1.34,
    count: 2500,
    arms: 4,
    radius: 11.0,
    radialPow: 1.25,
    barStretch: 1.9,
    twist: 1.32,
    armTightness: 2.35,
    scatterScale: 0.48,
    starSize: 0.30,
    starOpacity: 0.95,
    coreColor: new THREE.Color(0xfffbeb),
    midColor: new THREE.Color(0xfcd34d),
    outerColor: new THREE.Color(0xfb7185),
    haloColor: new THREE.Color(0xc084fc),
    coreGlowHex: 0xfde68a,
    coreGlowOpacity: 0.54,
    coreGlowScale: [8.4, 3.8, 1],
    haloGlowHex: 0xf472b6,
    haloGlowOpacity: 0.24,
    haloGlowScale: [16.0, 7.2, 1],
  });

  scene.add(spaceGroup);
  return { spaceGroup, galaxies: [gLeftSpiral, gRightBarred] };
}

export function createLogoDisplay(scene, maxAnisotropy) {
  const logoMeshGroup = new THREE.Group();
  logoMeshGroup.position.set(0, 3.48, 0.35);
  scene.add(logoMeshGroup);

  let logoMesh;
  const initialLogoTex = createLogoTextureAndFallback(LOGO_ASSET_URL, maxAnisotropy, (aspect, loadedTex) => {
    if (logoMesh && aspect > 0) {
      const h = 1.65;
      logoMesh.geometry.dispose();
      logoMesh.geometry = new THREE.PlaneGeometry(h * aspect, h);
      const oldMap = logoMesh.material.map;
      logoMesh.material.map = loadedTex;
      logoMesh.material.needsUpdate = true;
      if (oldMap && oldMap !== loadedTex) oldMap.dispose();
    }
  });
  logoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 1.65),
    new THREE.MeshBasicMaterial({ map: initialLogoTex, transparent: true, depthWrite: false })
  );
  logoMeshGroup.add(logoMesh);
  return logoMeshGroup;
}

export function createRearTunnel(cyberArmorMat) {
  const rearTunnelGroup = new THREE.Group();
  const tunnelLen = 96;
  const tunnelSpan = CUBE_SIZE - 0.12;
  const tunnelWallThick = 0.26;
  const tunnelWallMat = new THREE.MeshStandardMaterial({
    color: 0x0b1020,
    emissive: 0x1e1b4b,
    emissiveIntensity: 0.22,
    roughness: 0.72,
    metalness: 0.42,
  });

  const tunnelTop = new THREE.Mesh(new THREE.BoxGeometry(tunnelSpan, tunnelWallThick, tunnelLen), tunnelWallMat);
  tunnelTop.position.set(0, tunnelSpan / 2 - tunnelWallThick / 2, -tunnelLen / 2 - 0.08);
  const tunnelBottom = new THREE.Mesh(new THREE.BoxGeometry(tunnelSpan, tunnelWallThick, tunnelLen), tunnelWallMat);
  tunnelBottom.position.set(0, -tunnelSpan / 2 + tunnelWallThick / 2, -tunnelLen / 2 - 0.08);
  const tunnelLeft = new THREE.Mesh(new THREE.BoxGeometry(tunnelWallThick, tunnelSpan - tunnelWallThick * 2, tunnelLen), tunnelWallMat);
  tunnelLeft.position.set(-tunnelSpan / 2 + tunnelWallThick / 2, 0, -tunnelLen / 2 - 0.08);
  const tunnelRight = new THREE.Mesh(new THREE.BoxGeometry(tunnelWallThick, tunnelSpan - tunnelWallThick * 2, tunnelLen), tunnelWallMat);
  tunnelRight.position.set(tunnelSpan / 2 - tunnelWallThick / 2, 0, -tunnelLen / 2 - 0.08);
  rearTunnelGroup.add(tunnelTop, tunnelBottom, tunnelLeft, tunnelRight);

  const railOffset = tunnelSpan / 2 - tunnelWallThick - 0.06;
  const tunnelRailGeo = new THREE.BoxGeometry(0.055, 0.055, tunnelLen - 2);
  const tunnelRailMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.52 });
  [[-railOffset, railOffset], [railOffset, railOffset], [-railOffset, -railOffset], [railOffset, -railOffset]].forEach(([rx, ry]) => {
    const rail = new THREE.Mesh(tunnelRailGeo, tunnelRailMat);
    rail.position.set(rx, ry, -tunnelLen / 2 - 0.08);
    rearTunnelGroup.add(rail);
  });

  const ringSteps = [-1.4, -3.5, -6.2, -9.6, -13.8, -19.0, -25.2, -32.6, -41.2, -51.0, -62.0, -74.0, -86.0, -95.0];
  const innerFrameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(tunnelSpan - tunnelWallThick * 2 - 0.04, tunnelSpan - tunnelWallThick * 2 - 0.04, 0.24));
  const outerRibTopGeo = new THREE.BoxGeometry(tunnelSpan + 0.14, 0.12, 0.24);
  const outerRibSideGeo = new THREE.BoxGeometry(0.12, tunnelSpan + 0.14, 0.24);

  ringSteps.forEach((rz, idx) => {
    const depthFade = Math.max(0.08, 1 - idx / ringSteps.length);
    const frameLine = new THREE.LineSegments(
      innerFrameGeo,
      new THREE.LineBasicMaterial({
        color: idx % 2 === 0 ? 0x38bdf8 : 0xa855f7,
        transparent: true,
        opacity: 0.65 * depthFade,
      })
    );
    frameLine.position.z = rz;
    rearTunnelGroup.add(frameLine);

    if (idx % 2 === 0) {
      const rTop = new THREE.Mesh(outerRibTopGeo, cyberArmorMat);
      rTop.position.set(0, tunnelSpan / 2 + 0.04, rz);
      const rBot = new THREE.Mesh(outerRibTopGeo, cyberArmorMat);
      rBot.position.set(0, -tunnelSpan / 2 - 0.04, rz);
      const rL = new THREE.Mesh(outerRibSideGeo, cyberArmorMat);
      rL.position.set(-tunnelSpan / 2 - 0.04, 0, rz);
      const rR = new THREE.Mesh(outerRibSideGeo, cyberArmorMat);
      rR.position.set(tunnelSpan / 2 + 0.04, 0, rz);
      rearTunnelGroup.add(rTop, rBot, rL, rR);
    }
  });

  const tunnelEndCap = new THREE.Mesh(
    new THREE.PlaneGeometry(tunnelSpan, tunnelSpan),
    new THREE.MeshBasicMaterial({ color: 0x030108, side: THREE.DoubleSide })
  );
  tunnelEndCap.position.z = -tunnelLen - 0.08;
  rearTunnelGroup.add(tunnelEndCap);
  return rearTunnelGroup;
}
