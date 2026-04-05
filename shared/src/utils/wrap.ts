import { Position } from '../types/game';

/** Wrap x-coordinate for toroidal map */
export function wrapX(x: number, width: number): number {
  return ((x % width) + width) % width;
}

/** Wrap y-coordinate for toroidal map */
export function wrapY(y: number, height: number): number {
  return ((y % height) + height) % height;
}

/** Wrap both coordinates for toroidal map */
export function wrapPosition(x: number, y: number, width: number, height: number): Position {
  return { x: wrapX(x, width), y: wrapY(y, height) };
}

/** Manhattan distance on a toroidal grid (shortest path considering wrapping) */
export function wrappedManhattanDistance(
  a: Position,
  b: Position,
  width: number,
  height: number,
): number {
  const dx = Math.min(Math.abs(a.x - b.x), width - Math.abs(a.x - b.x));
  const dy = Math.min(Math.abs(a.y - b.y), height - Math.abs(a.y - b.y));
  return dx + dy;
}
