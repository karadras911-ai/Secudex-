import * as THREE from 'three';
import { CONTRACT_PAGES } from '../config/contractData.js';
import { CUBE_HALF } from '../config/constants.js';
import { configureCrispTexture, createScanFanTex } from '../core/textures.js';
import { createTransferPlasmaMat } from '../core/shaders.js';
import { prepareGeometry, mergePreparedGeometries } from '../core/geometryMerge.js';

export function createRiskAbsorptionRig(scene, maxAnisotropy, isMobile, agentSpecs, flagshipPos) {
  const scanFanTex = createScanFanTex();

  // Динамический объёмный веер сканирования: от активной сферы ИИ к строке сканера
  const agentScanBeam = new THREE.Group();
  agentScanBeam.visible = false;

  const scanFanGeo = new THREE.BufferGeometry();
  const fanVerts = new Float32Array(3 * 3);
  const fanUvs = new Float32Array([0.5, 0.0, 0.0, 1.0, 1.0, 1.0]);
  scanFanGeo.setAttribute('position', new THREE.BufferAttribute(fanVerts, 3));
  scanFanGeo.setAttribute('uv', new THREE.BufferAttribute(fanUvs, 2));
  const agentBeamMat = new THREE.MeshBasicMaterial({
    map: scanFanTex, color: 0x38bdf8, transparent: true, opacity: 0.46,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const scanFanMesh = new THREE.Mesh(scanFanGeo, agentBeamMat);
  scanFanMesh.frustumCulled = false;

  const scanRaysGeo = new THREE.BufferGeometry();
  const scanRaysVerts = new Float32Array(5 * 6);
  scanRaysGeo.setAttribute('position', new THREE.BufferAttribute(scanRaysVerts, 3));
  const scanRaysMat = new THREE.LineBasicMaterial({
    color: 0xe0f2fe, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const scanRaysLines = new THREE.LineSegments(scanRaysGeo, scanRaysMat);
  scanRaysLines.frustumCulled = false;

  const calibRaysGeo = new THREE.BufferGeometry();
  const calibRaysVerts = new Float32Array(2 * 6);
  calibRaysGeo.setAttribute('position', new THREE.BufferAttribute(calibRaysVerts, 3));
  const calibRaysMat = new THREE.LineBasicMaterial({
    color: 0xa78bfa, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const calibRaysLines = new THREE.LineSegments(calibRaysGeo, calibRaysMat);
  calibRaysLines.frustumCulled = false;

  const scanApertureMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const scanApertureGlow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), scanApertureMat);

  agentScanBeam.add(scanFanMesh, scanRaysLines, calibRaysLines, scanApertureGlow);
  scene.add(agentScanBeam);

  // Проекция выявленного риска на передней панели куба + поочерёдное поглощение ИИ-сферами
  const riskCubeCanvas = document.createElement('canvas');
  riskCubeCanvas.width = 1024;
  riskCubeCanvas.height = 384;
  const riskCubeCtx = riskCubeCanvas.getContext('2d');
  const riskCubeTex = new THREE.CanvasTexture(riskCubeCanvas);
  configureCrispTexture(riskCubeTex, maxAnisotropy, true);

  const _tmpAccentColor = new THREE.Color();
  let lastRiskKey = '';
  function drawRiskCubeProjection(pageData, accentHex = 0x38bdf8) {
    const rKey = `${pageData.riskCode}|${accentHex}`;
    if (rKey === lastRiskKey) return;
    lastRiskKey = rKey;

    const w = riskCubeCanvas.width;
    const h = riskCubeCanvas.height;
    riskCubeCtx.clearRect(0, 0, w, h);

    riskCubeCtx.fillStyle = 'rgba(18, 6, 22, 0.94)';
    riskCubeCtx.fillRect(14, 14, w - 28, h - 28);

    const grad = riskCubeCtx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(244, 63, 94, 0.26)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.14)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.24)');
    riskCubeCtx.fillStyle = grad;
    riskCubeCtx.fillRect(14, 14, w - 28, h - 28);

    riskCubeCtx.strokeStyle = 'rgba(251, 113, 133, 0.92)';
    riskCubeCtx.lineWidth = 6;
    riskCubeCtx.strokeRect(14, 14, w - 28, h - 28);

    const cHex = '#' + _tmpAccentColor.setHex(accentHex).getHexString();
    riskCubeCtx.fillStyle = cHex;
    riskCubeCtx.font = '800 30px monospace';
    riskCubeCtx.textAlign = 'left';
    riskCubeCtx.fillText(`РИСК ПОСТАВКИ • АГЕНТ-0${pageData.agentIndex + 1}`, 44, 74);

    riskCubeCtx.fillStyle = '#fda4af';
    riskCubeCtx.font = '800 42px "Segoe UI", Arial, sans-serif';
    riskCubeCtx.fillText(`${pageData.riskCode} • [${pageData.severity}]`, 44, 144);

    riskCubeCtx.fillStyle = '#f8fafc';
    riskCubeCtx.font = '800 37px "Segoe UI", Arial, sans-serif';
    const words = pageData.riskText.split(' ');
    let l1 = '';
    let l2 = '';
    for (const wPart of words) {
      if ((l1 + wPart).length <= 32 && !l2) l1 += wPart + ' ';
      else l2 += wPart + ' ';
    }
    riskCubeCtx.fillText(l1.trim(), 44, 224);
    if (l2.trim()) riskCubeCtx.fillText(l2.trim(), 44, 282);

    riskCubeTex.needsUpdate = true;
  }
  drawRiskCubeProjection(CONTRACT_PAGES[0], agentSpecs[0].accent);

  const riskProjGroup = new THREE.Group();
  riskProjGroup.position.set(0, -0.05, CUBE_HALF + 0.16);
  riskProjGroup.visible = false;
  const riskProjMat = new THREE.MeshBasicMaterial({
    map: riskCubeTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false,
  });
  const riskProjPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 1.0), riskProjMat);
  const riskProjBorderMat = { color: new THREE.Color(0xff3b5c), opacity: 0 };
  riskProjGroup.add(riskProjPlane);
  scene.add(riskProjGroup);

  const absorbRayVerts = new Float32Array(6 * 6);
  const absorbRayGeo = new THREE.BufferGeometry();
  absorbRayGeo.setAttribute('position', new THREE.BufferAttribute(absorbRayVerts, 3));
  const absorbRayMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const absorbRays = new THREE.LineSegments(absorbRayGeo, absorbRayMat);
  absorbRays.frustumCulled = false;

  const absorbOrbCount = 28;
  const absorbOrbGeo = new THREE.SphereGeometry(0.068, 8, 8);
  const absorbOrbMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const absorbOrbsInst = new THREE.InstancedMesh(absorbOrbGeo, absorbOrbMat, absorbOrbCount);
  absorbOrbsInst.frustumCulled = false;
  absorbOrbsInst.visible = false;
  const _orbColor = new THREE.Color();
  for (let k = 0; k < absorbOrbCount; k++) {
    _orbColor.setHex(k % 2 === 0 ? 0xff4d6d : 0x7dd3fc);
    absorbOrbsInst.setColorAt(k, _orbColor);
  }
  if (absorbOrbsInst.instanceColor) absorbOrbsInst.instanceColor.needsUpdate = true;
  scene.add(absorbOrbsInst);

  const absorbRingMat = new THREE.MeshBasicMaterial({
    color: 0xff4d6d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const absorbRing = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.52, 40), absorbRingMat);
  absorbRing.visible = false;
  scene.add(absorbRays, absorbRing);

  // Потоки передачи от 3 агентов вверх к Флагману объединены в 1 GPU-меш плазмы (1 draw call вместо 3)
  const transferCurves = [];
  const streamTubeGeos = [];
  const _streamCol = new THREE.Color();
  agentSpecs.forEach((spec, idx) => {
    const start = spec.posVec.clone();
    const end = flagshipPos.clone().add(new THREE.Vector3((idx - 1) * 1.3, -1.8, 0.6));
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.x += (idx - 1) * 1.4;
    mid.z += 1.6;
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    transferCurves.push({ curve, agentIndex: idx });

    const tg = prepareGeometry(new THREE.TubeGeometry(curve, 44, 0.072, 10, false));
    const vCount = tg.getAttribute('position').count;
    const colArr = new Float32Array(vCount * 3);
    const phaseArr = new Float32Array(vCount);
    _streamCol.setHex(spec.accent);
    for (let v = 0; v < vCount; v++) {
      colArr[v * 3] = _streamCol.r;
      colArr[v * 3 + 1] = _streamCol.g;
      colArr[v * 3 + 2] = _streamCol.b;
      phaseArr[v] = idx * 0.22;
    }
    tg.setAttribute('aStreamColor', new THREE.BufferAttribute(colArr, 3));
    tg.setAttribute('aStreamPhase', new THREE.BufferAttribute(phaseArr, 1));
    streamTubeGeos.push(tg);
  });
  const mergedTransferTubeGeo = mergePreparedGeometries(streamTubeGeos);
  const transferStreamMat = createTransferPlasmaMat(0x38bdf8);
  const transferStreamsMesh = new THREE.Mesh(mergedTransferTubeGeo, transferStreamMat);
  transferStreamsMesh.visible = false;
  scene.add(transferStreamsMesh);
  const transferStreams = transferCurves;

  // Фронтальная проекция реквизитов договора от правой камеры куба
  const briefCanvas = document.createElement('canvas');
  briefCanvas.width = 1280;
  briefCanvas.height = 700;
  const briefCtx = briefCanvas.getContext('2d');
  const briefTex = new THREE.CanvasTexture(briefCanvas);
  configureCrispTexture(briefTex, maxAnisotropy, true);

  let lastBriefKey = '';
  function drawBriefProjection(bState) {
    const bKey = bState.lines.map(l => `${Math.round(l.alpha * 50)}:${Math.round(l.slideY * 2)}`).join('|');
    if (bKey === lastBriefKey) return;
    lastBriefKey = bKey;

    const w = briefCanvas.width;
    const h = briefCanvas.height;
    briefCtx.clearRect(0, 0, w, h);

    briefCtx.fillStyle = 'rgba(5, 9, 22, 0.94)';
    briefCtx.fillRect(20, 20, w - 40, h - 40);

    const grad = briefCtx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
    grad.addColorStop(0.5, 'rgba(79, 70, 229, 0.08)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.16)');
    briefCtx.fillStyle = grad;
    briefCtx.fillRect(20, 20, w - 40, h - 40);

    briefCtx.fillStyle = 'rgba(125, 211, 252, 0.04)';
    for (let y = 36; y < h - 36; y += 24) briefCtx.fillRect(30, y, w - 60, 2.5);

    briefCtx.strokeStyle = 'rgba(56, 189, 248, 0.92)';
    briefCtx.lineWidth = 6;
    briefCtx.strokeRect(20, 20, w - 40, h - 40);

    briefCtx.strokeStyle = 'rgba(224, 242, 254, 0.96)';
    briefCtx.lineWidth = 9;
    const cLen = 54;
    [[20, 20, 1, 1], [w - 20, 20, -1, 1], [20, h - 20, 1, -1], [w - 20, h - 20, -1, -1]].forEach(([cx, cy, dx, dy]) => {
      briefCtx.beginPath();
      briefCtx.moveTo(cx + dx * cLen, cy);
      briefCtx.lineTo(cx, cy);
      briefCtx.lineTo(cx, cy + dy * cLen);
      briefCtx.stroke();
    });

    briefCtx.fillStyle = '#38bdf8';
    briefCtx.font = '800 30px monospace';
    briefCtx.textAlign = 'center';
    briefCtx.fillText('РЕКВИЗИТЫ ДОГОВОРА • SECUDEX', w / 2, 92);

    briefCtx.strokeStyle = 'rgba(56, 189, 248, 0.48)';
    briefCtx.lineWidth = 3.5;
    briefCtx.beginPath();
    briefCtx.moveTo(64, 120);
    briefCtx.lineTo(w - 64, 120);
    briefCtx.stroke();

    const items = [
      { text: 'Договор купли-продажи № 238', y: 248, font: '800 60px "Segoe UI", Arial, sans-serif', color: '#ffffff', badge: 'rgba(56, 189, 248, 0.18)', border: 'rgba(56, 189, 248, 0.65)' },
      { text: '25.12.2026г', y: 408, font: '800 56px "Segoe UI", Arial, sans-serif', color: '#bae6fd', badge: 'rgba(30, 58, 138, 0.36)', border: 'rgba(125, 211, 252, 0.55)' },
      { text: 'финансовая гарантия - 650000 р', y: 568, font: '800 54px "Segoe UI", Arial, sans-serif', color: '#fde68a', badge: 'rgba(245, 158, 11, 0.18)', border: 'rgba(251, 191, 36, 0.65)' },
    ];
    items.forEach((item, idx) => {
      const st = bState.lines[idx];
      if (!st || st.alpha <= 0.01) return;
      briefCtx.save();
      briefCtx.globalAlpha = Math.min(1, st.alpha);
      const drawY = item.y + st.slideY * 1.4;
      briefCtx.fillStyle = item.badge;
      briefCtx.strokeStyle = item.border;
      briefCtx.lineWidth = 3.5;
      briefCtx.fillRect(64, drawY - 78, w - 128, 120);
      briefCtx.strokeRect(64, drawY - 78, w - 128, 120);
      briefCtx.fillStyle = item.color;
      briefCtx.font = item.font;
      briefCtx.textAlign = 'center';
      briefCtx.fillText(item.text, w / 2, drawY);
      briefCtx.restore();
    });

    briefTex.needsUpdate = true;
  }

  const briefProjGroup = new THREE.Group();
  briefProjGroup.visible = false;
  const briefFrameGroup = new THREE.Group();
  const briefMat = new THREE.MeshBasicMaterial({
    map: briefTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false,
  });
  const briefPlaneW = isMobile ? 3.25 : 3.85;
  const briefPlaneH = briefPlaneW * (500 / 920);
  const briefPlane = new THREE.Mesh(new THREE.PlaneGeometry(briefPlaneW, briefPlaneH), briefMat);
  const briefBorderMat = { opacity: 0 };
  briefFrameGroup.add(briefPlane);

  const briefRayVerts = new Float32Array(4 * 6);
  const briefRayGeo = new THREE.BufferGeometry();
  briefRayGeo.setAttribute('position', new THREE.BufferAttribute(briefRayVerts, 3));
  const briefRayMat = new THREE.LineBasicMaterial({
    color: 0x7dd3fc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const briefRays = new THREE.LineSegments(briefRayGeo, briefRayMat);
  briefRays.frustumCulled = false;

  briefProjGroup.add(briefFrameGroup, briefRays);
  scene.add(briefProjGroup);

  // Проекции 5 поглощённых рисков, летящих от малых ИИ-сфер к Главной сфере во время TRANSFER
  // Все 5 карточек делят единый 1024×1280 текстурный атлас (1 загрузка текстуры, 0 лишних атласов)
  const transferCargoGroup = new THREE.Group();
  transferCargoGroup.visible = false;
  scene.add(transferCargoGroup);

  const transferAtlasCanvas = document.createElement('canvas');
  transferAtlasCanvas.width = 1280;
  transferAtlasCanvas.height = 1600; // 5 полос по 320px для высокой чёткости шрифта
  const transferAtlasCtx = transferAtlasCanvas.getContext('2d');
  const bandH = 320;
  transferAtlasCtx.save();
  transferAtlasCtx.scale(1280 / 1024, 1600 / 1280);
  const vBandH = 256;
  CONTRACT_PAGES.forEach((page, idx) => {
    const y0 = idx * vBandH;
    const accentHex = '#' + new THREE.Color(agentSpecs[page.agentIndex]?.accent ?? 0x38bdf8).getHexString();
    transferAtlasCtx.fillStyle = 'rgba(8, 10, 26, 0.96)';
    transferAtlasCtx.fillRect(14, y0 + 12, 996, vBandH - 24);

    const grad = transferAtlasCtx.createLinearGradient(0, y0, 1024, y0 + vBandH);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.14)');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0.24)');
    transferAtlasCtx.fillStyle = grad;
    transferAtlasCtx.fillRect(14, y0 + 12, 996, vBandH - 24);

    transferAtlasCtx.strokeStyle = accentHex;
    transferAtlasCtx.lineWidth = 6;
    transferAtlasCtx.strokeRect(14, y0 + 12, 996, vBandH - 24);

    transferAtlasCtx.fillStyle = accentHex;
    transferAtlasCtx.font = '900 34px monospace';
    transferAtlasCtx.textAlign = 'left';
    transferAtlasCtx.fillText(`АГЕНТ-0${page.agentIndex + 1} → ФЛАГМАН`, 36, y0 + 56);

    transferAtlasCtx.fillStyle = '#fda4af';
    transferAtlasCtx.font = '900 36px "Segoe UI", Arial, sans-serif';
    transferAtlasCtx.textAlign = 'right';
    transferAtlasCtx.fillText(`${page.riskCode} • [${page.severity}]`, 988, y0 + 56);

    transferAtlasCtx.fillStyle = '#ffffff';
    transferAtlasCtx.font = '900 44px "Segoe UI", Arial, sans-serif';
    transferAtlasCtx.textAlign = 'left';
    const words = page.riskText.split(' ');
    let line1 = '';
    let line2 = '';
    for (const word of words) {
      if ((line1 + word).length <= 32 && !line2) line1 += word + ' ';
      else line2 += word + ' ';
    }
    transferAtlasCtx.fillText(line1.trim(), 36, y0 + 130);
    if (line2.trim()) transferAtlasCtx.fillText(line2.trim(), 36, y0 + 188);

    transferAtlasCtx.fillStyle = '#bae6fd';
    transferAtlasCtx.font = '800 26px monospace';
    transferAtlasCtx.fillText('ПОГЛОЩЁННЫЙ РИСК // ПЕРЕДАЧА', 36, y0 + 232);
  });
  transferAtlasCtx.restore();

  const transferAtlasTex = new THREE.CanvasTexture(transferAtlasCanvas);
  configureCrispTexture(transferAtlasTex, maxAnisotropy, true);

  const cardGeo = new THREE.PlaneGeometry(2.05, 0.66);
  const bandIdxArr = new Float32Array(CONTRACT_PAGES.length);
  const cardAlphaArr = new Float32Array(CONTRACT_PAGES.length);
  for (let i = 0; i < CONTRACT_PAGES.length; i++) {
    bandIdxArr[i] = i;
    cardAlphaArr[i] = 0;
  }
  const bandAttr = new THREE.InstancedBufferAttribute(bandIdxArr, 1);
  const cardAlphaAttr = new THREE.InstancedBufferAttribute(cardAlphaArr, 1);
  cardGeo.setAttribute('aBandIdx', bandAttr);
  cardGeo.setAttribute('aCardOpacity', cardAlphaAttr);

  const transferCardsMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: transferAtlasTex },
    },
    vertexShader: `
      attribute float aBandIdx;
      attribute float aCardOpacity;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vUv = vec2(uv.x, (4.0 - aBandIdx) * 0.2 + uv.y * 0.2);
        vAlpha = aCardOpacity;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        if (vAlpha <= 0.01) discard;
        vec4 tex = texture2D(uMap, vUv);
        gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });

  const transferCardsInst = new THREE.InstancedMesh(cardGeo, transferCardsMat, CONTRACT_PAGES.length);
  transferCardsInst.frustumCulled = false;
  transferCargoGroup.add(transferCardsInst);

  const transferRiskCards = CONTRACT_PAGES.map((page, idx) => ({
    index: idx,
    agentIndex: page.agentIndex,
  }));

  const transferPacketCount = 24;
  const transferPacketInst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.085, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    transferPacketCount
  );
  transferPacketInst.frustumCulled = false;
  const _pktColor = new THREE.Color();
  for (let i = 0; i < transferPacketCount; i++) {
    const streamIdx = i % agentSpecs.length;
    _pktColor.setHex(i % 4 === 0 ? 0xff4d6d : (agentSpecs[streamIdx]?.accent ?? 0x38bdf8));
    transferPacketInst.setColorAt(i, _pktColor);
  }
  if (transferPacketInst.instanceColor) transferPacketInst.instanceColor.needsUpdate = true;
  transferCargoGroup.add(transferPacketInst);

  return {
    scanFanTex,
    agentScanBeam,
    scanFanGeo,
    agentBeamMat,
    scanRaysGeo,
    scanRaysMat,
    calibRaysGeo,
    scanApertureGlow,
    scanApertureMat,
    riskProjGroup,
    riskProjMat,
    riskProjBorderMat,
    drawRiskCubeProjection,
    absorbRays,
    absorbRayGeo,
    absorbRayMat,
    absorbOrbsInst,
    absorbOrbMat,
    absorbOrbCount,
    absorbRing,
    absorbRingMat,
    transferStreams,
    transferStreamsMesh,
    transferStreamMat,
    transferCargoGroup,
    transferRiskCards,
    transferCardsInst,
    cardAlphaAttr,
    transferPacketInst,
    transferPacketCount,
    briefProjGroup,
    briefFrameGroup,
    briefMat,
    briefBorderMat,
    briefRayGeo,
    briefRayMat,
    briefPlaneW,
    briefPlaneH,
    drawBriefProjection,
  };
}
