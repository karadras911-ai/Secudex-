import * as THREE from 'three';
import { STAGE_DURATIONS } from '../config/stages.js';
import { shouldPlayStartupIntro } from './timelineMath.js';

const _vPos = new THREE.Vector3();
const _vLook = new THREE.Vector3();

function dampCam(camera, controls, targetPos, targetLook, lambda, dt) {
  const alpha = 1 - Math.exp(-lambda * dt);
  camera.position.lerp(targetPos, alpha);
  controls.target.lerp(targetLook, alpha);
}

export function updateIntroDirector({
  state,
  dt,
  camera,
  controls,
  isMobile,
  irisOverlay,
  polarRelayRig,
  onIntroComplete,
}) {
  const playStartupIntro = shouldPlayStartupIntro(state.hasPlayedStartupIntro, state.stage);
  const tIntro = state.stageTimer;

  if (playStartupIntro && tIntro < STAGE_DURATIONS.intro) {
    controls.enabled = false;
    if (tIntro < 2.55) {
      const u = tIntro / 2.55;
      const spinEase = u * u * (3 - 2 * u) * 0.25 + u * 0.75;
      const angle = 1.25 + spinEase * (Math.PI * 3.2);
      const startRad = isMobile ? 16.8 : 14.4;
      const endRad = isMobile ? 14.0 : 12.0;
      const rad = startRad + (endRad - startRad) * u;
      const camY = 13.4 - u * 4.8;
      camera.position.set(Math.sin(angle) * rad, camY, Math.cos(angle) * rad);
      const bank = Math.sin(u * Math.PI * 2) * 0.085;
      camera.up.set(bank, 1, 0).normalize();
      controls.target.set(0, 3.45 - u * 0.65, -0.2);
      camera.lookAt(controls.target);
      if (camera.fov !== 48) {
        camera.fov = 48;
        camera.updateProjectionMatrix();
      }
      polarRelayRig.speedStreaksGroup.visible = false;
      irisOverlay.style.opacity = '0';
    } else if (tIntro < 3.55) {
      const w = (tIntro - 2.55) / 1.0;
      const warp = Math.pow(w, 2.1);
      const startA = 1.25 + Math.PI * 3.2;
      const endA = Math.PI * 4.0;
      const angle = startA + (endA - startA) * (1 - Math.pow(1 - w, 2));
      const rad = (isMobile ? 14.0 : 12.0) + warp * 58.0;
      const camY = 8.6 + warp * 5.0;
      camera.position.set(Math.sin(angle) * rad, camY, Math.cos(angle) * rad);
      camera.up.set((1 - w) * 0.04, 1, 0).normalize();
      controls.target.set(0, 2.8 - warp * 0.4, -0.2);
      camera.lookAt(controls.target);
      camera.fov = 48 + warp * 32;
      camera.updateProjectionMatrix();

      polarRelayRig.speedStreaksGroup.visible = true;
      const posAttr = polarRelayRig.streakGeo.attributes.position;
      const streakSpeed = 28 + warp * 95;
      for (let i = 0; i < polarRelayRig.streakCount; i++) {
        let z1 = posAttr.getZ(i * 2) - dt * streakSpeed;
        let z2 = posAttr.getZ(i * 2 + 1) - dt * streakSpeed;
        if (z1 < -30) {
          z1 += 32;
          z2 += 32;
        }
        posAttr.setZ(i * 2, z1);
        posAttr.setZ(i * 2 + 1, z2);
      }
      posAttr.needsUpdate = true;
      irisOverlay.style.opacity = '0';
    } else if (tIntro < 3.85) {
      const blackIn = Math.min((tIntro - 3.55) / 0.11, 1);
      irisOverlay.style.background = '#030108';
      irisOverlay.style.opacity = blackIn.toFixed(3);
      if (tIntro >= 3.68) {
        polarRelayRig.speedStreaksGroup.visible = false;
        camera.up.set(0, 1, 0);
        if (camera.fov !== 52) {
          camera.fov = 52;
          camera.updateProjectionMatrix();
        }
        camera.position.set(0, -2.35, isMobile ? 7.6 : 6.0);
        controls.target.set(0, 1.55, -0.2);
        camera.lookAt(controls.target);
      }
    } else if (tIntro < 5.30) {
      const holdP = (tIntro - 3.85) / 1.45;
      const fadeOut = Math.min((tIntro - 3.85) / 0.78, 1);
      const darkAlpha = Math.pow(1 - fadeOut, 1.5);
      irisOverlay.style.background = '#030108';
      irisOverlay.style.opacity = darkAlpha.toFixed(3);
      polarRelayRig.speedStreaksGroup.visible = false;
      camera.up.set(0, 1, 0);
      if (camera.fov !== 52) {
        camera.fov = 52;
        camera.updateProjectionMatrix();
      }
      camera.position.set(0, -2.35 + holdP * 0.12, (isMobile ? 7.6 : 6.0) + holdP * 0.18);
      controls.target.set(0, 1.55 + holdP * 0.12, -0.2);
      camera.lookAt(controls.target);
    } else {
      const zOut = Math.min((tIntro - 5.30) / 0.90, 1);
      const zoomEase = 1 - Math.pow(1 - zOut, 4);
      irisOverlay.style.opacity = '0';
      polarRelayRig.speedStreaksGroup.visible = false;
      camera.up.set(0, 1, 0);
      const startZ = isMobile ? 7.78 : 6.18;
      const endZ = isMobile ? 20.5 : 16.5;
      camera.position.set(
        0,
        -2.23 + (-0.1 - (-2.23)) * zoomEase,
        startZ + (endZ - startZ) * zoomEase
      );
      controls.target.set(
        0,
        1.67 + (2.65 - 1.67) * zoomEase,
        -0.2 + (-0.3 - (-0.2)) * zoomEase
      );
      camera.lookAt(controls.target);
      camera.fov = 52 - 4 * zoomEase;
      camera.updateProjectionMatrix();
    }
  } else if (!state.userInteracting && !state.userCameraOverride && (!state.introZoomSettled || (state.hasPlayedStartupIntro && tIntro < 1.8))) {
    if (playStartupIntro) {
      state.introZoomSettled = true;
      state.hasPlayedStartupIntro = true;
      controls.enabled = true;
      onIntroComplete();
    }
    irisOverlay.style.opacity = '0';
    polarRelayRig.speedStreaksGroup.visible = false;
    camera.up.set(0, 1, 0);
    if (state.hasPlayedStartupIntro && !playStartupIntro) {
      _vPos.set(0, 0.1, isMobile ? 21.8 : 17.6);
      _vLook.set(0, 2.65, -0.3);
      dampCam(camera, controls, _vPos, _vLook, 3.6, dt);
    } else {
      camera.position.set(0, 0.1, isMobile ? 21.8 : 17.6);
      controls.target.set(0, 2.65, -0.3);
      camera.lookAt(controls.target);
    }
    if (camera.fov !== 48) {
      camera.fov = 48;
      camera.updateProjectionMatrix();
    }
  }
}
