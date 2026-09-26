// The solo campaign: a path of levels that introduces shapes, surfaces and
// rain in turn. Finishing a level unlocks the next; bonus levels unlock with
// total stars. Pure logic only; saving lives in progressStore.ts.

import { STAGES } from './stages';

export type Level = {
  id: string;
  name: string;
  stage: number; // index into STAGES
  surface: number; // index into SURFACES: 0 Dirt, 1 Sand, 2 Cement, 3 Tile
  wet: boolean;
  par: number;
  bonusStars?: number; // bonus level: total stars needed to unlock
};

// Par = stage par, +2 on sand (short slides), +1 on tile (hard to control),
// +1 when wet. First guesses, to be tuned in playtests.
function par(stage: number, surface: number, wet: boolean) {
  return STAGES[stage].par + (surface === 1 ? 2 : 0) + (surface === 3 ? 1 : 0) + (wet ? 1 : 0);
}

function level(id: string, name: string, stage: number, surface: number, wet = false, bonusStars?: number): Level {
  return { id, name, stage, surface, wet, par: par(stage, surface, wet), bonusStars };
}

export const LEVELS: Level[] = [
  level('1', 'School yard', 0, 0),
  level('2', 'Diani beach', 0, 1),
  level('3', 'Estate parking', 0, 2),
  level('4', 'Market square', 1, 0),
  level('5', 'Church compound', 1, 2),
  level('6', 'Hotel lobby', 1, 3),
  level('7', 'Village path', 2, 0),
  level('8', 'Lake shore', 2, 1),
  level('9', 'Mall floor', 2, 3),
  level('10', 'Rainy school yard', 0, 0, true),
  level('11', 'Wet car park', 1, 2, true),
  level('12', 'Flooded lobby', 2, 3, true),
  level('B1', 'Monsoon beach', 1, 1, true, 12),
  level('B2', 'Slippery mall', 0, 3, true, 24),
  level('B3', 'Storm yard', 2, 2, true, 33),
];

export type Progress = { stars: Record<string, number> };

export const EMPTY_PROGRESS: Progress = { stars: {} };

export function totalStars(p: Progress): number {
  return Object.values(p.stars).reduce((t, s) => t + s, 0);
}

export function maxStars(): number {
  return LEVELS.length * 3;
}

export function isUnlocked(p: Progress, index: number): boolean {
  const lvl = LEVELS[index];
  if (lvl.bonusStars !== undefined) return totalStars(p) >= lvl.bonusStars;
  if (index === 0) return true;
  // Main levels open one after another.
  const prev = LEVELS.slice(0, index).filter((l) => l.bonusStars === undefined).pop();
  return !prev || (p.stars[prev.id] ?? 0) > 0;
}

// Keep the best result for a level.
export function recordStars(p: Progress, id: string, stars: number): Progress {
  if (stars <= (p.stars[id] ?? 0)) return p;
  return { stars: { ...p.stars, [id]: stars } };
}

// The next level to offer after finishing `index`, if it's unlocked.
export function nextLevel(p: Progress, index: number): number | null {
  for (let i = index + 1; i < LEVELS.length; i++) if (isUnlocked(p, i)) return i;
  return null;
}
