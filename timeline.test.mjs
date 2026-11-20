import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES,
  STAGE_DURATIONS,
  CONTRACT_PAGES,
  CAMERA_LIMITS,
  getPageDuration,
  clampOrbitAngles,
  getNextUserAction,
  getStageHintText,
  getSlideGroup,
  shouldPlayStartupIntro,
  shouldShowHudOverlays,
  getContractDropState,
  getBriefProjectionState,
  getPolarAscentCameraState,
  getContinuousPolarRelayState,
  computeDataStreamPoint,
  computeCinemaOptics,
  getPagePairIndices,
  getStorageTelemetry,
  getRulerStepStates,
  DEVICE_TIERS,
  detectDeviceTier,
  getDeviceProfile,
  getTransferRiskCardState,
} from './timeline.js';

test('page scan duration accelerates progressively across pages', () => {
  const d0 = getPageDuration(0);
  const d1 = getPageDuration(1);
  const d2 = getPageDuration(2);
  const d3 = getPageDuration(3);
  const d4 = getPageDuration(4);
  assert.ok(d0 > d1 && d1 > d2 && d2 > d3 && d3 > d4);
  assert.ok(d0 >= 4.0, 'extended scan duration gives ample time for flip and disintegration');
  assert.equal(CONTRACT_PAGES.length, 5);
  assert.ok(CONTRACT_PAGES.some(p => /поставк/i.test(p.riskText) || /поставк/i.test(p.header)));
  assert.ok(CONTRACT_PAGES.some(p => /650\s*000/.test(p.riskText)));
});

test('beam ascent duration is 2.5 seconds as requested', () => {
  assert.equal(STAGE_DURATIONS.beam_ascent, 2.5);
});

test('free camera orbit allows full 360 horizontal and unrestricted vertical rotation outside animations', () => {
  assert.equal(CAMERA_LIMITS.minAzimuthAngle, -Infinity);
  assert.equal(CAMERA_LIMITS.maxAzimuthAngle, Infinity);
  const fullSpin = clampOrbitAngles(Math.PI * 2.5, 0.15);
  assert.equal(fullSpin.azimuth, Math.PI * 2.5);
  assert.equal(fullSpin.polar, 0.15);

  const behind = clampOrbitAngles(-Math.PI, 2.6);
  assert.equal(behind.azimuth, -Math.PI);
  assert.equal(behind.polar, 2.6);
});

test('button actions and stage hints map cleanly across stages without stale intro text', () => {
  assert.equal(getNextUserAction(STAGES.INTRO)?.action, 'start_scan');
  assert.equal(getNextUserAction(STAGES.SCAN_PAUSED)?.action, 'start_transfer');
  assert.equal(getNextUserAction(STAGES.LOGO_REVEAL)?.action, 'restart');
  assert.equal(getNextUserAction(STAGES.CONTRACT_DROP), null);
  assert.equal(getNextUserAction(STAGES.CONTRACT_BRIEF), null);
  assert.equal(getNextUserAction(STAGES.SCAN), null);
  assert.equal(getSlideGroup(STAGES.CONTRACT_DROP), 'slide-1');
  assert.equal(getSlideGroup(STAGES.CONTRACT_BRIEF), 'slide-1');
  assert.equal(getSlideGroup(STAGES.BEAM_ASCENT), 'slide-3');

  assert.notEqual(getStageHintText(STAGES.WINDOW_FOCUS), getStageHintText(STAGES.INTRO));
  assert.ok(/юрист/i.test(getStageHintText(STAGES.BEAM_ASCENT)));
  assert.ok(/поставк/i.test(getStageHintText(STAGES.SCAN_PAUSED)));
});

test('startup quadcopter and zoom intro only plays once on initial launch', () => {
  assert.equal(shouldPlayStartupIntro(false, STAGES.INTRO), true);
  assert.equal(shouldPlayStartupIntro(true, STAGES.INTRO), false);
  assert.equal(shouldPlayStartupIntro(false, STAGES.SCAN), false);
});

test('HUD stays hidden until initial startup intro completes', () => {
  assert.equal(shouldShowHudOverlays(false, STAGES.INTRO, 2.0, 6.2), false);
  assert.equal(shouldShowHudOverlays(false, STAGES.INTRO, 6.2, 6.2), true);
  assert.equal(shouldShowHudOverlays(true, STAGES.INTRO, 1.0, 6.2), true);
  assert.equal(shouldShowHudOverlays(false, STAGES.CONTRACT_DROP, 0.5, 6.2), true);
});

test('getContractDropState beams focal particle at cube center then smoothly unfolds contract', () => {
  const start = getContractDropState(0.18);
  assert.equal(start.posY, 0.1);
  assert.equal(start.contractReveal, 0);
  assert.ok(start.beamOpacity > 0.2);
  assert.ok(start.capsuleOpacity > 0.2);

  const mid = getContractDropState(0.45);
  assert.ok(mid.beamOpacity > 0.1);
  assert.ok(mid.scale <= 0.1);

  const end = getContractDropState(1.0);
  assert.equal(end.posY, 0.1);
  assert.equal(end.scale, 1);
  assert.equal(end.contractReveal, 1);
  assert.equal(end.beamOpacity, 0);
  assert.equal(end.capsuleOpacity, 0);
});

test('getBriefProjectionState advances projection toward camera frontally and reveals 3 lines sequentially', () => {
  const early = getBriefProjectionState(0.10, false);
  assert.ok(early.posZ < 6.5);

  const mid = getBriefProjectionState(0.46, false);
  assert.equal(mid.lines[0].alpha, 1);
  assert.ok(mid.lines[1].alpha > 0.4);
  assert.equal(mid.lines[2].alpha, 0);
  assert.ok(mid.posZ > 7.5, 'projection moves closer to user camera for easy reading');
  assert.ok(mid.posX > 1.0 && mid.posX < 2.6, 'projection stays slightly right of cube center');

  const full = getBriefProjectionState(0.80, false);
  assert.equal(full.lines[0].alpha, 1);
  assert.equal(full.lines[1].alpha, 1);
  assert.equal(full.lines[2].alpha, 1);
  assert.equal(full.lines[2].slideY, 0);
});

test('getPolarAscentCameraState tracks beam vertically from front and pans synchronously toward distant lawyer window', () => {
  const a = getPolarAscentCameraState(0.1, false);
  const b = getPolarAscentCameraState(0.65, false);
  const c = getPolarAscentCameraState(1.0, false);
  assert.equal(a.camZ, b.camZ);
  assert.equal(b.camZ, c.camZ);
  assert.ok(a.camZ > 12, 'camera remains well in front of the vertical beam at z = -1.3');
  assert.ok(a.camY < b.camY && b.camY < c.camY);
  assert.equal(c.camY, 138);
  assert.equal(a.lookZ, -1.3);
  assert.ok(b.lookZ < -10, 'camera begins looking toward distant lawyer window synchronously during ascent');
  assert.equal(c.lookZ, -142);
  assert.equal(c.forwardBeamProgress, 1);
  assert.equal(c.windowReveal, 1);
});

test('computeDataStreamPoint smoothly updates x, y, z within radial bounds', () => {
  const radius = 2.55;
  const outA = { x: 0, y: 0, z: 0 };
  const outB = { x: 0, y: 0, z: 0 };
  computeDataStreamPoint(radius, 1.2, 0.8, 0.655, 0, 1, outA);
  computeDataStreamPoint(radius, 1.2, 0.8, 0.655, 0.5, 1, outB);

  const distA = Math.hypot(outA.x, outA.y, outA.z);
  const distB = Math.hypot(outB.x, outB.y, outB.z);
  assert.ok(distA >= radius * 0.55 && distA <= radius * 0.75);
  assert.ok(distB >= radius * 0.55 && distB <= radius * 0.75);
  assert.notEqual(outA.x, outB.x);
  assert.notEqual(outA.y, outB.y);
  assert.notEqual(outA.z, outB.z);
});

test('computeCinemaOptics keeps contract and near AI spheres razor-sharp without blur or glare', () => {
  const scanOpt = computeCinemaOptics(STAGES.SCAN, 18.5, false);
  assert.equal(scanOpt.focus, 18.5);
  assert.equal(scanOpt.aperture, 0);
  assert.equal(scanOpt.chromaAmount, 0);
  assert.ok(scanOpt.bloomStrength >= 0.12 && scanOpt.bloomStrength <= 0.28);

  const focusOpt = computeCinemaOptics(STAGES.WINDOW_FOCUS, 18, false);
  assert.equal(focusOpt.aperture, 0, 'lawyer window focus must stay crisp with zero DOF blur');

  const warpOpt = computeCinemaOptics(STAGES.WINDOW_RUSH, 120, true);
  assert.equal(warpOpt.focus, 120);
  assert.equal(warpOpt.aperture, 0);
  assert.ok(warpOpt.chromaAmount > scanOpt.chromaAmount);

  const endOpt = computeCinemaOptics(STAGES.LOGO_REVEAL, 10, false);
  assert.equal(endOpt.aperture, 0);
});

test('getContinuousPolarRelayState smoothly bridges BEAM_ASCENT -> WINDOW_FOCUS -> WINDOW_RUSH with C1 continuity', () => {
  const ascentEnd = getContinuousPolarRelayState(STAGES.BEAM_ASCENT, STAGE_DURATIONS.beam_ascent, false);
  const focusStart = getContinuousPolarRelayState(STAGES.WINDOW_FOCUS, 0, false);
  assert.ok(Math.abs(ascentEnd.camY - focusStart.camY) < 0.05);
  assert.ok(Math.abs(ascentEnd.camZ - focusStart.camZ) < 0.05);
  assert.ok(Math.abs(ascentEnd.lookZ - focusStart.lookZ) < 0.05);

  const focusEnd = getContinuousPolarRelayState(STAGES.WINDOW_FOCUS, STAGE_DURATIONS.window_focus, false);
  const rushStart = getContinuousPolarRelayState(STAGES.WINDOW_RUSH, 0, false);
  assert.ok(Math.abs(focusEnd.camY - rushStart.camY) < 0.05);
  assert.ok(Math.abs(focusEnd.camZ - rushStart.camZ) < 0.05);
  assert.ok(Math.abs(focusEnd.fov - rushStart.fov) < 0.05);

  const rushEnd = getContinuousPolarRelayState(STAGES.WINDOW_RUSH, STAGE_DURATIONS.window_rush, false);
  assert.ok(rushEnd.camZ < -120, 'camera rushes all the way into the lawyer portal');
  assert.ok(rushEnd.fov > focusStart.fov, 'FOV smoothly widens into warp');
});

test('getPagePairIndices pre-selects next page beneath current sheet and marks final page cleanly', () => {
  assert.deepEqual(getPagePairIndices(0, 5), { currentIdx: 0, nextIdx: 1, hasNext: true });
  assert.deepEqual(getPagePairIndices(3, 5), { currentIdx: 3, nextIdx: 4, hasNext: true });
  assert.deepEqual(getPagePairIndices(4, 5), { currentIdx: 4, nextIdx: 4, hasNext: false });
});

test('getStorageTelemetry computes battery percentage, IDX-S, K-RISK, and bus flow progressively', () => {
  const idle = getStorageTelemetry(0, 0);
  assert.equal(idle.chargePct, 0);
  assert.equal(idle.indexCoeff, 0);
  assert.equal(idle.riskCoeff, 0);

  const midPull = getStorageTelemetry(1, 0.5);
  assert.equal(midPull.chargePct, 30);
  assert.ok(midPull.indexCoeff > 0.3);
  assert.ok(midPull.riskCoeff > 0.2);
  assert.ok(midPull.flowMbps > 400);

  const full = getStorageTelemetry(5, 0);
  assert.equal(full.chargePct, 100);
  assert.equal(full.storedCount, 5);
  assert.equal(full.indexCoeff, 1.25);
  assert.equal(full.riskCoeff, 0.84);
});

test('getRulerStepStates marks done/active/upcoming stages and includes live risk & battery details', () => {
  const steps = getRulerStepStates(STAGES.SCAN, 2, 2);
  assert.equal(steps.length, 6);
  assert.equal(steps[0].status, 'done');
  assert.equal(steps[1].status, 'done');
  assert.equal(steps[2].status, 'active');
  assert.equal(steps[3].status, 'upcoming');
  assert.ok(steps[2].detailLines.some(l => /лист 3\/5/i.test(l)));
  assert.ok(steps[2].detailLines.some(l => /40%/.test(l)));
});

test('device tier classification distinguishes weak phone, laptop, and desktop PC with explicit override', () => {
  assert.equal(detectDeviceTier({ width: 390, height: 844, cores: 4, memoryGb: 4, coarsePointer: true }), DEVICE_TIERS.MOBILE);
  assert.equal(detectDeviceTier({ width: 1280, height: 720, cores: 4, memoryGb: 8, coarsePointer: false }), DEVICE_TIERS.LAPTOP);
  assert.equal(detectDeviceTier({ width: 1440, height: 900, cores: 8, memoryGb: 8, coarsePointer: false }), DEVICE_TIERS.PC);
  assert.equal(detectDeviceTier({ width: 1440, height: 900, cores: 8, memoryGb: 8, forcedTier: 'mobile' }), DEVICE_TIERS.MOBILE);

  const pc = getDeviceProfile({ width: 1440, height: 900, cores: 8, memoryGb: 8 });
  const mob = getDeviceProfile({ width: 390, height: 844, cores: 4, memoryGb: 4, coarsePointer: true });
  assert.ok(pc.starCount > mob.starCount);
  assert.ok(pc.galaxyNebulaLayers > mob.galaxyNebulaLayers);
  assert.ok(pc.maxDpr > mob.maxDpr);
  assert.equal(mob.anamorphicStreak, false);
  assert.equal(pc.anamorphicStreak, true);
});

test('computeCinemaOptics scales bloom and anamorphic flare by device profile while keeping aperture 0', () => {
  const pc = getDeviceProfile({ width: 1920, height: 1080, cores: 12, memoryGb: 16 });
  const mob = getDeviceProfile({ width: 390, height: 844, cores: 4, memoryGb: 2, coarsePointer: true });

  const pcOpt = computeCinemaOptics(STAGES.VERDICT, 15, false, pc);
  const mobOpt = computeCinemaOptics(STAGES.VERDICT, 15, false, mob);
  assert.equal(pcOpt.aperture, 0);
  assert.equal(mobOpt.aperture, 0);
  assert.ok(pcOpt.bloomStrength > mobOpt.bloomStrength);
  assert.ok(pcOpt.bloomStrength <= 0.28);
  assert.ok(pcOpt.anamorphicAmount > 0);
  assert.equal(mobOpt.anamorphicAmount, 0);
});

test('getTransferRiskCardState staggers absorbed risk projections along transfer curves cleanly', () => {
  const firstEarly = getTransferRiskCardState(0.08, 0, 5);
  const lastEarly = getTransferRiskCardState(0.08, 4, 5);
  assert.equal(firstEarly.visible, true);
  assert.equal(lastEarly.visible, false);

  const midCard = getTransferRiskCardState(0.55, 2, 5);
  assert.equal(midCard.visible, true);
  assert.ok(midCard.curveT > 0.2 && midCard.curveT < 0.9);
  assert.ok(midCard.opacity > 0.5);

  const arriving = getTransferRiskCardState(0.90, 4, 5);
  assert.equal(arriving.visible, true);
  assert.ok(arriving.absorbPulse > 0);
});



