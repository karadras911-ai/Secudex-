import * as THREE from 'three';
import { CONTRACT_PAGES } from '../config/contractData.js';
import { configureCrispTexture, createBeamFalloffTex, createCloudOrbTex, createScanGlowTex } from '../core/textures.js';
import { prepareGeometry, mergePreparedGeometries } from '../core/geometryMerge.js';
import { createGpuCloudMat } from '../core/shaders.js';
import { getPagePairIndices } from '../stages/timelineMath.js';

function createPageEdgesTex() {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e5dece';
  ctx.fillRect(0, 0, 96, 128);
  for (let x = 2; x < 96; x += 5) {
    ctx.fillStyle = x % 10 === 0 ? '#78716c' : '#f5f0e4';
    ctx.fillRect(x, 0, 1.6, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function renderContractPageTexture(pageData, totalPages, maxAnisotropy) {
  const c = document.createElement('canvas');
  c.width = 1536;
  c.height = 2176;
  const ctx = c.getContext('2d');
  const w = c.width;
  const h = c.height;

  // Чистая матовая архивная бумага высокой чёткости без шумового зерна
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#f7f4ec');
  grad.addColorStop(0.55, '#f0eadc');
  grad.addColorStop(1, '#e6decb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.55);
  ctx.fillStyle = 'rgba(30, 58, 138, 0.045)';
  ctx.font = '900 162px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECUDEX AUDIT', 0, -205);
  ctx.fillText('884-СД // LEGAL', 0, 235);
  ctx.restore();

  ctx.strokeStyle = '#050811';
  ctx.lineWidth = 6;
  ctx.strokeRect(58, 58, w - 116, h - 116);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(76, 76, w - 152, h - 152);

  const tabY = 268 + (pageData.pageNum - 1) * 276;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(w - 94, tabY, 94, 198);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(w - 94, tabY, 10, 198);
  ctx.save();
  ctx.translate(w - 44, tabY + 99);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 31px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ЛИСТ 0${pageData.pageNum}`, 0, 0);
  ctx.restore();

  for (let r = 0; r < 6; r++) {
    for (let col = 0; col < 6; col++) {
      if ((r * 7 + col * 3 + pageData.pageNum) % 2 === 0) {
        ctx.fillStyle = '#050811';
        ctx.fillRect(w - 226 + col * 18, 108 + r * 18, 13, 13);
      }
    }
  }
  ctx.fillStyle = '#1e293b';
  ctx.font = '800 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`DOC:238-P${pageData.pageNum}`, 114, 138);

  ctx.fillStyle = '#050811';
  ctx.textAlign = 'center';
  ctx.font = '800 56px "Segoe UI", Arial, sans-serif';
  ctx.fillText(pageData.header, w / 2 - 18, 224);

  ctx.font = '700 31px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(
    `Договор поставки № 238 от 25.12.2026г • Гарантия 650 000 ₽ • Стр. ${pageData.pageNum}/${totalPages}`,
    w / 2 - 18,
    292
  );

  ctx.strokeStyle = 'rgba(5, 8, 17, 0.62)';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(120, 336);
  ctx.lineTo(w - 152, 336);
  ctx.stroke();

  ctx.textAlign = 'left';
  const bodyLines = [
    '§ 1. ОБЩИЕ ПОЛОЖЕНИЯ И ЗАЩИТНЫЙ КОНТУР:',
    'Лист договора передаётся в контур верификации для извлечения ключевых обязательств.',
    '',
    `§ 2. КЛЮЧЕВОЙ ПУНКТ (${pageData.riskCode}):`,
    pageData.clause,
    '',
    '§ 3. РЕГЛАМЕНТ ОТВЕТСТВЕННОСТИ И СИНХРОНИЗАЦИИ:',
    'Условия скрепляются крипто-слепком и проверяются ИИ-агентами перед передачей Флагману.',
  ];
  let y = 418;
  bodyLines.forEach((line, idx) => {
    const isRiskTitle = idx === 3;
    const isRiskBody = idx === 4;
    const isSectionHead = idx === 0 || idx === 6;
    ctx.font = (isRiskTitle || isRiskBody || isSectionHead)
      ? '800 41px "Segoe UI", Arial, sans-serif'
      : '600 37px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = isRiskTitle ? '#9f1239' : '#050811';
    const words = line.split(' ');
    let cur = '';
    for (const word of words) {
      if ((cur + word).length > 38) {
        ctx.fillText(cur.trim(), 124, y);
        cur = word + ' ';
        y += 58;
      } else {
        cur += word + ' ';
      }
    }
    if (cur.trim()) ctx.fillText(cur.trim(), 124, y);
    y += line ? 68 : 26;
  });

  ctx.fillStyle = 'rgba(225, 29, 72, 0.14)';
  ctx.strokeStyle = 'rgba(190, 18, 60, 0.88)';
  ctx.lineWidth = 5.5;
  ctx.fillRect(120, 1292, w - 260, 232);
  ctx.strokeRect(120, 1292, w - 260, 232);
  ctx.fillStyle = '#881337';
  ctx.font = '800 36px monospace';
  ctx.fillText(`ИИ-ДЕТЕКТОР УГРОЗ • ${pageData.riskCode} • [${pageData.severity}]`, 156, 1364);
  ctx.fillStyle = '#050811';
  ctx.font = '800 41px "Segoe UI", Arial, sans-serif';
  ctx.fillText(pageData.riskText, 156, 1448);

  ctx.save();
  ctx.translate(364, 1824);
  ctx.strokeStyle = 'rgba(29, 78, 216, 0.94)';
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.arc(0, 0, 124, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.setLineDash([9, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, 106, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '800 31px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(29, 78, 216, 0.98)';
  ctx.textAlign = 'center';
  ctx.fillText('SECUDEX', 0, -12);
  ctx.font = '800 24px monospace';
  ctx.fillText(`ЛИСТ 0${pageData.pageNum}/0${totalPages}`, 0, 26);
  ctx.restore();

  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(912, 1836);
  ctx.bezierCurveTo(988, 1712, 1094, 1912, 1222, 1778);
  ctx.bezierCurveTo(1256, 1748, 1290, 1808, 1338, 1790);
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.font = '800 29px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Стр. ${pageData.pageNum} / ${totalPages}`, w - 134, h - 104);

  const tex = new THREE.CanvasTexture(c);
  return configureCrispTexture(tex, maxAnisotropy, true);
}

function renderArchiveCompleteTexture(maxAnisotropy) {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 1024;
  const ctx = c.getContext('2d');
  const w = c.width;
  const h = c.height;

  ctx.fillStyle = '#0c1322';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 2;
  for (let y = 80; y < h - 80; y += 64) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 40, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('SECUDEX // КОНТУР ОЧИЩЕН', w / 2, h / 2 - 42);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('АРХИВ ЗАВЕРШЁН (5 / 5)', w / 2, h / 2 + 12);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('ДАННЫЕ ЗАГРУЖЕНЫ В НАКОПИТЕЛЬ 100%', w / 2, h / 2 + 64);

  const tex = new THREE.CanvasTexture(c);
  return configureCrispTexture(tex, maxAnisotropy, true);
}

export function createContractRig(scene, maxAnisotropy) {
  const contractPivot = new THREE.Group();
  contractPivot.position.set(0, 0.1, 0.15);
  contractPivot.visible = false;
  scene.add(contractPivot);

  const pageEdgesTex = createPageEdgesTex();

  // Предварительная генерация и кэш текстур всех 5 листов договора (без задержек при перелистывании и без пустого белого листа)
  const pageTextures = CONTRACT_PAGES.map(page =>
    renderContractPageTexture(page, CONTRACT_PAGES.length, maxAnisotropy)
  );
  const archiveCompleteTex = renderArchiveCompleteTexture(maxAnisotropy);

  // Абсолютно плоская поверхность листа без микро-шума нормалей для кристальной чёткости шрифта
  const pageGeo = new THREE.PlaneGeometry(2.26, 3.20, 8, 10);
  const pPos = pageGeo.attributes.position;
  for (let i = 0; i < pPos.count; i++) {
    const px = pPos.getX(i);
    const u = (px + 1.13) / 2.26;
    const bow = Math.sin(u * Math.PI) * 0.005;
    pPos.setZ(i, bow);
  }
  pageGeo.computeVertexNormals();

  // Текущий активный лист с шейдером сканирующей материализации в фазе подачи (uReveal)
  const pageMat = new THREE.MeshStandardMaterial({
    map: pageTextures[0],
    emissive: 0xf4efe4,
    emissiveMap: pageTextures[0],
    emissiveIntensity: 0.075,
    roughness: 0.96,
    metalness: 0.0,
    transparent: true,
    side: THREE.DoubleSide,
  });
  pageMat.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = { value: 1.0 };
    pageMat.userData.shader = shader;
    shader.vertexShader = 'varying vec2 vRevealUv;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvRevealUv = uv;\n'
    );
    shader.fragmentShader = 'uniform float uReveal;\nvarying vec2 vRevealUv;\n' + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      if (uReveal < 0.995) {
        float distEdge = abs(vRevealUv.y - 0.5) * 1.45 + abs(vRevealUv.x - 0.5) * 0.65;
        float thresh = uReveal * 1.18;
        if (distEdge > thresh) discard;
        float edgeGlow = smoothstep(thresh - 0.09, thresh, distEdge);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.28, 0.88, 1.0), edgeGlow * 0.92);
      }
      #include <dithering_fragment>
      `
    );
  };
  const pageMesh = new THREE.Mesh(pageGeo, pageMat);
  pageMesh.position.z = 0.062;
  contractPivot.add(pageMesh);

  // Следующий заранее отрендеренный лист строго под текущим (чтобы при уходе текущего в архив не оставался пустой белый лист)
  const nextPageMat = new THREE.MeshStandardMaterial({
    map: pageTextures[1] || archiveCompleteTex,
    emissive: 0xf4efe4,
    emissiveMap: pageTextures[1] || archiveCompleteTex,
    emissiveIntensity: 0.07,
    roughness: 0.96,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const nextPageMesh = new THREE.Mesh(pageGeo, nextPageMat);
  nextPageMesh.position.set(0.006, -0.004, 0.048);
  contractPivot.add(nextPageMesh);

  const stackEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xdad2c0, map: pageEdgesTex, emissive: 0xd8d0be, emissiveIntensity: 0.06, roughness: 0.85, metalness: 0.02,
  });
  const stackBlock = new THREE.Mesh(
    new THREE.BoxGeometry(2.26, 3.20, 0.20),
    stackEdgeMat
  );
  stackBlock.position.set(0.02, -0.015, -0.06);
  contractPivot.add(stackBlock);

  // Веер листов стопки объединён в 1 InstancedMesh с кромкой на GPU (1 draw call вместо 8)
  const fannedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xd8cfc0, emissiveIntensity: 0.045, roughness: 0.89, metalness: 0.01, side: THREE.DoubleSide,
  });
  fannedMat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec2 vFanUv;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvFanUv = uv;\n'
    );
    shader.fragmentShader = 'varying vec2 vFanUv;\n' + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      float fEdge = min(min(vFanUv.x, 1.0 - vFanUv.x), min(vFanUv.y, 1.0 - vFanUv.y));
      float fRim = 1.0 - smoothstep(0.0, 0.012, fEdge);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.39, 0.45, 0.55), fRim * 0.55);
      #include <dithering_fragment>
      `
    );
  };
  const fannedSheetsInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.25, 3.18), fannedMat, 4);
  fannedSheetsInst.frustumCulled = false;
  const _fanDummy = new THREE.Object3D();
  const _fanColor = new THREE.Color();
  for (let s = 1; s <= 4; s++) {
    _fanDummy.position.set(0.044 * s, -0.032 * s, -0.14 - 0.036 * s);
    _fanDummy.rotation.set(0, 0.018 * s, -0.014 * s);
    _fanDummy.updateMatrix();
    fannedSheetsInst.setMatrixAt(s - 1, _fanDummy.matrix);
    _fanColor.setHex(s % 2 === 1 ? 0xeae3d4 : 0xd8cfc0);
    fannedSheetsInst.setColorAt(s - 1, _fanColor);
  }
  if (fannedSheetsInst.instanceColor) fannedSheetsInst.instanceColor.needsUpdate = true;
  fannedSheetsInst.instanceMatrix.needsUpdate = true;
  contractPivot.add(fannedSheetsInst);

  // Зажим стопки (хром + неоновый индикатор) объединён в 1 Mesh с атрибутом aClampGlow
  const clampBodyGeo = prepareGeometry(new THREE.BoxGeometry(0.14, 0.62, 0.30), null, 0xcbd5e1);
  const clampGlowMat4 = new THREE.Matrix4().makeTranslation(-0.02, 0, 0);
  const clampGlowGeo = prepareGeometry(new THREE.BoxGeometry(0.055, 0.44, 0.315), clampGlowMat4, 0x67e8f9);
  const bodyGlowAttr = new Float32Array(clampBodyGeo.getAttribute('position').count);
  const stripGlowAttr = new Float32Array(clampGlowGeo.getAttribute('position').count).fill(1.0);
  const mergedClampGeo = mergePreparedGeometries([clampBodyGeo, clampGlowGeo]);
  const combinedGlowAttr = new Float32Array(bodyGlowAttr.length + stripGlowAttr.length);
  combinedGlowAttr.set(bodyGlowAttr, 0);
  combinedGlowAttr.set(stripGlowAttr, bodyGlowAttr.length);
  mergedClampGeo.setAttribute('aClampGlow', new THREE.BufferAttribute(combinedGlowAttr, 1));

  const clampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.16, metalness: 0.94,
  });
  clampMat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'attribute float aClampGlow;\nvarying float vClampGlow;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvClampGlow = aClampGlow;\n'
    );
    shader.fragmentShader = 'varying float vClampGlow;\n' + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.024, 0.714, 0.831) * (1.65 * vClampGlow);\n'
    );
  };
  const clampClip = new THREE.Mesh(mergedClampGeo, clampMat);
  clampClip.position.set(-1.11, 1.06, -0.02);
  contractPivot.add(clampClip);

  // Перелистывание внутри стопки с GPU vertex-bend шейдером изгиба вокруг левого зажима
  const flipSheetGroup = new THREE.Group();
  flipSheetGroup.position.set(0, 0, 0.08);
  flipSheetGroup.visible = false;
  const flipPageGeo = new THREE.PlaneGeometry(2.18, 3.10, 20, 4);
  const flipLeaves = [];
  for (let l = 0; l < 3; l++) {
    const initTex = pageTextures[l % pageTextures.length];
    const fMat = new THREE.MeshStandardMaterial({
      map: initTex,
      emissive: 0xf4efe4,
      emissiveMap: initTex,
      emissiveIntensity: 0.075,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: l === 0 ? 0.96 : 0.88,
    });
    fMat.onBeforeCompile = (shader) => {
      shader.uniforms.uFlipProgress = { value: 0 };
      shader.uniforms.uLeafIndex = { value: l };
      fMat.userData.shader = shader;
      shader.vertexShader = 'uniform float uFlipProgress;\nuniform float uLeafIndex;\nvarying vec2 vFlipUv;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vFlipUv = uv;
        float localP = clamp((uFlipProgress - uLeafIndex * 0.14) / 0.72, 0.0, 1.0);
        float flipArc = sin(localP * 3.14159);
        float spineU = clamp((transformed.x + 1.09) / 2.18, 0.0, 1.0);
        float curlAngle = flipArc * (1.02 + spineU * 0.72);
        transformed.z += sin(spineU * 3.14159) * flipArc * 0.44 + pow(spineU, 1.25) * flipArc * 0.24;
        transformed.x -= (1.0 - cos(curlAngle)) * spineU * 0.46;
        transformed.y += sin(localP * 3.14159) * 0.07 * spineU;
        `
      );
      shader.fragmentShader = 'varying vec2 vFlipUv;\n' + shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        float rimX = min(vFlipUv.x, 1.0 - vFlipUv.x);
        float rimY = min(vFlipUv.y, 1.0 - vFlipUv.y);
        float rim = 1.0 - smoothstep(0.0, 0.014, min(rimX, rimY));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.22, 0.74, 0.97), rim * 0.72);
        #include <dithering_fragment>
        `
      );
    };
    const leaf = new THREE.Mesh(flipPageGeo, fMat);
    leaf.position.z = l * 0.012;
    flipSheetGroup.add(leaf);
    flipLeaves.push(leaf);
  }
  contractPivot.add(flipSheetGroup);

  // Складывающийся в 3 створки уходящий лист в 1 draw call (GPU-шарниры боковых створок)
  const archivedSheetGroup = new THREE.Group();
  archivedSheetGroup.visible = false;
  const foldVertWrap = new THREE.Group();
  archivedSheetGroup.add(foldVertWrap);

  function buildFoldStripGeo(panelW, uMin, uMax, centerX) {
    const geo = new THREE.PlaneGeometry(panelW, 3.14, 1, 1);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, uMin + uv.getX(i) * (uMax - uMin));
    }
    return prepareGeometry(geo, new THREE.Matrix4().makeTranslation(centerX, 0, 0));
  }

  const foldLeftGeo = buildFoldStripGeo(0.75, 0, 1 / 3, -0.755);
  const foldCenterGeo = buildFoldStripGeo(0.76, 1 / 3, 2 / 3, 0);
  const foldRightGeo = buildFoldStripGeo(0.75, 2 / 3, 1, 0.755);
  const cL = foldLeftGeo.getAttribute('position').count;
  const cC = foldCenterGeo.getAttribute('position').count;
  const cR = foldRightGeo.getAttribute('position').count;
  const foldMergedGeo = mergePreparedGeometries([foldLeftGeo, foldCenterGeo, foldRightGeo]);
  const aWingArr = new Float32Array(cL + cC + cR);
  aWingArr.fill(-1.0, 0, cL);
  aWingArr.fill(0.0, cL, cL + cC);
  aWingArr.fill(1.0, cL + cC, cL + cC + cR);
  foldMergedGeo.setAttribute('aWing', new THREE.BufferAttribute(aWingArr, 1));

  const archivedSheetMat = new THREE.MeshStandardMaterial({
    map: pageTextures[0],
    emissive: 0x38bdf8,
    emissiveIntensity: 0.14,
    roughness: 0.78,
    metalness: 0.04,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.96,
  });
  archivedSheetMat.onBeforeCompile = (shader) => {
    shader.uniforms.uFoldAngle = { value: 0 };
    shader.uniforms.uRimOpacity = { value: 0.72 };
    archivedSheetMat.userData.shader = shader;
    shader.vertexShader = 'attribute float aWing;\nuniform float uFoldAngle;\nvarying vec2 vFoldUv;\n' + shader.vertexShader
      .replace(
        '#include <beginnormal_vertex>',
        `
        #include <beginnormal_vertex>
        if (abs(aWing) > 0.5) {
          float thN = -aWing * uFoldAngle;
          float cN = cos(thN);
          float sN = sin(thN);
          float nx = objectNormal.x * cN + objectNormal.z * sN;
          float nz = -objectNormal.x * sN + objectNormal.z * cN;
          objectNormal.x = nx;
          objectNormal.z = nz;
        }
        `
      )
      .replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vFoldUv = uv;
        if (abs(aWing) > 0.5) {
          float hingeX = aWing * 0.38;
          float th = -aWing * uFoldAngle;
          float c = cos(th);
          float s = sin(th);
          float dx = transformed.x - hingeX;
          float dz = transformed.z;
          transformed.x = hingeX + dx * c + dz * s;
          transformed.z = -dx * s + dz * c;
        }
        `
      );
    shader.fragmentShader = 'uniform float uRimOpacity;\nvarying vec2 vFoldUv;\n' + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      float rimDist = min(min(vFoldUv.x, 1.0 - vFoldUv.x), min(vFoldUv.y, 1.0 - vFoldUv.y));
      float rimFactor = (1.0 - smoothstep(0.0, 0.016, rimDist)) * uRimOpacity;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.49, 0.83, 0.99), rimFactor);
      #include <dithering_fragment>
      `
    );
  };
  const archivedSheetMesh = new THREE.Mesh(foldMergedGeo, archivedSheetMat);
  foldVertWrap.add(archivedSheetMesh);
  scene.add(archivedSheetGroup);

  function setFoldState(foldAngle, sheetAlpha) {
    archivedSheetMat.opacity = sheetAlpha;
    if (archivedSheetMat.userData.shader) {
      archivedSheetMat.userData.shader.uniforms.uFoldAngle.value = foldAngle;
      archivedSheetMat.userData.shader.uniforms.uRimOpacity.value = sheetAlpha * 0.78;
    }
  }

  function setPagePair(pageIndex) {
    const { currentIdx, nextIdx, hasNext } = getPagePairIndices(pageIndex, CONTRACT_PAGES.length);
    const curTex = pageTextures[currentIdx];
    const nxtTex = hasNext ? pageTextures[nextIdx] : archiveCompleteTex;

    pageMat.map = curTex;
    pageMat.emissiveMap = curTex;
    pageMat.needsUpdate = true;

    nextPageMat.map = nxtTex;
    nextPageMat.emissiveMap = nxtTex;
    nextPageMat.needsUpdate = true;
    nextPageMesh.visible = true;

    archivedSheetMat.map = curTex;
    archivedSheetMat.needsUpdate = true;

    flipLeaves.forEach((leaf, idx) => {
      const texForLeaf = idx === 0 ? curTex : (idx === 1 ? nxtTex : pageTextures[(currentIdx + 2) % pageTextures.length]);
      leaf.material.map = texForLeaf;
      leaf.material.emissiveMap = texForLeaf;
      leaf.material.needsUpdate = true;
    });

    fannedSheetsInst.count = Math.max(0, Math.min(4, CONTRACT_PAGES.length - currentIdx));
  }
  setPagePair(0);

  // Луч подачи и центральная частица-кристалл
  const beamFalloffTex = createBeamFalloffTex();
  const cloudOrbTex = createCloudOrbTex();
  const scanGlowTex = createScanGlowTex();

  const dropOrigin = new THREE.Vector3(0, 5.25, -0.7);
  const dropTarget = new THREE.Vector3(0, 0.1, 0.15);
  const dropLen = dropOrigin.distanceTo(dropTarget);
  const ufoBeamGroup = new THREE.Group();
  ufoBeamGroup.visible = false;
  ufoBeamGroup.position.copy(dropOrigin);
  ufoBeamGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3().subVectors(dropTarget, dropOrigin).normalize()
  );

  const ufoOuterGeo = new THREE.CylinderGeometry(0.24, 0.05, dropLen, 20, 1, true);
  ufoOuterGeo.translate(0, -dropLen / 2, 0);
  const ufoBeamOuterMat = new THREE.MeshBasicMaterial({
    map: beamFalloffTex, color: 0x38bdf8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const ufoInnerGeo = new THREE.CylinderGeometry(0.075, 0.016, dropLen, 16, 1, true);
  ufoInnerGeo.translate(0, -dropLen / 2, 0);
  const ufoBeamInnerMat = new THREE.MeshBasicMaterial({
    map: beamFalloffTex, color: 0xe0f2fe, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  ufoBeamGroup.add(new THREE.Mesh(ufoOuterGeo, ufoBeamOuterMat), new THREE.Mesh(ufoInnerGeo, ufoBeamInnerMat));

  const ufoRings = [];
  for (let r = 0; r < 2; r++) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: r === 0 ? 0x7dd3fc : 0xa78bfa, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 8, 24), ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ufoBeamGroup.add(ringMesh);
    ufoRings.push({ mesh: ringMesh, mat: ringMat, phase: r * 0.5 });
  }
  scene.add(ufoBeamGroup);

  const contractDropCore = new THREE.Group();
  contractDropCore.position.copy(dropTarget);
  contractDropCore.visible = false;
  const dropCapsuleMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const dropGyroMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const dropCapsuleMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 2), dropCapsuleMat);
  const dropRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.008, 8, 32), dropGyroMat);
  const dropRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.006, 8, 32), dropGyroMat);
  dropRing2.rotation.x = Math.PI / 2;
  const dropGlowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: cloudOrbTex, color: 0x7dd3fc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  dropGlowSprite.scale.setScalar(0.75);
  contractDropCore.add(dropCapsuleMesh, dropRing1, dropRing2, dropGlowSprite);
  scene.add(contractDropCore);

  // Каретка лазерного сканирования по поверхности листа
  const scanBar = new THREE.Group();
  const scanBarMat = new THREE.MeshBasicMaterial({
    map: scanGlowTex, color: 0x38bdf8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const scanCoreMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const scanSwath = new THREE.Mesh(new THREE.PlaneGeometry(2.34, 0.34), scanBarMat);
  const laserLineGeo = new THREE.PlaneGeometry(2.28, 0.028);
  const bracketGeo = new THREE.BoxGeometry(0.06, 0.22, 0.025);
  const scanCoreMergedGeo = mergePreparedGeometries([
    prepareGeometry(laserLineGeo, new THREE.Matrix4().makeTranslation(0, 0, 0.005)),
    prepareGeometry(bracketGeo, new THREE.Matrix4().makeTranslation(-1.14, 0, 0.01)),
    prepareGeometry(bracketGeo, new THREE.Matrix4().makeTranslation(1.14, 0, 0.01)),
  ]);
  laserLineGeo.dispose();
  bracketGeo.dispose();
  const scanCoreMesh = new THREE.Mesh(scanCoreMergedGeo, scanCoreMat);
  scanBar.add(scanSwath, scanCoreMesh);
  scanBar.position.z = 0.075;
  pageMesh.add(scanBar);

  // GPU-облако распада листа (1100 частиц по кривой Безье на видеокарте с нулевой нагрузкой на CPU)
  const cloudCount = 1100;
  const cloudOrigins = new Float32Array(cloudCount * 3);
  const cloudColors = new Float32Array(cloudCount * 3);
  const cloudSeeds = new Float32Array(cloudCount * 4);
  for (let i = 0; i < cloudCount; i++) {
    cloudOrigins[i * 3] = (Math.random() * 2 - 1) * 1.10;
    cloudOrigins[i * 3 + 1] = (Math.random() * 2 - 1) * 1.54;
    cloudOrigins[i * 3 + 2] = 0.09 + (Math.random() - 0.5) * 0.04;

    cloudSeeds[i * 4] = Math.random(); // фаза вихря X
    cloudSeeds[i * 4 + 1] = 0.72 + Math.random() * 0.72; // размер частицы
    cloudSeeds[i * 4 + 2] = (i / cloudCount) * 0.65 + Math.random() * 0.35; // задержка старта
    cloudSeeds[i * 4 + 3] = (Math.random() - 0.5) * 1.4; // разброс по Y

    const mix = i % 3;
    cloudColors[i * 3] = mix === 2 ? 0.92 : 0.32;
    cloudColors[i * 3 + 1] = mix === 2 ? 0.62 : 0.88;
    cloudColors[i * 3 + 2] = 1.0;
  }
  const disintegrateGeo = new THREE.BufferGeometry();
  disintegrateGeo.setAttribute('position', new THREE.BufferAttribute(cloudOrigins, 3));
  disintegrateGeo.setAttribute('aColor', new THREE.BufferAttribute(cloudColors, 3));
  disintegrateGeo.setAttribute('aSeed', new THREE.BufferAttribute(cloudSeeds, 4));
  const disintegrateMat = createGpuCloudMat(cloudOrbTex);
  const disintegrateCloud = new THREE.Points(disintegrateGeo, disintegrateMat);
  disintegrateCloud.frustumCulled = false;
  disintegrateCloud.visible = false;
  scene.add(disintegrateCloud);

  function setPageReveal(revealVal = 1.0) {
    if (pageMat.userData.shader) {
      pageMat.userData.shader.uniforms.uReveal.value = revealVal;
    }
  }

  return {
    contractPivot,
    pageMesh,
    pageMat,
    nextPageMesh,
    fannedSheetsInst,
    setPagePair,
    setPageReveal,
    flipSheetGroup,
    flipLeaves,
    archivedSheetGroup,
    foldVertWrap,
    setFoldState,
    ufoBeamGroup,
    ufoBeamOuterMat,
    ufoBeamInnerMat,
    ufoRings,
    dropOrigin,
    dropTarget,
    dropLen,
    contractDropCore,
    dropRing1,
    dropRing2,
    dropCapsuleMat,
    dropGyroMat,
    dropGlowSprite,
    scanBar,
    scanBarMat,
    scanCoreMat,
    disintegrateCloud,
    disintegrateGeo,
    disintegrateMat,
    cloudCount,
  };
}
