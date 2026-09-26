// The ground the spiral is drawn on. Friction is how quickly a sliding stone
// slows down (world units / s²): lower friction means it slides further.

export type Surface = {
  name: string;
  icon: string;
  friction: number;
  ground: string; // base colour
  grain: string; // speckle / grout colour
  line: string; // colour of the drawn spiral
  texture: 'speckle' | 'tiles' | 'smooth';
};

export const SURFACES: Surface[] = [
  { name: 'Dirt', icon: '🟫', friction: 520, ground: '#7a5634', grain: '#5e3f22', line: '#fdf6e3', texture: 'speckle' },
  { name: 'Sand', icon: '🏖️', friction: 850, ground: '#d6b77c', grain: '#b8955a', line: '#6b4a26', texture: 'speckle' },
  { name: 'Cement', icon: '🧱', friction: 370, ground: '#8d8c87', grain: '#77766f', line: '#fdfdf8', texture: 'speckle' },
  { name: 'Tile', icon: '🔲', friction: 260, ground: '#c7d2d4', grain: '#9fb0b4', line: '#1f3a5a', texture: 'tiles' },
];

// Rain makes any surface slippery.
export const WET_FRICTION = 0.6;

export function friction(surface: Surface, wet: boolean): number {
  return surface.friction * (wet ? WET_FRICTION : 1);
}

// How far a push at `speed` slides before stopping.
export function slideDistance(speed: number, surface: Surface, wet: boolean): number {
  return (speed * speed) / (2 * friction(surface, wet));
}
