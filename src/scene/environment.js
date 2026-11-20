import * as THREE from 'three';
import { configureCrispTexture, createLogoTextureAndFallback, heightCanvasToNormalTex } from '../core/textures.js';
import { LOGO_ASSET_URL, CUBE_SIZE } from '../config/constants.js';

export function createBalancedSpace(scene, isMobile) {
  const spaceGroup = new THREE.Group();

  const starCount = 2200;
  const sPos = new Float32Array(starCount * 3);
  const sCol = new Float32Array(starCount * 3);
  const sSeed = new Float32Array(starCount * 3);
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
    sSeed[i * 3] = Math.random() * Math.PI * 2;
    sSeed[i * 3 + 1] = 0.8 + Math.random() * 2.6;
    sSeed[i * 3 + 2] = 0.72 + Math.random() * 0.85;
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
  sGeo.setAttribute('aStarColor', new THREE.BufferAttribute(sCol, 3));
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 3));

  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: isMobile ? 18.0 : 22.0 },
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
        vTwinkle = 0.66 + 0.34 * sin(uTime * aSeed.y + aSeed.x);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp((uPointSize * aSeed.z * (0.88 + 0.16 * vTwinkle)) / max(1.0, -mvPosition.z * 0.08), 1.6, 8.0);
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
        gl_FragColor = vec4(vColor * tex.rgb, tex.a * 0.88 * vTwinkle);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  spaceGroup.add(new THREE.Points(sGeo, starMat));

  const createRealisticGalaxy = (cfg) => {
    const tiltGroup = new THREE.Group();
    const diskGroup = new THREE.Group();
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

    const coreSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaCoreTex,
      color: cfg.coreGlowHex,
      transparent: true,
      opacity: cfg.coreGlowOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    coreSprite.scale.set(...cfg.coreGlowScale);
    diskGroup.add(coreSprite);

    const haloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaCoreTex,
      color: cfg.haloGlowHex,
      transparent: true,
      opacity: cfg.haloGlowOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    haloSprite.scale.set(...cfg.haloGlowScale);
    diskGroup.add(haloSprite);

    tiltGroup.add(diskGroup);
    tiltGroup.position.set(...cfg.pos);
    tiltGroup.rotation.set(...cfg.rot);
    tiltGroup.scale.setScalar(cfg.scale);
    spaceGroup.add(tiltGroup);
    return diskGroup;
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

  function updateSpace(dt, t) {
    starMat.uniforms.uTime.value = t;
    gLeftSpiral.rotation.y += dt * 0.042;
    gRightBarred.rotation.y -= dt * 0.036;
  }

  return { spaceGroup, galaxies: [gLeftSpiral, gRightBarred], updateSpace };
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

  const tunnelHullMat = new THREE.MeshStandardMaterial({
    color: 0x070a14,
    roughness: 0.78,
    metalness: 0.45,
  });

  const tunnelArmorMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    map: armorMaps.colorTex,
    normalMap: armorMaps.normalTex,
    normalScale: new THREE.Vector2(1.75, 1.75),
    roughnessMap: armorMaps.roughTex,
    roughness: 0.36,
    metalness: 0.88,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
    emissive: 0xffffff,
    emissiveMap: armorMaps.emissiveTex,
    emissiveIntensity: 0.68,
  });

  // Внешний несущий короб туннеля
  const tunnelTop = new THREE.Mesh(new THREE.BoxGeometry(tunnelSpan, tunnelWallThick, tunnelLen), tunnelHullMat);
  tunnelTop.position.set(0, tunnelSpan / 2 - tunnelWallThick / 2, -tunnelLen / 2 - 0.08);
  const tunnelBottom = new THREE.Mesh(new THREE.BoxGeometry(tunnelSpan, tunnelWallThick, tunnelLen), tunnelHullMat);
  tunnelBottom.position.set(0, -tunnelSpan / 2 + tunnelWallThick / 2, -tunnelLen / 2 - 0.08);
  const tunnelLeft = new THREE.Mesh(new THREE.BoxGeometry(tunnelWallThick, innerSpan, tunnelLen), tunnelHullMat);
  tunnelLeft.position.set(-tunnelSpan / 2 + tunnelWallThick / 2, 0, -tunnelLen / 2 - 0.08);
  const tunnelRight = new THREE.Mesh(new THREE.BoxGeometry(tunnelWallThick, innerSpan, tunnelLen), tunnelHullMat);
  tunnelRight.position.set(tunnelSpan / 2 - tunnelWallThick / 2, 0, -tunnelLen / 2 - 0.08);
  rearTunnelGroup.add(tunnelTop, tunnelBottom, tunnelLeft, tunnelRight);

  // Рельефная внутренняя обшивка на 4 стенах с ровной развёрткой вдоль глубины Z
  const wallPanelGeo = new THREE.PlaneGeometry(innerSpan, tunnelLen);
  const innerTop = new THREE.Mesh(wallPanelGeo, tunnelArmorMat);
  innerTop.position.set(0, innerSpan / 2 - 0.005, -tunnelLen / 2 - 0.08);
  innerTop.rotation.x = Math.PI / 2;

  const innerBot = new THREE.Mesh(wallPanelGeo, tunnelArmorMat);
  innerBot.position.set(0, -innerSpan / 2 + 0.005, -tunnelLen / 2 - 0.08);
  innerBot.rotation.x = -Math.PI / 2;

  const innerLeft = new THREE.Mesh(wallPanelGeo, tunnelArmorMat);
  innerLeft.position.set(-innerSpan / 2 + 0.005, 0, -tunnelLen / 2 - 0.08);
  innerLeft.rotation.order = 'YXZ';
  innerLeft.rotation.y = Math.PI / 2;
  innerLeft.rotation.x = Math.PI / 2;

  const innerRight = new THREE.Mesh(wallPanelGeo, tunnelArmorMat);
  innerRight.position.set(innerSpan / 2 - 0.005, 0, -tunnelLen / 2 - 0.08);
  innerRight.rotation.order = 'YXZ';
  innerRight.rotation.y = -Math.PI / 2;
  innerRight.rotation.x = Math.PI / 2;

  rearTunnelGroup.add(innerTop, innerBot, innerLeft, innerRight);

  // Продольные силовые трубы-магистрали и неоновые рельсы по углам туннеля
  const railOffset = innerSpan / 2 - 0.07;
  const tunnelRailGeo = new THREE.BoxGeometry(0.055, 0.055, tunnelLen - 2);
  const tunnelRailMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.46 });
  const conduitGeo = new THREE.CylinderGeometry(0.055, 0.055, tunnelLen - 2, 8);
  conduitGeo.rotateX(Math.PI / 2);
  [[-railOffset, railOffset], [railOffset, railOffset], [-railOffset, -railOffset], [railOffset, -railOffset]].forEach(([rx, ry]) => {
    const rail = new THREE.Mesh(tunnelRailGeo, tunnelRailMat);
    rail.position.set(rx, ry, -tunnelLen / 2 - 0.08);
    const pipe = new THREE.Mesh(conduitGeo, cyberArmorMat);
    pipe.position.set(rx * 0.94, ry * 0.94, -tunnelLen / 2 - 0.08);
    rearTunnelGroup.add(rail, pipe);
  });

  // Локальный внутренний свет туннеля, чтобы рельефные рёбра, болты и фаски давали объёмный блик
  const tunnelMouthLight = new THREE.PointLight(0x38bdf8, 3.2, 30, 1.35);
  tunnelMouthLight.position.set(0, 0.15, -5.8);
  rearTunnelGroup.add(tunnelMouthLight);

  const ringSteps = [-1.4, -3.5, -6.2, -9.6, -13.8, -19.0, -25.2, -32.6, -41.2, -51.0, -62.0, -74.0, -86.0, -95.0];
  const innerFrameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(innerSpan - 0.06, innerSpan - 0.06, 0.24));
  const outerRibTopGeo = new THREE.BoxGeometry(tunnelSpan + 0.14, 0.14, 0.28);
  const outerRibSideGeo = new THREE.BoxGeometry(0.14, tunnelSpan + 0.14, 0.28);
  const innerBulkheadTopGeo = new THREE.BoxGeometry(innerSpan - 0.04, 0.09, 0.24);
  const innerBulkheadSideGeo = new THREE.BoxGeometry(0.09, innerSpan - 0.04, 0.24);

  const pulseRings = [];
  ringSteps.forEach((rz, idx) => {
    const depthFade = Math.max(0.10, 1 - idx / ringSteps.length);
    const frameMat = new THREE.LineBasicMaterial({
      color: idx % 2 === 0 ? 0x38bdf8 : 0xa855f7,
      transparent: true,
      opacity: 0.45 * depthFade,
    });
    const frameLine = new THREE.LineSegments(innerFrameGeo, frameMat);
    frameLine.position.z = rz;
    rearTunnelGroup.add(frameLine);

    // Внутренние физические шпангоуты для настоящего рельефа силуэта
    const inTop = new THREE.Mesh(innerBulkheadTopGeo, cyberArmorMat);
    inTop.position.set(0, innerSpan / 2 - 0.045, rz);
    const inBot = new THREE.Mesh(innerBulkheadTopGeo, cyberArmorMat);
    inBot.position.set(0, -innerSpan / 2 + 0.045, rz);
    const inL = new THREE.Mesh(innerBulkheadSideGeo, cyberArmorMat);
    inL.position.set(-innerSpan / 2 + 0.045, 0, rz);
    const inR = new THREE.Mesh(innerBulkheadSideGeo, cyberArmorMat);
    inR.position.set(innerSpan / 2 - 0.045, 0, rz);
    rearTunnelGroup.add(inTop, inBot, inL, inR);

    pulseRings.push({
      frameMat,
      depthFade,
      normZ: Math.abs(rz) / tunnelLen,
      isEven: idx % 2 === 0,
    });

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

  function updateTunnel(t, pulseSpeed = 1.6, activityBoost = 1.0) {
    armorMaps.emissiveTex.offset.y = -(t * 0.14 * pulseSpeed) % 1;
    tunnelArmorMat.emissiveIntensity = (0.52 + 0.22 * Math.sin(t * 2.2)) * activityBoost;
    tunnelRailMat.opacity = Math.min(0.88, (0.38 + 0.16 * Math.sin(t * 2.6)) * activityBoost);
    tunnelMouthLight.intensity = 2.6 + activityBoost * 1.1 + Math.sin(t * 3.1) * 0.35;

    for (let i = 0; i < pulseRings.length; i++) {
      const pr = pulseRings[i];
      const wave = Math.pow(0.5 + 0.5 * Math.sin(pr.normZ * Math.PI * 5.0 - t * pulseSpeed * 2.4), 4.0);
      pr.frameMat.opacity = Math.min(0.95, pr.depthFade * (0.28 + wave * 0.68 * activityBoost));
      pr.frameMat.color.setHex(wave > 0.62 ? 0x7dd3fc : (pr.isEven ? 0x38bdf8 : 0xa855f7));
    }
  }

  return { rearTunnelGroup, updateTunnel };
}
