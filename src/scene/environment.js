import * as THREE from 'three';
import { configureCrispTexture, createLogoTextureAndFallback, heightCanvasToNormalTex } from '../core/textures.js';
import { prepareGeometry, mergePreparedGeometries } from '../core/geometryMerge.js';
import { createTunnelPulseLinesMat } from '../core/shaders.js';
import { LOGO_ASSET_URL, CUBE_SIZE } from '../config/constants.js';

export function createBalancedSpace(scene, deviceProfileOrIsMobile) {
  const isMobile = typeof deviceProfileOrIsMobile === 'boolean'
    ? deviceProfileOrIsMobile
    : Boolean(deviceProfileOrIsMobile?.isMobileLayout);
  const profile = typeof deviceProfileOrIsMobile === 'object' && deviceProfileOrIsMobile !== null
    ? deviceProfileOrIsMobile
    : {
      starCount: isMobile ? 1600 : 2600,
      galaxyParticleScale: isMobile ? 0.72 : 1.0,
      galaxyNebulaLayers: isMobile ? 1 : 2,
      parallaxDepthMul: isMobile ? 0.65 : 1.0,
    };

  const spaceGroup = new THREE.Group();

  const starCount = profile.starCount || 2200;
  const sPos = new Float32Array(starCount * 3);
  const sCol = new Float32Array(starCount * 3);
  const sSeed = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xc4b5fd),
    new THREE.Color(0x93c5fd),
    new THREE.Color(0xfde68a),
    new THREE.Color(0xe879f9),
    new THREE.Color(0x67e8f9),
  ];
  for (let i = 0; i < starCount; i++) {
    const layer = i % 10;
    let r;
    if (layer === 0) {
      r = 21 + Math.random() * 14; // передний слой параллакса
    } else if (layer < 5) {
      r = 36 + Math.random() * 44; // средний глубокий слой
    } else {
      r = 80 + Math.random() * 78; // дальняя космическая бездна
    }
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    sPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    sPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 8;
    sPos[i * 3 + 2] = r * Math.cos(phi) - 12;
    const col = palette[i % palette.length];
    const dim = layer >= 5 ? 0.72 : 1.0;
    sCol[i * 3] = col.r * dim; sCol[i * 3 + 1] = col.g * dim; sCol[i * 3 + 2] = col.b * dim;
    sSeed[i * 3] = Math.random() * Math.PI * 2;
    sSeed[i * 3 + 1] = 0.7 + Math.random() * 2.5;
    sSeed[i * 3 + 2] = (layer === 0 ? 1.15 : (layer >= 5 ? 0.52 : 0.78)) + Math.random() * 0.55;
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

  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('aStarColor', new THREE.BufferAttribute(sCol, 3));
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 3));

  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: isMobile ? 18.0 : 23.0 },
      uMap: { value: starOrbTex },
    },
    vertexShader: `
      attribute vec3 aStarColor;
      attribute vec3 aSeed;
      uniform float uTime;
      uniform float uPointSize;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = aStarColor;
        vTwinkle = 0.62 + 0.38 * sin(uTime * aSeed.y + aSeed.x);
        vec3 drifted = position + vec3(
          sin(uTime * 0.08 + aSeed.x) * 0.35,
          cos(uTime * 0.06 + aSeed.x * 1.3) * 0.25,
          0.0
        );
        vec4 mvPosition = modelViewMatrix * vec4(drifted, 1.0);
        gl_PointSize = clamp((uPointSize * aSeed.z * (0.86 + 0.18 * vTwinkle)) / max(1.0, -mvPosition.z * 0.075), 1.4, 8.6);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        if (tex.a < 0.02) discard;
        gl_FragColor = vec4(vColor * tex.rgb, tex.a * 0.90 * vTwinkle);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  spaceGroup.add(new THREE.Points(sGeo, starMat));

  const makeGalaxyCombinedGlowTex = (coreColorHex, haloColorHex, coreOp, haloOp) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const cCol = new THREE.Color(coreColorHex);
    const hCol = new THREE.Color(haloColorHex);
    const gHalo = ctx.createRadialGradient(128, 128, 2, 128, 128, 126);
    gHalo.addColorStop(0, `rgba(${Math.round(hCol.r * 255)}, ${Math.round(hCol.g * 255)}, ${Math.round(hCol.b * 255)}, ${haloOp})`);
    gHalo.addColorStop(0.45, `rgba(${Math.round(hCol.r * 255)}, ${Math.round(hCol.g * 255)}, ${Math.round(hCol.b * 255)}, ${(haloOp * 0.42).toFixed(3)})`);
    gHalo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gHalo;
    ctx.fillRect(0, 0, 256, 256);

    const gCore = ctx.createRadialGradient(128, 128, 1, 128, 128, 76);
    gCore.addColorStop(0, `rgba(${Math.round(cCol.r * 255)}, ${Math.round(cCol.g * 255)}, ${Math.round(cCol.b * 255)}, ${coreOp})`);
    gCore.addColorStop(0.32, `rgba(${Math.round(cCol.r * 255)}, ${Math.round(cCol.g * 255)}, ${Math.round(cCol.b * 255)}, ${(coreOp * 0.45).toFixed(3)})`);
    gCore.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gCore;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const makeGalaxyNebulaDiskTex = (innerHex, outerHex, arms) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const cIn = new THREE.Color(innerHex);
    const cOut = new THREE.Color(outerHex);
    ctx.clearRect(0, 0, 256, 256);
    for (let a = 0; a < arms; a++) {
      for (let step = 4; step < 96; step += 2) {
        const t = step / 96;
        const ang = (a * Math.PI * 2) / arms + Math.log(1 + t * 4.2) * 2.1;
        const px = 128 + Math.cos(ang) * step * 1.15;
        const py = 128 + Math.sin(ang) * step * 1.15;
        const rad = 14 + t * 24;
        const mixCol = cIn.clone().lerp(cOut, t);
        const alpha = (1 - t) * 0.085;
        const g = ctx.createRadialGradient(px, py, 1, px, py, rad);
        g.addColorStop(0, `rgba(${Math.round(mixCol.r * 255)},${Math.round(mixCol.g * 255)},${Math.round(mixCol.b * 255)},${alpha.toFixed(3)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const createRealisticGalaxy = (cfg) => {
    const tiltGroup = new THREE.Group();
    const diskGroup = new THREE.Group();
    const count = Math.max(900, Math.round(cfg.count * (profile.galaxyParticleScale || 1.0)));
    const gPos = new Float32Array(count * 3);
    const gCol = new Float32Array(count * 3);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const arm = i % cfg.arms;
      const radialT = Math.pow(Math.random(), cfg.radialPow);
      const dist = radialT * cfg.radius;
      const isCoreBulge = radialT < 0.18;
      const isHaloCluster = i % 14 === 0;

      let px, py, pz;
      if (isHaloCluster) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const hr = (0.18 + Math.random() * 0.72) * cfg.radius;
        px = hr * Math.sin(phi) * Math.cos(theta);
        py = hr * Math.cos(phi) * 0.42;
        pz = hr * Math.sin(phi) * Math.sin(theta);
      } else if (isCoreBulge) {
        const theta = Math.random() * Math.PI * 2;
        const bulgeR = Math.pow(Math.random(), 0.7) * cfg.radius * 0.21;
        px = Math.cos(theta) * bulgeR * cfg.barStretch;
        py = (Math.random() - 0.5) * 1.15 * (1 - bulgeR / (cfg.radius * 0.28));
        pz = Math.sin(theta) * bulgeR;
      } else {
        const logAngle = Math.log(1 + dist * cfg.twist) * cfg.armTightness;
        const scatter = (Math.random() - 0.5) * (0.28 + radialT * cfg.scatterScale);
        const angle = logAngle + (arm * Math.PI * 2) / cfg.arms + scatter;
        px = Math.cos(angle) * dist;
        py = (Math.random() - 0.5) * (0.68 / (1 + dist * 0.34));
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
      const lum = (isHaloCluster ? 0.55 : 0.68) + Math.random() * 0.34;
      gCol[i * 3] = tmpCol.r * lum;
      gCol[i * 3 + 1] = tmpCol.g * lum;
      gCol[i * 3 + 2] = tmpCol.b * lum;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
    diskGroup.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: cfg.starSize,
      map: starOrbTex,
      alphaTest: 0.008,
      vertexColors: true,
      transparent: true,
      opacity: cfg.starOpacity || 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })));

    if ((profile.galaxyNebulaLayers || 1) >= 2) {
      const dustTex = makeGalaxyNebulaDiskTex(cfg.coreGlowHex, cfg.haloGlowHex, cfg.arms);
      const dustDisk = new THREE.Mesh(
        new THREE.PlaneGeometry(cfg.radius * 2.1, cfg.radius * 2.1),
        new THREE.MeshBasicMaterial({
          map: dustTex,
          transparent: true,
          opacity: profile.galaxyNebulaLayers >= 3 ? 0.92 : 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      dustDisk.rotation.x = -Math.PI / 2;
      diskGroup.add(dustDisk);
    }

    const combinedGlowTex = makeGalaxyCombinedGlowTex(
      cfg.coreGlowHex, cfg.haloGlowHex, cfg.coreGlowOpacity, cfg.haloGlowOpacity
    );
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: combinedGlowTex,
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    glowSprite.scale.set(...cfg.haloGlowScale);
    diskGroup.add(glowSprite);

    tiltGroup.add(diskGroup);
    tiltGroup.position.set(...cfg.pos);
    tiltGroup.rotation.set(...cfg.rot);
    tiltGroup.scale.setScalar(cfg.scale);
    spaceGroup.add(tiltGroup);
    return { diskGroup, tiltGroup, basePos: [...cfg.pos] };
  };

  const gLeftSpiral = createRealisticGalaxy({
    pos: isMobile ? [-13.6, 19.6, -54] : [-24.5, 21.4, -56],
    rot: [0.64, 0.28, 0.34],
    scale: isMobile ? 0.96 : 1.32,
    count: 2300,
    arms: 2,
    radius: 10.8,
    radialPow: 1.48,
    barStretch: 1.0,
    twist: 1.35,
    armTightness: 2.85,
    scatterScale: 0.62,
    starSize: 0.27,
    starOpacity: 0.92,
    coreColor: new THREE.Color(0xfffbeb),
    midColor: new THREE.Color(0x93c5fd),
    outerColor: new THREE.Color(0x6366f1),
    haloColor: new THREE.Color(0xc084fc),
    coreGlowHex: 0xfff7ed,
    coreGlowOpacity: 0.50,
    coreGlowScale: [6.8, 4.6, 1],
    haloGlowHex: 0x60a5fa,
    haloGlowOpacity: 0.24,
    haloGlowScale: [14.5, 9.6, 1],
  });

  const gRightBarred = createRealisticGalaxy({
    pos: isMobile ? [14.4, 21.2, -58] : [25.6, 23.6, -60],
    rot: [1.08, -0.46, -0.42],
    scale: isMobile ? 1.0 : 1.40,
    count: 2600,
    arms: 4,
    radius: 11.4,
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
    coreGlowOpacity: 0.56,
    coreGlowScale: [8.8, 4.1, 1],
    haloGlowHex: 0xf472b6,
    haloGlowOpacity: 0.26,
    haloGlowScale: [17.0, 7.8, 1],
  });

  scene.add(spaceGroup);

  function updateSpace(dt, t, camPos = null) {
    starMat.uniforms.uTime.value = t;
    gLeftSpiral.diskGroup.rotation.y += dt * 0.042;
    gRightBarred.diskGroup.rotation.y -= dt * 0.036;
    if (camPos) {
      const pMul = (profile.parallaxDepthMul || 1.0) * 0.035;
      spaceGroup.rotation.y = Math.max(-0.08, Math.min(0.08, -camPos.x * pMul * 0.08));
      spaceGroup.rotation.x = Math.max(-0.05, Math.min(0.05, camPos.y * pMul * 0.02));
    }
  }

  return {
    spaceGroup,
    galaxies: [gLeftSpiral.diskGroup, gRightBarred.diskGroup],
    updateSpace,
  };
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
    new THREE.MeshBasicMaterial({ map: initialLogoTex, transparent: true, depthWrite: false, toneMapped: false })
  );
  logoMeshGroup.add(logoMesh);
  return logoMeshGroup;
}

function createTunnelArmorMaps(maxAnisotropy) {
  const size = 512;
  const colC = document.createElement('canvas'); colC.width = colC.height = size;
  const colCtx = colC.getContext('2d');
  const bumpC = document.createElement('canvas'); bumpC.width = bumpC.height = size;
  const bumpCtx = bumpC.getContext('2d');
  const roughC = document.createElement('canvas'); roughC.width = roughC.height = size;
  const roughCtx = roughC.getContext('2d');
  const emC = document.createElement('canvas'); emC.width = emC.height = size;
  const emCtx = emC.getContext('2d');

  colCtx.fillStyle = '#090d1a';
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#585858';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#686868';
  roughCtx.fillRect(0, 0, size, size);
  emCtx.fillStyle = '#000000';
  emCtx.fillRect(0, 0, size, size);

  // Микрошлифовка и следы техно-износа вдоль туннеля
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const h = 10 + Math.random() * 44;
    const v = 14 + Math.floor(Math.random() * 24);
    colCtx.fillStyle = `rgba(${v + 8}, ${v + 12}, ${v + 30}, 0.28)`;
    colCtx.fillRect(x, y, 1.4, h);
    bumpCtx.fillStyle = `rgba(${100 + v}, ${100 + v}, ${100 + v}, 0.16)`;
    bumpCtx.fillRect(x, y, 1.2, h * 0.7);
  }

  // Тяжёлые секционные бронеплиты 2x4 с глубокими швами, фасками и заклёпками
  const cols = 2;
  const rows = 4;
  const cw = size / cols;
  const ch = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * cw;
      const py = r * ch;
      const pad = 8;

      // Глубокий стык между плитами
      colCtx.strokeStyle = '#03050c';
      colCtx.lineWidth = 7;
      colCtx.strokeRect(px, py, cw, ch);
      bumpCtx.strokeStyle = '#121212';
      bumpCtx.lineWidth = 8;
      bumpCtx.strokeRect(px, py, cw, ch);

      // Рельефная приподнятая бронеплита с металлической фаской
      const isAlt = (r + c) % 2 === 0;
      colCtx.fillStyle = isAlt ? '#131b31' : '#0f1629';
      colCtx.fillRect(px + pad, py + pad, cw - pad * 2, ch - pad * 2);
      colCtx.strokeStyle = 'rgba(148, 163, 184, 0.26)';
      colCtx.lineWidth = 2;
      colCtx.strokeRect(px + pad + 2, py + pad + 2, cw - pad * 2 - 4, ch - pad * 2 - 4);

      bumpCtx.fillStyle = isAlt ? '#cecece' : '#aeaeae';
      bumpCtx.fillRect(px + pad + 2, py + pad + 2, cw - pad * 2 - 4, ch - pad * 2 - 4);
      roughCtx.fillStyle = isAlt ? '#404040' : '#767676';
      roughCtx.fillRect(px + pad + 2, py + pad + 2, cw - pad * 2 - 4, ch - pad * 2 - 4);

      // Внутренний утопленный технический канал / жалюзи охлаждения
      const innerX = px + 24;
      const innerY = py + 22;
      const innerW = cw - 48;
      const innerH = ch - 44;
      colCtx.fillStyle = '#070b15';
      colCtx.fillRect(innerX, innerY, innerW, innerH);
      bumpCtx.fillStyle = '#383838';
      bumpCtx.fillRect(innerX, innerY, innerW, innerH);
      roughCtx.fillStyle = '#8e8e8e';
      roughCtx.fillRect(innerX, innerY, innerW, innerH);

      // Поперечные рёбра жёсткости внутри ниши
      for (let lv = 0; lv < 4; lv++) {
        const ly = innerY + 12 + lv * ((innerH - 20) / 4);
        colCtx.fillStyle = '#1e293b';
        colCtx.fillRect(innerX + 8, ly, innerW - 16, 7);
        bumpCtx.fillStyle = '#dcdcdc';
        bumpCtx.fillRect(innerX + 8, ly, innerW - 16, 6);
        roughCtx.fillStyle = '#323232';
        roughCtx.fillRect(innerX + 8, ly, innerW - 16, 6);
      }

      // Угловые болты крепления
      const rivets = [
        [px + 16, py + 16],
        [px + cw - 16, py + 16],
        [px + 16, py + ch - 16],
        [px + cw - 16, py + ch - 16],
      ];
      rivets.forEach(([rx, ry]) => {
        colCtx.fillStyle = '#04070e';
        colCtx.beginPath(); colCtx.arc(rx, ry, 4.5, 0, Math.PI * 2); colCtx.fill();
        colCtx.fillStyle = '#94a3b8';
        colCtx.beginPath(); colCtx.arc(rx, ry, 2.4, 0, Math.PI * 2); colCtx.fill();
        bumpCtx.fillStyle = '#f2f2f2';
        bumpCtx.beginPath(); bumpCtx.arc(rx, ry, 3.2, 0, Math.PI * 2); bumpCtx.fill();
      });

      // Тонкие оптоволоконные линии вдоль швов
      emCtx.strokeStyle = r % 2 === 0 ? '#38bdf8' : '#8b5cf6';
      emCtx.lineWidth = 2.6;
      emCtx.beginPath();
      emCtx.moveTo(px + 10, py + 3);
      emCtx.lineTo(px + cw - 10, py + 3);
      emCtx.stroke();
      if (c === 0) {
        emCtx.fillStyle = '#38bdf8';
        emCtx.fillRect(px + cw - 5, py + 18, 3, ch - 36);
      }
    }
  }

  const repeatX = 2;
  const repeatZ = 22;

  const colorTex = new THREE.CanvasTexture(colC);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(repeatX, repeatZ);
  configureCrispTexture(colorTex, maxAnisotropy, true);

  const normalTex = heightCanvasToNormalTex(bumpC, 4.4, repeatX, repeatZ, maxAnisotropy);

  const roughTex = new THREE.CanvasTexture(roughC);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(repeatX, repeatZ);
  configureCrispTexture(roughTex, maxAnisotropy, false);

  const emissiveTex = new THREE.CanvasTexture(emC);
  emissiveTex.wrapS = emissiveTex.wrapT = THREE.RepeatWrapping;
  emissiveTex.repeat.set(repeatX, repeatZ);
  configureCrispTexture(emissiveTex, maxAnisotropy, true);

  return { colorTex, normalTex, roughTex, emissiveTex };
}

export function createRearTunnel(cyberArmorMat, maxAnisotropy = 4) {
  const rearTunnelGroup = new THREE.Group();
  const tunnelLen = 96;
  const tunnelSpan = CUBE_SIZE - 0.12;
  const tunnelWallThick = 0.26;
  const innerSpan = tunnelSpan - tunnelWallThick * 2;

  const armorMaps = createTunnelArmorMaps(maxAnisotropy);

  const tunnelArmorMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    map: armorMaps.colorTex,
    normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(1.75, 1.75),
    roughnessMap: armorMaps.roughTex,
    roughness: 0.36,
    metalness: 0.88,
    emissive: 0xffffff,
    emissiveMap: armorMaps.emissiveTex,
    emissiveIntensity: 0.68,
  });

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3(1, 1, 1);

  function buildTransformedGeo(srcGeo, px, py, pz, rx = 0, ry = 0, rz = 0, order = 'XYZ', colorHex = null) {
    _e.set(rx, ry, rz, order);
    _q.setFromEuler(_e);
    _p.set(px, py, pz);
    _m.compose(_p, _q, _s);
    return prepareGeometry(srcGeo, _m, colorHex);
  }

  // Объединённая рельефная внутренняя обшивка на 4 стенах (1 draw call)
  const wallPanelGeo = new THREE.PlaneGeometry(innerSpan, tunnelLen);
  const armorWallGeos = [
    buildTransformedGeo(wallPanelGeo, 0, innerSpan / 2 - 0.005, -tunnelLen / 2 - 0.08, Math.PI / 2, 0, 0),
    buildTransformedGeo(wallPanelGeo, 0, -innerSpan / 2 + 0.005, -tunnelLen / 2 - 0.08, -Math.PI / 2, 0, 0),
    buildTransformedGeo(wallPanelGeo, -innerSpan / 2 + 0.005, 0, -tunnelLen / 2 - 0.08, Math.PI / 2, Math.PI / 2, 0, 'YXZ'),
    buildTransformedGeo(wallPanelGeo, innerSpan / 2 - 0.005, 0, -tunnelLen / 2 - 0.08, Math.PI / 2, -Math.PI / 2, 0, 'YXZ'),
  ];
  wallPanelGeo.dispose();
  rearTunnelGroup.add(new THREE.Mesh(mergePreparedGeometries(armorWallGeos), tunnelArmorMat));

  // Объединённые продольные рельсы (1 draw call) и внешний короб + трубы + шпангоуты (1 draw call через cyberArmorMat)
  const railOffset = innerSpan / 2 - 0.07;
  const tunnelRailGeo = new THREE.BoxGeometry(0.055, 0.055, tunnelLen - 2);
  const tunnelRailMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.46 });
  const conduitGeo = new THREE.CylinderGeometry(0.055, 0.055, tunnelLen - 2, 8);
  conduitGeo.rotateX(Math.PI / 2);

  const railGeos = [];
  const hBoxGeo = new THREE.BoxGeometry(tunnelSpan, tunnelWallThick, tunnelLen);
  const vBoxGeo = new THREE.BoxGeometry(tunnelWallThick, innerSpan, tunnelLen);
  const armorStructGeos = [
    buildTransformedGeo(hBoxGeo, 0, tunnelSpan / 2 - tunnelWallThick / 2, -tunnelLen / 2 - 0.08, 0, 0, 0, 'XYZ', 0x070a14),
    buildTransformedGeo(hBoxGeo, 0, -tunnelSpan / 2 + tunnelWallThick / 2, -tunnelLen / 2 - 0.08, 0, 0, 0, 'XYZ', 0x070a14),
    buildTransformedGeo(vBoxGeo, -tunnelSpan / 2 + tunnelWallThick / 2, 0, -tunnelLen / 2 - 0.08, 0, 0, 0, 'XYZ', 0x070a14),
    buildTransformedGeo(vBoxGeo, tunnelSpan / 2 - tunnelWallThick / 2, 0, -tunnelLen / 2 - 0.08, 0, 0, 0, 'XYZ', 0x070a14),
  ];
  hBoxGeo.dispose();
  vBoxGeo.dispose();
  [[-railOffset, railOffset], [railOffset, railOffset], [-railOffset, -railOffset], [railOffset, -railOffset]].forEach(([rx, ry]) => {
    railGeos.push(buildTransformedGeo(tunnelRailGeo, rx, ry, -tunnelLen / 2 - 0.08));
    armorStructGeos.push(buildTransformedGeo(conduitGeo, rx * 0.94, ry * 0.94, -tunnelLen / 2 - 0.08, 0, 0, 0, 'XYZ', 0x150929));
  });
  tunnelRailGeo.dispose();
  conduitGeo.dispose();
  rearTunnelGroup.add(new THREE.Mesh(mergePreparedGeometries(railGeos), tunnelRailMat));

  // Локальный свет туннеля для подчёркивания рельефа плит, шпангоутов и заклёпок
  const tunnelMouthLight = new THREE.PointLight(0x38bdf8, 3.2, 30, 1.35);
  tunnelMouthLight.position.set(0, 0.15, -5.8);
  rearTunnelGroup.add(tunnelMouthLight);

  const ringSteps = [-1.4, -3.5, -6.2, -9.6, -13.8, -19.0, -25.2, -32.6, -41.2, -51.0, -62.0, -74.0, -86.0, -95.0];
  const innerFrameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(innerSpan - 0.06, innerSpan - 0.06, 0.24));
  const frameBasePos = innerFrameGeo.getAttribute('position').array;
  const vertsPerRing = innerFrameGeo.getAttribute('position').count;
  const mergedLinePos = new Float32Array(ringSteps.length * vertsPerRing * 3);
  const mergedLineParity = new Float32Array(ringSteps.length * vertsPerRing);

  const outerRibTopGeo = new THREE.BoxGeometry(tunnelSpan + 0.14, 0.14, 0.28);
  const outerRibSideGeo = new THREE.BoxGeometry(0.14, tunnelSpan + 0.14, 0.28);
  const innerBulkheadTopGeo = new THREE.BoxGeometry(innerSpan - 0.04, 0.09, 0.24);
  const innerBulkheadSideGeo = new THREE.BoxGeometry(0.09, innerSpan - 0.04, 0.24);

  ringSteps.forEach((rz, idx) => {
    const parity = idx % 2 === 0 ? 0.0 : 1.0;
    const baseOffset = idx * vertsPerRing;
    for (let v = 0; v < vertsPerRing; v++) {
      mergedLinePos[(baseOffset + v) * 3] = frameBasePos[v * 3];
      mergedLinePos[(baseOffset + v) * 3 + 1] = frameBasePos[v * 3 + 1];
      mergedLinePos[(baseOffset + v) * 3 + 2] = frameBasePos[v * 3 + 2] + rz;
      mergedLineParity[baseOffset + v] = parity;
    }

    armorStructGeos.push(
      buildTransformedGeo(innerBulkheadTopGeo, 0, innerSpan / 2 - 0.045, rz, 0, 0, 0, 'XYZ', 0x150929),
      buildTransformedGeo(innerBulkheadTopGeo, 0, -innerSpan / 2 + 0.045, rz, 0, 0, 0, 'XYZ', 0x150929),
      buildTransformedGeo(innerBulkheadSideGeo, -innerSpan / 2 + 0.045, 0, rz, 0, 0, 0, 'XYZ', 0x150929),
      buildTransformedGeo(innerBulkheadSideGeo, innerSpan / 2 - 0.045, 0, rz, 0, 0, 0, 'XYZ', 0x150929)
    );

    if (idx % 2 === 0) {
      armorStructGeos.push(
        buildTransformedGeo(outerRibTopGeo, 0, tunnelSpan / 2 + 0.04, rz, 0, 0, 0, 'XYZ', 0x150929),
        buildTransformedGeo(outerRibTopGeo, 0, -tunnelSpan / 2 - 0.04, rz, 0, 0, 0, 'XYZ', 0x150929),
        buildTransformedGeo(outerRibSideGeo, -tunnelSpan / 2 - 0.04, 0, rz, 0, 0, 0, 'XYZ', 0x150929),
        buildTransformedGeo(outerRibSideGeo, tunnelSpan / 2 + 0.04, 0, rz, 0, 0, 0, 'XYZ', 0x150929)
      );
    }
  });
  innerFrameGeo.dispose();
  outerRibTopGeo.dispose();
  outerRibSideGeo.dispose();
  innerBulkheadTopGeo.dispose();
  innerBulkheadSideGeo.dispose();

  const tunnelEndCapGeo = new THREE.PlaneGeometry(tunnelSpan, tunnelSpan);
  armorStructGeos.push(
    buildTransformedGeo(tunnelEndCapGeo, 0, 0, -tunnelLen - 0.08, 0, 0, 0, 'XYZ', 0x030108)
  );
  tunnelEndCapGeo.dispose();

  rearTunnelGroup.add(new THREE.Mesh(mergePreparedGeometries(armorStructGeos), cyberArmorMat));

  // Все 14 колец импульсов объединены в 1 LineSegments draw call на GPU-шейдере
  const pulseLinesGeo = new THREE.BufferGeometry();
  pulseLinesGeo.setAttribute('position', new THREE.BufferAttribute(mergedLinePos, 3));
  pulseLinesGeo.setAttribute('aRingParity', new THREE.BufferAttribute(mergedLineParity, 1));
  const pulseLinesMat = createTunnelPulseLinesMat(tunnelLen);
  rearTunnelGroup.add(new THREE.LineSegments(pulseLinesGeo, pulseLinesMat));

  function updateTunnel(t, pulseSpeed = 1.6, activityBoost = 1.0) {
    armorMaps.emissiveTex.offset.y = -(t * 0.14 * pulseSpeed) % 1;
    tunnelArmorMat.emissiveIntensity = (0.52 + 0.22 * Math.sin(t * 2.2)) * activityBoost;
    tunnelRailMat.opacity = Math.min(0.88, (0.38 + 0.16 * Math.sin(t * 2.6)) * activityBoost);
    tunnelMouthLight.intensity = 2.6 + activityBoost * 1.1 + Math.sin(t * 3.1) * 0.35;
    pulseLinesMat.uniforms.uTime.value = t;
    pulseLinesMat.uniforms.uPulseSpeed.value = pulseSpeed;
    pulseLinesMat.uniforms.uBoost.value = activityBoost;
  }

  return { rearTunnelGroup, updateTunnel };
}
