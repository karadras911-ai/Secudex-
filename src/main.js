import { STAGES, STAGE_DURATIONS } from './config/stages.js';
import { shouldPlayStartupIntro } from './stages/timelineMath.js';
import { createBrushedMetalMaps, createPointSpriteTex } from './core/textures.js';
import { detectSoftwareGl, initSceneRenderer } from './core/renderer.js';
import { createSfxSynth } from './audio/sfxSynth.js';
import { createVoicePlayer } from './audio/voicePlayer.js';
import { createBalancedSpace, createLogoDisplay } from './scene/environment.js';
import { createCubeRig } from './scene/cubeRig.js';
import { createAiSphereRig } from './scene/aiSpheres.js';
import { createContractRig } from './scene/contractRig.js';
import { createRiskAbsorptionRig } from './scene/riskAbsorption.js';
import { createPolarRelayRig } from './scene/polarRelay.js';
import { createStageRunner } from './stages/stageRunner.js';
import { createHudController } from './ui/hudController.js';

const state = {
  stage: STAGES.INTRO,
  stageTimer: 0,
  pageIndex: 0,
  pageTimer: 0,
  paused: false,
  threatsExtracted: 0,
  userInteracting: false,
  userCameraOverride: false,
  introZoomSettled: false,
  hasPlayedStartupIntro: false,
};

const isMobile = window.innerWidth < 640;
const isSoftwareGl = detectSoftwareGl();
const container = document.getElementById('canvas-container');
const irisOverlay = document.getElementById('iris-overlay');
const finalLogoScreen = document.getElementById('final-logo-screen');

const { scene, camera, renderer, controls, composer, sceneStats, lights, updatePostProcessing } =
  initSceneRenderer(container, isMobile, isSoftwareGl);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
const { roughTex: metalTex, normalTex: metalNormalTex } = createBrushedMetalMaps(maxAnisotropy);
const pointSpriteTex = createPointSpriteTex();

const sfx = createSfxSynth(() => voicePlayer.audioState.muted);
const voicePlayer = createVoicePlayer(state, sfx);

const spaceData = createBalancedSpace(scene, isMobile);
createLogoDisplay(scene, maxAnisotropy);
const cubeRig = createCubeRig(scene, maxAnisotropy, metalTex, metalNormalTex);
const aiRig = createAiSphereRig(scene, maxAnisotropy, pointSpriteTex);
const contractRig = createContractRig(scene, maxAnisotropy);
const riskRig = createRiskAbsorptionRig(scene, maxAnisotropy, isMobile, aiRig.agentSpecs, aiRig.flagshipPos);
const polarRelayRig = createPolarRelayRig(scene, camera, aiRig.flagshipPos, aiRig.flagshipSphere.radius, maxAnisotropy);

let stageRunner = null;
const hud = createHudController({
  state,
  onEnterStage: (nextStage, audioKey, options) => stageRunner?.enterStage(nextStage, audioKey, options),
  voicePlayer,
});

stageRunner = createStageRunner({
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
});

function isInitialIntroLocked() {
  return shouldPlayStartupIntro(state.hasPlayedStartupIntro, state.stage) && state.stageTimer < STAGE_DURATIONS.intro;
}
controls.addEventListener('start', () => {
  if (isInitialIntroLocked()) {
    state.userInteracting = false;
    return;
  }
  state.userInteracting = true;
  state.userCameraOverride = true;
});
controls.addEventListener('end', () => {
  state.userInteracting = false;
});

// Поддержка ?autostart=1 / brief / beam (+ optional &stageTime= / &pageTime=)
const urlParams = new URLSearchParams(window.location.search);
const autostartMode = urlParams.get('autostart');
const forcedStageTime = parseFloat(urlParams.get('stageTime') || '');
const forcedPageTime = parseFloat(urlParams.get('pageTime') || '');
if (autostartMode === '1') {
  stageRunner.enterStage(STAGES.SCAN);
} else if (autostartMode === 'brief') {
  stageRunner.enterStage(STAGES.CONTRACT_BRIEF);
} else if (autostartMode === 'beam') {
  stageRunner.enterStage(STAGES.BEAM_ASCENT);
} else {
  controls.enabled = false;
  voicePlayer.playVoiceTrack('intro');
  hud.syncUI();
}
if (Number.isFinite(forcedStageTime) && forcedStageTime >= 0) {
  state.stageTimer = forcedStageTime;
  state.paused = true;
}
if (Number.isFinite(forcedPageTime) && forcedPageTime >= 0) {
  state.pageTimer = forcedPageTime;
  state.paused = true;
}

function afterDraw(cb) {
  try {
    const gl = renderer.getContext();
    const sync = gl.fenceSync && gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      window.setTimeout(cb, 16);
      return;
    }
    gl.flush();
    const poll = () => {
      const st = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (st === gl.UNSIGNALED) {
        window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        window.setTimeout(cb, 16);
      }
    };
    window.setTimeout(poll, 5);
  } catch {
    window.setTimeout(cb, 16);
  }
}

if (!isSoftwareGl) {
  renderer.compile(scene, camera);
}

let lastFrameTime = performance.now();
const startTimestamp = lastFrameTime;
let fpsFrameCount = 0;
let fpsWindowStart = lastFrameTime;
let currentFps = 60;
let perfPushAccum = 0;

function tick(now) {
  const nowMs = typeof now === 'number' ? now : performance.now();
  const maxDt = isSoftwareGl ? 0.65 : 0.08;
  const rawDtSec = Math.max(0.0001, (nowMs - lastFrameTime) / 1000);
  const dt = Math.min(rawDtSec, maxDt);
  lastFrameTime = nowMs;
  const elapsedSec = (nowMs - startTimestamp) * 0.001;

  fpsFrameCount++;
  const fpsSpan = nowMs - fpsWindowStart;
  if (fpsSpan >= 500) {
    currentFps = (fpsFrameCount * 1000) / fpsSpan;
    fpsFrameCount = 0;
    fpsWindowStart = nowMs;
  }

  stageRunner.update(dt, elapsedSec);

  if (composer && !isSoftwareGl) {
    updatePostProcessing(state.stage, polarRelayRig.speedStreaksGroup.visible, elapsedSec);
    composer.render();
  } else {
    renderer.render(scene, camera);
    sceneStats.calls = renderer.info.render.calls;
    sceneStats.triangles = renderer.info.render.triangles;
  }

  perfPushAccum += rawDtSec;
  if (perfPushAccum >= 0.25) {
    perfPushAccum = 0;
    hud.updatePerfStats({
      fps: currentFps,
      calls: sceneStats.calls,
      triangles: sceneStats.triangles,
      dpr: sceneStats.dpr,
    });
  }

  if (isSoftwareGl) {
    afterDraw(() => tick(performance.now()));
  } else {
    requestAnimationFrame(tick);
  }
}

tick(lastFrameTime);
