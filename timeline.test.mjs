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
