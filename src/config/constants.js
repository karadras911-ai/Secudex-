export const LOGO_ASSET_URL = '/assets/aistudio/SJmoFqjxktcBE2_s7xOueDeqy587oy99Ot1z7gbeKKnIrY2zsbBkL1zgb2IoWHCpMmqPzL6XRzkbhq-Kv8329mNh-1_1645ecf9.jpg';

export const CAMERA_LIMITS = {
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity,
  minPolarAngle: 0.02,
  maxPolarAngle: Math.PI - 0.02,
  minDistance: 5.5,
  maxDistance: 32,
};

export const CUBE_SIZE = 4.35;
export const CUBE_HALF = CUBE_SIZE / 2;

export const FLAGSHIP_POS = { x: 0, y: 7.45, z: -1.3 };
export const FLAGSHIP_RADIUS = 2.55;

export const AGENT_SPECS = [
  { pos: [-2.7, -1.78, 2.55], accent: 0x38bdf8, secondary: 0x7c3aed, label: 'АГЕНТ-01 // ПРАВА' },
  { pos: [0.0, -1.88, 2.95], accent: 0xe879f9, secondary: 0x6d28d9, label: 'АГЕНТ-02 // РИСКИ' },
  { pos: [2.7, -1.78, 2.55], accent: 0x60a5fa, secondary: 0x4f46e5, label: 'АГЕНТ-03 // САНКЦИИ' },
];
