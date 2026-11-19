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
  getSlideGroup,
  shouldPlayStartupIntro,
  computeDataStreamPoint,
  computeCinemaOptics,
} from './timeline.js';

test('page scan duration accelerates progressively across pages', () => {
  const d0 = getPageDuration(0);
  const d1 = getPageDuration(1);
  const d2 = getPageDuration(2);
  const d3 = getPageDuration(3);
  const d4 = getPageDuration(4);
  assert.ok(d0 > d1 && d1 > d2 && d2 > d3 && d3 > d4);
  assert.ok(d0 >= 2.5, 'initial page scan should be unhurried');
  assert.equal(CONTRACT_PAGES.length, 5);
});

test('beam ascent duration is 2.5 seconds as requested', () => {
  assert.equal(STAGE_DURATIONS.beam_ascent, 2.5);
});

test('camera orbit clamping blocks going behind the cube or straight overhead', () => {
  const behind = clampOrbitAngles(Math.PI, 0.1);
  assert.equal(behind.azimuth, CAMERA_LIMITS.maxAzimuthAngle);
  assert.equal(behind.polar, CAMERA_LIMITS.minPolarAngle);

  const valid = clampOrbitAngles(0.2, 1.3);
  assert.equal(valid.azimuth, 0.2);
  assert.equal(valid.polar, 1.3);
});

test('button actions map cleanly across stages', () => {
  assert.equal(getNextUserAction(STAGES.INTRO)?.action, 'start_scan');
  assert.equal(getNextUserAction(STAGES.SCAN_PAUSED)?.action, 'start_transfer');
  assert.equal(getNextUserAction(STAGES.LOGO_REVEAL)?.action, 'restart');
  assert.equal(getNextUserAction(STAGES.SCAN), null);
  assert.equal(getSlideGroup(STAGES.BEAM_ASCENT), 'slide-3');
});

test('startup quadcopter and zoom intro only plays once on initial launch', () => {
  assert.equal(shouldPlayStartupIntro(false, STAGES.INTRO), true);
  assert.equal(shouldPlayStartupIntro(true, STAGES.INTRO), false);
  assert.equal(shouldPlayStartupIntro(false, STAGES.SCAN), false);
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

test('computeCinemaOptics keeps focus locked to target distance and scales effects safely', () => {
  const scanOpt = computeCinemaOptics(STAGES.SCAN, 16.3, false);
  assert.equal(scanOpt.focus, 16.3);
  assert.ok(scanOpt.aperture > 0 && scanOpt.aperture <= 0.00015);
  assert.ok(scanOpt.bloomStrength > 0.3);

  const warpOpt = computeCinemaOptics(STAGES.WINDOW_RUSH, 120, true);
  assert.equal(warpOpt.focus, 80);
  assert.ok(warpOpt.chromaAmount > scanOpt.chromaAmount);

  const endOpt = computeCinemaOptics(STAGES.LOGO_REVEAL, 10, false);
  assert.equal(endOpt.aperture, 0);
});

