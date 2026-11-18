export const STAGES = {
  INTRO: 'intro',
  SCAN: 'scan',
  SCAN_PAUSED: 'scan_paused',
  TRANSFER: 'transfer',
  ANALYSIS: 'analysis',
  VERDICT: 'verdict',
  POWERDOWN: 'powerdown',
  BEAM_ASCENT: 'beam_ascent',
  WINDOW_FOCUS: 'window_focus',
  WINDOW_RUSH: 'window_rush',
  COLLAPSE: 'collapse',
  LOGO_REVEAL: 'logo_reveal',
};

export const STAGE_DURATIONS = {
  intro: 3.6,
  transfer: 3.4,
  analysis: 3.6,
  verdict: 2.2,
  powerdown: 1.1,
  beam_ascent: 2.5,
  window_focus: 1.6,
  window_rush: 1.6,
  collapse: 0.55,
};

export const CAMERA_LIMITS = {
  minAzimuthAngle: -Math.PI * 0.34,
  maxAzimuthAngle: Math.PI * 0.34,
  minPolarAngle: Math.PI * 0.30,
  maxPolarAngle: Math.PI * 0.64,
  minDistance: 5.5,
  maxDistance: 25,
};

export const CONTRACT_PAGES = [
  {
    pageNum: 1,
    header: 'СТР. 1 • ПРЕДМЕТ ДОГОВОРА № 884-СД',
    clause: '1.2. Оператор вправе в одностороннем порядке расторгнуть доступ без уведомления.',
    riskCode: 'ПУНКТ 1.2',
    riskText: 'СКРЫТАЯ ОГОВОРКА ОБ ОДНОСТОРОННЕМ ОТКАЗЕ',
    agentIndex: 0,
    severity: 'ВЫСОКИЙ',
  },
  {
    pageNum: 2,
    header: 'СТР. 2 • ФИНАНСОВЫЕ САНКЦИИ И ЛИМИТЫ',
    clause: '2.1. Правообладатель несет полную имущественную ответственность без верхнего порога.',
    riskCode: 'ПУНКТ 2.1',
    riskText: 'НЕОГРАНИЧЕННАЯ ОТВЕТСТВЕННОСТЬ БЕЗ ЛИМИТА',
    agentIndex: 2,
    severity: 'КРИТИЧЕСКИЙ',
  },
  {
    pageNum: 3,
    header: 'СТР. 3 • НЕОБРАТИМОСТЬ ТРАНЗАКЦИЙ',
    clause: '2.4. Подтвержденные операции не подлежат отзыву и перерасчету в судебном порядке.',
    riskCode: 'ПУНКТ 2.4',
    riskText: 'ЗАПРЕТ НА ОСПАРИВАНИЕ ТРАНЗАКЦИЙ',
    agentIndex: 1,
    severity: 'КРИТИЧЕСКИЙ',
  },
  {
    pageNum: 4,
    header: 'СТР. 4 • ПЕРЕДАЧА ИНТЕЛЛЕКТУАЛЬНЫХ ПРАВ',
    clause: '3.3. Все производные алгоритмы автоматически отчуждаются в пользу Оператора.',
    riskCode: 'ПУНКТ 3.3',
    riskText: 'ОТЧУЖДЕНИЕ ПРОИЗВОДНЫХ ПРАВ БЕЗ ВЫПЛАТ',
    agentIndex: 0,
    severity: 'ВЫСОКИЙ',
  },
  {
    pageNum: 5,
    header: 'СТР. 5 • АРБИТРАЖ И ЮРИСДИКЦИЯ',
    clause: '4.1. Споры рассматриваются закрытым трибуналом в ускоренный срок 24 часа.',
    riskCode: 'ПУНКТ 4.1',
    riskText: 'ЗАКРЫТЫЙ АРБИТРАЖ СО СРОКОМ 24 ЧАСА',
    agentIndex: 1,
    severity: 'ВЫСОКИЙ',
  },
];

export const AUDIO_TRACKS = {
  intro: { id: 'intro', label: '01. Озвучка: Введение и обзор пространства', url: '' },
  scan: { id: 'scan', label: '02. Озвучка: Сканирование страниц агентами', url: '' },
  transfer: { id: 'transfer', label: '03. Озвучка: Передача данных в сферу флагмана', url: '' },
  finale: { id: 'finale', label: '04. Озвучка: Вердикт ИИ и импульс к юристу', url: '' },
};

export function getPageDuration(pageIndex) {
  const durations = [2.8, 2.3, 1.85, 1.45, 1.2];
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

export function getSlideGroup(stage) {
  if (stage === STAGES.INTRO) return 'slide-0';
  if (stage === STAGES.SCAN || stage === STAGES.SCAN_PAUSED) return 'slide-1';
  if (stage === STAGES.TRANSFER) return 'slide-2';
  return 'slide-3';
}
