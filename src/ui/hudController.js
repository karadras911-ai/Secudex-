import { STAGES, STAGE_DURATIONS, RULER_STEP_DEFINITIONS } from '../config/stages.js';
import { CONTRACT_PAGES } from '../config/contractData.js';
import {
  getNextUserAction,
  getSlideGroup,
  shouldShowHudOverlays,
  getRulerStepStates,
  getStorageTelemetry,
  getPageDuration,
} from '../stages/timelineMath.js';

export function createHudController({ state, onEnterStage, voicePlayer }) {
  const rulerStepsEl = document.getElementById('ruler-steps');
  const rulerFillEl = document.getElementById('ruler-track-fill');
  const telemetryBadgeEl = document.getElementById('ruler-telemetry-badge');
  const detailPopoverEl = document.getElementById('ruler-detail-popover');
  const detailTitleEl = document.getElementById('ruler-detail-title');
  const detailStatusEl = document.getElementById('ruler-detail-status');
  const detailBodyEl = document.getElementById('ruler-detail-body');
  const jumpBtn = document.getElementById('ruler-jump-btn');
  const closeDetailBtn = document.getElementById('ruler-close-btn');

  const primaryBtn = document.getElementById('primary-action-btn');
  const pauseBtn = document.getElementById('pause-btn');

  let selectedStepId = null;

  // Создаём 6 объёмных кнопок-этапов на верхней линейке
  const stepButtons = new Map();
  RULER_STEP_DEFINITIONS.forEach(def => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ruler-step';
    btn.setAttribute('data-step-id', def.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `<span class="ruler-step-pip" aria-hidden="true"></span><span class="ruler-step-num">${def.num}</span><span class="ruler-step-label">${def.shortLabel}</span>`;
    btn.addEventListener('click', () => {
      selectedStepId = selectedStepId === def.id ? null : def.id;
      syncUI();
    });
    rulerStepsEl.appendChild(btn);
    stepButtons.set(def.id, btn);
  });

  function renderDetailPopover(stepStates) {
    if (!selectedStepId) {
      detailPopoverEl.classList.remove('open');
      return;
    }
    const found = stepStates.find(s => s.id === selectedStepId);
    if (!found) {
      detailPopoverEl.classList.remove('open');
      return;
    }
    detailPopoverEl.classList.add('open');
    detailTitleEl.textContent = found.title;
    detailStatusEl.textContent = found.statusBadge;
    detailBodyEl.innerHTML = '';
    found.detailLines.forEach(line => {
      const p = document.createElement('div');
      p.textContent = line;
      detailBodyEl.appendChild(p);
    });
    jumpBtn.setAttribute('data-jump-stage', found.jumpStage);
  }

  function syncUI() {
    document.body.setAttribute('data-stage', state.stage);
    document.body.setAttribute('data-threats', String(state.threatsExtracted));
    document.body.classList.toggle(
      'intro-cinematic-active',
      !shouldShowHudOverlays(state.hasPlayedStartupIntro, state.stage, state.stageTimer, STAGE_DURATIONS.intro)
    );

    const stepStates = getRulerStepStates(state.stage, state.pageIndex, state.threatsExtracted);
    let activeIdx = 0;
    stepStates.forEach((st, idx) => {
      if (st.status === 'active') activeIdx = idx;
      const btn = stepButtons.get(st.id);
      if (btn) {
        btn.classList.toggle('done', st.status === 'done');
        btn.classList.toggle('active', st.status === 'active');
        btn.classList.toggle('selected', selectedStepId === st.id);
        btn.setAttribute('aria-expanded', String(selectedStepId === st.id));
      }
    });

    const pctRail = Math.round((activeIdx / Math.max(1, stepStates.length - 1)) * 100);
    rulerFillEl.style.width = `${pctRail}%`;

    const stored = state.stage === STAGES.INTRO || state.stage === STAGES.CONTRACT_DROP || state.stage === STAGES.CONTRACT_BRIEF
      ? 0
      : state.threatsExtracted;
    let pullP = 0;
    if (state.stage === STAGES.SCAN) {
      const p = Math.min(state.pageTimer / getPageDuration(state.pageIndex), 1);
      if (p >= 0.64) pullP = (p - 0.64) / 0.36;
    }
    const tel = getStorageTelemetry(stored, pullP);
    telemetryBadgeEl.textContent = `УГРОЗ: ${state.threatsExtracted}/${CONTRACT_PAGES.length} • БАТ: ${tel.chargePct}%`;
    lastBadgePct = tel.chargePct;
    lastBadgeThreats = state.threatsExtracted;

    renderDetailPopover(stepStates);

    const activeSlide = getSlideGroup(state.stage);
    document.querySelectorAll('.slide-btn').forEach(btn => {
      btn.classList.toggle('active', `slide-${btn.getAttribute('data-slide')}` === activeSlide);
    });

    const nextAct = getNextUserAction(state.stage);
    if (nextAct) {
      primaryBtn.disabled = false;
      primaryBtn.textContent = nextAct.label;
    } else {
      primaryBtn.disabled = true;
      primaryBtn.textContent = 'ИДЕТ ПРОЦЕСС...';
    }

    pauseBtn.disabled = !(state.stage === STAGES.SCAN);
    pauseBtn.textContent = state.paused ? 'Продолжить скан' : 'Пауза скана';
  }

  closeDetailBtn.addEventListener('click', () => {
    selectedStepId = null;
    syncUI();
  });

  jumpBtn.addEventListener('click', () => {
    const targetStage = jumpBtn.getAttribute('data-jump-stage');
    if (!targetStage) return;
    selectedStepId = null;
    const audioMap = {
      [STAGES.INTRO]: 'intro',
      [STAGES.CONTRACT_DROP]: 'scan',
      [STAGES.SCAN]: 'scan',
      [STAGES.TRANSFER]: 'transfer',
      [STAGES.ANALYSIS]: 'finale',
      [STAGES.BEAM_ASCENT]: 'finale',
    };
    onEnterStage(targetStage, audioMap[targetStage] || null);
  });

  primaryBtn.addEventListener('click', () => {
    const act = getNextUserAction(state.stage);
    if (!act) return;
    if (act.action === 'start_scan') onEnterStage(STAGES.CONTRACT_DROP, 'scan');
    else if (act.action === 'start_transfer') onEnterStage(STAGES.TRANSFER, 'transfer');
    else if (act.action === 'restart') onEnterStage(STAGES.INTRO, 'intro');
  });

  pauseBtn.addEventListener('click', () => {
    if (state.stage !== STAGES.SCAN) return;
    state.paused = !state.paused;
    syncUI();
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    selectedStepId = null;
    onEnterStage(STAGES.INTRO, 'intro');
  });

  document.getElementById('final-replay-btn').addEventListener('click', () => {
    selectedStepId = null;
    onEnterStage(STAGES.INTRO, 'intro');
  });

  document.querySelectorAll('.slide-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-slide'));
      if (idx === 0) onEnterStage(STAGES.INTRO, 'intro');
      else if (idx === 1) onEnterStage(STAGES.CONTRACT_DROP, 'scan');
      else if (idx === 2) onEnterStage(STAGES.TRANSFER, 'transfer');
      else if (idx === 3) onEnterStage(STAGES.ANALYSIS, 'finale');
    });
  });

  document.getElementById('dock-toggle-btn').addEventListener('click', (e) => {
    const wrap = document.getElementById('bottom-dock-wrap');
    const collapsed = wrap.classList.toggle('collapsed');
    e.currentTarget.textContent = collapsed ? 'Показать панель' : 'Свернуть панель';
    e.currentTarget.setAttribute('aria-expanded', String(!collapsed));
  });

  document.getElementById('audio-drawer-btn').addEventListener('click', (e) => {
    const drawer = document.getElementById('audio-drawer');
    const open = drawer.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });

  document.getElementById('audio-mute-btn').addEventListener('click', (e) => {
    const muted = voicePlayer.toggleMute();
    e.currentTarget.textContent = muted ? 'Звук: ВЫКЛ' : 'Звук: ВКЛ';
    document.getElementById('audio-drawer-btn').textContent = muted ? 'Озвучка: Выкл' : 'Озвучка: Вкл';
  });

  let lastBadgePct = -1;
  let lastBadgeThreats = -1;

  function updateLiveBattery(telemetry) {
    if (!telemetry) return;
    if (telemetry.chargePct === lastBadgePct && state.threatsExtracted === lastBadgeThreats) return;
    lastBadgePct = telemetry.chargePct;
    lastBadgeThreats = state.threatsExtracted;
    telemetryBadgeEl.textContent = `УГРОЗ: ${state.threatsExtracted}/${CONTRACT_PAGES.length} • БАТ: ${telemetry.chargePct}%`;
  }

  return {
    syncUI,
    updateLiveBattery,
  };
}
