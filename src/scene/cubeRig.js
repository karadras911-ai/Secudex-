import * as THREE from 'three';
import { CUBE_SIZE, CUBE_HALF } from '../config/constants.js';
import { configureCrispTexture, heightCanvasToNormalTex } from '../core/textures.js';
import { prepareGeometry, mergePreparedGeometries } from '../core/geometryMerge.js';
import { createCubeGlassMat } from '../core/shaders.js';
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

  const cyberArmorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.32, metalness: 0.9,
    normalMap: metalNormalTex, normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: metalTex, envMapIntensity: 1.45,
  });
  const cubeReactorArmorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cubeReactorMaps.colorTex,
    normalMap: cubeReactorMaps.normalTex,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: cubeReactorMaps.roughTex,
    roughness: 0.34,
    metalness: 0.9,
    envMapIntensity: 1.55,
    emissive: 0xffffff,
    emissiveMap: cubeReactorMaps.emissiveTex,
    emissiveIntensity: 0.95,
  });
  const cyberChromeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1, roughness: 0.15, metalness: 0.96,
    normalMap: metalNormalTex, normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: metalTex, envMapIntensity: 1.7,
  });
  const violetAccentMat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed, emissive: 0x5b21b6, emissiveIntensity: 0.95, roughness: 0.2, metalness: 0.9,
  });
  const electrodeGlowMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.65, roughness: 0.15, metalness: 0.25,
  });
  const glassMat = createCubeGlassMat();
  const staticLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.46 });

  // Сборник статической геометрии куба для объединения по материалам (снижение Draw Calls)
  const staticRoot = new THREE.Group();
  const matBuckets = new Map([
    [cyberArmorMat, []],
    [cubeReactorArmorMat, []],
    [cyberChromeMat, []],
    [violetAccentMat, []],
    [electrodeGlowMat, []],
    [glassMat, []],
  ]);
  const lineGeosToMerge = [];

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
  const collarGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.03, 8);
  const tipConeGeo = new THREE.ConeGeometry(0.032, 0.16, 8);
  const centerLockGeo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
  const centerChromeGeo = new THREE.BoxGeometry(0.36, 0.16, 0.36);
  const centerPlasmaGeo = new THREE.BoxGeometry(0.37, 0.048, 0.37);

  beamDirs.forEach(d => {
    const beamGroup = new THREE.Group();
    const barMesh = new THREE.Mesh(barGeo, cyberArmorMat);
    barMesh.userData.vColor = 0x260c47;
    beamGroup.add(
      barMesh,
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
    beamGroup.add(
      new THREE.Mesh(centerLockGeo, cyberArmorMat),
      new THREE.Mesh(centerChromeGeo, cyberChromeMat),
      new THREE.Mesh(centerPlasmaGeo, electrodeGlowMat)
    );
    [[-0.14, -0.14], [0.14, 0.14], [-0.14, 0.14], [0.14, -0.14]].forEach(([ox, oz]) => {
      const rail = new THREE.Mesh(railGeo, cyberChromeMat);
      rail.position.set(ox, 0, oz);
      beamGroup.add(rail);
    });
    beamGroup.position.set(...d.p);
    beamGroup.rotation.set(...d.r);
    staticRoot.add(beamGroup);

    [-1.12, 0, 1.12].forEach((along) => {
      const worldPt = new THREE.Vector3(0, along, 0).applyEuler(beamGroup.rotation).add(beamGroup.position);
      const inward = worldPt.clone().negate().normalize();
      const edgeNode = new THREE.Group();
      edgeNode.position.copy(worldPt);
      edgeNode.quaternion.setFromUnitVectors(up, inward);
      const bushing = new THREE.Mesh(bushingGeo, cyberArmorMat);
      bushing.position.y = 0.12;
      const collar = new THREE.Mesh(collarGeo, cyberChromeMat);
      collar.position.y = 0.19;
      const tip = new THREE.Mesh(tipConeGeo, electrodeGlowMat);
      tip.position.y = 0.27;
      edgeNode.add(bushing, collar, tip);
      staticRoot.add(edgeNode);
    });
  });

  const cCoreGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
  const cBar1 = new THREE.BoxGeometry(0.50, 0.18, 0.50);
  const cBar2 = new THREE.BoxGeometry(0.18, 0.50, 0.50);
  const cBar3 = new THREE.BoxGeometry(0.50, 0.50, 0.18);
  const cOctGeo = new THREE.OctahedronGeometry(0.28, 0);
  const pinBaseGeo = new THREE.CylinderGeometry(0.068, 0.095, 0.15, 8);
  const pinRingGeo = new THREE.TorusGeometry(0.065, 0.014, 6, 16);
  const pinGlowGeo = new THREE.SphereGeometry(0.048, 10, 10);

  for (const x of [-half, half]) {
    for (const y of [-half, half]) {
      for (const z of [-half, half]) {
        const node = new THREE.Group();
        node.add(
          new THREE.Mesh(cCoreGeo, cubeReactorArmorMat),
          new THREE.Mesh(cBar1, cyberChromeMat),
          new THREE.Mesh(cBar2, cyberArmorMat),
          new THREE.Mesh(cBar3, cyberArmorMat),
          new THREE.Mesh(cOctGeo, violetAccentMat)
        );
        const inward = new THREE.Vector3(-x, -y, -z).normalize();
        const cornerPin = new THREE.Group();
        cornerPin.quaternion.setFromUnitVectors(up, inward);
        const pinBase = new THREE.Mesh(pinBaseGeo, cyberChromeMat);
        pinBase.position.y = 0.27;
        const pinRing = new THREE.Mesh(pinRingGeo, electrodeGlowMat);
        pinRing.rotation.x = Math.PI / 2;
        pinRing.position.y = 0.34;
        const pinGlow = new THREE.Mesh(pinGlowGeo, electrodeGlowMat);
        pinGlow.position.y = 0.39;
        cornerPin.add(pinBase, pinRing, pinGlow);
        node.add(cornerPin);
        node.position.set(x, y, z);
        staticRoot.add(node);
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
  const strutGeo = new THREE.BoxGeometry(0.68, 0.34, 0.18);
  const finTipGeo = new THREE.BoxGeometry(0.14, 0.24, 0.22);
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const fin = new THREE.Group();
    fin.position.set(Math.cos(ang) * 2.95, -0.26, Math.sin(ang) * 2.95);
    fin.rotation.y = -ang;
    const strut = new THREE.Mesh(strutGeo, cyberChromeMat);
    const finTip = new THREE.Mesh(finTipGeo, violetAccentMat);
    finTip.position.x = 0.28;
    fin.add(strut, finTip);
    pedestalGroup.add(fin);
  }
  staticRoot.add(pedestalGroup);

  const floorPadRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.028, 8, 48), cyberChromeMat);
  floorPadRing.rotation.x = Math.PI / 2;
  floorPadRing.position.y = -half + 0.07;
  const floorPadGlow = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.016, 8, 48), electrodeGlowMat);
  floorPadGlow.rotation.x = Math.PI / 2;
  floorPadGlow.position.y = -half + 0.075;
  staticRoot.add(floorPadRing, floorPadGlow);

  // Полупрозрачные стёкла куба с лёгким Fresnel-шейдером вместо heavy MeshPhysicalMaterial (объединены в 1 draw call)
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
    staticRoot.add(pane);
  });
  staticRoot.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE - 0.14, CUBE_SIZE - 0.14, CUBE_SIZE - 0.14)),
    staticLineMat
  ));

  const backWallStatic = new THREE.Group();
  backWallStatic.position.set(0, 0, -half + 0.05);
  const bwTop = new THREE.Mesh(new THREE.BoxGeometry(CUBE_SIZE - 0.14, 0.52, 0.16), cubeReactorArmorMat);
  bwTop.position.y = (CUBE_SIZE - 0.14) / 2 - 0.26;
  const bwBottom = new THREE.Mesh(new THREE.BoxGeometry(CUBE_SIZE - 0.14, 0.52, 0.16), cubeReactorArmorMat);
  bwBottom.position.y = -(CUBE_SIZE - 0.14) / 2 + 0.26;
  const bwLeft = new THREE.Mesh(new THREE.BoxGeometry(0.52, CUBE_SIZE - 1.18, 0.16), cubeReactorArmorMat);
  bwLeft.position.x = -(CUBE_SIZE - 0.14) / 2 + 0.26;
  const bwRight = new THREE.Mesh(new THREE.BoxGeometry(0.52, CUBE_SIZE - 1.18, 0.16), cubeReactorArmorMat);
  bwRight.position.x = (CUBE_SIZE - 0.14) / 2 - 0.26;
  backWallStatic.add(bwTop, bwBottom, bwLeft, bwRight);

  const bwRibGeo = new THREE.BoxGeometry(0.11, CUBE_SIZE - 0.28, 0.22);
  [-1.68, 1.68].forEach(bx => {
    const rib = new THREE.Mesh(bwRibGeo, cyberChromeMat);
    rib.position.x = bx;
    backWallStatic.add(rib);
  });
  const bwHBeamGeo = new THREE.BoxGeometry(CUBE_SIZE - 0.28, 0.16, 0.22);
  const bwHGlowGeo = new THREE.BoxGeometry(3.2, 0.032, 0.24);
  [-1.82, 1.82].forEach(by => {
    const hBeam = new THREE.Mesh(bwHBeamGeo, cyberArmorMat);
    hBeam.position.y = by;
    const hGlow = new THREE.Mesh(bwHGlowGeo, electrodeGlowMat);
    hGlow.position.y = by;
    backWallStatic.add(hBeam, hGlow);
  });
  const bwRollerGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.24, 10);
  [-1.58, 1.58].forEach(rx => {
    const feedRoller = new THREE.Mesh(bwRollerGeo, electrodeGlowMat);
    feedRoller.position.set(rx, 0, 0.11);
    backWallStatic.add(feedRoller);
  });
  staticRoot.add(backWallStatic);

  const portalGlowMat = new THREE.MeshBasicMaterial({
    map: portalFieldTex, color: 0xbae6fd, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const portalSlot = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 3.12), portalGlowMat);
  portalSlot.position.set(0, 0, -half + 0.13);
  cubeGroup.add(portalSlot);

  const rearTunnel = createRearTunnel(cyberArmorMat, maxAnisotropy);
  rearTunnel.rearTunnelGroup.position.set(0, 0, -half + 0.05);
  cubeGroup.add(rearTunnel.rearTunnelGroup);

  const fPlateGeo = new THREE.BoxGeometry(0.44, 0.44, 0.06);
  const fFlangeGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.08, 6);
  const fInsGeo = new THREE.CylinderGeometry(0.10, 0.12, 0.1, 12);
  const fOuterCapGeo = new THREE.CylinderGeometry(0.055, 0.075, 0.06, 6);
  const fRodGeo = new THREE.CylinderGeometry(0.015, 0.024, 0.22, 8);
  const fTipGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const fCapBlockGeo = new THREE.BoxGeometry(0.48, 0.12, 0.1);
  const fBusGlowGeo = new THREE.BoxGeometry(0.34, 0.03, 0.115);
  const fPinGeo = new THREE.ConeGeometry(0.026, 0.16, 8);
  const fPodGeo = new THREE.BoxGeometry(0.24, 1.45, 0.14);
  const fPodTrimGeo = new THREE.BoxGeometry(0.06, 1.25, 0.165);
  const fPodPipeGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.68, 8);

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
  const traceGeo = new THREE.BufferGeometry().setFromPoints(tracePts);

  const emitterConfigs = [];
  [
    { pos: [0, 0, half - 0.02], rot: [0, 0, 0], center: false },
    { pos: [-half + 0.02, 0, 0], rot: [0, -Math.PI / 2, 0], center: true },
    { pos: [half - 0.02, 0, 0], rot: [0, Math.PI / 2, 0], center: true },
    { pos: [0, half - 0.02, 0], rot: [-Math.PI / 2, 0, 0], center: true },
    { pos: [0, -half + 0.02, 0], rot: [Math.PI / 2, 0, 0], center: true },
  ].forEach(cfg => {
    const fGroup = new THREE.Group();
    fGroup.position.set(...cfg.pos);
    fGroup.rotation.set(...cfg.rot);

    const cOff = 1.56;
    [[-cOff, cOff], [cOff, cOff], [-cOff, -cOff], [cOff, -cOff]].forEach(([ex, ey]) => {
      const mod = new THREE.Group();
      mod.position.set(ex, ey, 0);
      const flange = new THREE.Mesh(fFlangeGeo, cyberChromeMat);
      flange.rotation.x = Math.PI / 2;
      const insulator = new THREE.Mesh(fInsGeo, cyberArmorMat);
      insulator.rotation.x = Math.PI / 2;
      insulator.position.z = -0.05;
      const outerCap = new THREE.Mesh(fOuterCapGeo, electrodeGlowMat);
      outerCap.rotation.x = Math.PI / 2;
      outerCap.position.z = 0.06;
      [-0.045, 0.045].forEach(px => {
        const rod = new THREE.Mesh(fRodGeo, cyberChromeMat);
        rod.rotation.x = Math.PI / 2;
        rod.position.set(px, 0, -0.15);
        const tip = new THREE.Mesh(fTipGeo, electrodeGlowMat);
        tip.position.set(px, 0, -0.27);
        mod.add(rod, tip);
      });
      mod.add(new THREE.Mesh(fPlateGeo, cubeReactorArmorMat), flange, insulator, outerCap);
      fGroup.add(mod);
    });

    fGroup.add(new THREE.LineSegments(traceGeo, staticLineMat));

    [-0.74, 0.74].forEach(bx => {
      [-1.78, 1.78].forEach(by => {
        const capBlock = new THREE.Mesh(fCapBlockGeo, cyberArmorMat);
        capBlock.position.set(bx, by, 0);
        const busGlow = new THREE.Mesh(fBusGlowGeo, electrodeGlowMat);
        busGlow.position.set(bx, by, 0);
        const pin = new THREE.Mesh(fPinGeo, electrodeGlowMat);
        pin.rotation.x = -Math.PI / 2;
        pin.position.set(bx, by, -0.1);
        fGroup.add(capBlock, busGlow, pin);
      });
    });

    if (cfg.center) {
      [-1.42, 1.42].forEach(mx => {
        const pod = new THREE.Mesh(fPodGeo, cubeReactorArmorMat);
        pod.position.set(mx, 0, 0);
        const podTrim = new THREE.Mesh(fPodTrimGeo, violetAccentMat);
        podTrim.position.set(mx, 0, 0);
        const podPipe = new THREE.Mesh(fPodPipeGeo, cyberChromeMat);
        podPipe.position.set(mx > 0 ? mx - 0.15 : mx + 0.15, 0, 0.02);
        fGroup.add(pod, podTrim, podPipe);
      });
      emitterConfigs.push({ pos: cfg.pos, rot: cfg.rot });
    }
    staticRoot.add(fGroup);
  });

  // 4 вращающихся эмиттера граней через 3 InstancedMesh (3 draw calls вместо 44)
  const emitterOuterChromeGeo = new THREE.TorusGeometry(0.62, 0.052, 10, 32);
  const hexBaseGeo = new THREE.CylinderGeometry(0.22, 0.27, 0.12, 6);
  hexBaseGeo.rotateX(Math.PI / 2);
  const emitterArmorParts = [
    prepareGeometry(new THREE.TorusGeometry(0.49, 0.04, 8, 24), null, 0x150929),
    prepareGeometry(hexBaseGeo, null, 0x1e1138),
  ];
  hexBaseGeo.dispose();
  const clampSrc = new THREE.BoxGeometry(0.13, 0.25, 0.12);
  const _emMat = new THREE.Matrix4();
  const _emQuat = new THREE.Quaternion();
  const _emEuler = new THREE.Euler();
  const _emPos = new THREE.Vector3();
  const _emScale = new THREE.Vector3(1, 1, 1);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    _emPos.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
    _emEuler.set(0, 0, a + Math.PI / 2);
    _emQuat.setFromEuler(_emEuler);
    _emMat.compose(_emPos, _emQuat, _emScale);
    emitterArmorParts.push(prepareGeometry(clampSrc, _emMat, 0x150929));
  }
  clampSrc.dispose();
  const emitterOuterArmorGeo = mergePreparedGeometries(emitterArmorParts);

  const coilRingGeo = new THREE.TorusGeometry(0.37, 0.024, 8, 24);
  const centerNeedleGeo = new THREE.ConeGeometry(0.058, 0.34, 8);
  centerNeedleGeo.rotateX(-Math.PI / 2);
  centerNeedleGeo.translate(0, 0, -0.21);
  const emitterInnerGlowGeo = mergePreparedGeometries([
    prepareGeometry(coilRingGeo),
    prepareGeometry(centerNeedleGeo),
  ]);
  coilRingGeo.dispose();
  centerNeedleGeo.dispose();

  const emitterCount = emitterConfigs.length;
  const emitterOuterChromeInst = new THREE.InstancedMesh(emitterOuterChromeGeo, cyberChromeMat, emitterCount);
  const emitterOuterArmorInst = new THREE.InstancedMesh(emitterOuterArmorGeo, cyberArmorMat, emitterCount);
  const emitterInnerGlowInst = new THREE.InstancedMesh(emitterInnerGlowGeo, electrodeGlowMat, emitterCount);
  cubeGroup.add(emitterOuterChromeInst, emitterOuterArmorInst, emitterInnerGlowInst);

  const emitterQuats = emitterConfigs.map(cfg => new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.rot)));
  const emitterOffsets = emitterConfigs.map(cfg => new THREE.Vector3(...cfg.pos));
  const emitterSpinOuter = new Float32Array(emitterCount);
  const emitterSpinInner = new Float32Array(emitterCount);
  const _spinQuat = new THREE.Quaternion();
  const _finalQuat = new THREE.Quaternion();
  const _zAxis = new THREE.Vector3(0, 0, 1);

  function updateEmitters(dt) {
    for (let i = 0; i < emitterCount; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      emitterSpinOuter[i] += dt * 0.52 * dir;
      emitterSpinInner[i] -= dt * 0.63 * dir;

      _spinQuat.setFromAxisAngle(_zAxis, emitterSpinOuter[i]);
      _finalQuat.copy(emitterQuats[i]).multiply(_spinQuat);
      _emMat.compose(emitterOffsets[i], _finalQuat, _emScale);
      emitterOuterChromeInst.setMatrixAt(i, _emMat);
      emitterOuterArmorInst.setMatrixAt(i, _emMat);

      _spinQuat.setFromAxisAngle(_zAxis, emitterSpinInner[i]);
      _finalQuat.copy(emitterQuats[i]).multiply(_spinQuat);
      _emMat.compose(emitterOffsets[i], _finalQuat, _emScale);
      emitterInnerGlowInst.setMatrixAt(i, _emMat);
    }
    emitterOuterChromeInst.instanceMatrix.needsUpdate = true;
    emitterOuterArmorInst.instanceMatrix.needsUpdate = true;
    emitterInnerGlowInst.instanceMatrix.needsUpdate = true;
  }
  updateEmitters(0);

  // -------------------------------------------------------------------------
  // Левый блок шкалы анализа договора и рисков
  // -------------------------------------------------------------------------
  const leftStorageGroup = new THREE.Group();
  leftStorageGroup.position.set(-half - 1.02, -0.1, 0.05);

  const vaultBody = new THREE.Mesh(new THREE.BoxGeometry(1.18, 3.36, 1.54), cubeReactorArmorMat);
  const vaultCapTop = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.18, 1.62), cyberChromeMat);
  vaultCapTop.position.y = 1.72;
  const diagCap = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.10, 0.96), cyberArmorMat);
  diagCap.position.y = 1.84;
  const diagVisor = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.045, 0.98), electrodeGlowMat);
  diagVisor.position.y = 1.87;
  const vaultCapBot = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.18, 1.62), cyberChromeMat);
  vaultCapBot.position.y = -1.72;
  const vaultEdgeFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.22, 3.40, 1.58)),
    staticLineMat
  );
  leftStorageGroup.add(vaultBody, vaultCapTop, diagCap, diagVisor, vaultCapBot, vaultEdgeFrame);

  const cConduitGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.56, 12);
  const cSleeveGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12);
  [-0.85, 0.85].forEach(cy => {
    const conduit = new THREE.Mesh(cConduitGeo, cyberChromeMat);
    conduit.rotation.z = Math.PI / 2;
    conduit.position.set(0.72, cy, 0);
    const sleeve = new THREE.Mesh(cSleeveGeo, electrodeGlowMat);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(0.60, cy, 0);
    leftStorageGroup.add(conduit, sleeve);
  });

  // 5 якорей слотов для точного попадания облака + 1 InstancedMesh светящихся шкал-индикаторов
  const vaultSlots = [];
  const bayBezelGeo = new THREE.BoxGeometry(0.92, 0.25, 1.38);
  const coreBarGeo = new THREE.BoxGeometry(0.72, 0.13, 1.44);
  const vaultCoreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.48,
    metalness: 0.12,
    roughness: 0.72,
    envMapIntensity: 0.15,
  });
  const vaultCoreInst = new THREE.InstancedMesh(coreBarGeo, vaultCoreMat, 5);
  leftStorageGroup.add(vaultCoreInst);

  const _slotAnchorDummy = new THREE.Object3D();
  const _slotColor = new THREE.Color();
  const slotColorsState = new Int32Array(5).fill(-1);

  for (let s = 0; s < 5; s++) {
    const sy = -1.26 + s * 0.36;
    const anchor = new THREE.Object3D();
    anchor.position.set(0.02, sy, 0.04);
    leftStorageGroup.add(anchor);

    const bayBezel = new THREE.Mesh(bayBezelGeo, cyberArmorMat);
    bayBezel.position.set(0.02, sy, 0.04);
    staticRoot.add((() => {
      // Помещаем bezel в локальные координаты leftStorageGroup через временный узел-обёртку
      return bayBezel;
    })());
    // Чтобы позиция точно совпадала с leftStorageGroup:
    bayBezel.position.set(leftStorageGroup.position.x + 0.02, leftStorageGroup.position.y + sy, leftStorageGroup.position.z + 0.04);

    _slotAnchorDummy.position.set(0.02, sy, 0.04);
    _slotAnchorDummy.updateMatrix();
    vaultCoreInst.setMatrixAt(s, _slotAnchorDummy.matrix);
    _slotColor.setHex(0x0c1528);
    vaultCoreInst.setColorAt(s, _slotColor);
    vaultSlots.push({ group: anchor, lit: false });
  }
  vaultCoreInst.instanceMatrix.needsUpdate = true;
  if (vaultCoreInst.instanceColor) vaultCoreInst.instanceColor.needsUpdate = true;

  // Высококонтрастный передний телеметрический дисплей шкалы анализа и рисков
  const storageCanvas = document.createElement('canvas');
  storageCanvas.width = 512;
  storageCanvas.height = 460;
  const storageCtx = storageCanvas.getContext('2d');
  const storageTex = new THREE.CanvasTexture(storageCanvas);
  configureCrispTexture(storageTex, maxAnisotropy, true);

  const storageScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 1.00),
    new THREE.MeshBasicMaterial({ map: storageTex, side: THREE.DoubleSide })
  );
  storageScreen.position.set(0, 1.06, 0.80);
  const storageScreenRim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.15, 1.03)),
    staticLineMat
  );
  storageScreenRim.position.copy(storageScreen.position);
  leftStorageGroup.add(storageScreen);

  // Продублируем статические элементы leftStorageGroup (кроме живых storageScreen и vaultCoreInst)
  const leftStorageStaticMirror = new THREE.Group();
  leftStorageStaticMirror.position.copy(leftStorageGroup.position);
  [vaultBody, vaultCapTop, diagCap, diagVisor, vaultCapBot, vaultEdgeFrame].forEach(el => {
    leftStorageGroup.remove(el);
    leftStorageStaticMirror.add(el);
  });
  leftStorageGroup.children.slice().forEach(ch => {
    if (ch !== storageScreen && ch !== vaultCoreInst && ch.isMesh) {
      leftStorageGroup.remove(ch);
      leftStorageStaticMirror.add(ch);
    }
  });
  leftStorageStaticMirror.add(storageScreenRim);
  staticRoot.add(leftStorageStaticMirror);
  cubeGroup.add(leftStorageGroup);

  // Правая проекционная камера
  const rightCamProjector = new THREE.Group();
  rightCamProjector.position.set(half - 0.06, 1.24, 0.68);
  const rCamMount = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.24), cyberArmorMat);
  const rCamHousing = new THREE.Group();
  rCamHousing.position.set(0.10, 0.02, 0.05);
  rCamHousing.rotation.set(0.22, 0.45, 0.18);
  const rCamBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), cyberChromeMat);
  const rCamBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.072, 0.14, 14), cyberArmorMat);
  rCamBarrel.rotation.z = -Math.PI / 2;
  rCamBarrel.position.set(0.12, 0, 0);
  rCamHousing.add(rCamBox, rCamBarrel);
  rightCamProjector.add(rCamMount, rCamHousing);
  staticRoot.add(rightCamProjector);

  const rightCamLensMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.35, roughness: 0.25,
  });
  const rightCamLens = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), rightCamLensMat);
  rightCamLens.position.set(0.19, 0, 0);
  const rightCamLensMount = new THREE.Group();
  rightCamLensMount.position.copy(rightCamProjector.position);
  const rightCamLensHousing = new THREE.Group();
  rightCamLensHousing.position.copy(rCamHousing.position);
  rightCamLensHousing.rotation.copy(rCamHousing.rotation);
  rightCamLensHousing.add(rightCamLens);
  rightCamLensMount.add(rightCamLensHousing);
  cubeGroup.add(rightCamLensMount);

  // Финальное объединение всей статической геометрии куба по материалам (6 draw calls вместо ~600!)
  staticRoot.updateMatrixWorld(true);
  staticRoot.traverse(obj => {
    if (obj.isMesh && matBuckets.has(obj.material)) {
      const vColor = obj.material === cyberArmorMat ? (obj.userData.vColor ?? 0x150929) : null;
      matBuckets.get(obj.material).push(prepareGeometry(obj.geometry, obj.matrixWorld, vColor));
    } else if (obj.isLineSegments) {
      const lg = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      lg.applyMatrix4(obj.matrixWorld);
      for (const key of Object.keys(lg.attributes)) {
        if (key !== 'position') lg.deleteAttribute(key);
      }
      lineGeosToMerge.push(lg);
    }
  });

  matBuckets.forEach((geos, mat) => {
    const merged = mergePreparedGeometries(geos);
    if (merged) {
      cubeGroup.add(new THREE.Mesh(merged, mat));
    }
  });
  if (lineGeosToMerge.length > 0) {
    const mergedLines = mergePreparedGeometries(lineGeosToMerge);
    if (mergedLines) {
      cubeGroup.add(new THREE.LineSegments(mergedLines, staticLineMat));
    }
  }

  let lastDrawnKey = '';
  function drawStorageTelemetry(telemetry) {
    const key = `${telemetry.chargePct}|${telemetry.storedCount}|${telemetry.statusLabel}|${telemetry.flowMbps}`;
    if (key === lastDrawnKey) return;
    lastDrawnKey = key;

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

    storageCtx.fillStyle = pct >= 80 ? '#fda4af' : '#e0f2fe';
    storageCtx.font = '900 84px Arial, sans-serif';
    storageCtx.fillText(`${pct}%`, 22, 136);

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
  }

  function updateStorageDisplay(telemetry) {
    const filledFloat = telemetry.rawFraction * vaultSlots.length;
    let colorDirty = false;
    for (let i = 0; i < vaultSlots.length; i++) {
      const slot = vaultSlots[i];
      const cellFill = Math.min(1, Math.max(0, filledFloat - i));
      const isActive = cellFill > 0.05;
      slot.lit = cellFill >= 0.99;
      const targetHex = isActive ? (i >= 3 ? 0xf43f5e : 0x0ea5e9) : 0x0c1528;
      if (slotColorsState[i] !== targetHex) {
        slotColorsState[i] = targetHex;
        _slotColor.setHex(targetHex);
        vaultCoreInst.setColorAt(i, _slotColor);
        colorDirty = true;
      }
    }
    if (colorDirty && vaultCoreInst.instanceColor) {
      vaultCoreInst.instanceColor.needsUpdate = true;
    }
    drawStorageTelemetry(telemetry);
  }

  function setVaultSlotLit(idx, lit) {
    const slot = vaultSlots[idx];
    if (!slot) return;
    slot.lit = lit;
    const targetHex = lit ? (idx >= 3 ? 0xf43f5e : 0x0ea5e9) : 0x0c1528;
    if (slotColorsState[idx] !== targetHex) {
      slotColorsState[idx] = targetHex;
      _slotColor.setHex(targetHex);
      vaultCoreInst.setColorAt(idx, _slotColor);
      if (vaultCoreInst.instanceColor) vaultCoreInst.instanceColor.needsUpdate = true;
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

  return {
    cubeGroup,
    updateEmitters,
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
