import * as THREE from 'three';
import { AGENT_SPECS, CUBE_HALF, FLAGSHIP_POS, FLAGSHIP_RADIUS } from '../config/constants.js';
import { configureCrispTexture, heightCanvasToNormalTex } from '../core/textures.js';
import { computeDataStreamPoint } from '../stages/timelineMath.js';

function createTechArmorMaps(accentHex, maxAnisotropy) {
  const size = 512;
  const colC = document.createElement('canvas'); colC.width = colC.height = size;
  const colCtx = colC.getContext('2d');
  const bumpC = document.createElement('canvas'); bumpC.width = bumpC.height = size;
  const bumpCtx = bumpC.getContext('2d');
  const roughC = document.createElement('canvas'); roughC.width = roughC.height = size;
  const roughCtx = roughC.getContext('2d');
  const emC = document.createElement('canvas'); emC.width = emC.height = size;
  const emCtx = emC.getContext('2d');

  colCtx.fillStyle = '#0e1524'; colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#787878'; bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#7a7a7a'; roughCtx.fillRect(0, 0, size, size);
  emCtx.fillStyle = '#000000'; emCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * size, y = Math.random() * size, w = 14 + Math.random() * 54;
    const v = 16 + Math.floor(Math.random() * 20);
    colCtx.fillStyle = `rgba(${v + 4}, ${v + 12}, ${v + 28}, 0.35)`;
    colCtx.fillRect(x, y, w, 1);
    const rv = 70 + Math.floor(Math.random() * 65);
    roughCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    roughCtx.fillRect(x, y, w, 1);
  }

  const cols = 4, rows = 4, cellW = size / cols, cellH = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * cellW, py = r * cellH, pad = 5;
      const shade = ((r + c) % 3 === 0) ? '#172236' : (((r * 3 + c) % 2 === 0) ? '#111a2b' : '#1b273d');
      colCtx.strokeStyle = 'rgba(2, 4, 10, 0.88)'; colCtx.lineWidth = 6; colCtx.strokeRect(px, py, cellW, cellH);
      colCtx.fillStyle = shade; colCtx.fillRect(px + pad, py + pad, cellW - pad * 2, cellH - pad * 2);
      colCtx.strokeStyle = 'rgba(148, 163, 184, 0.28)'; colCtx.lineWidth = 1.5;
      colCtx.strokeRect(px + pad + 1, py + pad + 1, cellW - pad * 2 - 2, cellH - pad * 2 - 2);

      bumpCtx.strokeStyle = '#141414'; bumpCtx.lineWidth = 6; bumpCtx.strokeRect(px, py, cellW, cellH);
      bumpCtx.fillStyle = ((r + c) % 2 === 0) ? '#c0c0c0' : '#a2a2a2';
      bumpCtx.fillRect(px + pad + 2, py + pad + 2, cellW - pad * 2 - 4, cellH - pad * 2 - 4);
      roughCtx.fillStyle = ((r + c) % 2 === 0) ? '#444444' : '#8a8a8a';
      roughCtx.fillRect(px + pad + 2, py + pad + 2, cellW - pad * 2 - 4, cellH - pad * 2 - 4);

      const bOff = 11;
      [[px + bOff, py + bOff], [px + cellW - bOff, py + bOff], [px + bOff, py + cellH - bOff], [px + cellW - bOff, py + cellH - bOff]].forEach(([bx, by]) => {
        colCtx.fillStyle = '#090d16'; colCtx.beginPath(); colCtx.arc(bx, by, 3.1, 0, Math.PI * 2); colCtx.fill();
        colCtx.fillStyle = '#475569'; colCtx.beginPath(); colCtx.arc(bx, by, 2.0, 0, Math.PI * 2); colCtx.fill();
        bumpCtx.fillStyle = '#222222'; bumpCtx.beginPath(); bumpCtx.arc(bx, by, 3.0, 0, Math.PI * 2); bumpCtx.fill();
        bumpCtx.fillStyle = '#d4d4d4'; bumpCtx.beginPath(); bumpCtx.arc(bx, by, 1.5, 0, Math.PI * 2); bumpCtx.fill();
      });

      if ((r + c) % 2 === 0) {
        for (let lv = 0; lv < 4; lv++) {
          const ly = py + 22 + lv * 7;
          colCtx.fillStyle = '#050811'; colCtx.fillRect(px + 18, ly, cellW - 44, 3);
          bumpCtx.fillStyle = '#1e1e1e'; bumpCtx.fillRect(px + 18, ly, cellW - 44, 3);
        }
        emCtx.strokeStyle = accentHex; emCtx.lineWidth = 2.2;
        emCtx.beginPath();
        emCtx.moveTo(px + 18, py + cellH - 28);
        emCtx.lineTo(px + cellW * 0.55, py + cellH - 28);
        emCtx.lineTo(px + cellW * 0.68, py + cellH - 18);
        emCtx.lineTo(px + cellW - 18, py + cellH - 18);
        emCtx.stroke();
        emCtx.fillStyle = accentHex; emCtx.fillRect(px + cellW - 26, py + 14, 10, 3.5);
      } else {
        colCtx.fillStyle = 'rgba(100, 116, 139, 0.35)'; colCtx.font = 'bold 10px monospace';
        colCtx.fillText(`SDX-${r}${c}9`, px + 18, py + 28);
        emCtx.fillStyle = accentHex;
        emCtx.fillRect(px + 18, py + cellH - 20, 18, 3);
        emCtx.fillRect(px + 40, py + cellH - 20, 6, 3);
      }
    }
  }

  const colorTex = new THREE.CanvasTexture(colC);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  configureCrispTexture(colorTex, maxAnisotropy, true);

  const normalTex = heightCanvasToNormalTex(bumpC, 3.1, 1, 1, maxAnisotropy);
  const roughTex = new THREE.CanvasTexture(roughC);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  configureCrispTexture(roughTex, maxAnisotropy, false);

  const emissiveTex = new THREE.CanvasTexture(emC);
  emissiveTex.wrapS = emissiveTex.wrapT = THREE.RepeatWrapping;
  configureCrispTexture(emissiveTex, maxAnisotropy, true);

  return { colorTex, normalTex, roughTex, emissiveTex };
}

function createBeveledTechPlateGeometry(w, h, depth) {
  const shape = new THREE.Shape();
  const hw = w * 0.5, hh = h * 0.5, ch = Math.min(w, h) * 0.18;
  shape.moveTo(-hw + ch, -hh);
  shape.lineTo(hw - ch, -hh);
  shape.lineTo(hw, -hh + ch);
  shape.lineTo(hw, hh - ch);
  shape.lineTo(hw - ch, hh);
  shape.lineTo(-hw + ch, hh);
  shape.lineTo(-hw, hh - ch);
  shape.lineTo(-hw, -hh + ch);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: depth * 0.35,
    bevelSize: Math.min(w, h) * 0.04, bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createCodeLayerCanvas(accentHex, maxAnisotropy) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(4, 7, 16, 0.18)';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.font = 'bold 11px monospace';
  const tokens = [
    '0xA4F9::CLAUSE_VERIFY', 'RISK_EVAL => 0.841', 'AST_LEGAL_NODE[2.1]',
    'SHA3:99F1_QUANTUM', 'TRAP_GUARD_ACTIVE', 'WEIGHT_SIGMA:0.924',
    'MEM_BANK[4096x64]', 'AGENT_SYNC_STREAM()', 'SECUDEX_PROTOCOL_V9',
  ];
  for (let row = 0; row < 28; row++) {
    ctx.fillStyle = row % 4 === 0 ? accentHex : 'rgba(148, 163, 184, 0.62)';
    const line = `${tokens[row % tokens.length]}  // ${Math.random().toString(16).slice(2, 10).toUpperCase()}  [${(row * 17) % 99}]`;
    ctx.fillText(line, (row * 43) % 240, 14 + row * 18);
    ctx.fillText(line, ((row * 43) % 240) + 512, 14 + row * 18);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return configureCrispTexture(tex, maxAnisotropy, true);
}

function createTechnosphere(scene, dataPointSpriteTex, maxAnisotropy, { radius, position, accentColor, secondaryColor, label, isFlagship = false }) {
  const group = new THREE.Group();
  group.position.copy(position);
  scene.add(group);

  const accentHexStr = '#' + new THREE.Color(accentColor).getHexString();
  const armorMaps = createTechArmorMaps(accentHexStr, maxAnisotropy);

  const coreGroup = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, emissive: accentColor, emissiveIntensity: 1.9,
    roughness: 0.14, metalness: 0.88, flatShading: true,
  });
  const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.175, 1), coreMat);
  const coreCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius * 0.22, 0),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.94, roughness: 0.22, wireframe: true })
  );
  const coreAura = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.28, 18, 14),
    new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  coreGroup.add(coreMesh, coreCage);
  group.add(coreGroup, coreAura);

  const procGroup = new THREE.Group();
  const gimbalBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b, metalness: 0.93, roughness: 0.22, normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(0.85, 0.85), clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 1.5,
  });
  const gimbalClampMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.95, roughness: 0.18 });
  const gimbalTrackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, emissive: secondaryColor, emissiveIntensity: 1.25, metalness: 0.6, roughness: 0.2,
  });

  const rings = [];
  const clampGeo = new THREE.BoxGeometry(radius * 0.042, radius * 0.056, radius * 0.056);
  [0.35, 0.46, 0.57].forEach((rf, idx) => {
    const rGroup = new THREE.Group();
    const rRad = radius * rf;
    rGroup.add(
      new THREE.Mesh(new THREE.TorusGeometry(rRad, radius * 0.015, 10, 48), gimbalBodyMat),
      new THREE.Mesh(new THREE.TorusGeometry(rRad * 1.006, radius * 0.005, 6, 48), gimbalTrackMat)
    );
    const clampCount = isFlagship ? 10 : 6;
    for (let c = 0; c < clampCount; c++) {
      const a = (c / clampCount) * Math.PI * 2;
      const clamp = new THREE.Mesh(clampGeo, gimbalClampMat);
      clamp.position.set(Math.cos(a) * rRad, Math.sin(a) * rRad, 0);
      clamp.rotation.z = a;
      rGroup.add(clamp);
    }
    rGroup.rotation.set(idx * 0.92, idx * 0.65, idx * 0.42);
    procGroup.add(rGroup);
    rings.push(rGroup);
  });
  group.add(procGroup);

  const dataCount = isFlagship ? 340 : 140;
  const dPos = new Float32Array(dataCount * 3);
  const baseThetas = new Float32Array(dataCount);
  const basePhis = new Float32Array(dataCount);
  const baseScales = new Float32Array(dataCount);
  const latBands = isFlagship ? 10 : 6;
  const streamPt = { x: 0, y: 0, z: 0 };
  let dataStreamPhase = 0;

  for (let i = 0; i < dataCount; i++) {
    const band = i % latBands;
    const theta = 0.35 + (band / (latBands - 1)) * (Math.PI - 0.7);
    const phi = (i / dataCount) * Math.PI * 18 + band * 0.7;
    const scale = 0.61 + (i % 3) * 0.045;
    baseThetas[i] = theta;
    basePhis[i] = phi;
    baseScales[i] = scale;
    computeDataStreamPoint(radius, theta, phi, scale, 0, i, streamPt);
    dPos[i * 3] = streamPt.x;
    dPos[i * 3 + 1] = streamPt.y;
    dPos[i * 3 + 2] = streamPt.z;
  }
  const dataGeo = new THREE.BufferGeometry();
  const dataPosAttr = new THREE.BufferAttribute(dPos, 3);
  dataPosAttr.setUsage(THREE.DynamicDrawUsage);
  dataGeo.setAttribute('position', dataPosAttr);
  const dataMat = new THREE.PointsMaterial({
    color: accentColor, map: dataPointSpriteTex, size: isFlagship ? 0.085 : 0.042,
    transparent: true, opacity: 0.92, alphaTest: 0.01, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const dataPoints = new THREE.Points(dataGeo, dataMat);
  dataPoints.frustumCulled = false;
  group.add(dataPoints);

  function updateDataPoints(dt, intensity = 1.0) {
    dataStreamPhase += dt * intensity;
    const arr = dataPosAttr.array;
    for (let i = 0; i < dataCount; i++) {
      computeDataStreamPoint(radius, baseThetas[i], basePhis[i], baseScales[i], dataStreamPhase, i, streamPt);
      const base = i * 3;
      arr[base] = streamPt.x;
      arr[base + 1] = streamPt.y;
      arr[base + 2] = streamPt.z;
    }
    dataPosAttr.needsUpdate = true;
  }

  const codeTex = createCodeLayerCanvas(accentHexStr, maxAnisotropy);
  const codeSphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.76, 32, 22),
    new THREE.MeshBasicMaterial({
      map: codeTex, transparent: true, opacity: 0.56, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  group.add(codeSphere);

  const armorGroup = new THREE.Group();
  const hullCowlMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: armorMaps.colorTex, normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(isFlagship ? 1.45 : 1.15, isFlagship ? 1.45 : 1.15),
    roughnessMap: armorMaps.roughTex, roughness: 0.38, metalness: 0.89,
    clearcoat: 0.42, clearcoatRoughness: 0.22, iridescence: 0.22, iridescenceIOR: 1.45,
    specularIntensity: 1.0, envMapIntensity: 1.58, emissive: 0xffffff, emissiveMap: armorMaps.emissiveTex,
    emissiveIntensity: 0.88, side: THREE.DoubleSide,
  });
  const plateMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe, map: armorMaps.colorTex, normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(isFlagship ? 1.55 : 1.2, isFlagship ? 1.55 : 1.2),
    roughnessMap: armorMaps.roughTex, roughness: 0.30, metalness: 0.92,
    clearcoat: 0.56, clearcoatRoughness: 0.16, iridescence: 0.18, iridescenceIOR: 1.4,
    specularIntensity: 1.0, envMapIntensity: 1.65, emissive: 0xffffff, emissiveMap: armorMaps.emissiveTex,
    emissiveIntensity: 0.95,
  });
  const digitalModuleMat = new THREE.MeshStandardMaterial({
    color: 0x0b1322, map: armorMaps.colorTex, emissive: accentColor,
    emissiveMap: armorMaps.emissiveTex, emissiveIntensity: 1.25, metalness: 0.82, roughness: 0.22,
  });

  const cowlScale = isFlagship ? 0.945 : 0.93;
  armorGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(radius * cowlScale, 36, 14, 0, Math.PI * 2, isFlagship ? 0.15 : 0.18, isFlagship ? 0.74 : 0.56),
    hullCowlMat
  ));
  armorGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(radius * cowlScale, 36, 14, 0, Math.PI * 2, isFlagship ? 2.24 : 2.38, isFlagship ? 0.74 : 0.58),
    hullCowlMat
  ));
  const rearPhiStart = isFlagship ? Math.PI * 0.76 : Math.PI * 0.82;
  const rearPhiLen = isFlagship ? Math.PI * 1.48 : Math.PI * 1.36;
  armorGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(radius * cowlScale, 36, 18, rearPhiStart, rearPhiLen, 0.72, 1.70),
    hullCowlMat
  ));

  const structRingMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b, metalness: 0.95, roughness: 0.19, normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(0.85, 0.85), clearcoat: 0.5, clearcoatRoughness: 0.16, envMapIntensity: 1.55,
  });
  const collarTop = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.79, radius * 0.022, 10, 48), structRingMat);
  collarTop.rotation.x = Math.PI / 2;
  collarTop.position.y = radius * 0.58;
  const collarBot = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.79, radius * 0.022, 10, 48), structRingMat);
  collarBot.rotation.x = Math.PI / 2;
  collarBot.position.y = -radius * 0.58;
  armorGroup.add(collarTop, collarBot);

  if (isFlagship) {
    const emitterCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.16, radius * 0.24, radius * 0.12, 12, 1, true),
      structRingMat
    );
    emitterCrown.position.y = radius * 0.97;
    armorGroup.add(emitterCrown);
    [-0.78, 0.78].forEach(ry => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.97, radius * 0.02, 8, 48), structRingMat);
      arc.rotation.y = ry;
      armorGroup.add(arc);
    });
  }

  const plateCandidates = [];
  const latSteps = isFlagship ? 8 : 5;
  for (let li = 0; li < latSteps; li++) {
    const tNorm = (li + 0.5) / latSteps;
    const theta = 0.22 + tNorm * (Math.PI - 0.44);
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    const lonCount = Math.max(6, Math.round((isFlagship ? 14 : 8) * sinT));
    for (let lj = 0; lj < lonCount; lj++) {
      const phi = (lj / lonCount) * Math.PI * 2 + (li % 2) * (Math.PI / lonCount);
      const nx = sinT * Math.cos(phi), ny = cosT, nz = sinT * Math.sin(phi);
      const inFrontAperture = isFlagship ? (nz > 0.56 && Math.abs(ny) < 0.40) : (nz > 0.44 && Math.abs(ny) < 0.52);
      if (!inFrontAperture) plateCandidates.push({ nx, ny, nz, tier: (li + lj) % 2 });
    }
  }

  const plateW = isFlagship ? radius * 0.34 : radius * 0.42;
  const plateH = isFlagship ? radius * 0.24 : radius * 0.29;
  const plateGeo = createBeveledTechPlateGeometry(plateW, plateH, radius * 0.032);
  const plateInst = new THREE.InstancedMesh(plateGeo, plateMat, plateCandidates.length);
  const modGeo = createBeveledTechPlateGeometry(plateW * 0.58, plateH * 0.38, radius * 0.018);
  const modCount = Math.ceil(plateCandidates.length * 0.65);
  const modInst = new THREE.InstancedMesh(modGeo, digitalModuleMat, modCount);

  const plateLayout = [];
  const modLayout = [];
  const dummy = new THREE.Object3D();
  const cVar = new THREE.Color();
  const paletteTints = [0x94a3b8, 0xb8c7dc, 0x64748b, 0x7c93b3];
  let mIdx = 0;
  plateCandidates.forEach((pt, idx) => {
    const rPlace = radius * (pt.tier === 0 ? 0.975 : 1.005);
    const sc = pt.tier === 0 ? 1.0 : 0.92;
    plateLayout.push({ nx: pt.nx, ny: pt.ny, nz: pt.nz, rBase: rPlace, scale: sc, tier: pt.tier });
    cVar.setHex(paletteTints[idx % paletteTints.length]);
    plateInst.setColorAt(idx, cVar);

    if (mIdx < modCount && (idx % 3 !== 1)) {
      const rMod = rPlace + radius * 0.022;
      modLayout.push({ nx: pt.nx, ny: pt.ny, nz: pt.nz, rBase: rMod, scale: 1.0, tier: pt.tier });
      mIdx++;
    }
  });
  modInst.count = mIdx;
  if (plateInst.instanceColor) plateInst.instanceColor.needsUpdate = true;
  plateInst.frustumCulled = false;
  modInst.frustumCulled = false;

  let lastArmorOpen = -1;
  function setArmorAperture(openAmt = 0) {
    const clamped = Math.min(1, Math.max(0, openAmt));
    if (Math.abs(clamped - lastArmorOpen) < 0.002) return;
    lastArmorOpen = clamped;
    const expand = radius * 0.095 * clamped;
    const tiltAngle = clamped * 0.24;

    for (let i = 0; i < plateLayout.length; i++) {
      const p = plateLayout[i];
      const rNow = p.rBase + expand * (p.tier === 0 ? 0.72 : 1.15);
      dummy.position.set(p.nx * rNow, p.ny * rNow, p.nz * rNow);
      dummy.lookAt(p.nx * rNow * 2, p.ny * rNow * 2, p.nz * rNow * 2);
      dummy.rotateX(tiltAngle * (p.ny >= 0 ? -1 : 1));
      dummy.scale.set(p.scale, p.scale, 1);
      dummy.updateMatrix();
      plateInst.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < modLayout.length; i++) {
      const m = modLayout[i];
      const rNow = m.rBase + expand * (m.tier === 0 ? 0.82 : 1.25);
      dummy.position.set(m.nx * rNow, m.ny * rNow, m.nz * rNow);
      dummy.lookAt(m.nx * rNow * 2, m.ny * rNow * 2, m.nz * rNow * 2);
      dummy.rotateX(tiltAngle * (m.ny >= 0 ? -1 : 1));
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      modInst.setMatrixAt(i, dummy.matrix);
    }
    plateInst.instanceMatrix.needsUpdate = true;
    modInst.instanceMatrix.needsUpdate = true;
  }
  setArmorAperture(0);
  armorGroup.add(plateInst, modInst);
  group.add(armorGroup);

  const projCanvas = document.createElement('canvas');
  projCanvas.width = isFlagship ? 1024 : 512;
  projCanvas.height = isFlagship ? 512 : 256;
  const projCtx = projCanvas.getContext('2d');
  const projTex = new THREE.CanvasTexture(projCanvas);
  projTex.wrapS = THREE.RepeatWrapping;
  configureCrispTexture(projTex, maxAnisotropy, true);

  const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: projTex, emissive: secondaryColor, emissiveMap: projTex,
    emissiveIntensity: 0.9, transparent: true, opacity: 0.56, roughness: 0.08, metalness: 0.25,
    clearcoat: 1.0, clearcoatRoughness: 0.06, ior: 1.76, envMapIntensity: 1.75, depthWrite: false, side: THREE.FrontSide,
  });
  outerMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uMorph = { value: 1.0 };
    shader.uniforms.uFresnelColor = { value: new THREE.Color(secondaryColor) };
    outerMat.userData.shader = shader;
    shader.vertexShader = 'uniform float uTime;\nuniform float uMorph;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float wave = sin(position.x * 5.2 + uTime * 2.4) * cos(position.y * 4.8 - uTime * 1.9) * sin(position.z * 4.5 + uTime * 1.5);
      transformed += normal * (wave * ${(radius * 0.012).toFixed(4)} * uMorph);
      `
    );
    shader.fragmentShader = 'uniform vec3 uFresnelColor;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      float optFresnel = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.8);
      totalEmissiveRadiance += uFresnelColor * (optFresnel * 0.72);
      `
    );
  };
  const outerShell = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.96, isFlagship ? 40 : 24, isFlagship ? 28 : 18),
    outerMat
  );
  outerShell.rotation.y = -Math.PI / 2;
  group.add(outerShell);

  const wireShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius * 1.025, isFlagship ? 3 : 2),
    new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true, transparent: true, opacity: 0.16 })
  );
  group.add(wireShell);

  const dataRingGroup = new THREE.Group();
  dataRingGroup.rotation.set(0.28, 0, -0.14);
  const ringBandCanvas = document.createElement('canvas');
  ringBandCanvas.width = 1024; ringBandCanvas.height = 128;
  const rbCtx = ringBandCanvas.getContext('2d');
  rbCtx.clearRect(0, 0, 1024, 128);
  for (let x = 0; x < 1024; x += 16) {
    const tall = x % 64 === 0 ? 52 : (x % 32 === 0 ? 34 : 18);
    rbCtx.fillStyle = x % 64 === 0 ? '#ffffff' : accentHexStr;
    rbCtx.fillRect(x, 64 - tall * 0.5, 6, tall);
  }
  rbCtx.strokeStyle = accentHexStr; rbCtx.lineWidth = 3;
  rbCtx.beginPath(); rbCtx.moveTo(0, 20); rbCtx.lineTo(1024, 20); rbCtx.moveTo(0, 108); rbCtx.lineTo(1024, 108); rbCtx.stroke();
  rbCtx.fillStyle = '#e0f2fe'; rbCtx.font = 'bold 14px monospace';
  for (let s = 0; s < 4; s++) rbCtx.fillText(`DATA_BUS::0${s + 1} // SYNC_OK`, 28 + s * 256, 15);

  const dataRingTex = new THREE.CanvasTexture(ringBandCanvas);
  dataRingTex.wrapS = THREE.RepeatWrapping;
  dataRingTex.repeat.set(isFlagship ? 3 : 2, 1);
  configureCrispTexture(dataRingTex, maxAnisotropy, true);

  const dataRingR = radius * (isFlagship ? 1.24 : 1.28);
  const dataRingBandMat = new THREE.MeshBasicMaterial({
    map: dataRingTex, color: accentColor, transparent: true,
    opacity: isFlagship ? 0.85 : 0.72, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const dataRingBand = new THREE.Mesh(
    new THREE.CylinderGeometry(dataRingR, dataRingR, radius * (isFlagship ? 0.16 : 0.18), 64, 1, true),
    dataRingBandMat
  );
  const dataRingCoreMat = new THREE.MeshBasicMaterial({
    color: accentColor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const dataRingCore = new THREE.Mesh(new THREE.TorusGeometry(dataRingR, radius * 0.011, 8, 72), dataRingCoreMat);
  dataRingCore.rotation.x = Math.PI / 2;
  dataRingGroup.add(dataRingBand, dataRingCore);
  group.add(dataRingGroup);

  const verdictHoloGroup = new THREE.Group();
  verdictHoloGroup.position.set(0, radius * 1.74, 0.45);
  verdictHoloGroup.visible = false;
  const verdictCanvas = document.createElement('canvas');
  verdictCanvas.width = 1024; verdictCanvas.height = 384;
  const verdictCtx = verdictCanvas.getContext('2d');
  const verdictTex = new THREE.CanvasTexture(verdictCanvas);
  configureCrispTexture(verdictTex, maxAnisotropy, true);

  const verdictHoloPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2.5, radius * 0.92),
    new THREE.MeshBasicMaterial({ map: verdictTex, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  const verdictCone = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.52, radius * 0.14, radius * 0.56, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  verdictCone.position.set(0, -radius * 0.68, -0.35);
  verdictHoloGroup.add(verdictCone, verdictHoloPlane);
  group.add(verdictHoloGroup);

  function updateVerdictHologram(visible, percentText = '84%', elapsed = 0, threatCount = 5) {
    verdictHoloGroup.visible = visible;
    if (!visible) return;
    const w = verdictCanvas.width, h = verdictCanvas.height;
    verdictCtx.clearRect(0, 0, w, h);
    const pulse = 0.72 + Math.sin(elapsed * 8) * 0.28;
    const bgGrad = verdictCtx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, 'rgba(30, 8, 20, 0.72)');
    bgGrad.addColorStop(0.5, 'rgba(48, 8, 24, 0.86)');
    bgGrad.addColorStop(1, 'rgba(20, 6, 16, 0.72)');
    verdictCtx.fillStyle = bgGrad;
    verdictCtx.fillRect(36, 26, w - 72, h - 52);
    verdictCtx.fillStyle = 'rgba(255, 77, 109, 0.08)';
    for (let y = 32; y < h - 32; y += 8) verdictCtx.fillRect(40, y, w - 80, 2);
    const sweepY = 30 + ((elapsed * 180) % (h - 60));
    verdictCtx.fillStyle = `rgba(255, 130, 150, ${(0.28 * pulse).toFixed(2)})`;
    verdictCtx.fillRect(40, sweepY, w - 80, 10);
    verdictCtx.strokeStyle = `rgba(255, 77, 109, ${pulse.toFixed(2)})`;
    verdictCtx.lineWidth = 6;
    const bx0 = 36, bx1 = w - 36, by0 = 26, by1 = h - 26, br = 42;
    verdictCtx.beginPath();
    verdictCtx.moveTo(bx0, by0 + br); verdictCtx.lineTo(bx0, by0); verdictCtx.lineTo(bx0 + br, by0);
    verdictCtx.moveTo(bx1 - br, by0); verdictCtx.lineTo(bx1, by0); verdictCtx.lineTo(bx1, by0 + br);
    verdictCtx.moveTo(bx0, by1 - br); verdictCtx.lineTo(bx0, by1); verdictCtx.lineTo(bx0 + br, by1);
    verdictCtx.moveTo(bx1 - br, by1); verdictCtx.lineTo(bx1, by1); verdictCtx.lineTo(bx1, by1 - br);
    verdictCtx.stroke();

    verdictCtx.textAlign = 'center'; verdictCtx.textBaseline = 'middle';
    verdictCtx.fillStyle = '#fda4af'; verdictCtx.font = 'bold 26px monospace';
    verdictCtx.fillText(`ГОЛОГРАФИЧЕСКИЙ ВЕРДИКТ SECUDEX • УГРОЗ: ${threatCount}/5`, w / 2, 76);
    verdictCtx.fillStyle = '#ff4d6d'; verdictCtx.font = '900 124px Arial, sans-serif';
    verdictCtx.fillText(percentText, w / 2, 198);
    verdictCtx.fillStyle = '#ffffff'; verdictCtx.font = '900 32px Arial, sans-serif';
    verdictCtx.fillText('КРИТИЧЕСКИЙ УРОВЕНЬ ЮРИДИЧЕСКОГО РИСКА', w / 2, 310);
    verdictTex.needsUpdate = true;
    verdictHoloGroup.position.y = radius * (1.74 + Math.sin(elapsed * 3.2) * 0.02);
  }

  function updateProjection(mode, statusText, percentText) {
    const w = projCanvas.width, h = projCanvas.height;
    projCtx.clearRect(0, 0, w, h);
    projCtx.strokeStyle = mode === 'powerdown'
      ? 'rgba(30, 41, 59, 0.25)'
      : (mode === 'verdict' ? 'rgba(255, 59, 92, 0.45)' : 'rgba(56, 189, 248, 0.24)');
    projCtx.lineWidth = 1;
    for (let x = w * 0.25; x <= w * 0.75; x += w / 24) {
      projCtx.beginPath(); projCtx.moveTo(x, h * 0.22); projCtx.lineTo(x, h * 0.78); projCtx.stroke();
    }
    for (let y = h * 0.25; y <= h * 0.75; y += h / 12) {
      projCtx.beginPath(); projCtx.moveTo(w * 0.25, y); projCtx.lineTo(w * 0.75, y); projCtx.stroke();
    }

    if (mode === 'powerdown') {
      dataRingBandMat.opacity = 0.08;
      dataRingCoreMat.opacity = 0.1;
      projTex.needsUpdate = true;
      return;
    }

    if (mode === 'verdict' && isFlagship) {
      dataRingBandMat.color.setHex(0xff3b5c);
      dataRingCoreMat.color.setHex(0xff6b81);
      dataRingBandMat.opacity = 0.95;
      dataRingCoreMat.opacity = 0.95;

      projCtx.fillStyle = 'rgba(28, 4, 14, 0.84)';
      projCtx.fillRect(w * 0.31, h * 0.28, w * 0.38, h * 0.44);
      projCtx.strokeStyle = '#ff3b5c'; projCtx.lineWidth = 4;
      projCtx.strokeRect(w * 0.31, h * 0.28, w * 0.38, h * 0.44);
      projCtx.textAlign = 'center'; projCtx.textBaseline = 'middle';
      projCtx.fillStyle = '#fecdd3'; projCtx.font = '900 22px monospace';
      projCtx.fillText('ВЕРДИКТ ИИ • РИСК', w / 2, h * 0.38);
      projCtx.fillStyle = '#ff4d6d'; projCtx.font = '900 104px Arial, sans-serif';
      projCtx.fillText(percentText || '84%', w / 2, h * 0.56);
    } else {
      dataRingBandMat.color.setHex(accentColor);
      dataRingCoreMat.color.setHex(accentColor);
      dataRingBandMat.opacity = isFlagship ? 0.85 : 0.72;
      dataRingCoreMat.opacity = 0.9;

      const tNow = performance.now() * 0.0022;
      projCtx.strokeStyle = mode === 'scan' ? '#fb7185' : '#38bdf8';
      projCtx.lineWidth = isFlagship ? 2.2 : 1.5;
      projCtx.beginPath();
      for (let x = w * 0.3; x <= w * 0.7; x += 6) {
        const env = Math.sin(((x - w * 0.3) / (w * 0.4)) * Math.PI);
        const y = h * 0.5 + (Math.sin(x * 0.05 + tNow * 2) * (h * 0.11) + Math.cos(x * 0.12 - tNow * 3) * (h * 0.04)) * env;
        if (x === w * 0.3) projCtx.moveTo(x, y); else projCtx.lineTo(x, y);
      }
      projCtx.stroke();

      projCtx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
      projCtx.lineWidth = 2;
      const bx0 = w * 0.33, bx1 = w * 0.67, by0 = h * 0.31, by1 = h * 0.69, br = 16;
      projCtx.beginPath();
      projCtx.moveTo(bx0, by0 + br); projCtx.lineTo(bx0, by0); projCtx.lineTo(bx0 + br, by0);
      projCtx.moveTo(bx1 - br, by0); projCtx.lineTo(bx1, by0); projCtx.lineTo(bx1, by0 + br);
      projCtx.moveTo(bx0, by1 - br); projCtx.lineTo(bx0, by1); projCtx.lineTo(bx0 + br, by1);
      projCtx.moveTo(bx1 - br, by1); projCtx.lineTo(bx1, by1); projCtx.lineTo(bx1, by1 - br);
      projCtx.stroke();

      projCtx.fillStyle = '#e2e8f0'; projCtx.textAlign = 'center';
      projCtx.font = `700 ${isFlagship ? 20 : 14}px monospace`;
      projCtx.fillText(label, w / 2, h * 0.37);
      projCtx.fillStyle = mode === 'scan' ? '#fda4af' : '#7dd3fc';
      projCtx.font = `700 ${isFlagship ? 17 : 12}px monospace`;
      projCtx.fillText(statusText || 'ONLINE // MATRIX', w / 2, h * 0.64);
    }
    projTex.needsUpdate = true;
  }

  updateProjection('idle', 'STANDBY // CORE LOCKED');

  return {
    group, coreMesh, coreCage, coreMat, rings, dataPoints, dataMat, updateDataPoints,
    codeSphere, codeTex, outerShell, outerMat, wireShell, dataRingGroup, dataRingTex,
    dataRingBandMat, dataRingCoreMat, verdictHoloGroup, updateVerdictHologram,
    armorMats: [hullCowlMat, plateMat, digitalModuleMat, gimbalTrackMat],
    setArmorAperture,
    projTex, updateProjection, radius,
  };
}

export function createAiSphereRig(scene, maxAnisotropy, dataPointSpriteTex) {
  const half = CUBE_HALF;

  const chamberDustCount = 140;
  const chamberDustPos = new Float32Array(chamberDustCount * 3);
  const chamberDustPhase = new Float32Array(chamberDustCount);
  for (let i = 0; i < chamberDustCount; i++) {
    chamberDustPos[i * 3] = (Math.random() - 0.5) * 5.2;
    chamberDustPos[i * 3 + 1] = -1.9 + Math.random() * 4.8;
    chamberDustPos[i * 3 + 2] = (Math.random() - 0.5) * 5.2;
    chamberDustPhase[i] = Math.random() * Math.PI * 2;
  }
  const chamberDustGeo = new THREE.BufferGeometry();
  const chamberDustAttr = new THREE.BufferAttribute(chamberDustPos, 3);
  chamberDustAttr.setUsage(THREE.DynamicDrawUsage);
  chamberDustGeo.setAttribute('position', chamberDustAttr);
  const chamberDust = new THREE.Points(chamberDustGeo, new THREE.PointsMaterial({
    color: 0xbae6fd, map: dataPointSpriteTex, size: 0.045, transparent: true, opacity: 0.28,
    alphaTest: 0.01, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  chamberDust.frustumCulled = false;
  scene.add(chamberDust);

  function updateChamberDust(dt, activity = 1.0) {
    const arr = chamberDustAttr.array;
    const speed = (0.14 + activity * 0.1) * dt;
    for (let i = 0; i < chamberDustCount; i++) {
      const b = i * 3;
      const ph = chamberDustPhase[i] + dt * 1.1;
      chamberDustPhase[i] = ph;
      arr[b] += Math.sin(ph + i * 0.13) * 0.06 * dt;
      arr[b + 1] += speed;
      arr[b + 2] += Math.cos(ph * 0.8 + i * 0.19) * 0.06 * dt;
      if (arr[b + 1] > 2.95) arr[b + 1] = -1.95;
    }
    chamberDustAttr.needsUpdate = true;
  }

  const agentSpecs = AGENT_SPECS.map(s => ({ ...s, posVec: new THREE.Vector3(...s.pos) }));
  const agentSpheres = agentSpecs.map(s => createTechnosphere(scene, dataPointSpriteTex, maxAnisotropy, {
    radius: 0.68, position: s.posVec, accentColor: s.accent, secondaryColor: s.secondary, label: s.label,
  }));

  const cableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 });
  [
    [agentSpecs[0].posVec, new THREE.Vector3(-half, -half + 0.1, half)],
    [agentSpecs[1].posVec, new THREE.Vector3(0, -half + 0.1, half)],
    [agentSpecs[2].posVec, new THREE.Vector3(half, -half + 0.1, half)],
  ].forEach(([start, end]) => {
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.y -= 0.24;
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.036, 8, false), cableMat));
  });

  const flagshipPos = new THREE.Vector3(FLAGSHIP_POS.x, FLAGSHIP_POS.y, FLAGSHIP_POS.z);
  const flagshipSphere = createTechnosphere(scene, dataPointSpriteTex, maxAnisotropy, {
    radius: FLAGSHIP_RADIUS, position: flagshipPos, accentColor: 0x38bdf8,
    secondaryColor: 0x7c3aed, label: 'SECUDEX FLAGSHIP AI', isFlagship: true,
  });

  return { agentSpecs, agentSpheres, flagshipPos, flagshipSphere, updateChamberDust };
}

export function updateTechnosphereAnimation(sphere, dt, t, intensity = 1.0) {
  sphere.coreMesh.rotation.y += dt * 1.1 * intensity;
  sphere.coreMesh.rotation.x += dt * 0.7 * intensity;
  if (sphere.coreCage) {
    sphere.coreCage.rotation.y -= dt * 0.65 * intensity;
    sphere.coreCage.rotation.z += dt * 0.45 * intensity;
  }
  sphere.coreMesh.scale.setScalar(0.94 + Math.sin(t * 3.8) * 0.08 * intensity);
  sphere.rings.forEach((ring, idx) => {
    ring.rotation.x += dt * (0.55 + idx * 0.25) * intensity * (idx % 2 === 0 ? 1 : -1);
    ring.rotation.y += dt * (0.7 + idx * 0.2) * intensity;
  });
  sphere.updateDataPoints(dt, intensity);
  sphere.codeSphere.rotation.y += dt * 0.25 * intensity;
  sphere.codeTex.offset.y -= dt * 0.18 * intensity;
  sphere.codeTex.offset.x += dt * 0.06 * intensity;
  sphere.wireShell.rotation.y -= dt * 0.12 * intensity;
  if (sphere.dataRingGroup) {
    sphere.dataRingGroup.rotation.y += dt * 0.42 * intensity;
    sphere.dataRingTex.offset.x -= dt * 0.16 * intensity;
  }
  if (sphere.outerMat.userData.shader) {
    sphere.outerMat.userData.shader.uniforms.uTime.value = t * intensity;
  }
}
