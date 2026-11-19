import { STAGES, STAGE_DURATIONS, RULER_STEP_DEFINITIONS } from '../config/stages.js';
import { CONTRACT_PAGES } from '../config/contractData.js';
import { CAMERA_LIMITS } from '../config/constants.js';

export function getPageDuration(pageIndex) {
  const durations = [4.3, 3.7, 3.2, 2.8, 2.5];
  return durations[Math.min(Math.max(0, pageIndex), durations.length - 1)];
}

export function clampOrbitAngles(azimuth, polar) {
  return {
    azimuth: Math.min(CAMERA_LIMITS.maxAzimuthAngle, Math.max(CAMERA_LIMITS.minAzimuthAngle, azimuth)),
    polar: Math.min(CAMERA_LIMITS.maxPolarAngle, Math.max(CAMERA_LIMITS.minPolarAngle, polar)),
  };
}

export function getNextUserAction(stage) {
  switch (stage) {
    case STAGES.INTRO:
      return { action: 'start_scan', label: 'ЗАПУСТИТЬ АНАЛИЗ', audioKey: 'scan' };
    case STAGES.SCAN_PAUSED:
      return { action: 'start_transfer', label: 'ПЕРЕДАТЬ НА АНАЛИЗ ФЛАГМАНА', audioKey: 'transfer' };
    case STAGES.LOGO_REVEAL:
      return { action: 'restart', label: 'ПОВТОРИТЬ СЦЕНУ', audioKey: 'intro' };
    default:
      return null;
  }
}

export function getStageHintText(stage, pageIndex = 0, totalPages = CONTRACT_PAGES.length) {
  switch (stage) {
    case STAGES.INTRO:
      return 'Нажмите «ЗАПУСТИТЬ АНАЛИЗ» для подачи договора поставки ИИ';
    case STAGES.CONTRACT_DROP:
      return 'Флагман материализует договор поставки № 238 внутри куба';
    case STAGES.CONTRACT_BRIEF:
      return 'Камера справа транслирует ключевые реквизиты договора поставки';
    case STAGES.SCAN:
      return `Лист ${Math.min(totalPages, pageIndex + 1)}/${totalPages}: скан, проекция риска и архивация в накопитель`;
    case STAGES.SCAN_PAUSED:
      return 'Все 5 угроз договора поставки извлечены • накопитель 100%';
    case STAGES.TRANSFER:
      return 'Сферы-агенты передают сводку рисков в Флагманский контур';
    case STAGES.ANALYSIS:
      return 'Флагман сопоставляет риски поставки и финансовой гарантии 650 000 ₽';
    case STAGES.VERDICT:
      return 'Вердикт сформирован: критический уровень риска 84%';
    case STAGES.POWERDOWN:
      return 'Контур концентрирует энергию для отправки импульса юристу';
    case STAGES.BEAM_ASCENT:
      return 'Импульс поднимается и наводится на удалённое окно юриста';
    case STAGES.WINDOW_FOCUS:
      return 'Захват цели: терминал дежурного юриста в дальней перспективе';
    case STAGES.WINDOW_RUSH:
      return 'Сверхскоростной переход отчёта напрямую на экран юриста';
    case STAGES.COLLAPSE:
      return 'Синхронизация канала связи завершена';
    case STAGES.LOGO_REVEAL:
      return 'Глобальный анализ договора поставки завершён';
    default:
      return 'Система SECUDEX активна';
  }
}

export function getSlideGroup(stage) {
  if (stage === STAGES.INTRO) return 'slide-0';
  if (stage === STAGES.CONTRACT_DROP || stage === STAGES.CONTRACT_BRIEF || stage === STAGES.SCAN || stage === STAGES.SCAN_PAUSED) return 'slide-1';
  if (stage === STAGES.TRANSFER) return 'slide-2';
  return 'slide-3';
}

export function shouldPlayStartupIntro(hasPlayedStartupIntro, stage) {
  return !hasPlayedStartupIntro && stage === STAGES.INTRO;
}

export function shouldShowHudOverlays(hasPlayedStartupIntro, stage, stageTimer, introDuration = STAGE_DURATIONS.intro) {
  if (shouldPlayStartupIntro(hasPlayedStartupIntro, stage) && stageTimer < introDuration) {
    return false;
  }
  return true;
}

export function getContractDropState(progress, startY = 5.25, targetY = 0.1, out = {
  posY: 0.1,
  scale: 0.04,
  spinY: 0,
  beamOpacity: 0,
  capsuleOpacity: 0,
  contractReveal: 0,
}) {
  const p = Math.min(1, Math.max(0, progress));
  if (p < 0.46) {
    const u = p / 0.46;
    const smooth = u * u * (3 - 2 * u);
    out.posY = targetY;
    out.scale = 0.04 + smooth * 0.04;
    out.spinY = smooth * Math.PI * 0.5;
    out.beamOpacity = Math.sin(u * Math.PI * 0.85) * 0.85;
    out.capsuleOpacity = Math.min(1, u * 1.45);
    out.contractReveal = 0;
  } else {
    const u = (p - 0.46) / 0.54;
    const ease = 1 - Math.pow(1 - u, 3);
    out.posY = targetY;
    out.scale = 0.05 + ease * 0.95;
    out.spinY = (1 - ease) * Math.PI * 0.45;
    out.beamOpacity = Math.max(0, (1 - u * 1.65) * 0.65);
    out.capsuleOpacity = Math.max(0, 1 - u * 2.1);
    out.contractReveal = ease;
  }
  return out;
}

export function getBriefProjectionState(progress, isMobileOrOut = false, maybeOut) {
  const isMobile = typeof isMobileOrOut === 'boolean' ? isMobileOrOut : false;
  const out = (typeof isMobileOrOut === 'object' && isMobileOrOut !== null)
    ? isMobileOrOut
    : (maybeOut || {
      frameAlpha: 0,
      rayOpacity: 0,
      posX: isMobile ? 0.36 : 1.75,
      posY: isMobile ? 1.45 : 1.05,
      posZ: 0.9,
      scale: 0.45,
      lines: [
        { alpha: 0, slideY: -18 },
        { alpha: 0, slideY: -18 },
        { alpha: 0, slideY: -18 },
      ],
    });

  const p = Math.min(1, Math.max(0, progress));
  const fadeOut = p > 0.90 ? Math.max(0, 1 - (p - 0.90) / 0.10) : 1;
  const frameIn = Math.min(1, p / 0.14);
  const approachT = Math.min(1, p / 0.36);
  const approachEase = 1 - Math.pow(1 - approachT, 3);

  out.frameAlpha = frameIn * fadeOut;
  out.rayOpacity = Math.min(1, p / 0.12) * fadeOut;

  const startX = isMobile ? 1.85 : 2.95;
  const targetX = isMobile ? 0.38 : 1.85;
  const startY = isMobile ? 2.25 : 1.65;
  const targetY = isMobile ? 1.35 : 1.05;
  const startZ = 0.95;
  const targetZ = isMobile ? 9.6 : 8.2;

  out.posX = startX + (targetX - startX) * approachEase;
  out.posY = startY + (targetY - startY) * approachEase;
  out.posZ = startZ + (targetZ - startZ) * approachEase;
  out.scale = 0.42 + approachEase * 0.58;

  const starts = [0.10, 0.34, 0.58];
  const spans = [0.18, 0.18, 0.18];
  for (let i = 0; i < 3; i++) {
    const t = Math.min(1, Math.max(0, (p - starts[i]) / spans[i]));
    const ease = 1 - Math.pow(1 - t, 3);
    out.lines[i].alpha = ease * fadeOut;
    out.lines[i].slideY = ease >= 1 ? 0 : (1 - ease) * -22;
  }
  return out;
}

export function getPolarAscentCameraState(progress, isMobile = false, out = {
  camY: 11.4,
  camZ: 17.0,
  lookY: 14.9,
  lookZ: -1.3,
  beamHeadY: 29.4,
  forwardBeamProgress: 0,
  windowReveal: 0,
}) {
  const p = Math.min(1, Math.max(0, progress));
  const climbEase = p < 0.85
    ? Math.pow(p / 0.85, 1.55) * 0.88
    : 0.88 + ((p - 0.85) / 0.15) * 0.12;
  const startY = 11.4;
  const topY = 138.0;
  const y = startY + climbEase * (topY - startY);
  const frontZ = isMobile ? 22.0 : 17.0;

  const lookPanT = p <= 0.32 ? 0 : Math.min(1, (p - 0.32) / 0.68);
  const lookEase = lookPanT * lookPanT * (3 - 2 * lookPanT);
  const baseLookY = Math.min(topY, y + 3.5);

  out.camY = y;
  out.camZ = frontZ;
  out.lookY = baseLookY + (topY - baseLookY) * lookEase;
  out.lookZ = -1.3 + (-142.0 - (-1.3)) * lookEase;
  out.beamHeadY = Math.min(topY + 4, y + 18.0 * (1 - p * 0.62));
  out.forwardBeamProgress = p <= 0.44 ? 0 : Math.min(1, (p - 0.44) / 0.52);
  out.windowReveal = p <= 0.10 ? 0.16 : Math.min(1, 0.16 + ((p - 0.10) / 0.80) * 0.84);
  return out;
}

export function computeDataStreamPoint(
  radius,
  baseTheta,
  basePhi,
  baseScale,
  streamPhase,
  index,
  out = { x: 0, y: 0, z: 0 },
) {
  const layer = index % 3;
  const dir = layer === 1 ? -1 : 1;
  const azSpeed = (0.55 + layer * 0.32) * dir;
  const phase = index * 0.47;
  const phi = basePhi + streamPhase * azSpeed + Math.sin(streamPhase * 0.85 + phase) * 0.24;
  const thetaRaw = baseTheta + Math.sin(streamPhase * (1.2 + layer * 0.28) + phase) * 0.16;
  const theta = Math.min(Math.PI - 0.24, Math.max(0.24, thetaRaw));
  const rPulse = 1 + Math.sin(streamPhase * 2.2 + phase * 1.4) * 0.055;
  const dr = radius * baseScale * rPulse;
  const sinT = Math.sin(theta);

  out.x = dr * sinT * Math.cos(phi);
  out.y = dr * Math.cos(theta);
  out.z = dr * sinT * Math.sin(phi);
  return out;
}

export function computeCinemaOptics(stage, camDistance, isWarpActive = false, out = {
  focus: 17.6,
  aperture: 0,
  bloomStrength: 0.14,
  chromaAmount: 0,
}) {
  const safeDist = Number.isFinite(camDistance) ? camDistance : 17.6;
  out.focus = Math.min(160, Math.max(3.5, safeDist));

  // Полностью отключаем DOF, чтобы все сцены (включая окно юриста и договор) оставались кристально резкими
  out.aperture = 0;

  if (stage === STAGES.POWERDOWN) {
    out.bloomStrength = 0.08;
  } else if (stage === STAGES.ANALYSIS || stage === STAGES.VERDICT || stage === STAGES.BEAM_ASCENT) {
    out.bloomStrength = 0.20;
  } else if (stage === STAGES.CONTRACT_DROP || stage === STAGES.CONTRACT_BRIEF || stage === STAGES.SCAN || stage === STAGES.TRANSFER) {
    out.bloomStrength = 0.14;
  } else {
    out.bloomStrength = 0.13;
  }

  out.chromaAmount = isWarpActive ? 0.0009 : 0;
  return out;
}

export function getPagePairIndices(pageIndex, totalPages = CONTRACT_PAGES.length) {
  const clamped = Math.min(Math.max(0, pageIndex), totalPages - 1);
  const hasNext = clamped < totalPages - 1;
  return {
    currentIdx: clamped,
    nextIdx: hasNext ? clamped + 1 : clamped,
    hasNext,
  };
}

export function getStorageTelemetry(pagesStored, pullProgress = 0, pages = CONTRACT_PAGES) {
  const total = pages.length || 5;
  const baseStored = Math.min(total, Math.max(0, pagesStored));
  const fractional = Math.min(1, Math.max(0, pullProgress));
  const rawFraction = Math.min(1, (baseStored + fractional) / total);
  const chargePct = Math.round(rawFraction * 100);

  let riskAccum = 0;
  for (let i = 0; i < baseStored; i++) {
    riskAccum += pages[i]?.riskWeight ?? 0.16;
  }
  if (fractional > 0 && baseStored < total) {
    riskAccum += (pages[baseStored]?.riskWeight ?? 0.16) * fractional;
  }

  const indexCoeff = Number((rawFraction * 1.25).toFixed(2));
  const riskCoeff = Number(Math.min(0.99, riskAccum).toFixed(2));
  const flowMbps = fractional > 0.02 ? Math.round(420 + fractional * 540) : (baseStored > 0 ? 128 : 0);

  return {
    chargePct,
    rawFraction,
    storedCount: baseStored,
    totalCount: total,
    indexCoeff,
    riskCoeff,
    flowMbps,
    statusLabel: chargePct >= 100 ? 'ЗАРЯД 100% // ГОТОВ' : (fractional > 0.02 ? 'АРХИВАЦИЯ...' : (baseStored > 0 ? 'БУФЕР АКТИВЕН' : 'ОЖИДАНИЕ')),
  };
}

export function getRulerStepStates(currentStage, pageIndex = 0, threatsExtracted = 0, pages = CONTRACT_PAGES) {
  const activeStepIdx = RULER_STEP_DEFINITIONS.findIndex(step => step.stages.includes(currentStage));
  const safeActiveIdx = activeStepIdx === -1 ? 0 : activeStepIdx;

  return RULER_STEP_DEFINITIONS.map((step, idx) => {
    const status = idx < safeActiveIdx ? 'done' : (idx === safeActiveIdx ? 'active' : 'upcoming');
    const detailLines = [step.baseSummary];

    if (step.id === 'delivery' && (status === 'active' || status === 'done')) {
      detailLines.push('Реквизиты: Договор купли-продажи № 238 • 25.12.2026г • фин. гарантия 650 000 ₽.');
    } else if (step.id === 'scan') {
      const pct = Math.round((Math.min(pages.length, threatsExtracted) / pages.length) * 100);
      if (status === 'active') {
        const cur = pages[Math.min(pages.length - 1, pageIndex)];
        detailLines.push(`Сейчас: лист ${Math.min(pages.length, pageIndex + 1)}/${pages.length} (${cur.riskCode} — ${cur.severity}). Накопитель: ${pct}%.`);
      } else if (status === 'done') {
        detailLines.push(`Выполнено: извлечено ${pages.length}/${pages.length} рисков поставки, накопитель заполнен на 100%.`);
      }
      if (threatsExtracted > 0) {
        const found = pages.slice(0, threatsExtracted).map(p => `${p.riskCode}: ${p.riskText}`);
        detailLines.push(`Выявлено: ${found.join(' • ')}`);
      }
    } else if (step.id === 'verdict' && (status === 'active' || status === 'done')) {
      detailLines.push('Итоговый индекс угрозы: 84% (критический риск удержания финансовой гарантии 650 000 ₽).');
    }

    return {
      id: step.id,
      num: step.num,
      shortLabel: step.shortLabel,
      title: step.title,
      status,
      statusBadge: status === 'done' ? 'Пройдено' : (status === 'active' ? 'Сейчас' : 'Ожидает'),
      jumpStage: step.stages[0],
      detailLines,
    };
  });
}

function hermite(p0, m0, p1, m1, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0
    + (t3 - 2 * t2 + t) * m0
    + (-2 * t3 + 3 * t2) * p1
    + (t3 - t2) * m1;
}

export function getContinuousPolarRelayState(stage, stageTimer, isMobile = false, out = {
  camY: 11.4,
  camZ: 17.0,
  lookY: 14.9,
  lookZ: -1.3,
  fov: 48,
  relayProgress: 0,
}) {
  const dAscent = STAGE_DURATIONS.beam_ascent;
  const dFocus = STAGE_DURATIONS.window_focus;
  const dRush = STAGE_DURATIONS.window_rush;
  const totalDur = dAscent + dFocus + dRush;

  let elapsed = 0;
  if (stage === STAGES.BEAM_ASCENT) {
    elapsed = Math.min(dAscent, Math.max(0, stageTimer));
  } else if (stage === STAGES.WINDOW_FOCUS) {
    elapsed = dAscent + Math.min(dFocus, Math.max(0, stageTimer));
  } else if (stage === STAGES.WINDOW_RUSH) {
    elapsed = dAscent + dFocus + Math.min(dRush, Math.max(0, stageTimer));
  }

  const frontZ = isMobile ? 22.0 : 17.0;
  const focusZ = frontZ - 5.0;
  const baseFov = isMobile ? 56 : 48;

  const t1 = dAscent / totalDur;
  const t2 = (dAscent + dFocus) / totalDur;
  const u = Math.min(1, Math.max(0, elapsed / totalDur));
  out.relayProgress = u;

  if (u <= t1) {
    const s = u / t1;
    out.camY = hermite(11.4, 24.0, 138.0, 4.0, s);
    out.camZ = hermite(frontZ, 0.0, frontZ - 1.4, -3.6, s);
    const lookPan = s <= 0.30 ? 0 : (s - 0.30) / 0.70;
    const lookSmooth = lookPan * lookPan * (3 - 2 * lookPan);
    const baseLookY = Math.min(138.0, out.camY + 3.5);
    out.lookY = baseLookY + (138.0 - baseLookY) * lookSmooth;
    out.lookZ = hermite(-1.3, 0.0, -142.0, 0.0, lookSmooth);
    out.fov = baseFov;
  } else if (u <= t2) {
    const s = (u - t1) / (t2 - t1);
    const k = (t2 - t1) / t1;
    const kNext = (1 - t2) / (t2 - t1);
    out.camY = hermite(138.0, 4.0 * k, 138.0, 0.0, s);
    out.camZ = hermite(frontZ - 1.4, -3.6 * k, focusZ, -18.0 / Math.max(0.2, kNext), s);
    out.lookY = 138.0;
    out.lookZ = -142.0;
    out.fov = hermite(baseFov, 0.0, baseFov + 4.0, 12.0 / Math.max(0.2, kNext), s);
  } else {
    const s = (u - t2) / (1 - t2);
    out.camY = 138.0;
    out.camZ = hermite(focusZ, -18.0, -126.0, -210.0, s);
    out.lookY = 138.0;
    out.lookZ = -142.0;
    out.fov = hermite(baseFov + 4.0, 12.0, baseFov + 38.0, 44.0, s);
  }

  return out;
}
