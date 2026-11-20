import * as THREE from 'three';
import { createVolumetricBeamMat } from '../core/shaders.js';
import { configureCrispTexture, createCloudOrbTex, createPolarPlasmaTex } from '../core/textures.js';

function createBlurredLawyerWindow(scene, maxAnisotropy) {
  const winGroup = new THREE.Group();
  winGroup.position.set(0, 138, -142);
  winGroup.visible = false;

  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext('2d');

  const bg = ctx.createRadialGradient(512, 320, 40, 512, 320, 540);
  bg.addColorStop(0, '#1e3a5f');
  bg.addColorStop(0.55, '#0f172a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 640);

  ctx.save();
  ctx.filter = 'blur(14px)';

  ctx.fillStyle = '#0b1120';
  ctx.beginPath();
  ctx.ellipse(512, 620, 260, 190, 0, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(430, 470);
  ctx.lineTo(512, 560);
  ctx.lineTo(594, 470);
  ctx.closePath();
  ctx.fill();

  const faceGrad = ctx.createRadialGradient(512, 290, 25, 512, 310, 170);
  faceGrad.addColorStop(0, '#bae6fd');
  faceGrad.addColorStop(0.55, '#64748b');
  faceGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(512, 300, 102, 134, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.ellipse(512, 196, 108, 56, 0, Math.PI, 0);
  ctx.fill();

  ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)';
  ctx.lineWidth = 6;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.fillRect(435, 272, 64, 34);
  ctx.strokeRect(435, 272, 64, 34);
  ctx.fillRect(525, 272, 64, 34);
  ctx.strokeRect(525, 272, 64, 34);

  const glow = ctx.createRadialGradient(512, 330, 30, 512, 330, 340);
  glow.addColorStop(0, 'rgba(125, 211, 252, 0.35)');
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 640);
  ctx.restore();

  ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 976, 592);

  const tex = new THREE.CanvasTexture(c);
  configureCrispTexture(tex, maxAnisotropy, true);

  const screenPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(12.4, 7.75),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96, fog: false })
  );
  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(13.0, 8.3, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25, fog: false })
  );
  frameBox.position.z = -0.20;
  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(13.08, 8.38, 0.36)),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.82, fog: false })
  );
  winGroup.add(frameBox, screenPlane, rim);
  scene.add(winGroup);
  return winGroup;
}

export function createPolarRelayRig(scene, camera, flagshipPos, flagshipRadius, maxAnisotropy) {
  const polarPlasmaTex = createPolarPlasmaTex();
  const cloudOrbTex = createCloudOrbTex();

  const polarBeamGroup = new THREE.Group();
  polarBeamGroup.position.set(flagshipPos.x, flagshipPos.y + flagshipRadius - 0.1, flagshipPos.z);
  polarBeamGroup.visible = false;

  const polarHeight = 205;
  const polarCoreMat = createVolumetricBeamMat(0xffffff, 2.2, 0.96, false, 0.0, polarPlasmaTex);
  const polarMidMat = createVolumetricBeamMat(0x7dd3fc, 2.5, 0.82, true, 1.85, polarPlasmaTex);
  const polarOuterMat = createVolumetricBeamMat(0x38bdf8, 3.4, 0.56, true, 1.15, polarPlasmaTex);

  const polarCore = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.62, polarHeight, 24, 1, true), polarCoreMat);
  polarCore.position.y = polarHeight / 2;
  const polarMid = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.35, polarHeight, 24, 1, true), polarMidMat);
  polarMid.position.y = polarHeight / 2;
  const polarOuter = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.85, polarHeight, 24, 1, true), polarOuterMat);
  polarOuter.position.y = polarHeight / 2;

  const polarFlareBase = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudOrbTex, color: 0xbae6fd, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  polarFlareBase.scale.setScalar(4.4);
  const polarBeamHead = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudOrbTex, color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  polarBeamHead.scale.setScalar(3.6);

  const _ringDummy = new THREE.Object3D();
  const _ringColor = new THREE.Color();

  const shockRingCount = 5;
  const shockRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const polarShockRingsInst = new THREE.InstancedMesh(new THREE.TorusGeometry(1.35, 0.055, 8, 28), shockRingMat, shockRingCount);
  polarShockRingsInst.frustumCulled = false;
  for (let r = 0; r < shockRingCount; r++) {
    _ringColor.setHex(r % 2 === 0 ? 0xe0f2fe : 0x38bdf8);
    polarShockRingsInst.setColorAt(r, _ringColor);
  }
  if (polarShockRingsInst.instanceColor) polarShockRingsInst.instanceColor.needsUpdate = true;
  polarBeamGroup.add(polarCore, polarMid, polarOuter, polarFlareBase, polarBeamHead, polarShockRingsInst);
  scene.add(polarBeamGroup);

  function updateShockRings(t, beamRiseH, opacityMul = 1.0) {
    for (let r = 0; r < shockRingCount; r++) {
      const rp = (t * 0.9 + r / shockRingCount) % 1;
      const sc = 0.75 + Math.sin(rp * Math.PI) * 0.7;
      _ringDummy.position.set(0, rp * beamRiseH, 0);
      _ringDummy.rotation.set(Math.PI / 2, 0, 0);
      _ringDummy.scale.set(sc, sc, 1);
      _ringDummy.updateMatrix();
      polarShockRingsInst.setMatrixAt(r, _ringDummy.matrix);

      const alpha = Math.sin(rp * Math.PI) * 0.78 * opacityMul;
      _ringColor.setHex(r % 2 === 0 ? 0xe0f2fe : 0x38bdf8).multiplyScalar(alpha);
      polarShockRingsInst.setColorAt(r, _ringColor);
    }
    polarShockRingsInst.instanceMatrix.needsUpdate = true;
    if (polarShockRingsInst.instanceColor) polarShockRingsInst.instanceColor.needsUpdate = true;
  }

  const forwardBeamLen = 140.72;
  const polarForwardGroup = new THREE.Group();
  polarForwardGroup.position.set(0, 140.4, -1.3);
  polarForwardGroup.lookAt(0, 138, -142);
  polarForwardGroup.visible = false;

  const fBeamCoreGeo = new THREE.CylinderGeometry(0.14, 0.34, forwardBeamLen, 14, 1, true);
  fBeamCoreGeo.rotateX(Math.PI / 2);
  fBeamCoreGeo.translate(0, 0, forwardBeamLen / 2);
  const polarForwardCoreMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const polarForwardCore = new THREE.Mesh(fBeamCoreGeo, polarForwardCoreMat);

  const fBeamOuterGeo = new THREE.CylinderGeometry(0.55, 1.45, forwardBeamLen, 14, 1, true);
  fBeamOuterGeo.rotateX(Math.PI / 2);
  fBeamOuterGeo.translate(0, 0, forwardBeamLen / 2);
  const polarForwardOuterMat = new THREE.MeshBasicMaterial({
    map: polarPlasmaTex, color: 0x38bdf8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const polarForwardOuter = new THREE.Mesh(fBeamOuterGeo, polarForwardOuterMat);

  const polarTurnFlare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudOrbTex, color: 0xe0f2fe, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  polarTurnFlare.scale.setScalar(4.4);

  const forwardRingCount = 6;
  const forwardRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const polarForwardRingsInst = new THREE.InstancedMesh(new THREE.TorusGeometry(1.15, 0.06, 8, 24), forwardRingMat, forwardRingCount);
  polarForwardRingsInst.frustumCulled = false;
  for (let k = 0; k < forwardRingCount; k++) {
    _ringColor.setHex(k % 2 === 0 ? 0xe0f2fe : 0x38bdf8);
    polarForwardRingsInst.setColorAt(k, _ringColor);
  }
  if (polarForwardRingsInst.instanceColor) polarForwardRingsInst.instanceColor.needsUpdate = true;
  polarForwardGroup.add(polarForwardCore, polarForwardOuter, polarTurnFlare, polarForwardRingsInst);
  scene.add(polarForwardGroup);

  function updateForwardRings(t, fProg, fixedScale = null) {
    for (let k = 0; k < forwardRingCount; k++) {
      const rp = (t * 1.15 + k / forwardRingCount) % 1;
      const sc = fixedScale !== null ? fixedScale : (0.7 + (1 - rp) * 0.85);
      _ringDummy.position.set(0, 0, rp * forwardBeamLen);
      _ringDummy.rotation.set(0, 0, 0);
      _ringDummy.scale.setScalar(sc);
      _ringDummy.updateMatrix();
      polarForwardRingsInst.setMatrixAt(k, _ringDummy.matrix);

      const alpha = fProg * Math.sin(rp * Math.PI) * 0.82;
      _ringColor.setHex(k % 2 === 0 ? 0xe0f2fe : 0x38bdf8).multiplyScalar(alpha);
      polarForwardRingsInst.setColorAt(k, _ringColor);
    }
    polarForwardRingsInst.instanceMatrix.needsUpdate = true;
    if (polarForwardRingsInst.instanceColor) polarForwardRingsInst.instanceColor.needsUpdate = true;
  }

  const lawyerWindow = createBlurredLawyerWindow(scene, maxAnisotropy);

  const speedStreaksGroup = new THREE.Group();
  speedStreaksGroup.visible = false;
  const streakCount = 140;
  const streakPos = new Float32Array(streakCount * 6);
  for (let i = 0; i < streakCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const rad = 1.6 + Math.random() * 8.5;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const z = -Math.random() * 28;
    const len = 1.4 + Math.random() * 2.8;
    streakPos[i * 6] = x; streakPos[i * 6 + 1] = y; streakPos[i * 6 + 2] = z;
    streakPos[i * 6 + 3] = x; streakPos[i * 6 + 4] = y; streakPos[i * 6 + 5] = z + len;
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  speedStreaksGroup.add(new THREE.LineSegments(
    streakGeo,
    new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.75 })
  ));
  camera.add(speedStreaksGroup);
  scene.add(camera);

  return {
    polarPlasmaTex,
    polarBeamGroup,
    polarHeight,
    polarCoreMat,
    polarMidMat,
    polarOuterMat,
    polarCore,
    polarMid,
    polarOuter,
    polarBeamHead,
    updateShockRings,
    forwardBeamLen,
    polarForwardGroup,
    polarForwardCoreMat,
    polarForwardOuterMat,
    polarTurnFlare,
    updateForwardRings,
    lawyerWindow,
    speedStreaksGroup,
    streakGeo,
    streakCount,
  };
}
