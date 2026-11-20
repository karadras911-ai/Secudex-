import * as THREE from 'three';
import { CUBE_SIZE, CUBE_HALF } from '../config/constants.js';
import { configureCrispTexture, heightCanvasToNormalTex } from '../core/textures.js';
import { createRearTunnel } from './environment.js';

function createCubeReactorMaps(maxAnisotropy) {
  const size = 512;
  const colC = document.createElement('canvas'); colC.width = colC.height = size;
  const colCtx = colC.getContext('2d');
  const bumpC = document.createElement('canvas'); bumpC.width = bumpC.height = size;
  const bumpCtx = bumpC.getContext('2d');
  const roughC = document.createElement('canvas'); roughC.width = roughC.height = size;
  const roughCtx = roughC.getContext('2d');
  const emC = document.createElement('canvas'); emC.width = emC.height = size;
  const emCtx = emC.getContext('2d');

  colCtx.fillStyle = '#0c0618'; colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#6c6c6c'; bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#707070'; roughCtx.fillRect(0, 0, size, size);
  emCtx.fillStyle = '#000000'; emCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1500; i++) {
    const v = 16 + Math.floor(Math.random() * 20);
    colCtx.fillStyle = `rgba(${v + 12}, ${v + 4}, ${v + 30}, 0.35)`;
    colCtx.fillRect(Math.random() * size, Math.random() * size, 16 + Math.random() * 48, 1);
  }

  const step = size / 4;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const px = c * step, py = r * step, pad = 6;
      colCtx.strokeStyle = 'rgba(3, 1, 8, 0.92)';
      colCtx.lineWidth = 6;
      colCtx.strokeRect(px, py, step, step);
      colCtx.fillStyle = ((r + c) % 2 === 0) ? '#170d2e' : '#120924';
      colCtx.fillRect(px + pad, py + pad, step - pad * 2, step - pad * 2);
      colCtx.strokeStyle = 'rgba(167, 139, 250, 0.22)';
      colCtx.lineWidth = 1.5;
      colCtx.strokeRect(px + pad + 1, py + pad + 1, step - pad * 2 - 2, step - pad * 2 - 2);

      bumpCtx.strokeStyle = '#121212'; bumpCtx.lineWidth = 6; bumpCtx.strokeRect(px, py, step, step);
      bumpCtx.fillStyle = ((r + c) % 2 === 0) ? '#c2c2c2' : '#9e9e9e';
      bumpCtx.fillRect(px + pad + 2, py + pad + 2, step - pad * 2 - 4, step - pad * 2 - 4);
      roughCtx.fillStyle = ((r + c) % 2 === 0) ? '#444444' : '#828282';
      roughCtx.fillRect(px + pad + 2, py + pad + 2, step - pad * 2 - 4, step - pad * 2 - 4);

      [[px + 13, py + 13], [px + step - 13, py + 13], [px + 13, py + step - 13], [px + step - 13, py + step - 13]].forEach(([bx, by]) => {
        colCtx.fillStyle = '#070310'; colCtx.beginPath(); colCtx.arc(bx, by, 3, 0, Math.PI * 2); colCtx.fill();
        colCtx.fillStyle = '#64748b'; colCtx.beginPath(); colCtx.arc(bx, by, 1.8, 0, Math.PI * 2); colCtx.fill();
        bumpCtx.fillStyle = '#d8d8d8'; bumpCtx.beginPath(); bumpCtx.arc(bx, by, 2.2, 0, Math.PI * 2); bumpCtx.fill();
      });

      if ((r + c) % 2 === 0) {
        for (let lv = 0; lv < 4; lv++) {
          const ly = py + 24 + lv * 8;
          colCtx.fillStyle = '#05020d'; colCtx.fillRect(px + 20, ly, step - 42, 3.5);
          bumpCtx.fillStyle = '#1c1c1c'; bumpCtx.fillRect(px + 20, ly, step - 42, 3.5);
        }
        emCtx.strokeStyle = '#38bdf8'; emCtx.lineWidth = 2.4;
        emCtx.beginPath();
        emCtx.moveTo(px + 20, py + step - 24);
        emCtx.lineTo(px + step * 0.56, py + step - 24);
        emCtx.lineTo(px + step * 0.72, py + step - 15);
        emCtx.lineTo(px + step - 18, py + step - 15);
        emCtx.stroke();
      } else {
        colCtx.fillStyle = 'rgba(139, 92, 246, 0.45)';
        colCtx.font = 'bold 10px monospace';
        colCtx.fillText(`Q-NODE ${r}${c}`, px + 20, py + 30);
        emCtx.fillStyle = '#a855f7'; emCtx.fillRect(px + 20, py + step - 20, 22, 3);
        emCtx.fillStyle = '#38bdf8'; emCtx.fillRect(px + 48, py + step - 20, 8, 3);
      }
    }
  }

  const colorTex = new THREE.CanvasTexture(colC);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  configureCrispTexture(colorTex, maxAnisotropy, true);

  const normalTex = heightCanvasToNormalTex(bumpC, 3.2, 1, 1, maxAnisotropy);
  const roughTex = new THREE.CanvasTexture(roughC);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  configureCrispTexture(roughTex, maxAnisotropy, false);

  const emissiveTex = new THREE.CanvasTexture(emC);
  emissiveTex.wrapS = emissiveTex.wrapT = THREE.RepeatWrapping;
  configureCrispTexture(emissiveTex, maxAnisotropy, true);

  return { colorTex, normalTex, roughTex, emissiveTex };
}

function createPortalFieldTex(maxAnisotropy) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 18, 256, 256, 270);
  g.addColorStop(0, 'rgba(56, 189, 248, 0.78)');
  g.addColorStop(0.55, 'rgba(99, 102, 241, 0.42)');
  g.addColorStop(1, 'rgba(15, 23, 42, 0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y < 512; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(224, 242, 254, 0.65)';
  for (let y = 8; y < 512; y += 64) {
    ctx.fillRect(28, y, 456, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return configureCrispTexture(tex, maxAnisotropy, true);
}

export function createCubeRig(scene, maxAnisotropy, metalTex, metalNormalTex) {
  const half = CUBE_HALF;
  const up = new THREE.Vector3(0, 1, 0);

  const cubeGroup = new THREE.Group();
  cubeGroup.position.set(0, 0.1, 0);
  scene.add(cubeGroup);

  const cubeReactorMaps = createCubeReactorMaps(maxAnisotropy);
  const portalFieldTex = createPortalFieldTex(maxAnisotropy);

  const darkPurpleBeamMat = new THREE.MeshPhysicalMaterial({
    color: 0x260c47, roughness: 0.26, metalness: 0.91,
    normalMap: metalNormalTex, normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: metalTex, clearcoat: 0.4, clearcoatRoughness: 0.22, envMapIntensity: 1.5,
  });
  const cyberArmorMat = new THREE.MeshPhysicalMaterial({
    color: 0x150929, roughness: 0.32, metalness: 0.9,
    normalMap: metalNormalTex, normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: metalTex, clearcoat: 0.34, clearcoatRoughness: 0.26, envMapIntensity: 1.45,
  });
  const cubeReactorArmorMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: cubeReactorMaps.colorTex,
    normalMap: cubeReactorMaps.normalTex,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: cubeReactorMaps.roughTex,
    roughness: 0.34,
    metalness: 0.9,
    clearcoat: 0.45,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.55,
    emissive: 0xffffff,
    emissiveMap: cubeReactorMaps.emissiveTex,
    emissiveIntensity: 0.95,
  });
  const cyberChromeMat = new THREE.MeshPhysicalMaterial({
    color: 0xcbd5e1, roughness: 0.15, metalness: 0.96,
    normalMap: metalNormalTex, normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: metalTex, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.7,
  });
  const violetAccentMat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed, emissive: 0x5b21b6, emissiveIntensity: 0.95, roughness: 0.2, metalness: 0.9,
  });
  const electrodeGlowMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.65, roughness: 0.15, metalness: 0.25,
  });

  const cyberCoils = [];

  const beamDirs = [
    { p: [-half, 0, -half], r: [0, 0, 0] }, { p: [half, 0, -half], r: [0, 0, 0] },
    { p: [-half, 0, half], r: [0, 0, 0] }, { p: [half, 0, half], r: [0, 0, 0] },
    { p: [0, -half, -half], r: [0, 0, Math.PI / 2] }, { p: [0, half, -half], r: [0, 0, Math.PI / 2] },
    { p: [0, -half, half], r: [0, 0, Math.PI / 2] }, { p: [0, half, half], r: [0, 0, Math.PI / 2] },
    { p: [-half, -half, 0], r: [Math.PI / 2, 0, 0] }, { p: [half, -half, 0], r: [Math.PI / 2, 0, 0] },
    { p: [-half, half, 0], r: [Math.PI / 2, 0, 0] }, { p: [half, half, 0], r: [Math.PI / 2, 0, 0] },
  ];
  const barGeo = new THREE.BoxGeometry(0.24, CUBE_SIZE, 0.24);
  const shroudGeo = new THREE.BoxGeometry(0.28, 1.15, 0.28);
  const stripGeo1 = new THREE.BoxGeometry(0.055, CUBE_SIZE - 0.14, 0.265);
  const stripGeo2 = new THREE.BoxGeometry(0.265, CUBE_SIZE - 0.14, 0.055);
  const railGeo = new THREE.CylinderGeometry(0.017, 0.017, CUBE_SIZE - 0.48, 8);
  const finGeo = new THREE.BoxGeometry(0.32, 0.028, 0.32);
  const bushingGeo = new THREE.CylinderGeometry(0.068, 0.09, 0.11, 8);
  const tipConeGeo = new THREE.ConeGeometry(0.032, 0.16, 8);

  beamDirs.forEach(d => {
    const beamGroup = new THREE.Group();
    beamGroup.add(
      new THREE.Mesh(barGeo, darkPurpleBeamMat),
      new THREE.Mesh(stripGeo1, violetAccentMat),
      new THREE.Mesh(stripGeo2, violetAccentMat)
    );
    [-1.25, 1.25].forEach(sy => {
      const shroud = new THREE.Mesh(shroudGeo, cubeReactorArmorMat);
      shroud.position.y = sy;
      beamGroup.add(shroud);
    });
    [-0.92, -0.82, -0.72, 0.72, 0.82, 0.92].forEach(fy => {
      const fin = new THREE.Mesh(finGeo, cyberChromeMat);
      fin.position.y = fy;
      beamGroup.add(fin);
    });
    const centerLock = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), cyberArmorMat);
    const centerChrome = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.36), cyberChromeMat);
    const centerPlasma = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.048, 0.37), electrodeGlowMat);
    beamGroup.add(centerLock, centerChrome, centerPlasma);
    [[-0.14, -0.14], [0.14, 0.14], [-0.14, 0.14], [0.14, -0.14]].forEach(([ox, oz]) => {
      const rail = new THREE.Mesh(railGeo, cyberChromeMat);
      rail.position.set(ox, 0, oz);
      beamGroup.add(rail);
    });
    beamGroup.position.set(...d.p);
    beamGroup.rotation.set(...d.r);
    cubeGroup.add(beamGroup);

    [-1.12, 0, 1.12].forEach((along) => {
      const worldPt = new THREE.Vector3(0, along, 0).applyEuler(beamGroup.rotation).add(beamGroup.position);
      const inward = worldPt.clone().negate().normalize();
      const edgeNode = new THREE.Group();
      edgeNode.position.copy(worldPt);
      edgeNode.quaternion.setFromUnitVectors(up, inward);
      const bushing = new THREE.Mesh(bushingGeo, cyberArmorMat);
      bushing.position.y = 0.12;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 8), cyberChromeMat);
      collar.position.y = 0.19;
      const tip = new THREE.Mesh(tipConeGeo, electrodeGlowMat);
      tip.position.y = 0.27;
      edgeNode.add(bushing, collar, tip);
      cubeGroup.add(edgeNode);
    });
  });

  for (const x of [-half, half]) {
    for (const y of [-half, half]) {
      for (const z of [-half, half]) {
        const node = new THREE.Group();
        node.add(
          new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), cubeReactorArmorMat),
          new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.18, 0.50), cyberChromeMat),
          new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.50, 0.50), cyberArmorMat),
          new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.50, 0.18), cyberArmorMat),
          new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), violetAccentMat)
        );
        const inward = new THREE.Vector3(-x, -y, -z).normalize();
        const cornerPin = new THREE.Group();
        cornerPin.quaternion.setFromUnitVectors(up, inward);
        const pinBase = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.095, 0.15, 8), cyberChromeMat);
        pinBase.position.y = 0.27;
        const pinRing = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.014, 6, 16), electrodeGlowMat);
        pinRing.rotation.x = Math.PI / 2;
        pinRing.position.y = 0.34;
        const pinGlow = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), electrodeGlowMat);
        pinGlow.position.y = 0.39;
        cornerPin.add(pinBase, pinRing, pinGlow);
        node.add(cornerPin);
        node.position.set(x, y, z);
        cubeGroup.add(node);
      }
    }
  }

  const pedestalGroup = new THREE.Group();
  pedestalGroup.position.set(0, -half - 0.14, 0);
  const pedUpper = new THREE.Mesh(new THREE.CylinderGeometry(2.68, 2.98, 0.22, 8), cubeReactorArmorMat);
  pedUpper.rotation.y = Math.PI / 8;
  pedUpper.position.y = -0.06;
  const pedGlowRing = new THREE.Mesh(new THREE.TorusGeometry(2.84, 0.032, 8, 48), electrodeGlowMat);
  pedGlowRing.rotation.x = Math.PI / 2;
  pedGlowRing.position.y = -0.16;
  const pedLower = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.55, 0.30, 8), cyberArmorMat);
  pedLower.rotation.y = Math.PI / 8;
  pedLower.position.y = -0.32;
  const pedRim = new THREE.Mesh(new THREE.CylinderGeometry(3.57, 3.64, 0.07, 8), cyberChromeMat);
  pedRim.rotation.y = Math.PI / 8;
  pedRim.position.y = -0.46;
  pedestalGroup.add(pedUpper, pedGlowRing, pedLower, pedRim);
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const fin = new THREE.Group();
    fin.position.set(Math.cos(ang) * 2.95, -0.26, Math.sin(ang) * 2.95);
    fin.rotation.y = -ang;
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.18), cyberChromeMat);
    const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.22), violetAccentMat);
    finTip.position.x = 0.28;
    fin.add(strut, finTip);
    pedestalGroup.add(fin);
  }
  cubeGroup.add(pedestalGroup);

  const floorPadRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.028, 8, 48), cyberChromeMat);
  floorPadRing.rotation.x = Math.PI / 2;
  floorPadRing.position.y = -half + 0.07;
  const floorPadGlow = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.016, 8, 48), electrodeGlowMat);
  floorPadGlow.rotation.x = Math.PI / 2;
  floorPadGlow.position.y = -half + 0.075;
  cubeGroup.add(floorPadRing, floorPadGlow);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8b4fe, transparent: true, opacity: 0.075,
    roughness: 0.06, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.05,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const glassPlaneGeo = new THREE.PlaneGeometry(CUBE_SIZE - 0.16, CUBE_SIZE - 0.16);
  [
    { pos: [0, 0, half - 0.04], rot: [0, 0, 0] },
    { pos: [-half + 0.04, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [half - 0.04, 0, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [0, half - 0.04, 0], rot: [-Math.PI / 2, 0, 0] },
    { pos: [0, -half + 0.04, 0], rot: [Math.PI / 2, 0, 0] },
  ].forEach(cfg => {
    const pane = new THREE.Mesh(glassPlaneGeo, glassMat);
    pane.position.set(...cfg.pos);
    pane.rotation.set(...cfg.rot);
    cubeGroup.add(pane);
  });
  cubeGroup.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE - 0.14, CUBE_SIZE - 0.14, CUBE_SIZE - 0.14)),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.48 })
  ));

  const backWallGroup = new THREE.Group();
  backWallGroup.position.set(0, 0, -half + 0.05);
  const bwTop = new THREE.Mesh(new THREE.BoxGeometry(CUBE_SIZE - 0.14, 0.52, 0.16), cubeReactorArmorMat);
  bwTop.position.y = (CUBE_SIZE - 0.14) / 2 - 0.26;
  const bwBottom = new THREE.Mesh(new THREE.BoxGeometry(CUBE_SIZE - 0.14, 0.52, 0.16), cubeReactorArmorMat);
  bwBottom.position.y = -(CUBE_SIZE - 0.14) / 2 + 0.26;
  const bwLeft = new THREE.Mesh(new THREE.BoxGeometry(0.52, CUBE_SIZE - 1.18, 0.16), cubeReactorArmorMat);
  bwLeft.position.x = -(CUBE_SIZE - 0.14) / 2 + 0.26;
  const bwRight = new THREE.Mesh(new THREE.BoxGeometry(0.52, CUBE_SIZE - 1.18, 0.16), cubeReactorArmorMat);
  bwRight.position.x = (CUBE_SIZE - 0.14) / 2 - 0.26;
  backWallGroup.add(bwTop, bwBottom, bwLeft, bwRight);

  [-1.68, 1.68].forEach(bx => {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.11, CUBE_SIZE - 0.28, 0.22), cyberChromeMat);
    rib.position.x = bx;
    backWallGroup.add(rib);
  });
  [-1.82, 1.82].forEach(by => {
    const hBeam = new THREE.Mesh(new THREE.BoxGeometry(CUBE_SIZE - 0.28, 0.16, 0.22), cyberArmorMat);
    hBeam.position.y = by;
    const hGlow = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.032, 0.24), electrodeGlowMat);
    hGlow.position.y = by;
    backWallGroup.add(hBeam, hGlow);
  });
  [-1.58, 1.58].forEach(rx => {
    const feedRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.24, 10), electrodeGlowMat);
    feedRoller.position.set(rx, 0, 0.11);
    backWallGroup.add(feedRoller);
  });
  const portalGlowMat = new THREE.MeshBasicMaterial({
    map: portalFieldTex, color: 0xbae6fd, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const portalSlot = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 3.12), portalGlowMat);
  portalSlot.position.z = 0.08;
  backWallGroup.add(portalSlot);
  const rearTunnel = createRearTunnel(cyberArmorMat, maxAnisotropy);
  backWallGroup.add(rearTunnel.rearTunnelGroup);
  cubeGroup.add(backWallGroup);

  function buildFaceElectrodeAssembly(hasCenterEmitter) {
    const fGroup = new THREE.Group();
    const cOff = 1.56;
    [[-cOff, cOff], [cOff, cOff], [-cOff, -cOff], [cOff, -cOff]].forEach(([ex, ey]) => {
      const mod = new THREE.Group();
      mod.position.set(ex, ey, 0);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.06), cubeReactorArmorMat);
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.08, 6), cyberChromeMat);
      flange.rotation.x = Math.PI / 2;
      const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.1, 12), cyberArmorMat);
      insulator.rotation.x = Math.PI / 2;
      insulator.position.z = -0.05;
      const outerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.06, 6), electrodeGlowMat);
      outerCap.rotation.x = Math.PI / 2;
      outerCap.position.z = 0.06;
      [-0.045, 0.045].forEach(px => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.024, 0.22, 8), cyberChromeMat);
        rod.rotation.x = Math.PI / 2;
        rod.position.set(px, 0, -0.15);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), electrodeGlowMat);
        tip.position.set(px, 0, -0.27);
        mod.add(rod, tip);
      });
      mod.add(plate, flange, insulator, outerCap);
      fGroup.add(mod);
    });

    const tracePts = [
      new THREE.Vector3(-1.82, 1.82, 0), new THREE.Vector3(-1.56, 1.56, 0),
      new THREE.Vector3(1.82, 1.82, 0), new THREE.Vector3(1.56, 1.56, 0),
      new THREE.Vector3(-1.82, -1.82, 0), new THREE.Vector3(-1.56, -1.56, 0),
      new THREE.Vector3(1.82, -1.82, 0), new THREE.Vector3(1.56, -1.56, 0),
      new THREE.Vector3(-1.56, 1.56, 0), new THREE.Vector3(1.56, 1.56, 0),
      new THREE.Vector3(-1.56, -1.56, 0), new THREE.Vector3(1.56, -1.56, 0),
      new THREE.Vector3(-1.56, 1.56, 0), new THREE.Vector3(-1.56, -1.56, 0),
      new THREE.Vector3(1.56, 1.56, 0), new THREE.Vector3(1.56, -1.56, 0),
    ];
    fGroup.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(tracePts),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.38 })
    ));

    [-0.74, 0.74].forEach(bx => {
      [-1.78, 1.78].forEach(by => {
        const capBlock = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.1), cyberArmorMat);
        capBlock.position.set(bx, by, 0);
        const busGlow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.115), electrodeGlowMat);
        busGlow.position.set(bx, by, 0);
        const pin = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.16, 8), electrodeGlowMat);
        pin.rotation.x = -Math.PI / 2;
        pin.position.set(bx, by, -0.1);
        fGroup.add(capBlock, busGlow, pin);
      });
    });

    if (hasCenterEmitter) {
      [-1.42, 1.42].forEach(mx => {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.45, 0.14), cubeReactorArmorMat);
        pod.position.set(mx, 0, 0);
        const podTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.25, 0.165), violetAccentMat);
        podTrim.position.set(mx, 0, 0);
        const podPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.68, 8), cyberChromeMat);
        podPipe.position.set(mx > 0 ? mx - 0.15 : mx + 0.15, 0, 0.02);
        fGroup.add(pod, podTrim, podPipe);
      });

      const emitter = new THREE.Group();
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.052, 10, 32), cyberChromeMat);
      const midArmorRing = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.04, 8, 24), cyberArmorMat);
      const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.024, 8, 24), electrodeGlowMat);
      const hexBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.12, 6), cubeReactorArmorMat);
      hexBase.rotation.x = Math.PI / 2;
      const centerNeedle = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.34, 8), electrodeGlowMat);
      centerNeedle.rotation.x = -Math.PI / 2;
      centerNeedle.position.z = -0.21;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.25, 0.12), cyberArmorMat);
        clamp.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
        clamp.rotation.z = a + Math.PI / 2;
        emitter.add(clamp);
      }
      emitter.add(outerRing, midArmorRing, coilRing, hexBase, centerNeedle);
      emitter.userData.innerRing = coilRing;
      fGroup.add(emitter);
      cyberCoils.push(emitter);
    }
    return fGroup;
  }

  [
    { pos: [0, 0, half - 0.02], rot: [0, 0, 0], center: false },
    { pos: [-half + 0.02, 0, 0], rot: [0, -Math.PI / 2, 0], center: true },
    { pos: [half - 0.02, 0, 0], rot: [0, Math.PI / 2, 0], center: true },
    { pos: [0, half - 0.02, 0], rot: [-Math.PI / 2, 0, 0], center: true },
    { pos: [0, -half + 0.02, 0], rot: [Math.PI / 2, 0, 0], center: true },
  ].forEach(cfg => {
    const face = buildFaceElectrodeAssembly(cfg.center);
    face.position.set(...cfg.pos);
    face.rotation.set(...cfg.rot);
    cubeGroup.add(face);
  });

  // -------------------------------------------------------------------------
  // Левый батарейный блок-накопитель данных с процентами, индексами и коэффициентами
  // -------------------------------------------------------------------------
  const leftStorageGroup = new THREE.Group();
  leftStorageGroup.position.set(-half - 1.02, -0.1, 0.05);

  const vaultBody = new THREE.Mesh(new THREE.BoxGeometry(1.18, 3.36, 1.54), cubeReactorArmorMat);
  const vaultCapTop = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.18, 1.62), cyberChromeMat);
  vaultCapTop.position.y = 1.72;
  // Диагностический маяк-гребень блока анализа и рисков сверху корпуса
  const diagCap = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.10, 0.96), cyberArmorMat);
  diagCap.position.y = 1.84;
  const diagVisor = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.045, 0.98), electrodeGlowMat);
  diagVisor.position.y = 1.87;
  const vaultCapBot = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.18, 1.62), cyberChromeMat);
  vaultCapBot.position.y = -1.72;
  const vaultEdgeFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.22, 3.40, 1.58)),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.58 })
  );
  leftStorageGroup.add(vaultBody, vaultCapTop, diagCap, diagVisor, vaultCapBot, vaultEdgeFrame);

  [-0.85, 0.85].forEach(cy => {
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.56, 12), cyberChromeMat);
    conduit.rotation.z = Math.PI / 2;
    conduit.position.set(0.72, cy, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12), electrodeGlowMat);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(0.60, cy, 0);
    leftStorageGroup.add(conduit, sleeve);
  });

  // 5 ячеек заряда снизу вверх (20% -> 40% -> 60% -> 80% -> 100%)
  const vaultSlots = [];
  for (let s = 0; s < 5; s++) {
    const slotGroup = new THREE.Group();
    slotGroup.position.set(0.02, -1.26 + s * 0.36, 0.04);
    const bayBezel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.25, 1.38), cyberArmorMat);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x09111f,
      emissiveIntensity: 0.18,
      metalness: 0.08,
      roughness: 0.82,
      envMapIntensity: 0.12,
    });
    const coreBar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.13, 1.44), coreMat);
    slotGroup.add(bayBezel, coreBar);
    leftStorageGroup.add(slotGroup);
    vaultSlots.push({ group: slotGroup, coreBar, coreMat, lit: false });
  }

  // Высококонтрастный передний телеметрический дисплей батареи (шкала, %, IDX-S, К-РИСК, поток)
  const storageCanvas = document.createElement('canvas');
  storageCanvas.width = 512;
  storageCanvas.height = 460;
  const storageCtx = storageCanvas.getContext('2d');
  const storageTex = new THREE.CanvasTexture(storageCanvas);
  storageTex.colorSpace = THREE.SRGBColorSpace;
  storageTex.generateMipmaps = true;
  storageTex.minFilter = THREE.LinearMipmapLinearFilter;
  storageTex.magFilter = THREE.LinearFilter;
  storageTex.anisotropy = maxAnisotropy;

  const storageScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 1.00),
    new THREE.MeshBasicMaterial({ map: storageTex, side: THREE.DoubleSide })
  );
  storageScreen.position.set(0, 1.06, 0.80);
  const storageScreenRim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.15, 1.03)),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.88 })
  );
  storageScreenRim.position.copy(storageScreen.position);
  leftStorageGroup.add(storageScreen, storageScreenRim);

  let lastDrawnPct = -1;
  function drawStorageTelemetry(telemetry) {
    const pct = telemetry.chargePct;
    const w = storageCanvas.width;
    const h = storageCanvas.height;
    storageCtx.fillStyle = '#060c1a';
    storageCtx.fillRect(0, 0, w, h);

    storageCtx.strokeStyle = pct >= 80 ? '#f43f5e' : '#38bdf8';
    storageCtx.lineWidth = 7;
    storageCtx.strokeRect(8, 8, w - 16, h - 16);

    storageCtx.fillStyle = '#7dd3fc';
    storageCtx.font = '800 26px "Segoe UI", Arial, sans-serif';
    storageCtx.textAlign = 'left';
    storageCtx.fillText('ШКАЛА АНАЛИЗА И РИСКОВ', 22, 48);

    // Крупные проценты прогресса анализа договора
    storageCtx.fillStyle = pct >= 80 ? '#fda4af' : '#e0f2fe';
    storageCtx.font = '900 84px Arial, sans-serif';
    storageCtx.fillText(`${pct}%`, 22, 136);

    // Сегментированная шкала анализа и плотности рисков справа от процентов
    const bx = 250, by = 72, bw = 232, bh = 58;
    storageCtx.strokeStyle = 'rgba(125, 211, 252, 0.72)';
    storageCtx.lineWidth = 4;
    storageCtx.strokeRect(bx, by, bw, bh);

    const segW = (bw - 24) / 5;
    for (let s = 0; s < 5; s++) {
      const segMin = s * 20;
      const segFill = Math.min(1, Math.max(0, (pct - segMin) / 20));
      const sx = bx + 8 + s * (segW + 2);
      storageCtx.fillStyle = 'rgba(30, 41, 59, 0.75)';
      storageCtx.fillRect(sx, by + 8, segW - 2, bh - 16);
      if (segFill > 0.02) {
        storageCtx.fillStyle = s >= 4 ? '#f43f5e' : (s >= 3 ? '#a855f7' : '#38bdf8');
        storageCtx.fillRect(sx, by + 8, (segW - 2) * segFill, bh - 16);
      }
    }
    storageCtx.fillStyle = '#94a3b8';
    storageCtx.font = '700 13px monospace';
    storageCtx.textAlign = 'left';
    storageCtx.fillText('0%', bx, by + bh + 16);
    storageCtx.textAlign = 'center';
    storageCtx.fillText('50%', bx + bw / 2, by + bh + 16);
    storageCtx.textAlign = 'right';
    storageCtx.fillText('100%', bx + bw, by + bh + 16);

    // Разделитель и сетка индексов/коэффициентов
    storageCtx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
    storageCtx.lineWidth = 3;
    storageCtx.beginPath();
    storageCtx.moveTo(22, 162); storageCtx.lineTo(w - 22, 162);
    storageCtx.stroke();

    const rows = [
      { label: 'IDX-S', val: telemetry.indexCoeff.toFixed(2), color: '#38bdf8' },
      { label: 'К-РИСК', val: telemetry.riskCoeff.toFixed(2), color: pct >= 60 ? '#fb7185' : '#fcd34d' },
      { label: 'ЛИСТЫ', val: `${telemetry.storedCount}/${telemetry.totalCount}`, color: '#f8fafc' },
      { label: 'ПОТОК', val: `${telemetry.flowMbps} MB/s`, color: '#c4b5fd' },
    ];
    rows.forEach((r, idx) => {
      const ry = 212 + idx * 54;
      storageCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      storageCtx.fillRect(22, ry - 36, w - 44, 46);
      storageCtx.fillStyle = '#cbd5e1';
      storageCtx.font = '800 28px "Segoe UI", Arial, sans-serif';
      storageCtx.textAlign = 'left';
      storageCtx.fillText(r.label, 34, ry - 4);
      storageCtx.fillStyle = r.color;
      storageCtx.font = '900 31px monospace';
      storageCtx.textAlign = 'right';
      storageCtx.fillText(r.val, w - 34, ry - 3);
    });

    storageCtx.fillStyle = pct >= 100 ? '#fb7185' : '#7dd3fc';
    storageCtx.font = '800 22px monospace';
    storageCtx.textAlign = 'center';
    storageCtx.fillText(telemetry.statusLabel, w / 2, h - 22);
    storageTex.needsUpdate = true;
    lastDrawnPct = pct;
  }

  function updateStorageDisplay(telemetry) {
    const filledFloat = telemetry.rawFraction * vaultSlots.length;
    for (let i = 0; i < vaultSlots.length; i++) {
      const slot = vaultSlots[i];
      const cellFill = Math.min(1, Math.max(0, filledFloat - i));
      const isActive = cellFill > 0.05;
      slot.lit = cellFill >= 0.99;
      if (isActive) {
        const isHigh = i >= 3;
        slot.coreMat.color.setHex(isHigh ? 0x9f1239 : 0x0284c7);
        slot.coreMat.emissive.setHex(isHigh ? 0xf43f5e : 0x0ea5e9);
        slot.coreMat.emissiveIntensity = 0.25 + cellFill * 0.48;
      } else {
        slot.coreMat.color.setHex(0x0f172a);
        slot.coreMat.emissive.setHex(0x09111f);
        slot.coreMat.emissiveIntensity = 0.18;
      }
    }
    if (Math.abs(telemetry.chargePct - lastDrawnPct) >= 1) {
      drawStorageTelemetry(telemetry);
    }
  }

  function setVaultSlotLit(idx, lit) {
    const slot = vaultSlots[idx];
    if (!slot) return;
    slot.lit = lit;
    if (lit) {
      slot.coreMat.color.setHex(idx >= 3 ? 0x9f1239 : 0x0284c7);
      slot.coreMat.emissive.setHex(idx >= 3 ? 0xf43f5e : 0x0ea5e9);
      slot.coreMat.emissiveIntensity = 0.68;
    } else {
      slot.coreMat.color.setHex(0x0f172a);
      slot.coreMat.emissive.setHex(0x09111f);
      slot.coreMat.emissiveIntensity = 0.18;
    }
  }

  drawStorageTelemetry({
    chargePct: 0,
    rawFraction: 0,
    storedCount: 0,
    totalCount: 5,
    indexCoeff: 0,
    riskCoeff: 0,
    flowMbps: 0,
    statusLabel: 'ОЖИДАНИЕ',
  });
  cubeGroup.add(leftStorageGroup);

  const rightCamProjector = new THREE.Group();
  rightCamProjector.position.set(half - 0.06, 1.24, 0.68);
  const rCamMount = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.24), cyberArmorMat);
  const rCamHousing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), cyberChromeMat);
  rCamHousing.position.set(0.10, 0.02, 0.05);
  rCamHousing.rotation.set(0.22, 0.45, 0.18);
  const rCamBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.072, 0.14, 14), cyberArmorMat);
  rCamBarrel.rotation.z = -Math.PI / 2;
  rCamBarrel.position.set(0.12, 0, 0);
  const rightCamLensMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.35, roughness: 0.25,
  });
  const rightCamLens = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), rightCamLensMat);
  rightCamLens.position.set(0.19, 0, 0);
  rCamHousing.add(rCamBarrel, rightCamLens);
  rightCamProjector.add(rCamMount, rCamHousing);
  cubeGroup.add(rightCamProjector);

  return {
    cubeGroup,
    cyberCoils,
    portalFieldTex,
    portalGlowMat,
    vaultSlots,
    setVaultSlotLit,
    updateStorageDisplay,
    drawStorageTelemetry,
    rightCamLens,
    rightCamLensMat,
    updateRearTunnel: rearTunnel.updateTunnel,
    materials: {
      electrodeGlowMat,
      violetAccentMat,
      cubeReactorArmorMat,
    },
  };
}
