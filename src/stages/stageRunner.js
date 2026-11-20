import * as THREE from 'three';
import { STAGES, STAGE_DURATIONS } from '../config/stages.js';
import { CONTRACT_PAGES } from '../config/contractData.js';
import { CUBE_HALF } from '../config/constants.js';
import {
  getPageDuration,
  shouldPlayStartupIntro,
  getContractDropState,
  getBriefProjectionState,
  getPolarAscentCameraState,
  getContinuousPolarRelayState,
  getStorageTelemetry,
} from './timelineMath.js';
import { updateTechnosphereAnimation } from '../scene/aiSpheres.js';
import { updateIntroDirector } from './introDirector.js';

const BRIEF_CORNER_SIGNS = [
  [-0.5, 0.5],
  [0.5, 0.5],
  [-0.5, -0.5],
  [0.5, -0.5],
];

const RISK_CARD_ANCHORS = [
  [-1.15, 0.40],
  [0, 0.46],
  [1.15, 0.40],
  [-1.15, -0.40],
  [0, -0.46],
  [1.15, -0.40],
];

export function createStageRunner({
  state,
  isMobile,
  camera,
  controls,
  lights,
  spaceData,
  cubeRig,
  aiRig,
  contractRig,
  riskRig,
  polarRelayRig,
  sfx,
  voicePlayer,
  hud,
  irisOverlay,
  finalLogoScreen,
}) {
  const _v1 = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _v3 = new THREE.Vector3();
  const _scanLeft = new THREE.Vector3();
  const _scanRight = new THREE.Vector3();
  const _scanCenter = new THREE.Vector3();
  const _scanOrigin = new THREE.Vector3();
  const _scanTmp = new THREE.Vector3();
  const _vaultWorld = new THREE.Vector3();
  const _foldOrigin = new THREE.Vector3();
  const _foldPortal = new THREE.Vector3(-2.15, 0.1, 0.06);
  const _briefCamPos = new THREE.Vector3();
  const _briefCorner = new THREE.Vector3();
  const _orbDummy = new THREE.Object3D();
  const _orbPos = new THREE.Vector3();

  const _dropState = {
    posY: 0.1, scale: 1, spinY: 0, beamOpacity: 0, capsuleOpacity: 0, contractReveal: 1,
  };
  const _briefState = {
    frameAlpha: 0, rayOpacity: 0, posX: 1.85, posY: 1.05, posZ: 8.2, scale: 1,
    lines: [{ alpha: 0, slideY: -18 }, { alpha: 0, slideY: -18 }, { alpha: 0, slideY: -18 }],
  };
  const _polarCamState = {
    camY: 11.4, camZ: 17.0, lookY: 14.9, lookZ: -1.3, beamHeadY: 29.4, forwardBeamProgress: 0, windowReveal: 0,
  };
  const _relayCamState = {
    camY: 11.4, camZ: 17.0, lookY: 14.9, lookZ: -1.3, fov: 48, relayProgress: 0,
  };

  let lastFlipSfxPage = -1;
  let lastScanSfxPage = -1;
  let lastCloudSfxPage = -1;
  let projRefreshAccum = 0;
  let briefRefreshAccum = 0.05;

  const slideTransition = {
    active: false,
    elapsed: 0,
    duration: 0.42,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startLook: new THREE.Vector3(),
    endLook: new THREE.Vector3(),
    startFov: 48,
    endFov: 48,
  };

  function getStageDefaultPose(targetStage) {
    if (targetStage === STAGES.INTRO) {
      return { x: 0, y: -0.1, z: isMobile ? 21.8 : 16.6, lx: 0, ly: 2.65, lz: -0.3, fov: isMobile ? 56 : 48 };
    }
    if (targetStage === STAGES.CONTRACT_DROP || targetStage === STAGES.CONTRACT_BRIEF) {
      return { x: 0, y: 0.3, z: isMobile ? 20.6 : 16.6, lx: 0, ly: 2.45, lz: -0.2, fov: isMobile ? 56 : 48 };
    }
    if (targetStage === STAGES.SCAN || targetStage === STAGES.SCAN_PAUSED) {
      return { x: 0, y: 0.25, z: isMobile ? 20.6 : 16.4, lx: 0, ly: 2.45, lz: -0.2, fov: isMobile ? 56 : 48 };
    }
    if (targetStage === STAGES.TRANSFER) {
      return { x: 0, y: -0.7, z: isMobile ? 19.6 : 16.0, lx: 0, ly: 4.3, lz: -0.8, fov: isMobile ? 56 : 48 };
    }
    if (targetStage === STAGES.ANALYSIS) {
      return { x: 0, y: -0.8, z: isMobile ? 15.8 : 12.8, lx: 0, ly: 7.1, lz: -1.3, fov: isMobile ? 56 : 48 };
    }
    if (targetStage === STAGES.VERDICT || targetStage === STAGES.POWERDOWN) {
      return { x: 0, y: 1.35, z: isMobile ? 16.0 : 13.2, lx: 0, ly: 8.75, lz: -1.3, fov: isMobile ? 56 : 48 };
    }
    return null;
  }

  function dampCam(targetPos, targetLook, lambda, dt) {
    const alpha = 1 - Math.exp(-lambda * dt);
    camera.position.lerp(targetPos, alpha);
    controls.target.lerp(targetLook, alpha);
  }

  function resetVisualsForStage(targetStage) {
    finalLogoScreen.classList.remove('visible');
    irisOverlay.style.opacity = '0';
    irisOverlay.style.background = targetStage === STAGES.INTRO
      ? '#030108'
      : 'radial-gradient(circle at center, transparent 0%, #030108 100%)';

    polarRelayRig.speedStreaksGroup.visible = false;
    polarRelayRig.polarBeamGroup.visible = false;
    polarRelayRig.polarForwardGroup.visible = false;
    polarRelayRig.lawyerWindow.visible = false;
    polarRelayRig.lawyerWindow.scale.setScalar(1);

    riskRig.agentScanBeam.visible = false;
    riskRig.riskProjGroup.visible = false;
    riskRig.absorbRays.visible = false;
    riskRig.absorbRing.visible = false;
    riskRig.absorbOrbsInst.visible = false;
    riskRig.briefProjGroup.visible = false;
    riskRig.transferStreams.forEach(s => {
      s.tube.visible = false;
      s.tubeMat.uniforms.uOpacity.value = 0;
    });

    cubeRig.rightCamLensMat.emissiveIntensity = 0.35;
    contractRig.ufoBeamGroup.visible = false;
    contractRig.contractDropCore.visible = false;
    contractRig.flipSheetGroup.visible = false;
    contractRig.archivedSheetGroup.visible = false;
    contractRig.disintegrateCloud.visible = false;
    contractRig.disintegrateMat.uniforms.uPullProgress.value = 0;
    contractRig.setPageReveal(1.0);
    contractRig.scanBarMat.opacity = 0;
    contractRig.scanCoreMat.opacity = 0;
    lights.scanLight.intensity = 0;
    contractRig.contractPivot.scale.setScalar(1);
    contractRig.pageMesh.visible = true;
    contractRig.contractPivot.visible = targetStage !== STAGES.INTRO && targetStage !== STAGES.CONTRACT_DROP;

    camera.up.set(0, 1, 0);
    camera.fov = isMobile ? 56 : 48;
    camera.updateProjectionMatrix();

    lights.hemiLight.intensity = 0.85;
    lights.keyLight.intensity = 1.95;
    lights.rimLight.intensity = 1.75;
    lights.bottomLight.intensity = 3.6;
    lights.flagshipLight.color.setHex(0x38bdf8);
    lights.flagshipLight.intensity = 5.5;

    aiRig.flagshipSphere.coreMat.emissiveIntensity = 1.9;
    aiRig.flagshipSphere.outerMat.emissiveIntensity = 0.9;
    aiRig.flagshipSphere.armorMats?.forEach((m, idx) => { m.emissiveIntensity = idx === 2 || idx === 3 ? 1.25 : 0.9; });
    aiRig.flagshipSphere.setArmorAperture?.(0);
    aiRig.flagshipSphere.updateVerdictHologram(false);
    aiRig.flagshipSphere.dataRingBandMat.opacity = 0.85;
    aiRig.flagshipSphere.dataRingCoreMat.opacity = 0.9;

    cubeRig.materials.electrodeGlowMat.emissiveIntensity = 1.65;
    cubeRig.materials.violetAccentMat.emissiveIntensity = 0.95;
    cubeRig.materials.cubeReactorArmorMat.emissiveIntensity = 0.95;

    aiRig.agentSpheres.forEach(a => {
      a.coreMat.emissiveIntensity = 1.9;
      a.outerMat.emissiveIntensity = 0.9;
      a.armorMats?.forEach((m, idx) => { m.emissiveIntensity = idx === 2 || idx === 3 ? 1.25 : 0.9; });
      a.setArmorAperture?.(0);
      a.updateVerdictHologram(false);
      a.dataRingBandMat.opacity = 0.72;
      a.dataRingCoreMat.opacity = 0.9;
    });

    const isPreScan = targetStage === STAGES.INTRO || targetStage === STAGES.CONTRACT_DROP || targetStage === STAGES.CONTRACT_BRIEF;
    const storedCount = isPreScan ? 0 : (targetStage === STAGES.SCAN ? state.threatsExtracted : CONTRACT_PAGES.length);
    cubeRig.updateStorageDisplay(getStorageTelemetry(storedCount, 0));

    if (targetStage === STAGES.INTRO) {
      state.introZoomSettled = state.hasPlayedStartupIntro;
      state.threatsExtracted = 0;
      state.pageIndex = 0;
      lastFlipSfxPage = -1;
      lastScanSfxPage = -1;
      lastCloudSfxPage = -1;
      contractRig.setPagePair(0);
      contractRig.contractPivot.position.set(0, 0.1, 0.15);
      aiRig.flagshipSphere.updateProjection('idle', 'STANDBY // GLOBAL AI');
      aiRig.agentSpheres.forEach((a, i) => a.updateProjection('idle', `АГЕНТ-0${i + 1} // ГОТОВ`));
    }
  }

  function enterStage(nextStage, triggerAudioKey = null, options = {}) {
    state.hasPlayedStartupIntro = true;
    const prevStage = state.stage;
    const prevPosX = camera.position.x;
    const prevPosY = camera.position.y;
    const prevPosZ = camera.position.z;
    const prevLookX = controls.target.x;
    const prevLookY = controls.target.y;
    const prevLookZ = controls.target.z;
    const prevFov = camera.fov;

    state.stage = nextStage;
    state.stageTimer = 0;
    state.paused = false;
    resetVisualsForStage(nextStage);

    const keepManualOrbit = (
      (prevStage === STAGES.CONTRACT_DROP && nextStage === STAGES.CONTRACT_BRIEF) ||
      (prevStage === STAGES.CONTRACT_BRIEF && nextStage === STAGES.SCAN) ||
      (prevStage === STAGES.SCAN && nextStage === STAGES.SCAN_PAUSED)
    );
    if (!keepManualOrbit) {
      state.userCameraOverride = false;
    }

    const pose = options?.smoothSlide ? getStageDefaultPose(nextStage) : null;
    if (pose) {
      slideTransition.active = true;
      slideTransition.elapsed = 0;
      slideTransition.startPos.set(prevPosX, prevPosY, prevPosZ);
      slideTransition.startLook.set(prevLookX, prevLookY, prevLookZ);
      slideTransition.startFov = prevFov;
      slideTransition.endPos.set(pose.x, pose.y, pose.z);
      slideTransition.endLook.set(pose.lx, pose.ly, pose.lz);
      slideTransition.endFov = pose.fov;
    } else {
      slideTransition.active = false;
    }

    if (nextStage === STAGES.CONTRACT_DROP) {
      state.pageIndex = 0;
      state.pageTimer = 0;
      state.threatsExtracted = 0;
      lastFlipSfxPage = -1;
      lastScanSfxPage = -1;
      lastCloudSfxPage = -1;
      contractRig.setPagePair(0);
      contractRig.ufoBeamGroup.visible = true;
      contractRig.contractDropCore.visible = true;
      contractRig.contractPivot.visible = false;
      controls.enabled = true;
      aiRig.flagshipSphere.updateProjection('scan', 'BEAMING CONTRACT // SECUDEX');
      sfx.playContractBeamSound();
    } else if (nextStage === STAGES.CONTRACT_BRIEF) {
      contractRig.setPagePair(0);
      contractRig.contractPivot.visible = true;
      contractRig.contractPivot.scale.setScalar(1);
      contractRig.contractPivot.position.set(0, 0.1, 0.15);
      riskRig.briefProjGroup.visible = true;
      cubeRig.rightCamLensMat.emissiveIntensity = 1.6;
      riskRig.drawBriefProjection(getBriefProjectionState(0.05, isMobile, _briefState));
      controls.enabled = true;
      aiRig.flagshipSphere.updateProjection('idle', 'DOC #238 // BRIEFING');
      sfx.playDataTransferSound(false);
    } else if (nextStage === STAGES.SCAN) {
      state.pageIndex = 0;
      state.pageTimer = 0;
      state.threatsExtracted = 0;
      lastFlipSfxPage = -1;
      lastScanSfxPage = -1;
      lastCloudSfxPage = -1;
      contractRig.setPagePair(0);
      contractRig.contractPivot.visible = true;
      contractRig.contractPivot.scale.setScalar(1);
      contractRig.contractPivot.position.set(0, 0.1, 0.2);
      cubeRig.updateStorageDisplay(getStorageTelemetry(0, 0));
      controls.enabled = true;
    } else if (nextStage === STAGES.TRANSFER) {
      if (state.threatsExtracted < CONTRACT_PAGES.length) {
        state.threatsExtracted = CONTRACT_PAGES.length;
      }
      cubeRig.updateStorageDisplay(getStorageTelemetry(CONTRACT_PAGES.length, 0));
      aiRig.flagshipSphere.updateProjection('idle', 'RECEIVING REPORTS...');
      sfx.playDataTransferSound(true);
    } else if (nextStage === STAGES.ANALYSIS) {
      if (state.threatsExtracted < CONTRACT_PAGES.length) {
        state.threatsExtracted = CONTRACT_PAGES.length;
      }
      cubeRig.updateStorageDisplay(getStorageTelemetry(CONTRACT_PAGES.length, 0));
      aiRig.flagshipSphere.updateProjection('scan', 'DEEP SYNTHESIS // 5 PAGES');
    } else if (nextStage === STAGES.VERDICT) {
      aiRig.flagshipSphere.updateProjection('verdict', '', '84%');
      aiRig.flagshipSphere.updateVerdictHologram(true, '84%', 0, state.threatsExtracted || CONTRACT_PAGES.length);
    } else if (nextStage === STAGES.POWERDOWN) {
      aiRig.flagshipSphere.updateProjection('powerdown');
      aiRig.flagshipSphere.updateVerdictHologram(false);
      aiRig.agentSpheres.forEach(a => a.updateProjection('powerdown'));
    } else if (nextStage === STAGES.BEAM_ASCENT || nextStage === STAGES.WINDOW_FOCUS) {
      polarRelayRig.polarBeamGroup.visible = true;
      polarRelayRig.polarForwardGroup.visible = true;
      polarRelayRig.lawyerWindow.visible = true;
      controls.enabled = false;
    } else if (nextStage === STAGES.WINDOW_RUSH) {
      polarRelayRig.polarBeamGroup.visible = true;
      polarRelayRig.polarForwardGroup.visible = true;
      polarRelayRig.lawyerWindow.visible = true;
      polarRelayRig.speedStreaksGroup.visible = true;
      controls.enabled = false;
    } else if (nextStage === STAGES.COLLAPSE) {
      polarRelayRig.lawyerWindow.visible = true;
      controls.enabled = false;
    } else if (nextStage === STAGES.LOGO_REVEAL) {
      finalLogoScreen.classList.add('visible');
      controls.enabled = false;
    } else {
      controls.enabled = true;
    }

    if (triggerAudioKey) voicePlayer.playVoiceTrack(triggerAudioKey);
    hud.syncUI();
  }

  function update(dt, t) {
    spaceData.updateSpace(dt, t);
    cubeRig.updateEmitters(dt);
    cubeRig.portalFieldTex.offset.y -= dt * (state.stage === STAGES.SCAN ? 0.62 : 0.16);
    const tunnelSpeed = (state.stage === STAGES.VERDICT || state.stage === STAGES.BEAM_ASCENT)
      ? 2.5
      : ((state.stage === STAGES.SCAN || state.stage === STAGES.TRANSFER || state.stage === STAGES.ANALYSIS) ? 2.1 : 1.35);
    const tunnelBoost = (state.stage === STAGES.SCAN || state.stage === STAGES.ANALYSIS || state.stage === STAGES.VERDICT) ? 1.24 : 1.0;
    cubeRig.updateRearTunnel(t, tunnelSpeed, tunnelBoost);

    const targetYaw = Math.atan2(camera.position.x, Math.max(0.6, Math.abs(camera.position.z)));
    contractRig.contractPivot.rotation.set(0, Math.min(0.36, Math.max(-0.36, targetYaw)), 0);

    const agentActivity = state.stage === STAGES.SCAN ? 1.8 : (state.stage === STAGES.TRANSFER ? 2.2 : 1.0);
    const flagshipActivity = state.stage === STAGES.ANALYSIS ? 2.8 : (state.stage === STAGES.POWERDOWN ? 0.15 : 1.0);
    aiRig.updateChamberDust(dt, Math.max(agentActivity, flagshipActivity * 0.7));
    aiRig.agentSpheres.forEach(a => updateTechnosphereAnimation(a, dt, t, agentActivity));
    updateTechnosphereAnimation(aiRig.flagshipSphere, dt, t, flagshipActivity);

    projRefreshAccum += dt;
    if (projRefreshAccum >= 0.45 && state.stage !== STAGES.VERDICT && state.stage !== STAGES.POWERDOWN) {
      projRefreshAccum = 0;
      if (state.stage === STAGES.SCAN) {
        const curPage = CONTRACT_PAGES[state.pageIndex];
        aiRig.agentSpheres.forEach((a, i) => {
          a.updateProjection(
            i === curPage.agentIndex ? 'scan' : 'idle',
            i === curPage.agentIndex ? `EXTRACT: ${curPage.riskCode}` : `BUFFER: ${state.threatsExtracted} RISKS`
          );
        });
        aiRig.flagshipSphere.updateProjection('idle', `WAITING AGENTS // ${state.threatsExtracted}/${CONTRACT_PAGES.length}`);
      } else if (state.stage === STAGES.ANALYSIS) {
        aiRig.flagshipSphere.updateProjection('scan', 'COMPUTING GLOBAL RISK MATRIX...');
      } else if (state.stage === STAGES.INTRO) {
        aiRig.flagshipSphere.updateProjection('idle', 'SECUDEX FLAGSHIP // READY');
      }
    }

    if (!state.paused) {
      state.stageTimer += dt;
    }

    if (state.stage === STAGES.INTRO) {
      updateIntroDirector({
        state,
        dt,
        camera,
        controls,
        isMobile,
        irisOverlay,
        polarRelayRig,
        onIntroComplete: () => hud.syncUI(),
      });
      cubeRig.portalGlowMat.opacity = 0.24 + Math.sin(t * 2.2) * 0.05;
    } else if (state.stage === STAGES.CONTRACT_DROP) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.contract_drop, 1);
      getContractDropState(p, contractRig.dropOrigin.y, contractRig.dropTarget.y, _dropState);

      contractRig.ufoBeamGroup.visible = _dropState.beamOpacity > 0.02;
      contractRig.ufoBeamOuterMat.opacity = _dropState.beamOpacity * 0.26;
      contractRig.ufoBeamInnerMat.opacity = _dropState.beamOpacity * 0.44;
      contractRig.ufoRings.forEach(r => {
        const rp = (t * 0.85 + r.phase) % 1;
        r.mesh.position.y = -rp * contractRig.dropLen;
        const sc = 1.1 - rp * 0.78;
        r.mesh.scale.set(sc, sc, 1);
        r.mat.opacity = _dropState.beamOpacity * Math.sin(rp * Math.PI) * 0.48;
      });

      contractRig.contractDropCore.visible = _dropState.capsuleOpacity > 0.02;
      contractRig.contractDropCore.position.copy(contractRig.dropTarget);
      contractRig.contractDropCore.rotation.y = _dropState.spinY;
      contractRig.dropRing1.rotation.x += dt * 4.2;
      contractRig.dropRing2.rotation.y += dt * 5.0;
      contractRig.contractDropCore.scale.setScalar(0.45 + _dropState.capsuleOpacity * 0.85);
      contractRig.dropCapsuleMat.opacity = _dropState.capsuleOpacity * 0.88;
      contractRig.dropGyroMat.opacity = _dropState.capsuleOpacity * 0.65;
      contractRig.dropGlowSprite.material.opacity = _dropState.capsuleOpacity * 0.72;

      lights.scanLight.position.set(contractRig.dropTarget.x, contractRig.dropTarget.y + 0.2, contractRig.dropTarget.z + 0.55);
      lights.scanLight.color.setHex(0x38bdf8);
      lights.scanLight.intensity = 0.48 * Math.max(_dropState.beamOpacity, _dropState.capsuleOpacity);

      if (_dropState.contractReveal > 0.005) {
        contractRig.contractPivot.visible = true;
        contractRig.contractPivot.position.set(0, contractRig.dropTarget.y, contractRig.dropTarget.z);
        contractRig.contractPivot.scale.setScalar(0.32 + _dropState.scale * 0.68);
        contractRig.contractPivot.rotateY((1 - _dropState.contractReveal) * 0.38);
        contractRig.setPageReveal(_dropState.contractReveal);
        cubeRig.portalGlowMat.opacity = 0.28 + _dropState.contractReveal * 0.22;
      } else {
        contractRig.contractPivot.visible = false;
        contractRig.setPageReveal(0.0);
        cubeRig.portalGlowMat.opacity = 0.26;
      }

      if (!state.userInteracting && !state.userCameraOverride && !slideTransition.active) {
        _v2.set(0, 0.35, isMobile ? 20.8 : 16.8);
        _v3.set(0, 2.45, -0.2);
        dampCam(_v2, _v3, 2.6, dt);
      }

      if (p >= 1) {
        contractRig.setPageReveal(1.0);
        contractRig.ufoBeamGroup.visible = false;
        contractRig.contractDropCore.visible = false;
        lights.scanLight.intensity = 0;
        enterStage(STAGES.CONTRACT_BRIEF);
      }
    } else if (state.stage === STAGES.CONTRACT_BRIEF) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.contract_brief, 1);
      getBriefProjectionState(p, isMobile, _briefState);

      contractRig.contractPivot.visible = true;
      contractRig.contractPivot.position.set(0, 0.1, 0.16);
      cubeRig.portalGlowMat.opacity = 0.20;

      riskRig.briefProjGroup.visible = _briefState.frameAlpha > 0.01;
      riskRig.briefFrameGroup.position.set(
        _briefState.posX,
        _briefState.posY + Math.sin(t * 2.2) * 0.03,
        _briefState.posZ
      );
      riskRig.briefFrameGroup.scale.setScalar(_briefState.scale);
      riskRig.briefFrameGroup.quaternion.copy(camera.quaternion);
      riskRig.briefFrameGroup.updateMatrixWorld(true);
      riskRig.briefMat.opacity = _briefState.frameAlpha;
      riskRig.briefBorderMat.opacity = _briefState.frameAlpha * 0.90;
      riskRig.briefRayMat.opacity = _briefState.rayOpacity * 0.36;
      cubeRig.rightCamLensMat.emissiveIntensity = 0.5 + _briefState.rayOpacity * 1.4;

      briefRefreshAccum += dt;
      if (briefRefreshAccum >= 0.03) {
        briefRefreshAccum = 0;
        riskRig.drawBriefProjection(_briefState);
      }

      cubeRig.rightCamLens.getWorldPosition(_briefCamPos);
      const bArr = riskRig.briefRayGeo.attributes.position;
      const bw = riskRig.briefPlaneW;
      const bh = riskRig.briefPlaneH;
      for (let idx = 0; idx < BRIEF_CORNER_SIGNS.length; idx++) {
        _briefCorner.set(BRIEF_CORNER_SIGNS[idx][0] * bw, BRIEF_CORNER_SIGNS[idx][1] * bh, 0);
        riskRig.briefFrameGroup.localToWorld(_briefCorner);
        bArr.setXYZ(idx * 2, _briefCamPos.x, _briefCamPos.y, _briefCamPos.z);
        bArr.setXYZ(idx * 2 + 1, _briefCorner.x, _briefCorner.y, _briefCorner.z);
      }
      bArr.needsUpdate = true;

      if (!state.userInteracting && !state.userCameraOverride && !slideTransition.active) {
        _v2.set(0, 0.25, isMobile ? 20.6 : 16.6);
        _v3.set(0, 2.45, -0.2);
        dampCam(_v2, _v3, 2.6, dt);
      }

      if (p >= 1) {
        riskRig.briefProjGroup.visible = false;
        cubeRig.rightCamLensMat.emissiveIntensity = 0.35;
        enterStage(STAGES.SCAN);
      }
    } else if (state.stage === STAGES.SCAN) {
      const curPage = CONTRACT_PAGES[state.pageIndex];
      const pageDur = getPageDuration(state.pageIndex);

      if (!state.paused) {
        state.pageTimer += dt;
      }
      const p = Math.min(state.pageTimer / pageDur, 1);
      const activeAgent = aiRig.agentSpheres[curPage.agentIndex];
      contractRig.contractPivot.visible = true;
      contractRig.contractPivot.scale.setScalar(1);

      if (p < 0.18) {
        const flipP = p / 0.18;
        if (lastFlipSfxPage !== state.pageIndex) {
          lastFlipSfxPage = state.pageIndex;
          contractRig.setPagePair(state.pageIndex);
          sfx.playPageFlipSound();
        }
        contractRig.contractPivot.position.set(0, 0.1, 0.2 + Math.sin(flipP * Math.PI) * 0.04);
        cubeRig.portalGlowMat.opacity = 0.42;
        riskRig.agentScanBeam.visible = false;
        contractRig.scanBarMat.opacity = 0;
        contractRig.scanCoreMat.opacity = 0;
        lights.scanLight.intensity = 0;
        riskRig.riskProjGroup.visible = false;
        riskRig.absorbRays.visible = false;
        riskRig.absorbRing.visible = false;
        riskRig.absorbOrbsInst.visible = false;
        aiRig.agentSpheres.forEach(a => a.setArmorAperture?.(0));
        contractRig.archivedSheetGroup.visible = false;
        contractRig.pageMesh.visible = true;
        contractRig.disintegrateCloud.visible = false;
        contractRig.disintegrateMat.uniforms.uPullProgress.value = 0;

        contractRig.flipSheetGroup.visible = true;
        contractRig.flipLeaves.forEach((leaf, idx) => {
          if (leaf.material.userData?.shader) {
            leaf.material.userData.shader.uniforms.uFlipProgress.value = flipP;
          }
          const localP = Math.min(1, Math.max(0, (flipP - idx * 0.14) / 0.72));
          const lift = Math.sin(localP * Math.PI);
          leaf.position.z = idx * 0.012 + lift * 0.06;
        });
      } else if (p < 0.64) {
        contractRig.flipSheetGroup.visible = false;
        contractRig.archivedSheetGroup.visible = false;
        contractRig.pageMesh.visible = true;
        contractRig.disintegrateCloud.visible = false;
        contractRig.disintegrateMat.uniforms.uPullProgress.value = 0;

        if (lastScanSfxPage !== state.pageIndex) {
          lastScanSfxPage = state.pageIndex;
          contractRig.setPagePair(state.pageIndex);
          sfx.playScanSweepSound();
        }

        const scanP = (p - 0.18) / 0.46;
        contractRig.contractPivot.position.set(0, 0.1, 0.2 + Math.sin(t * 2.5) * 0.025);
        contractRig.contractPivot.updateMatrixWorld(true);
        cubeRig.portalGlowMat.opacity = 0.24;

        const scanColorHex = aiRig.agentSpecs[curPage.agentIndex].accent;
        contractRig.scanBarMat.color.setHex(scanColorHex);
        contractRig.scanBarMat.opacity = 0.68;
        contractRig.scanCoreMat.opacity = 0.72;
        contractRig.scanBar.position.y = 1.42 - scanP * 2.84;

        _scanLeft.set(-1.12, 0, 0.02);
        contractRig.scanBar.localToWorld(_scanLeft);
        _scanRight.set(1.12, 0, 0.02);
        contractRig.scanBar.localToWorld(_scanRight);
        _scanCenter.set(0, 0, 0.02);
        contractRig.scanBar.localToWorld(_scanCenter);

        _scanOrigin.copy(activeAgent.group.position).lerp(_scanCenter, 0.15);
        riskRig.scanApertureGlow.position.copy(_scanOrigin);
        riskRig.scanApertureMat.color.setHex(scanColorHex);
        riskRig.scanApertureMat.opacity = 0.65 + Math.sin(t * 10) * 0.12;

        _v1.subVectors(camera.position, _scanCenter).normalize();
        lights.scanLight.position.copy(_scanCenter).addScaledVector(_v1, 0.55);
        lights.scanLight.color.setHex(scanColorHex);
        lights.scanLight.intensity = 0.52 + Math.sin(t * 10) * 0.08;

        const fv = riskRig.scanFanGeo.attributes.position;
        fv.setXYZ(0, _scanOrigin.x, _scanOrigin.y, _scanOrigin.z);
        fv.setXYZ(1, _scanLeft.x, _scanLeft.y, _scanLeft.z);
        fv.setXYZ(2, _scanRight.x, _scanRight.y, _scanRight.z);
        fv.needsUpdate = true;
        riskRig.agentBeamMat.color.setHex(scanColorHex);
        riskRig.agentBeamMat.opacity = 0.24 + Math.sin(t * 8) * 0.04;
        riskRig.scanFanTex.offset.y -= dt * 1.45;

        const rv = riskRig.scanRaysGeo.attributes.position;
        for (let r = 0; r < 5; r++) {
          const frac = r / 4;
          const tx = _scanLeft.x + (_scanRight.x - _scanLeft.x) * frac;
          const ty = _scanLeft.y + (_scanRight.y - _scanLeft.y) * frac;
          const tz = _scanLeft.z + (_scanRight.z - _scanLeft.z) * frac;
          rv.setXYZ(r * 2, _scanOrigin.x, _scanOrigin.y, _scanOrigin.z);
          rv.setXYZ(r * 2 + 1, tx, ty, tz);
        }
        rv.needsUpdate = true;
        riskRig.scanRaysMat.color.setHex(scanColorHex);

        const cv = riskRig.calibRaysGeo.attributes.position;
        _scanLeft.set(-1.12, -1.56, 0.04);
        contractRig.pageMesh.localToWorld(_scanLeft);
        _scanRight.set(1.12, -1.56, 0.04);
        contractRig.pageMesh.localToWorld(_scanRight);
        let cSlot = 0;
        aiRig.agentSpheres.forEach((ag, aIdx) => {
          if (aIdx !== curPage.agentIndex && cSlot < 2) {
            const cornerTarget = cSlot === 0 ? _scanLeft : _scanRight;
            _scanTmp.copy(ag.group.position).lerp(cornerTarget, 0.14);
            cv.setXYZ(cSlot * 2, _scanTmp.x, _scanTmp.y, _scanTmp.z);
            cv.setXYZ(cSlot * 2 + 1, cornerTarget.x, cornerTarget.y, cornerTarget.z);
            cSlot++;
          }
        });
        cv.needsUpdate = true;

        riskRig.agentScanBeam.visible = true;
        riskRig.riskProjGroup.visible = false;
        riskRig.absorbRays.visible = false;
        riskRig.absorbRing.visible = false;
        riskRig.absorbOrbsInst.visible = false;
        aiRig.agentSpheres.forEach((ag, aIdx) => ag.setArmorAperture?.(aIdx === curPage.agentIndex ? 0.35 : 0));
      } else {
        // Фаза C (0.64..1.0): текущий лист складывается и уходит налево в батарейный накопитель,
        // а СРАЗУ ПОД НИМ уже чётко виден заранее отрендеренный следующий лист договора (nextPageMesh)!
        contractRig.flipSheetGroup.visible = false;
        contractRig.pageMesh.visible = false;
        contractRig.nextPageMesh.visible = true;
        const pullP = (p - 0.64) / 0.36;

        riskRig.agentScanBeam.visible = false;
        contractRig.scanBarMat.opacity = 0;
        contractRig.scanCoreMat.opacity = 0;
        contractRig.contractPivot.updateMatrixWorld(true);

        const agentAccentHex = aiRig.agentSpecs[curPage.agentIndex].accent;
        if (lastCloudSfxPage !== state.pageIndex) {
          lastCloudSfxPage = state.pageIndex;
          contractRig.setPagePair(state.pageIndex);
          riskRig.drawRiskCubeProjection(curPage, agentAccentHex);
          sfx.playDataTransferSound(false);
        }

        // Обновляем шкалу батареи, %, индекс и коэффициент в левом блоке и на верхней линейке!
        const liveTelemetry = getStorageTelemetry(state.pageIndex, pullP);
        cubeRig.updateStorageDisplay(liveTelemetry);
        hud.updateLiveBattery?.(liveTelemetry);

        const projIn = Math.min(1, pullP / 0.24);
        const projOut = pullP > 0.36 ? Math.max(0, 1 - (pullP - 0.36) / 0.56) : 1;
        const projAlpha = projIn * projOut;
        riskRig.riskProjGroup.visible = projAlpha > 0.02;
        riskRig.riskProjGroup.position.set(0, -0.05 - (1 - projOut) * 0.45, CUBE_HALF + 0.16 + projIn * 0.08);
        riskRig.riskProjGroup.scale.setScalar(0.84 + projIn * 0.16 - (1 - projOut) * 0.42);
        riskRig.riskProjMat.opacity = projAlpha * 0.96;
        riskRig.riskProjBorderMat.color.setHex(agentAccentHex);
        riskRig.riskProjBorderMat.opacity = projAlpha * 0.9;

        const absorbT = Math.min(1, Math.max(0, (pullP - 0.14) / 0.80));
        const beamAlpha = Math.sin(absorbT * Math.PI);
        riskRig.absorbRays.visible = absorbT > 0.01 && absorbT < 0.99;
        riskRig.absorbRayMat.color.setHex(agentAccentHex);
        riskRig.absorbRayMat.opacity = beamAlpha * 0.72;

        const rArr = riskRig.absorbRayGeo.attributes.position;
        const aPos = activeAgent.group.position;
        const cardCenter = riskRig.riskProjGroup.position;
        for (let idx = 0; idx < RISK_CARD_ANCHORS.length; idx++) {
          const anchor = RISK_CARD_ANCHORS[idx];
          rArr.setXYZ(idx * 2, cardCenter.x + anchor[0] * projOut, cardCenter.y + anchor[1] * projOut, cardCenter.z);
          rArr.setXYZ(idx * 2 + 1, aPos.x, aPos.y, aPos.z);
        }
        rArr.needsUpdate = true;

        const absorbVisible = absorbT > 0.01 && absorbT < 0.99;
        riskRig.absorbOrbsInst.visible = absorbVisible;
        if (absorbVisible) {
          for (let k = 0; k < riskRig.absorbOrbCount; k++) {
            const u = absorbT * 1.45 - (k / riskRig.absorbOrbCount) * 0.48;
            if (u > 0.02 && u < 0.98) {
              const ue = u * u * (3 - 2 * u);
              _orbPos.lerpVectors(cardCenter, aPos, ue);
              _orbPos.x += Math.sin(ue * Math.PI * 2 + k * 0.7) * 0.24 * (1 - ue);
              _orbPos.y += Math.sin(ue * Math.PI) * 0.30;
              _orbDummy.position.copy(_orbPos);
              _orbDummy.lookAt(aPos);
              const sBase = Math.sin(ue * Math.PI) * (1.15 - ue * 0.45);
              _orbDummy.scale.set(sBase, sBase, sBase * 1.65);
            } else {
              _orbDummy.position.set(0, -999, 0);
              _orbDummy.scale.setScalar(0.0001);
            }
            _orbDummy.updateMatrix();
            riskRig.absorbOrbsInst.setMatrixAt(k, _orbDummy.matrix);
          }
          riskRig.absorbOrbsInst.instanceMatrix.needsUpdate = true;
        }
        riskRig.absorbOrbMat.opacity = Math.max(0.2, beamAlpha * 0.92);

        const pulseT = Math.min(1, Math.max(0, (pullP - 0.48) / 0.50));
        riskRig.absorbRing.visible = pulseT > 0.02 && pulseT < 0.98;
        riskRig.absorbRing.position.copy(aPos);
        riskRig.absorbRing.lookAt(camera.position);
        riskRig.absorbRing.scale.setScalar(0.68 + pulseT * 0.54);
        riskRig.absorbRingMat.color.setHex(agentAccentHex);
        riskRig.absorbRingMat.opacity = Math.sin(pulseT * Math.PI) * 0.52;

        activeAgent.coreMat.emissiveIntensity = 1.9 + beamAlpha * 1.4;
        activeAgent.dataRingCoreMat.opacity = Math.min(1, 0.78 + beamAlpha * 0.22);
        activeAgent.setArmorAperture?.(0.35 + beamAlpha * 0.65);

        const targetVault = cubeRig.vaultSlots[state.pageIndex];
        targetVault.group.getWorldPosition(_vaultWorld);

        const foldP = Math.min(1, pullP / 0.38);
        const wingP = Math.min(1, foldP / 0.62);
        const wingEase = wingP * wingP * (3 - 2 * wingP);
        const compactP = Math.min(1, Math.max(0, (foldP - 0.42) / 0.58));
        const compactEase = compactP * compactP * (3 - 2 * compactP);

        const glideP = Math.min(1, Math.max(0, (pullP - 0.32) / 0.68));
        const glideEase = glideP * glideP * (3 - 2 * glideP);
        const oneMinusG = 1 - glideEase;

        _foldOrigin.set(0, 0, 0.095);
        contractRig.contractPivot.localToWorld(_foldOrigin);

        contractRig.archivedSheetGroup.visible = pullP < 0.98;
        contractRig.archivedSheetGroup.position.set(
          oneMinusG * oneMinusG * _foldOrigin.x + 2 * oneMinusG * glideEase * _foldPortal.x + glideEase * glideEase * _vaultWorld.x,
          oneMinusG * oneMinusG * _foldOrigin.y + 2 * oneMinusG * glideEase * _foldPortal.y + glideEase * glideEase * _vaultWorld.y,
          oneMinusG * oneMinusG * _foldOrigin.z + 2 * oneMinusG * glideEase * _foldPortal.z + glideEase * glideEase * _vaultWorld.z
        );
        contractRig.archivedSheetGroup.quaternion.copy(contractRig.contractPivot.quaternion);
        contractRig.archivedSheetGroup.rotateY(-glideEase * 0.85);
        contractRig.archivedSheetGroup.rotateZ(glideEase * 0.32);

        contractRig.foldVertWrap.scale.set(
          1 - compactEase * 0.44 - glideEase * 0.18,
          1 - compactEase * 0.82 - glideEase * 0.06,
          1
        );
        contractRig.foldVertWrap.rotation.x = -compactEase * 0.22;

        const sheetAlpha = glideP > 0.74 ? Math.max(0, 1 - (glideP - 0.74) / 0.24) : 0.96;
        contractRig.setFoldState(wingEase * Math.PI * 0.94, sheetAlpha);

        // 1100 частиц распада рассчитываются целиком на GPU через uniforms
        contractRig.disintegrateCloud.visible = true;
        contractRig.disintegrateMat.uniforms.uPullProgress.value = pullP;
        contractRig.disintegrateMat.uniforms.uTime.value = t;
        contractRig.disintegrateMat.uniforms.uOriginMatrix.value.copy(contractRig.pageMesh.matrixWorld);
        contractRig.disintegrateMat.uniforms.uPortalPos.value.copy(_foldPortal);
        contractRig.disintegrateMat.uniforms.uVaultPos.value.copy(_vaultWorld);

        lights.scanLight.position.copy(aPos);
        lights.scanLight.color.setHex(agentAccentHex);
        lights.scanLight.intensity = 0.68 + beamAlpha * 0.9;
      }

      if (!state.userInteracting && !state.userCameraOverride && !slideTransition.active) {
        _v2.set(0, 0.25, isMobile ? 20.6 : 16.4);
        _v3.set(0, 2.45, -0.2);
        dampCam(_v2, _v3, 2.8, dt);
      }

      if (p >= 1) {
        riskRig.riskProjGroup.visible = false;
        riskRig.absorbRays.visible = false;
        riskRig.absorbRing.visible = false;
        riskRig.absorbOrbsInst.visible = false;
        activeAgent.coreMat.emissiveIntensity = 1.9;
        activeAgent.setArmorAperture?.(0);
        contractRig.archivedSheetGroup.visible = false;
        contractRig.pageMesh.visible = true;
        contractRig.disintegrateCloud.visible = false;
        contractRig.disintegrateMat.uniforms.uPullProgress.value = 0;
        contractRig.flipSheetGroup.visible = false;
        lights.scanLight.intensity = 0;

        state.threatsExtracted++;
        cubeRig.updateStorageDisplay(getStorageTelemetry(state.threatsExtracted, 0));

        if (state.pageIndex < CONTRACT_PAGES.length - 1) {
          state.pageIndex++;
          state.pageTimer = 0;
          contractRig.setPagePair(state.pageIndex);
          hud.syncUI();
        } else {
          enterStage(STAGES.SCAN_PAUSED);
        }
      }
    } else if (state.stage === STAGES.SCAN_PAUSED) {
      if (!state.userInteracting && !state.userCameraOverride && !slideTransition.active) {
        _v2.set(0, 0.25, isMobile ? 20.6 : 16.4);
        _v3.set(0, 2.45, -0.2);
        dampCam(_v2, _v3, 2.5, dt);
      }
    } else if (state.stage === STAGES.TRANSFER) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.transfer, 1);
      const pulseAlpha = Math.sin(p * Math.PI);
      riskRig.transferStreams.forEach((stream, idx) => {
        stream.tube.visible = true;
        stream.tubeMat.uniforms.uTime.value = t + idx * 0.22;
        stream.tubeMat.uniforms.uOpacity.value = 0.88 * pulseAlpha;
      });
      aiRig.agentSpheres.forEach(a => a.setArmorAperture?.(0.55 * pulseAlpha));
      aiRig.flagshipSphere.setArmorAperture?.(0.35 + p * 0.45);

      if (!state.userInteracting && !state.userCameraOverride && !slideTransition.active) {
        _v2.set(0, -0.7, isMobile ? 19.6 : 16.0);
        _v3.set(0, 4.3, -0.8);
        dampCam(_v2, _v3, 2.4, dt);
      }

      if (p >= 1) {
        enterStage(STAGES.ANALYSIS, 'finale');
      }
    } else if (state.stage === STAGES.ANALYSIS) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.analysis, 1);
      aiRig.flagshipSphere.setArmorAperture?.(0.75 + Math.sin(t * 5.0) * 0.15);
      if (!state.userInteracting && !state.userCameraOverride && !slideTransition.active) {
        _v2.set(Math.sin(p * 0.9) * 1.5, -0.8, isMobile ? 15.8 : 12.8);
        _v3.set(0, 7.1, -1.3);
        dampCam(_v2, _v3, 2.8, dt);
      }
      lights.flagshipLight.intensity = 5.4 + Math.sin(t * 7) * 0.8;

      if (p >= 1) {
        enterStage(STAGES.VERDICT);
      }
    } else if (state.stage === STAGES.VERDICT) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.verdict, 1);
      aiRig.flagshipSphere.setArmorAperture?.(1.0);
      if (!state.userInteracting && !state.userCameraOverride && !slideTransition.active) {
        _v2.set(0, 1.35, isMobile ? 16.0 : 13.2);
        _v3.set(0, 8.75, -1.3);
        dampCam(_v2, _v3, 4.5, dt);
      }
      lights.flagshipLight.color.setHex(0xff3b5c);
      lights.flagshipLight.intensity = 6.2;
      if (projRefreshAccum >= 0.08) {
        projRefreshAccum = 0;
        aiRig.flagshipSphere.updateVerdictHologram(true, '84%', state.stageTimer, state.threatsExtracted || CONTRACT_PAGES.length);
      }

      if (p >= 1) {
        enterStage(STAGES.POWERDOWN);
      }
    } else if (state.stage === STAGES.POWERDOWN) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.powerdown, 1);
      const dim = 1 - p * 0.92;
      aiRig.flagshipSphere.setArmorAperture?.(1.0 - p);
      lights.hemiLight.intensity = 0.85 * dim;
      lights.keyLight.intensity = 1.95 * dim;
      lights.rimLight.intensity = 1.75 * dim;
      lights.bottomLight.intensity = 3.6 * dim;
      lights.flagshipLight.intensity = 5.5 * dim;

      aiRig.flagshipSphere.coreMat.emissiveIntensity = 1.9 * dim;
      aiRig.flagshipSphere.outerMat.emissiveIntensity = 0.9 * dim;
      aiRig.flagshipSphere.dataRingBandMat.opacity = 0.85 * dim;
      aiRig.flagshipSphere.dataRingCoreMat.opacity = 0.9 * dim;
      aiRig.flagshipSphere.armorMats?.forEach((m, idx) => { m.emissiveIntensity = (idx === 2 || idx === 3 ? 1.25 : 0.9) * dim; });

      cubeRig.materials.electrodeGlowMat.emissiveIntensity = 1.65 * dim;
      cubeRig.materials.violetAccentMat.emissiveIntensity = 0.95 * dim;
      cubeRig.materials.cubeReactorArmorMat.emissiveIntensity = 0.95 * dim;

      aiRig.agentSpheres.forEach(a => {
        a.coreMat.emissiveIntensity = 1.9 * dim;
        a.outerMat.emissiveIntensity = 0.9 * dim;
        a.dataRingBandMat.opacity = 0.72 * dim;
        a.dataRingCoreMat.opacity = 0.9 * dim;
        a.armorMats?.forEach((m, idx) => { m.emissiveIntensity = (idx === 2 || idx === 3 ? 1.25 : 0.9) * dim; });
      });

      if (p >= 1) {
        enterStage(STAGES.BEAM_ASCENT);
      }
    } else if (state.stage === STAGES.BEAM_ASCENT) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.beam_ascent, 1);
      getPolarAscentCameraState(p, isMobile, _polarCamState);
      getContinuousPolarRelayState(STAGES.BEAM_ASCENT, state.stageTimer, isMobile, _relayCamState);
      camera.position.set(0, _relayCamState.camY, _relayCamState.camZ);
      controls.target.set(0, _relayCamState.lookY, _relayCamState.lookZ);
      camera.lookAt(controls.target);

      polarRelayRig.polarCoreMat.uniforms.uTime.value = t;
      polarRelayRig.polarMidMat.uniforms.uTime.value = t;
      polarRelayRig.polarOuterMat.uniforms.uTime.value = t;
      polarRelayRig.polarCoreMat.uniforms.uOpacity.value = 0.96;
      polarRelayRig.polarMidMat.uniforms.uOpacity.value = 0.82 + Math.sin(t * 16) * 0.10;
      polarRelayRig.polarOuterMat.uniforms.uOpacity.value = 0.56 + Math.sin(t * 12) * 0.08;

      const headOriginY = Math.min(132.5, _polarCamState.camY - 2.2);
      const beamRiseH = Math.max(4, headOriginY - polarRelayRig.polarBeamGroup.position.y);
      const beamScaleY = beamRiseH / polarRelayRig.polarHeight;
      polarRelayRig.polarCore.scale.set(1, beamScaleY, 1);
      polarRelayRig.polarCore.position.y = beamRiseH * 0.5;
      polarRelayRig.polarMid.scale.set(1, beamScaleY, 1);
      polarRelayRig.polarMid.position.y = beamRiseH * 0.5;
      polarRelayRig.polarOuter.scale.set(1, beamScaleY, 1);
      polarRelayRig.polarOuter.position.y = beamRiseH * 0.5;
      polarRelayRig.polarBeamHead.position.y = beamRiseH;

      polarRelayRig.updateShockRings(t, beamRiseH, 1.0);

      polarRelayRig.lawyerWindow.visible = true;
      polarRelayRig.lawyerWindow.scale.setScalar(0.32 + _polarCamState.windowReveal * 0.68);
      const fProg = _polarCamState.forwardBeamProgress;
      const distToWin = Math.hypot(138 - headOriginY, -142 - (-1.3));
      polarRelayRig.polarForwardGroup.position.set(0, headOriginY, -1.3);
      polarRelayRig.polarForwardGroup.lookAt(0, 138, -142);
      polarRelayRig.polarForwardGroup.visible = fProg > 0.01;
      polarRelayRig.polarForwardGroup.scale.set(1, 1, Math.max(0.02, fProg * (distToWin / polarRelayRig.forwardBeamLen)));
      polarRelayRig.polarPlasmaTex.offset.y -= dt * 3.8;
      polarRelayRig.polarForwardCoreMat.opacity = fProg * 0.95;
      polarRelayRig.polarForwardOuterMat.opacity = fProg * 0.60;
      polarRelayRig.polarTurnFlare.material.opacity = fProg * 0.88;
      polarRelayRig.updateForwardRings(t, fProg);

      if (p >= 1) {
        enterStage(STAGES.WINDOW_FOCUS);
      }
    } else if (state.stage === STAGES.WINDOW_FOCUS) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.window_focus, 1);
      getContinuousPolarRelayState(STAGES.WINDOW_FOCUS, state.stageTimer, isMobile, _relayCamState);
      camera.position.set(0, _relayCamState.camY, _relayCamState.camZ);
      controls.target.set(0, _relayCamState.lookY, _relayCamState.lookZ);
      camera.lookAt(controls.target);
      camera.fov = _relayCamState.fov;
      camera.updateProjectionMatrix();
      polarRelayRig.lawyerWindow.scale.setScalar(1);

      polarRelayRig.polarCoreMat.uniforms.uTime.value = t;
      polarRelayRig.polarMidMat.uniforms.uTime.value = t;
      polarRelayRig.polarOuterMat.uniforms.uTime.value = t;
      polarRelayRig.polarCoreMat.uniforms.uOpacity.value = 0.55 * (1 - p);
      polarRelayRig.polarMidMat.uniforms.uOpacity.value = 0.45 * (1 - p);
      polarRelayRig.polarOuterMat.uniforms.uOpacity.value = 0.28 * (1 - p);

      const focusBeamH = 132.5 - polarRelayRig.polarBeamGroup.position.y;
      const focusBeamScaleY = focusBeamH / polarRelayRig.polarHeight;
      polarRelayRig.polarCore.scale.set(1, focusBeamScaleY, 1);
      polarRelayRig.polarCore.position.y = focusBeamH * 0.5;
      polarRelayRig.polarMid.scale.set(1, focusBeamScaleY, 1);
      polarRelayRig.polarMid.position.y = focusBeamH * 0.5;
      polarRelayRig.polarOuter.scale.set(1, focusBeamScaleY, 1);
      polarRelayRig.polarOuter.position.y = focusBeamH * 0.5;
      polarRelayRig.polarBeamHead.position.y = focusBeamH;
      polarRelayRig.updateShockRings(t, focusBeamH, 1 - p);
      polarRelayRig.polarForwardGroup.position.set(0, 132.5, -1.3);
      polarRelayRig.polarForwardGroup.lookAt(0, 138, -142);
      polarRelayRig.polarForwardGroup.visible = p < 0.95;
      polarRelayRig.polarForwardGroup.scale.set(1, 1, Math.hypot(138 - 132.5, -142 - (-1.3)) / polarRelayRig.forwardBeamLen);
      polarRelayRig.polarPlasmaTex.offset.y -= dt * 3.0;
      polarRelayRig.polarForwardCoreMat.opacity = 0.88 * (1 - p);
      polarRelayRig.polarForwardOuterMat.opacity = 0.48 * (1 - p);
      polarRelayRig.polarTurnFlare.material.opacity = 0.85 * (1 - p);
      polarRelayRig.updateForwardRings(t, 1 - p, 1.0);

      if (p >= 1) {
        enterStage(STAGES.WINDOW_RUSH);
      }
    } else if (state.stage === STAGES.WINDOW_RUSH) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.window_rush, 1);
      const rush = Math.pow(p, 2.3);
      getContinuousPolarRelayState(STAGES.WINDOW_RUSH, state.stageTimer, isMobile, _relayCamState);
      camera.position.set(0, _relayCamState.camY, _relayCamState.camZ);
      controls.target.set(0, _relayCamState.lookY, _relayCamState.lookZ);
      camera.lookAt(controls.target);
      camera.fov = _relayCamState.fov;
      camera.updateProjectionMatrix();

      const posAttr = polarRelayRig.streakGeo.attributes.position;
      for (let i = 0; i < polarRelayRig.streakCount; i++) {
        let z1 = posAttr.getZ(i * 2) + dt * (42 + rush * 95);
        let z2 = posAttr.getZ(i * 2 + 1) + dt * (42 + rush * 95);
        if (z1 > 2) { z1 -= 30; z2 -= 30; }
        posAttr.setZ(i * 2, z1);
        posAttr.setZ(i * 2 + 1, z2);
      }
      posAttr.needsUpdate = true;

      if (p >= 1) {
        enterStage(STAGES.COLLAPSE);
      }
    } else if (state.stage === STAGES.COLLAPSE) {
      const p = Math.min(state.stageTimer / STAGE_DURATIONS.collapse, 1);
      const radiusPct = Math.max(0, 100 - p * 108);
      irisOverlay.style.opacity = '1';
      irisOverlay.style.background = `radial-gradient(circle at center, rgba(3,1,8,${p.toFixed(2)}) 0%, #030108 ${radiusPct.toFixed(1)}%)`;

      if (p >= 1) {
        enterStage(STAGES.LOGO_REVEAL);
      }
    }

    if (slideTransition.active) {
      if (state.userInteracting) {
        slideTransition.active = false;
      } else {
        slideTransition.elapsed += dt;
        const u = Math.min(1, slideTransition.elapsed / slideTransition.duration);
        const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        camera.position.lerpVectors(slideTransition.startPos, slideTransition.endPos, ease);
        controls.target.lerpVectors(slideTransition.startLook, slideTransition.endLook, ease);
        const nextFov = slideTransition.startFov + (slideTransition.endFov - slideTransition.startFov) * ease;
        if (Math.abs(camera.fov - nextFov) > 0.01) {
          camera.fov = nextFov;
          camera.updateProjectionMatrix();
        }
        if (u >= 1) slideTransition.active = false;
      }
    }

    const scriptedIntroActive = shouldPlayStartupIntro(state.hasPlayedStartupIntro, state.stage)
      && !state.userInteracting && state.stageTimer < STAGE_DURATIONS.intro;
    if (!scriptedIntroActive && controls.enabled) {
      controls.update();
    }
  }

  return {
    enterStage,
    resetVisualsForStage,
    update,
  };
}
