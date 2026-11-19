import * as THREE from 'three';

export function configureCrispTexture(tex, maxAnisotropy = 4, srgb = true) {
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.max(1, maxAnisotropy || 1);
  tex.needsUpdate = true;
  return tex;
}

export function heightCanvasToNormalTex(canvas, strength = 2.6, repeatX = 1, repeatY = 1, maxAnisotropy = 4) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const src = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h * 4);
  const sampleH = (x, y) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sampleH(x - 1, y - 1);
      const t = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const l = sampleH(x - 1, y);
      const r = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const b = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;

      const idx = (y * w + x) * 4;
      out[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      out[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createBrushedMetalMaps(maxAnisotropy = 4) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const v = 96 + Math.floor(Math.random() * 68);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 28 + Math.random() * 64, 1);
  }
  const roughTex = new THREE.CanvasTexture(c);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(3, 3);
  configureCrispTexture(roughTex, maxAnisotropy, false);
  const normalTex = heightCanvasToNormalTex(c, 1.85, 3, 3, maxAnisotropy);
  return { roughTex, normalTex };
}

export function createPaperNormalTex(maxAnisotropy = 4) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const v = 120 + Math.floor(Math.random() * 18);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 4, 1);
  }
  return heightCanvasToNormalTex(c, 0.22, 4, 5, maxAnisotropy);
}

export function createPointSpriteTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.35, 'rgba(186, 230, 253, 0.85)');
  g.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCloudOrbTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(186,230,253,0.85)');
  g.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBeamFalloffTex() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
  g.addColorStop(0.2, 'rgba(56, 189, 248, 0.55)');
  g.addColorStop(0.85, 'rgba(186, 230, 253, 0.9)');
  g.addColorStop(1, 'rgba(224, 242, 254, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createScanGlowTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(56, 189, 248, 0)');
  g.addColorStop(0.38, 'rgba(56, 189, 248, 0.45)');
  g.addColorStop(0.5, 'rgba(224, 242, 254, 1.0)');
  g.addColorStop(0.62, 'rgba(56, 189, 248, 0.45)');
  g.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createScanFanTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(224, 242, 254, 0.72)');
  g.addColorStop(0.22, 'rgba(56, 189, 248, 0.26)');
  g.addColorStop(0.82, 'rgba(56, 189, 248, 0.12)');
  g.addColorStop(1, 'rgba(186, 230, 253, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
  ctx.fillRect(0, 0, 5, 256);
  ctx.fillRect(251, 0, 5, 256);
  for (let x = 28; x < 232; x += 34) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(x, 0, 2, 256);
  }
  for (let y = 16; y < 256; y += 26) {
    ctx.fillStyle = 'rgba(186, 230, 253, 0.16)';
    ctx.fillRect(0, y, 256, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return configureCrispTexture(tex, 4, true);
}

export function createPolarPlasmaTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 128, 512);
  for (let x = 8; x < 120; x += 14) {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
    g.addColorStop(0.25, 'rgba(186, 230, 253, 0.85)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.75, 'rgba(125, 211, 252, 0.72)');
    g.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 5, 512);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 4);
  return configureCrispTexture(tex, 4, true);
}

export function createLogoTextureAndFallback(logoUrl, maxAnisotropy = 4, onReady) {
  const placeholderCanvas = document.createElement('canvas');
  placeholderCanvas.width = 16;
  placeholderCanvas.height = 8;
  const tex = new THREE.CanvasTexture(placeholderCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1024;
    canvas.height = img.naturalHeight || 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const maxC = Math.max(r, g, b);
      if (maxC < 20) {
        data[i + 3] = 0;
      } else if (maxC < 56) {
        data[i + 3] = Math.round(((maxC - 20) / 36) * 255);
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const loadedTex = new THREE.CanvasTexture(canvas);
    configureCrispTexture(loadedTex, maxAnisotropy, true);

    const finalCanvas = document.getElementById('final-logo-canvas');
    if (finalCanvas) {
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      const fCtx = finalCanvas.getContext('2d');
      fCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
      fCtx.drawImage(canvas, 0, 0);
    }
    if (onReady) onReady(canvas.width / canvas.height, loadedTex);
  };
  img.src = logoUrl;
  return tex;
}
