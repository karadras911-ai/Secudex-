export const DEVICE_TIERS = {
  MOBILE: 'mobile',
  LAPTOP: 'laptop',
  PC: 'pc',
};

const TIER_PROFILES = {
  [DEVICE_TIERS.MOBILE]: {
    tier: DEVICE_TIERS.MOBILE,
    label: 'Телефон (Эко-60 FPS)',
    isMobileLayout: true,
    maxDpr: 1.65,
    msaaSamples: 2,
    bloomResolutionScale: 0.5,
    bloomStrengthScale: 0.85,
    cinemaGrain: 0.0,
    anamorphicStreak: false,
    starCount: 1600,
    galaxyParticleScale: 0.72,
    galaxyNebulaLayers: 1,
    cloudParticleRatio: 0.82,
    cameraBreathingAmp: 0.015,
    parallaxDepthMul: 0.65,
  },
  [DEVICE_TIERS.LAPTOP]: {
    tier: DEVICE_TIERS.LAPTOP,
    label: 'Ноутбук (Баланс)',
    isMobileLayout: false,
    maxDpr: 1.75,
    msaaSamples: 4,
    bloomResolutionScale: 0.5,
    bloomStrengthScale: 0.96,
    cinemaGrain: 0.004,
    anamorphicStreak: true,
    starCount: 2600,
    galaxyParticleScale: 1.0,
    galaxyNebulaLayers: 2,
    cloudParticleRatio: 1.0,
    cameraBreathingAmp: 0.035,
    parallaxDepthMul: 1.0,
  },
  [DEVICE_TIERS.PC]: {
    tier: DEVICE_TIERS.PC,
    label: 'ПК (Ультра-Кино)',
    isMobileLayout: false,
    maxDpr: 2.0,
    msaaSamples: 4,
    bloomResolutionScale: 0.65,
    bloomStrengthScale: 1.12,
    cinemaGrain: 0.006,
    anamorphicStreak: true,
    starCount: 3800,
    galaxyParticleScale: 1.28,
    galaxyNebulaLayers: 3,
    cloudParticleRatio: 1.0,
    cameraBreathingAmp: 0.055,
    parallaxDepthMul: 1.35,
  },
};

export function detectDeviceTier({
  width = 1440,
  height = 900,
  cores = 8,
  memoryGb = 8,
  coarsePointer = false,
  forcedTier = null,
} = {}) {
  if (forcedTier && TIER_PROFILES[forcedTier]) {
    return forcedTier;
  }
  const minSide = Math.min(width, height);
  if (width < 640 || (coarsePointer && minSide < 780) || memoryGb <= 3 || cores <= 3) {
    return DEVICE_TIERS.MOBILE;
  }
  if (width >= 1360 && cores >= 8 && memoryGb >= 8 && !coarsePointer) {
    return DEVICE_TIERS.PC;
  }
  return DEVICE_TIERS.LAPTOP;
}

export function getDeviceProfile(env = {}) {
  const tier = detectDeviceTier(env);
  const base = TIER_PROFILES[tier] || TIER_PROFILES[DEVICE_TIERS.LAPTOP];
  return {
    ...base,
    isMobileLayout: env.width !== undefined ? env.width < 640 : base.isMobileLayout,
  };
}
