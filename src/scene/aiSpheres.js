import * as THREE from 'three';
import { AGENT_SPECS, CUBE_HALF, FLAGSHIP_POS, FLAGSHIP_RADIUS } from '../config/constants.js';
import { configureCrispTexture, heightCanvasToNormalTex } from '../core/textures.js';
import { prepareGeometry, mergePreparedGeometries } from '../core/geometryMerge.js';
import { computeDataStreamPoint } from '../stages/timelineMath.js';

// Модульные временные объекты (ноль аллокаций в цикле анимации)
const _tmpMat4 = new THREE.Matrix4();
const _tmpQuat = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler();
const _tmpPos = new THREE.Vector3();
const _tmpScale = new THREE.Vector3();
const _tmpColor = new THREE.Color();
const _tmpDummy = new THREE.Object3D();
const _streamPt = { x: 0, y: 0, z: 0 };

function createSharedTechArmorMaps(maxAnisotropy) {
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

      const traceCol = (r + c) % 2 === 0 ? '#7dd3fc' : '#c4b5fd';
      if ((r + c) % 2 === 0) {
        for (let lv = 0; lv < 4; lv++) {
          const ly = py + 22 + lv * 7;
          colCtx.fillStyle = '#050811'; colCtx.fillRect(px + 18, ly, cellW - 44, 3);
          bumpCtx.fillStyle = '#1e1e1e'; bumpCtx.fillRect(px + 18, ly, cellW - 44, 3);
        }
        emCtx.strokeStyle = traceCol; emCtx.lineWidth = 2.2;
        emCtx.beginPath();
        emCtx.moveTo(px + 18, py + cellH - 28);
        emCtx.lineTo(px + cellW * 0.55, py + cellH - 28);
        emCtx.lineTo(px + cellW * 0.68, py + cellH - 18);
        emCtx.lineTo(px + cellW - 18, py + cellH - 18);
        emCtx.stroke();
        emCtx.fillStyle = traceCol; emCtx.fillRect(px + cellW - 26, py + 14, 10, 3.5);
      } else {
        colCtx.fillStyle = 'rgba(100, 116, 139, 0.35)'; colCtx.font = 'bold 10px monospace';
        colCtx.fillText(`SDX-${r}${c}9`, px + 18, py + 28);
        emCtx.fillStyle = traceCol;
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

function createSharedCodeLayerTex(maxAnisotropy) {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.save();
  ctx.scale(2, 2);
  ctx.fillStyle = 'rgba(4, 7, 16, 0.18)';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.font = 'bold 12px monospace';
  const tokens = [
    '0xA4F9::CLAUSE_VERIFY', 'RISK_EVAL => 0.841', 'AST_LEGAL_NODE[2.1]',
    'SHA3:99F1_QUANTUM', 'TRAP_GUARD_ACTIVE', 'WEIGHT_SIGMA:0.924',
    'MEM_BANK[4096x64]', 'AGENT_SYNC_STREAM()', 'SECUDEX_PROTOCOL_V9',
  ];
  for (let row = 0; row < 28; row++) {
    ctx.fillStyle = row % 4 === 0 ? '#f0f9ff' : 'rgba(186, 230, 253, 0.72)';
    const line = `${tokens[row % tokens.length]}  // ${Math.random().toString(16).slice(2, 10).toUpperCase()}  [${(row * 17) % 99}]`;
    ctx.fillText(line, (row * 43) % 240, 14 + row * 18);
    ctx.fillText(line, ((row * 43) % 240) + 512, 14 + row * 18);
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return configureCrispTexture(tex, maxAnisotropy, true);
}

function createSharedRingBandTex(maxAnisotropy) {
  const ringBandCanvas = document.createElement('canvas');
  ringBandCanvas.width = 2048; ringBandCanvas.height = 256;
  const rbCtx = ringBandCanvas.getContext('2d');
  rbCtx.clearRect(0, 0, 2048, 256);
  rbCtx.save();
  rbCtx.scale(2, 2);
  for (let x = 0; x < 1024; x += 16) {
    const tall = x % 64 === 0 ? 52 : (x % 32 === 0 ? 34 : 18);
    rbCtx.fillStyle = x % 64 === 0 ? '#ffffff' : '#bae6fd';
    rbCtx.fillRect(x, 64 - tall * 0.5, 6, tall);
  }
  rbCtx.strokeStyle = '#e0f2fe'; rbCtx.lineWidth = 3;
  rbCtx.beginPath(); rbCtx.moveTo(0, 20); rbCtx.lineTo(1024, 20); rbCtx.moveTo(0, 108); rbCtx.lineTo(1024, 108); rbCtx.stroke();
  rbCtx.fillStyle = '#ffffff'; rbCtx.font = 'bold 14px monospace';
  for (let s = 0; s < 4; s++) rbCtx.fillText(`DATA_BUS::0${s + 1} // SYNC_OK`, 28 + s * 256, 15);
  rbCtx.restore();

  const dataRingTex = new THREE.CanvasTexture(ringBandCanvas);
  dataRingTex.wrapS = THREE.RepeatWrapping;
  dataRingTex.repeat.set(3, 1);
  return configureCrispTexture(dataRingTex, maxAnisotropy, true);
}

function createOuterShellInstancedMat(atlasTex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAtlasMap: { value: atlasTex },
      uTime: { value: 0 },
      uEmissiveScale: { value: 1.0 },
    },
    vertexShader: `
      attribute vec4 aUvRect;
      attribute float aWaveAmp;
      uniform float uTime;
      varying vec2 vAtlasUv;
      varying vec3 vViewPos;
      varying vec3 vWorldNormal;
      varying vec3 vFresnelCol;
      void main() {
        float wave = sin(position.x * 5.2 + uTime * 2.4) * cos(position.y * 4.8 - uTime * 1.9) * sin(position.z * 4.5 + uTime * 1.5);
        vec3 displaced = position + normal * (wave * aWaveAmp);
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vViewPos = -mvPosition.xyz;
        vWorldNormal = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
        vAtlasUv = uv * aUvRect.zw + aUvRect.xy;
        #ifdef USE_INSTANCING_COLOR
          vFresnelCol = instanceColor;
        #else
          vFresnelCol = vec3(0.49, 0.23, 0.93);
        #endif
      }
    `,
    fragmentShader: `
      uniform sampler2D uAtlasMap;
      uniform float uEmissiveScale;
      varying vec2 vAtlasUv;
      varying vec3 vViewPos;
      varying vec3 vWorldNormal;
      varying vec3 vFresnelCol;
      void main() {
        vec4 texel = texture2D(uAtlasMap, vAtlasUv);
        float fresnel = pow(1.0 - clamp(abs(dot(normalize(vWorldNormal), normalize(vViewPos))), 0.0, 1.0), 2.8);
        vec3 col = texel.rgb * (0.86 + 0.72 * uEmissiveScale) + vFresnelCol * (texel.rgb * 0.55 * uEmissiveScale + fresnel * 0.72 * uEmissiveScale);
        float alpha = clamp(texel.a * 0.56 + fresnel * 0.42 * uEmissiveScale, 0.0, 0.88);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

function createSharedDataPointsMat(spriteTex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSprite: { value: spriteTex },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    },
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      varying vec3 vColor;
      uniform float uPixelRatio;
      void main() {
        vColor = aColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (310.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uSprite;
      varying vec3 vColor;
      void main() {
        vec4 tex = texture2D(uSprite, gl_PointCoord);
        if (tex.a < 0.02) discard;
        gl_FragColor = vec4(vColor * tex.rgb, tex.a * 0.92);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createAiSphereRig(scene, maxAnisotropy, dataPointSpriteTex) {
  const half = CUBE_HALF;

  const chamberDustCount = 140;
  const chamberDustPhase = new Float32Array(chamberDustCount);
  for (let i = 0; i < chamberDustCount; i++) {
    chamberDustPhase[i] = Math.random() * Math.PI * 2;
  }

  // 2. Общие текстуры и лёгкие PBR-материалы (MeshStandardMaterial без clearcoat/iridescence)
  const armorMaps = createSharedTechArmorMaps(maxAnisotropy);
  const sharedCodeTex = createSharedCodeLayerTex(maxAnisotropy);
  const sharedDataRingTex = createSharedRingBandTex(maxAnisotropy);

  const hullCowlMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    map: armorMaps.colorTex,
    normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: armorMaps.roughTex,
    roughness: 0.34,
    metalness: 0.88,
    envMapIntensity: 1.65,
    emissive: 0xffffff,
    emissiveMap: armorMaps.emissiveTex,
    emissiveIntensity: 1.05,
    side: THREE.DoubleSide,
  });

  const structRingMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.94,
    roughness: 0.20,
    normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(0.85, 0.85),
    envMapIntensity: 1.55,
  });

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: armorMaps.colorTex,
    normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: armorMaps.roughTex,
    roughness: 0.28,
    metalness: 0.90,
    envMapIntensity: 1.65,
    emissive: 0xffffff,
    emissiveMap: armorMaps.emissiveTex,
    emissiveIntensity: 1.12,
  });

  const digitalModuleMat = new THREE.MeshStandardMaterial({
    color: 0x0b1322,
    map: armorMaps.colorTex,
    emissive: 0xffffff,
    emissiveMap: armorMaps.emissiveTex,
    emissiveIntensity: 1.25,
    metalness: 0.82,
    roughness: 0.22,
  });
  digitalModuleMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      #ifdef USE_INSTANCING_COLOR
      totalEmissiveRadiance *= vColor;
      #endif`
    );
  };

  const gimbalTrackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0xffffff,
    emissiveIntensity: 1.25,
    metalness: 0.6,
    roughness: 0.2,
  });
  gimbalTrackMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      #ifdef USE_INSTANCING_COLOR
      totalEmissiveRadiance *= vColor;
      #endif`
    );
  };

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0xffffff,
    emissiveIntensity: 1.9,
    roughness: 0.14,
    metalness: 0.88,
    flatShading: true,
  });
  coreMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      #ifdef USE_INSTANCING_COLOR
      totalEmissiveRadiance *= vColor;
      #endif`
    );
  };

  const gimbalBodyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: 0.93,
    roughness: 0.22,
    normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(0.85, 0.85),
    envMapIntensity: 1.45,
  });

  // Конфигурация всех 4 сфер (3 агента + 1 флагман)
  const agentSpecs = AGENT_SPECS.map(s => ({ ...s, posVec: new THREE.Vector3(...s.pos) }));
  const flagshipPos = new THREE.Vector3(FLAGSHIP_POS.x, FLAGSHIP_POS.y, FLAGSHIP_POS.z);

  const sphereConfigs = [
    ...agentSpecs.map(s => ({
      radius: 0.68,
      position: s.posVec,
      accentColor: s.accent,
      secondaryColor: s.secondary,
      label: s.label,
      isFlagship: false,
    })),
    {
      radius: FLAGSHIP_RADIUS,
      position: flagshipPos,
      accentColor: 0x38bdf8,
      secondaryColor: 0x7c3aed,
      label: 'SECUDEX FLAGSHIP AI',
      isFlagship: true,
    },
  ];
  const sphereCount = sphereConfigs.length;

  // 3. Единый 2x2 Canvas-атлас проекций для 4 сфер (1 draw call для всех outerShell!)
  const projAtlasCanvas = document.createElement('canvas');
  projAtlasCanvas.width = 2048;
  projAtlasCanvas.height = 1024;
  const projAtlasCtx = projAtlasCanvas.getContext('2d');
  const projAtlasTex = new THREE.CanvasTexture(projAtlasCanvas);
  configureCrispTexture(projAtlasTex, maxAnisotropy, true);

  // 4. Общие InstancedMesh-ы ядра, каркаса, ауры, колец кода, орбитальных лент и гимбал-колец
  const coreInst = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.175, 1), coreMat, sphereCount);
  const coreCageInst = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.94, roughness: 0.22, wireframe: true }),
    sphereCount
  );
  const coreAuraInst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.28, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }),
    sphereCount
  );
  const wireShellInst = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1.025, 2),
    new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true, transparent: true, opacity: 0.16 }),
    sphereCount
  );
  const codeSphereInst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.76, 28, 20),
    new THREE.MeshBasicMaterial({
      map: sharedCodeTex, color: 0xffffff, transparent: true, opacity: 0.56,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
    sphereCount
  );
  const dataRingBandMat = new THREE.MeshBasicMaterial({
    map: sharedDataRingTex, color: 0xffffff, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const dataRingCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const dataRingBandInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.135, 56, 1, true), dataRingBandMat, sphereCount);
  const dataRingCoreInst = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.009, 8, 64), dataRingCoreMat, sphereCount);

  // Гимбал-кольцо + зажимы объединены в 1 геометрию (экономит отдельный InstancedMesh для 84 зажимов!)
  const unitRingParts = [prepareGeometry(new THREE.TorusGeometry(1, 0.032, 8, 42), null, 0x1e293b)];
  const unitClampSrc = new THREE.BoxGeometry(0.09, 0.12, 0.12);
  for (let c = 0; c < 8; c++) {
    const a = (c / 8) * Math.PI * 2;
    _tmpPos.set(Math.cos(a), Math.sin(a), 0);
    _tmpEuler.set(0, 0, a);
    _tmpQuat.setFromEuler(_tmpEuler);
    _tmpScale.set(1, 1, 1);
    _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
    unitRingParts.push(prepareGeometry(unitClampSrc, _tmpMat4, 0x64748b));
  }
  unitClampSrc.dispose();
  const unitGimbalBodyGeo = mergePreparedGeometries(unitRingParts);
  const gimbalBodyInst = new THREE.InstancedMesh(unitGimbalBodyGeo, gimbalBodyMat, sphereCount * 3);
  const gimbalTrackInst = new THREE.InstancedMesh(new THREE.TorusGeometry(1.006, 0.011, 6, 42), gimbalTrackMat, sphereCount * 3);

  // 5. OuterShell InstancedMesh (4 сферы -> 1 draw call на GPU-шейдере с 2x2 атласом!)
  const outerGeo = new THREE.SphereGeometry(0.96, 36, 24);
  const uvRectArray = new Float32Array(sphereCount * 4);
  const waveAmpArray = new Float32Array(sphereCount);
  const outerShellMat = createOuterShellInstancedMat(projAtlasTex);
  const outerShellInst = new THREE.InstancedMesh(outerGeo, outerShellMat, sphereCount);

  // 6. Объединённая статическая броня: Cowls (1 draw call) + StructRings (1 draw call)
  const cowlGeos = [];
  const structRingGeos = [];

  // 7. Бронепластины и цифровые модули всех 4 сфер (2 InstancedMesh-а -> 2 draw calls)
  const allPlates = [];
  const allMods = [];
  const spherePlateRanges = [];
  const sphereModRanges = [];

  // 8. Потоковые частицы данных всех 4 сфер + пыль камеры в одном THREE.Points (1 draw call вместо 5)
  const totalSphereDataPts = sphereConfigs.reduce((acc, cfg) => acc + (cfg.isFlagship ? 340 : 140), 0);
  const totalPoints = totalSphereDataPts + chamberDustCount;
  const sharedDataPos = new Float32Array(totalPoints * 3);
  const sharedDataCol = new Float32Array(totalPoints * 3);
  const sharedDataSize = new Float32Array(totalPoints);
  const baseThetas = new Float32Array(totalSphereDataPts);
  const basePhis = new Float32Array(totalSphereDataPts);
  const baseScales = new Float32Array(totalSphereDataPts);
  let ptCursor = 0;

  for (let i = 0; i < chamberDustCount; i++) {
    const idx = totalSphereDataPts + i;
    sharedDataPos[idx * 3] = (Math.random() - 0.5) * 5.2;
    sharedDataPos[idx * 3 + 1] = -1.9 + Math.random() * 4.8;
    sharedDataPos[idx * 3 + 2] = (Math.random() - 0.5) * 5.2;
    sharedDataCol[idx * 3] = 0.729 * 0.32;
    sharedDataCol[idx * 3 + 1] = 0.902 * 0.32;
    sharedDataCol[idx * 3 + 2] = 0.992 * 0.32;
    sharedDataSize[idx] = 0.045;
  }

  const paletteTints = [0xaabbd0, 0xcbd5e1, 0x8298b8, 0x9ab0cc];

  const sphereRigs = sphereConfigs.map((cfg, sIdx) => {
    const { radius, position, accentColor, secondaryColor, label, isFlagship } = cfg;

    // Установка базовых цветов инстансов
    _tmpColor.setHex(accentColor);
    coreInst.setColorAt(sIdx, _tmpColor);
    coreAuraInst.setColorAt(sIdx, _tmpColor);
    codeSphereInst.setColorAt(sIdx, _tmpColor);
    dataRingBandInst.setColorAt(sIdx, _tmpColor);
    dataRingCoreInst.setColorAt(sIdx, _tmpColor);

    _tmpColor.setHex(secondaryColor);
    outerShellInst.setColorAt(sIdx, _tmpColor);
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      gimbalTrackInst.setColorAt(sIdx * 3 + rIdx, _tmpColor);
    }

    // Квадрант 2x2 атласа для outerShellInst (uOff, vOff, 0.5, 0.5)
    const qCol = sIdx % 2;
    const qRow = Math.floor(sIdx / 2);
    const uOff = qCol * 0.5;
    const vOff = 1.0 - (qRow + 1) * 0.5; // WebGL V=0 снизу, canvas Y=0 сверху
    uvRectArray[sIdx * 4] = uOff;
    uvRectArray[sIdx * 4 + 1] = vOff;
    uvRectArray[sIdx * 4 + 2] = 0.5;
    uvRectArray[sIdx * 4 + 3] = 0.5;
    waveAmpArray[sIdx] = radius * 0.012;

    // Начальная матрица outerShellInst (поворот -PI/2 и масштаб radius)
    _tmpPos.copy(position);
    _tmpEuler.set(0, -Math.PI / 2, 0);
    _tmpQuat.setFromEuler(_tmpEuler);
    _tmpScale.setScalar(radius);
    _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
    outerShellInst.setMatrixAt(sIdx, _tmpMat4);

    // CoreAura (не крутится отдельно, просто стоит в центре сферы)
    _tmpQuat.identity();
    _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
    coreAuraInst.setMatrixAt(sIdx, _tmpMat4);

    // Cowls & StructRings для слияния в 2 статических меша
    const cowlScale = isFlagship ? 0.945 : 0.93;
    const cowlTop = new THREE.SphereGeometry(radius * cowlScale, 32, 12, 0, Math.PI * 2, isFlagship ? 0.15 : 0.18, isFlagship ? 0.74 : 0.56);
    const cowlBot = new THREE.SphereGeometry(radius * cowlScale, 32, 12, 0, Math.PI * 2, isFlagship ? 2.24 : 2.38, isFlagship ? 0.74 : 0.58);
    const rearPhiStart = isFlagship ? Math.PI * 0.76 : Math.PI * 0.82;
    const rearPhiLen = isFlagship ? Math.PI * 1.48 : Math.PI * 1.36;
    const cowlRear = new THREE.SphereGeometry(radius * cowlScale, 32, 16, rearPhiStart, rearPhiLen, 0.72, 1.70);
    _tmpMat4.makeTranslation(position.x, position.y, position.z);
    cowlGeos.push(
      prepareGeometry(cowlTop, _tmpMat4),
      prepareGeometry(cowlBot, _tmpMat4),
      prepareGeometry(cowlRear, _tmpMat4)
    );
    cowlTop.dispose(); cowlBot.dispose(); cowlRear.dispose();

    const collarGeo = new THREE.TorusGeometry(radius * 0.79, radius * 0.022, 8, 44);
    _tmpEuler.set(Math.PI / 2, 0, 0);
    _tmpQuat.setFromEuler(_tmpEuler);
    _tmpScale.set(1, 1, 1);
    _tmpPos.set(position.x, position.y + radius * 0.58, position.z);
    _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
    structRingGeos.push(prepareGeometry(collarGeo, _tmpMat4));
    _tmpPos.set(position.x, position.y - radius * 0.58, position.z);
    _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
    structRingGeos.push(prepareGeometry(collarGeo, _tmpMat4));
    collarGeo.dispose();

    if (isFlagship) {
      const crownGeo = new THREE.CylinderGeometry(radius * 0.16, radius * 0.24, radius * 0.12, 12, 1, true);
      _tmpMat4.makeTranslation(position.x, position.y + radius * 0.97, position.z);
      structRingGeos.push(prepareGeometry(crownGeo, _tmpMat4));
      crownGeo.dispose();

      const arcGeo = new THREE.TorusGeometry(radius * 0.97, radius * 0.02, 8, 44);
      [-0.78, 0.78].forEach(ry => {
        _tmpEuler.set(0, ry, 0);
        _tmpQuat.setFromEuler(_tmpEuler);
        _tmpPos.copy(position);
        _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
        structRingGeos.push(prepareGeometry(arcGeo, _tmpMat4));
      });
      arcGeo.dispose();
    }

    // Бронепластины и цифровые модули
    const pStart = allPlates.length;
    const mStart = allMods.length;
    const latSteps = isFlagship ? 8 : 5;
    const plateCandidates = [];
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
    const plateScaleRatio = isFlagship ? 0.34 / 0.38 : 0.42 / 0.38;
    plateCandidates.forEach((pt, idx) => {
      const rPlace = radius * (pt.tier === 0 ? 0.975 : 1.005);
      const sc = (pt.tier === 0 ? 1.0 : 0.92) * plateScaleRatio;
      allPlates.push({
        cx: position.x, cy: position.y, cz: position.z, radius,
        nx: pt.nx, ny: pt.ny, nz: pt.nz, rBase: rPlace, scale: sc, tier: pt.tier,
        colorHex: paletteTints[idx % paletteTints.length],
      });
      if (idx % 3 !== 1) {
        allMods.push({
          cx: position.x, cy: position.y, cz: position.z, radius,
          nx: pt.nx, ny: pt.ny, nz: pt.nz, rBase: rPlace + radius * 0.022, scale: plateScaleRatio, tier: pt.tier,
          colorHex: accentColor,
        });
      }
    });
    spherePlateRanges.push([pStart, allPlates.length]);
    sphereModRanges.push([mStart, allMods.length]);

    // Частицы данных этой сферы
    const dataCount = isFlagship ? 340 : 140;
    const latBands = isFlagship ? 10 : 6;
    const ptStart = ptCursor;
    _tmpColor.setHex(accentColor);
    for (let i = 0; i < dataCount; i++) {
      const idx = ptStart + i;
      const band = i % latBands;
      const theta = 0.35 + (band / (latBands - 1)) * (Math.PI - 0.7);
      const phi = (i / dataCount) * Math.PI * 18 + band * 0.7;
      const sc = 0.61 + (i % 3) * 0.045;
      baseThetas[idx] = theta;
      basePhis[idx] = phi;
      baseScales[idx] = sc;
      computeDataStreamPoint(radius, theta, phi, sc, 0, i, _streamPt);
      sharedDataPos[idx * 3] = position.x + _streamPt.x;
      sharedDataPos[idx * 3 + 1] = position.y + _streamPt.y;
      sharedDataPos[idx * 3 + 2] = position.z + _streamPt.z;
      sharedDataCol[idx * 3] = _tmpColor.r;
      sharedDataCol[idx * 3 + 1] = _tmpColor.g;
      sharedDataCol[idx * 3 + 2] = _tmpColor.b;
      sharedDataSize[idx] = isFlagship ? 0.085 : 0.042;
    }
    ptCursor += dataCount;

    // Лёгкий Group-якорь позиции (0 draw calls) + голограмма вердикта у Флагмана
    const group = new THREE.Group();
    group.position.copy(position);
    scene.add(group);

    let verdictHoloGroup = null;
    let verdictHoloPlaneMat = null;
    let verdictCtx = null;
    let verdictCanvas = null;
    let verdictTex = null;
    let lastVerdictKey = '';

    if (isFlagship) {
      verdictHoloGroup = new THREE.Group();
      verdictHoloGroup.position.set(0, radius * 1.74, 0.45);
      verdictHoloGroup.visible = false;
      verdictCanvas = document.createElement('canvas');
      verdictCanvas.width = 1024; verdictCanvas.height = 384;
      verdictCtx = verdictCanvas.getContext('2d');
      verdictTex = new THREE.CanvasTexture(verdictCanvas);
      configureCrispTexture(verdictTex, maxAnisotropy, true);

      verdictHoloPlaneMat = new THREE.MeshBasicMaterial({
        map: verdictTex, transparent: true, opacity: 0.96,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      });
      const verdictHoloPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 2.5, radius * 0.92),
        verdictHoloPlaneMat
      );
      const verdictCone = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.52, radius * 0.14, radius * 0.56, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      verdictCone.position.set(0, -radius * 0.68, -0.35);
      verdictHoloGroup.add(verdictCone, verdictHoloPlane);
      group.add(verdictHoloGroup);
    }

    function updateVerdictHologram(visible, percentText = '84%', elapsed = 0, threatCount = 5) {
      if (!verdictHoloGroup) return;
      verdictHoloGroup.visible = visible;
      if (!visible) return;
      const vKey = `${percentText}|${threatCount}`;
      if (vKey !== lastVerdictKey) {
        lastVerdictKey = vKey;
        const w = verdictCanvas.width, h = verdictCanvas.height;
        verdictCtx.clearRect(0, 0, w, h);
        const bgGrad = verdictCtx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, 'rgba(30, 8, 20, 0.72)');
        bgGrad.addColorStop(0.5, 'rgba(48, 8, 24, 0.86)');
        bgGrad.addColorStop(1, 'rgba(20, 6, 16, 0.72)');
        verdictCtx.fillStyle = bgGrad;
        verdictCtx.fillRect(36, 26, w - 72, h - 52);
        verdictCtx.fillStyle = 'rgba(255, 77, 109, 0.08)';
        for (let y = 32; y < h - 32; y += 8) verdictCtx.fillRect(40, y, w - 80, 2);
        verdictCtx.strokeStyle = 'rgba(255, 77, 109, 0.92)';
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
      }
      verdictHoloGroup.position.y = radius * (1.74 + Math.sin(elapsed * 3.2) * 0.02);
      if (verdictHoloPlaneMat) {
        verdictHoloPlaneMat.opacity = 0.84 + Math.sin(elapsed * 8) * 0.12;
      }
    }

    let lastProjKey = '';
    function updateProjection(mode, statusText, percentText) {
      const pKey = `${mode}|${statusText || ''}|${percentText || ''}`;
      if (pKey === lastProjKey) return;
      lastProjKey = pKey;

      const qw = 1024, qh = 512;
      const qx = qCol * qw, qy = qRow * qh;
      projAtlasCtx.clearRect(qx, qy, qw, qh);

      projAtlasCtx.strokeStyle = mode === 'powerdown'
        ? 'rgba(30, 41, 59, 0.25)'
        : (mode === 'verdict' ? 'rgba(255, 59, 92, 0.45)' : 'rgba(56, 189, 248, 0.24)');
      projAtlasCtx.lineWidth = 1;
      for (let x = qw * 0.25; x <= qw * 0.75; x += qw / 24) {
        projAtlasCtx.beginPath(); projAtlasCtx.moveTo(qx + x, qy + qh * 0.22); projAtlasCtx.lineTo(qx + x, qy + qh * 0.78); projAtlasCtx.stroke();
      }
      for (let y = qh * 0.25; y <= qh * 0.75; y += qh / 12) {
        projAtlasCtx.beginPath(); projAtlasCtx.moveTo(qx + qw * 0.25, qy + y); projAtlasCtx.lineTo(qx + qw * 0.75, qy + y); projAtlasCtx.stroke();
      }

      if (mode === 'powerdown') {
        dataRingBandMat.opacity = 0.08;
        dataRingCoreMat.opacity = 0.1;
        projAtlasTex.needsUpdate = true;
        return;
      }

      if (mode === 'verdict' && isFlagship) {
        _tmpColor.setHex(0xff3b5c);
        dataRingBandInst.setColorAt(sIdx, _tmpColor);
        _tmpColor.setHex(0xff6b81);
        dataRingCoreInst.setColorAt(sIdx, _tmpColor);
        if (dataRingBandInst.instanceColor) dataRingBandInst.instanceColor.needsUpdate = true;
        if (dataRingCoreInst.instanceColor) dataRingCoreInst.instanceColor.needsUpdate = true;
        dataRingBandMat.opacity = 0.95;
        dataRingCoreMat.opacity = 0.95;

        projAtlasCtx.fillStyle = 'rgba(28, 4, 14, 0.84)';
        projAtlasCtx.fillRect(qx + qw * 0.31, qy + qh * 0.28, qw * 0.38, qh * 0.44);
        projAtlasCtx.strokeStyle = '#ff3b5c'; projAtlasCtx.lineWidth = 4;
        projAtlasCtx.strokeRect(qx + qw * 0.31, qy + qh * 0.28, qw * 0.38, qh * 0.44);
        projAtlasCtx.textAlign = 'center'; projAtlasCtx.textBaseline = 'middle';
        projAtlasCtx.fillStyle = '#fecdd3'; projAtlasCtx.font = '900 22px monospace';
        projAtlasCtx.fillText('ВЕРДИКТ ИИ • РИСК', qx + qw / 2, qy + qh * 0.38);
        projAtlasCtx.fillStyle = '#ff4d6d'; projAtlasCtx.font = '900 104px Arial, sans-serif';
        projAtlasCtx.fillText(percentText || '84%', qx + qw / 2, qy + qh * 0.56);
      } else {
        _tmpColor.setHex(accentColor);
        dataRingBandInst.setColorAt(sIdx, _tmpColor);
        dataRingCoreInst.setColorAt(sIdx, _tmpColor);
        if (dataRingBandInst.instanceColor) dataRingBandInst.instanceColor.needsUpdate = true;
        if (dataRingCoreInst.instanceColor) dataRingCoreInst.instanceColor.needsUpdate = true;
        dataRingBandMat.opacity = 0.82;
        dataRingCoreMat.opacity = 0.9;

        projAtlasCtx.strokeStyle = mode === 'scan' ? '#fb7185' : '#38bdf8';
        projAtlasCtx.lineWidth = isFlagship ? 2.4 : 1.8;
        projAtlasCtx.beginPath();
        for (let x = qw * 0.3; x <= qw * 0.7; x += 6) {
          const env = Math.sin(((x - qw * 0.3) / (qw * 0.4)) * Math.PI);
          const y = qh * 0.5 + (Math.sin(x * 0.05) * (qh * 0.11) + Math.cos(x * 0.12) * (qh * 0.04)) * env;
          if (x === qw * 0.3) projAtlasCtx.moveTo(qx + x, qy + y); else projAtlasCtx.lineTo(qx + x, qy + y);
        }
        projAtlasCtx.stroke();

        projAtlasCtx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
        projAtlasCtx.lineWidth = 2;
        const bx0 = qx + qw * 0.33, bx1 = qx + qw * 0.67, by0 = qy + qh * 0.31, by1 = qy + qh * 0.69, br = 16;
        projAtlasCtx.beginPath();
        projAtlasCtx.moveTo(bx0, by0 + br); projAtlasCtx.lineTo(bx0, by0); projAtlasCtx.lineTo(bx0 + br, by0);
        projAtlasCtx.moveTo(bx1 - br, by0); projAtlasCtx.lineTo(bx1, by0); projAtlasCtx.lineTo(bx1, by0 + br);
        projAtlasCtx.moveTo(bx0, by1 - br); projAtlasCtx.lineTo(bx0, by1); projAtlasCtx.lineTo(bx0 + br, by1);
        projAtlasCtx.moveTo(bx1 - br, by1); projAtlasCtx.lineTo(bx1, by1); projAtlasCtx.lineTo(bx1, by1 - br);
        projAtlasCtx.stroke();

        projAtlasCtx.fillStyle = '#e2e8f0'; projAtlasCtx.textAlign = 'center';
        projAtlasCtx.font = `700 ${isFlagship ? 22 : 18}px monospace`;
        projAtlasCtx.fillText(label, qx + qw / 2, qy + qh * 0.37);
        projAtlasCtx.fillStyle = mode === 'scan' ? '#fda4af' : '#7dd3fc';
        projAtlasCtx.font = `700 ${isFlagship ? 19 : 15}px monospace`;
        projAtlasCtx.fillText(statusText || 'ONLINE // MATRIX', qx + qw / 2, qy + qh * 0.64);
      }
      projAtlasTex.needsUpdate = true;
    }

    return {
      sIdx,
      radius,
      position,
      accentColor,
      group,
      isFlagship,
      dataStart: ptStart,
      dataCount,
      dataStreamPhase: 0,
      coreRot: new THREE.Euler(),
      cageRot: new THREE.Euler(),
      codeRotY: 0,
      wireRotY: 0,
      dataRingRot: new THREE.Euler(0.28, 0, -0.14),
      ringRots: [
        new THREE.Euler(0, 0, 0),
        new THREE.Euler(0.92, 0.65, 0.42),
        new THREE.Euler(1.84, 1.30, 0.84),
      ],
      ringRadii: [radius * 0.35, radius * 0.46, radius * 0.57],
      verdictHoloGroup,
      updateVerdictHologram,
      updateProjection,
      armorMats: [hullCowlMat, plateMat, digitalModuleMat, gimbalTrackMat],
      coreMat: {
        _val: 1.9,
        get emissiveIntensity() { return this._val; },
        set emissiveIntensity(v) {
          if (Math.abs(v - this._val) < 0.01) return;
          this._val = v;
          _tmpColor.setHex(accentColor).multiplyScalar(Math.max(0.05, v / 1.9));
          coreInst.setColorAt(sIdx, _tmpColor);
          if (coreInst.instanceColor) coreInst.instanceColor.needsUpdate = true;
        },
      },
      outerMat: {
        _val: 0.9,
        get emissiveIntensity() { return this._val; },
        set emissiveIntensity(v) {
          this._val = v;
          outerShellMat.uniforms.uEmissiveScale.value = Math.max(0.05, v / 0.9);
        },
      },
      dataRingBandMat,
      dataRingCoreMat,
      setArmorAperture: null, // Заполняется после создания plateInst/modInst
    };
  });

  // Завершаем настройку геометрических батчей и инстансов
  outerGeo.setAttribute('aUvRect', new THREE.InstancedBufferAttribute(uvRectArray, 4));
  outerGeo.setAttribute('aWaveAmp', new THREE.InstancedBufferAttribute(waveAmpArray, 1));
  if (coreInst.instanceColor) coreInst.instanceColor.needsUpdate = true;
  if (coreAuraInst.instanceColor) coreAuraInst.instanceColor.needsUpdate = true;
  if (codeSphereInst.instanceColor) codeSphereInst.instanceColor.needsUpdate = true;
  if (dataRingBandInst.instanceColor) dataRingBandInst.instanceColor.needsUpdate = true;
  if (dataRingCoreInst.instanceColor) dataRingCoreInst.instanceColor.needsUpdate = true;
  if (outerShellInst.instanceColor) outerShellInst.instanceColor.needsUpdate = true;
  if (gimbalTrackInst.instanceColor) gimbalTrackInst.instanceColor.needsUpdate = true;

  [
    coreInst, coreCageInst, coreAuraInst, wireShellInst, codeSphereInst,
    dataRingBandInst, dataRingCoreInst, gimbalBodyInst, gimbalTrackInst, outerShellInst,
  ].forEach(inst => {
    inst.frustumCulled = false;
    scene.add(inst);
  });

  scene.add(new THREE.Mesh(mergePreparedGeometries(cowlGeos), hullCowlMat));
  scene.add(new THREE.Mesh(mergePreparedGeometries(structRingGeos), structRingMat));

  // Бронепластины + цифровые модули всех 4 сфер (единичный базовый размер scale=radius)
  const plateGeo = createBeveledTechPlateGeometry(0.38, 0.26, 0.032);
  const modGeo = createBeveledTechPlateGeometry(0.22, 0.10, 0.018);
  const plateInst = new THREE.InstancedMesh(plateGeo, plateMat, allPlates.length);
  const modInst = new THREE.InstancedMesh(modGeo, digitalModuleMat, allMods.length);
  plateInst.frustumCulled = false;
  modInst.frustumCulled = false;

  for (let i = 0; i < allPlates.length; i++) {
    _tmpColor.setHex(allPlates[i].colorHex);
    plateInst.setColorAt(i, _tmpColor);
  }
  for (let i = 0; i < allMods.length; i++) {
    _tmpColor.setHex(allMods[i].colorHex);
    modInst.setColorAt(i, _tmpColor);
  }
  if (plateInst.instanceColor) plateInst.instanceColor.needsUpdate = true;
  if (modInst.instanceColor) modInst.instanceColor.needsUpdate = true;
  scene.add(plateInst, modInst);

  sphereRigs.forEach((rig, sIdx) => {
    const [pStart, pEnd] = spherePlateRanges[sIdx];
    const [mStart, mEnd] = sphereModRanges[sIdx];
    let lastArmorOpen = -1;
    rig.setArmorAperture = (openAmt = 0) => {
      const clamped = Math.min(1, Math.max(0, openAmt));
      if (Math.abs(clamped - lastArmorOpen) < 0.002) return;
      lastArmorOpen = clamped;
      const expand = rig.radius * 0.095 * clamped;
      const tiltAngle = clamped * 0.24;

      for (let i = pStart; i < pEnd; i++) {
        const p = allPlates[i];
        const rNow = p.rBase + expand * (p.tier === 0 ? 0.72 : 1.15);
        _tmpDummy.position.set(p.cx + p.nx * rNow, p.cy + p.ny * rNow, p.cz + p.nz * rNow);
        _tmpDummy.lookAt(p.cx + p.nx * rNow * 2, p.cy + p.ny * rNow * 2, p.cz + p.nz * rNow * 2);
        _tmpDummy.rotateX(tiltAngle * (p.ny >= 0 ? -1 : 1));
        _tmpDummy.scale.set(p.radius * p.scale, p.radius * p.scale, p.radius);
        _tmpDummy.updateMatrix();
        plateInst.setMatrixAt(i, _tmpDummy.matrix);
      }
      for (let i = mStart; i < mEnd; i++) {
        const m = allMods[i];
        const rNow = m.rBase + expand * (m.tier === 0 ? 0.82 : 1.25);
        _tmpDummy.position.set(m.cx + m.nx * rNow, m.cy + m.ny * rNow, m.cz + m.nz * rNow);
        _tmpDummy.lookAt(m.cx + m.nx * rNow * 2, m.cy + m.ny * rNow * 2, m.cz + m.nz * rNow * 2);
        _tmpDummy.rotateX(tiltAngle * (m.ny >= 0 ? -1 : 1));
        _tmpDummy.scale.set(m.radius * m.scale, m.radius * m.scale, m.radius);
        _tmpDummy.updateMatrix();
        modInst.setMatrixAt(i, _tmpDummy.matrix);
      }
      plateInst.instanceMatrix.needsUpdate = true;
      modInst.instanceMatrix.needsUpdate = true;
    };
    rig.setArmorAperture(0);
    rig.updateProjection('idle', 'STANDBY // CORE LOCKED');
  });

  // Единый THREE.Points для потоковых частиц всех 4 сфер (1 draw call)
  const dataGeo = new THREE.BufferGeometry();
  const dataPosAttr = new THREE.BufferAttribute(sharedDataPos, 3);
  dataPosAttr.setUsage(THREE.DynamicDrawUsage);
  dataGeo.setAttribute('position', dataPosAttr);
  dataGeo.setAttribute('aColor', new THREE.BufferAttribute(sharedDataCol, 3));
  dataGeo.setAttribute('aSize', new THREE.BufferAttribute(sharedDataSize, 1));
  const dataPoints = new THREE.Points(dataGeo, createSharedDataPointsMat(dataPointSpriteTex));
  dataPoints.frustumCulled = false;
  scene.add(dataPoints);

  function updateChamberDust(dt, activity = 1.0) {
    const arr = dataPosAttr.array;
    const speed = (0.14 + activity * 0.1) * dt;
    for (let i = 0; i < chamberDustCount; i++) {
      const b = (totalSphereDataPts + i) * 3;
      const ph = chamberDustPhase[i] + dt * 1.1;
      chamberDustPhase[i] = ph;
      arr[b] += Math.sin(ph + i * 0.13) * 0.06 * dt;
      arr[b + 1] += speed;
      arr[b + 2] += Math.cos(ph * 0.8 + i * 0.19) * 0.06 * dt;
      if (arr[b + 1] > 2.95) arr[b + 1] = -1.95;
    }
  }

  // Силовые кабели агентов объединены в 1 draw call
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 });
  const cableEndTargets = [
    new THREE.Vector3(-half, -half + 0.1, half),
    new THREE.Vector3(0, -half + 0.1, half),
    new THREE.Vector3(half, -half + 0.1, half),
  ];
  const cableGeos = agentSpecs.map((spec, idx) => {
    const start = spec.posVec;
    const end = cableEndTargets[idx];
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.y -= 0.24;
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const tube = new THREE.TubeGeometry(curve, 20, 0.036, 8, false);
    const prepared = prepareGeometry(tube);
    tube.dispose();
    return prepared;
  });
  scene.add(new THREE.Mesh(mergePreparedGeometries(cableGeos), cableMat));

  // Присоединяем вспомогательную функцию обновления инстансов к каждому сферическому ригу
  const agentSpheres = sphereRigs.slice(0, 3);
  const flagshipSphere = sphereRigs[3];

  function updateSphereInstance(sphere, dt, t, intensity = 1.0) {
    const { sIdx, radius, position } = sphere;

    sphere.coreRot.y += dt * 1.1 * intensity;
    sphere.coreRot.x += dt * 0.7 * intensity;
    const pulse = 0.94 + Math.sin(t * 3.8) * 0.08 * intensity;
    _tmpQuat.setFromEuler(sphere.coreRot);
    _tmpScale.setScalar(radius * pulse);
    _tmpMat4.compose(position, _tmpQuat, _tmpScale);
    coreInst.setMatrixAt(sIdx, _tmpMat4);

    sphere.cageRot.y -= dt * 0.65 * intensity;
    sphere.cageRot.z += dt * 0.45 * intensity;
    _tmpQuat.setFromEuler(sphere.cageRot);
    _tmpScale.setScalar(radius);
    _tmpMat4.compose(position, _tmpQuat, _tmpScale);
    coreCageInst.setMatrixAt(sIdx, _tmpMat4);

    sphere.codeRotY += dt * 0.25 * intensity;
    _tmpEuler.set(0, sphere.codeRotY, 0);
    _tmpQuat.setFromEuler(_tmpEuler);
    _tmpMat4.compose(position, _tmpQuat, _tmpScale);
    codeSphereInst.setMatrixAt(sIdx, _tmpMat4);

    sphere.wireRotY -= dt * 0.12 * intensity;
    _tmpEuler.set(0, sphere.wireRotY, 0);
    _tmpQuat.setFromEuler(_tmpEuler);
    _tmpMat4.compose(position, _tmpQuat, _tmpScale);
    wireShellInst.setMatrixAt(sIdx, _tmpMat4);

    sphere.dataRingRot.y += dt * 0.42 * intensity;
    const ringR = radius * (sphere.isFlagship ? 1.24 : 1.28);
    _tmpQuat.setFromEuler(sphere.dataRingRot);
    _tmpScale.setScalar(ringR);
    _tmpMat4.compose(position, _tmpQuat, _tmpScale);
    dataRingBandInst.setMatrixAt(sIdx, _tmpMat4);

    _tmpEuler.set(Math.PI / 2, 0, 0);
    _tmpDummy.quaternion.copy(_tmpQuat).multiply(_tmpQuat.setFromEuler(_tmpEuler));
    _tmpMat4.compose(position, _tmpDummy.quaternion, _tmpScale);
    dataRingCoreInst.setMatrixAt(sIdx, _tmpMat4);

    for (let r = 0; r < 3; r++) {
      const rEuler = sphere.ringRots[r];
      rEuler.x += dt * (0.55 + r * 0.25) * intensity * (r % 2 === 0 ? 1 : -1);
      rEuler.y += dt * (0.7 + r * 0.2) * intensity;
      _tmpQuat.setFromEuler(rEuler);
      _tmpScale.setScalar(sphere.ringRadii[r]);
      _tmpMat4.compose(position, _tmpQuat, _tmpScale);
      const flatIdx = sIdx * 3 + r;
      gimbalBodyInst.setMatrixAt(flatIdx, _tmpMat4);
      gimbalTrackInst.setMatrixAt(flatIdx, _tmpMat4);
    }

    sphere.dataStreamPhase += dt * intensity;
    const arr = dataPosAttr.array;
    const dEnd = sphere.dataStart + sphere.dataCount;
    for (let i = sphere.dataStart; i < dEnd; i++) {
      computeDataStreamPoint(radius, baseThetas[i], basePhis[i], baseScales[i], sphere.dataStreamPhase, i - sphere.dataStart, _streamPt);
      const b = i * 3;
      arr[b] = position.x + _streamPt.x;
      arr[b + 1] = position.y + _streamPt.y;
      arr[b + 2] = position.z + _streamPt.z;
    }

    if (sphere.isFlagship) {
      sharedCodeTex.offset.y -= dt * 0.18 * intensity;
      sharedCodeTex.offset.x += dt * 0.06 * intensity;
      sharedDataRingTex.offset.x -= dt * 0.16 * intensity;
      outerShellMat.uniforms.uTime.value = t * intensity;

      coreInst.instanceMatrix.needsUpdate = true;
      coreCageInst.instanceMatrix.needsUpdate = true;
      codeSphereInst.instanceMatrix.needsUpdate = true;
      wireShellInst.instanceMatrix.needsUpdate = true;
      dataRingBandInst.instanceMatrix.needsUpdate = true;
      dataRingCoreInst.instanceMatrix.needsUpdate = true;
      gimbalBodyInst.instanceMatrix.needsUpdate = true;
      gimbalTrackInst.instanceMatrix.needsUpdate = true;
      dataPosAttr.needsUpdate = true;
    }
  }

  sphereRigs.forEach(s => {
    s._updateInstance = (dt, t, intensity) => updateSphereInstance(s, dt, t, intensity);
  });
  // Инициализация стартовых матриц всех инстансов
  sphereRigs.forEach(s => updateSphereInstance(s, 0, 0, 1));

  return { agentSpecs, agentSpheres, flagshipPos, flagshipSphere, updateChamberDust };
}

export function updateTechnosphereAnimation(sphere, dt, t, intensity = 1.0) {
  sphere._updateInstance?.(dt, t, intensity);
}
