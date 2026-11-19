export const STAGES = {
  INTRO: 'intro',
  CONTRACT_DROP: 'contract_drop',
  CONTRACT_BRIEF: 'contract_brief',
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
  intro: 6.2,
  contract_drop: 3.1,
  contract_brief: 3.4,
  transfer: 3.4,
  analysis: 3.6,
  verdict: 2.2,
  powerdown: 1.1,
  beam_ascent: 2.5,
  window_focus: 1.6,
  window_rush: 1.6,
  collapse: 0.55,
};

export const AUDIO_TRACKS = {
  intro: { id: 'intro', label: '01. Озвучка: Введение и обзор пространства', url: '' },
  scan: { id: 'scan', label: '02. Озвучка: Сканирование договора поставки', url: '' },
  transfer: { id: 'transfer', label: '03. Озвучка: Передача данных в сферу флагмана', url: '' },
  finale: { id: 'finale', label: '04. Озвучка: Вердикт ИИ и импульс к юристу', url: '' },
};

export const RULER_STEP_DEFINITIONS = [
  {
    id: 'overview',
    num: '01',
    shortLabel: 'Обзор',
    title: '01. Инициализация и обзор контура',
    stages: [STAGES.INTRO],
    baseSummary: 'Запуск 3D-катализатора SECUDEX: 3 периферийных агента ИИ, центральный куб-реактор, левый накопитель и Флагман ИИ.',
  },
  {
    id: 'delivery',
    num: '02',
    shortLabel: 'Подача',
    title: '02. Материализация договора № 238',
    stages: [STAGES.CONTRACT_DROP, STAGES.CONTRACT_BRIEF],
    baseSummary: 'Сфера Флагмана фокусирует квантовую частицу в центре куба и раскрывает договор, а правая камера проецирует его реквизиты.',
  },
  {
    id: 'scan',
    num: '03',
    shortLabel: 'Скан',
    title: '03. Постраничный скан, риски и архив',
    stages: [STAGES.SCAN, STAGES.SCAN_PAUSED],
    baseSummary: 'Агенты поочерёдно сканируют 5 страниц, проецируют и поглощают риски поставки, а листы складываются в батарейный накопитель слева (0% → 100%).',
  },
  {
    id: 'transfer',
    num: '04',
    shortLabel: 'Передача',
    title: '04. Передача отчётов Флагману',
    stages: [STAGES.TRANSFER],
    baseSummary: 'Сферы-агенты отправляют структурированные пакеты извлечённых угроз вверх по энергетическим каналам в Флагманскую сферу.',
  },
  {
    id: 'verdict',
    num: '05',
    shortLabel: 'Вердикт',
    title: '05. Глобальный синтез и вердикт 84%',
    stages: [STAGES.ANALYSIS, STAGES.VERDICT, STAGES.POWERDOWN],
    baseSummary: 'Флагман строит глобальную матрицу рисков поставки и финансовой гарантии 650 000 ₽, выносит вердикт 84% и концентрирует энергию.',
  },
  {
    id: 'impulse',
    num: '06',
    shortLabel: 'Импульс',
    title: '06. Полярный импульс к юристу',
    stages: [STAGES.BEAM_ASCENT, STAGES.WINDOW_FOCUS, STAGES.WINDOW_RUSH, STAGES.COLLAPSE, STAGES.LOGO_REVEAL],
    baseSummary: 'Вертикальный плазменный импульс поднимается вверх, наводится на удалённый терминал дежурного юриста и доставляет отчёт.',
  },
];
