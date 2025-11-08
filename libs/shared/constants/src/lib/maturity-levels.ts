// Maturity Level Definitions

export const MATURITY_LEVELS = {
  1: { min: 1.0, max: 1.5, label: 'Sơ khai (Initial)', color: '#EF4444' },
  2: { min: 1.6, max: 2.5, label: 'Khởi đầu (Beginning)', color: '#F97316' },
  3: { min: 2.6, max: 3.5, label: 'Phát triển (Developing)', color: '#EAB308' },
  4: { min: 3.6, max: 4.5, label: 'Trưởng thành (Mature)', color: '#22C55E' },
  5: { min: 4.6, max: 5.0, label: 'Tối ưu (Optimized)', color: '#3B82F6' },
} as const;

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

export function getMaturityLevel(score: number): MaturityLevel {
  if (score >= 4.6) return 5;
  if (score >= 3.6) return 4;
  if (score >= 2.6) return 3;
  if (score >= 1.6) return 2;
  return 1;
}

export function getMaturityLevelInfo(level: MaturityLevel) {
  return MATURITY_LEVELS[level];
}
