import { DEFAULT_SPIRAL, SpiralConfig } from './spiral';

export type Stage = { name: string; icon: string; cfg: SpiralConfig };

export const STAGES: Stage[] = [
  { name: 'Circle', icon: '●', cfg: DEFAULT_SPIRAL },
  // Flat sides top/bottom/left/right, corners on the diagonals.
  { name: 'Square', icon: '■', cfg: { ...DEFAULT_SPIRAL, sides: 4, rotation: Math.PI / 4 } },
  // Point up. Corners stick out a long way, so one ring fewer keeps it on screen.
  { name: 'Triangle', icon: '▲', cfg: { ...DEFAULT_SPIRAL, rings: 3, sides: 3, rotation: Math.PI / 6 } },
];
