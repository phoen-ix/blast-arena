import { GameMap, TileType, Position } from '@blast-arena/shared';
import { DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT, DESTRUCTIBLE_FILL_RATE, SPAWN_CLEAR_RADIUS } from '@blast-arena/shared';

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }
}

export function generateMap(width: number = DEFAULT_MAP_WIDTH, height: number = DEFAULT_MAP_HEIGHT, seed?: number): GameMap {
  const mapSeed = seed ?? Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(mapSeed);

  // Initialize all tiles as empty
  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = 'empty';
    }
  }

  // Place indestructible walls in a grid pattern (every other cell)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Border walls
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        tiles[y][x] = 'wall';
        continue;
      }
      // Internal grid pattern: walls on even row AND even column (1-indexed inner grid)
      if (x % 2 === 0 && y % 2 === 0) {
        tiles[y][x] = 'wall';
      }
    }
  }

  // Define spawn points at corners and edges
  const spawnPoints: Position[] = [
    { x: 1, y: 1 },                          // top-left
    { x: width - 2, y: 1 },                  // top-right
    { x: 1, y: height - 2 },                 // bottom-left
    { x: width - 2, y: height - 2 },         // bottom-right
    { x: Math.floor(width / 2), y: 1 },      // top-center
    { x: Math.floor(width / 2), y: height - 2 }, // bottom-center
    { x: 1, y: Math.floor(height / 2) },     // left-center
    { x: width - 2, y: Math.floor(height / 2) }, // right-center
  ];

  // Mark spawn points
  for (const sp of spawnPoints) {
    tiles[sp.y][sp.x] = 'spawn';
  }

  // Calculate cells that must stay clear (around spawn points)
  const clearCells = new Set<string>();
  for (const sp of spawnPoints) {
    for (let dy = -SPAWN_CLEAR_RADIUS; dy <= SPAWN_CLEAR_RADIUS; dy++) {
      for (let dx = -SPAWN_CLEAR_RADIUS; dx <= SPAWN_CLEAR_RADIUS; dx++) {
        const nx = sp.x + dx;
        const ny = sp.y + dy;
        if (nx >= 1 && nx < width - 1 && ny >= 1 && ny < height - 1) {
          if (Math.abs(dx) + Math.abs(dy) <= SPAWN_CLEAR_RADIUS) {
            clearCells.add(`${nx},${ny}`);
          }
        }
      }
    }
  }

  // Place destructible walls randomly
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] !== 'empty') continue;
      if (clearCells.has(`${x},${y}`)) continue;

      if (rng.next() < DESTRUCTIBLE_FILL_RATE) {
        tiles[y][x] = 'destructible';
      }
    }
  }

  return {
    width,
    height,
    tiles,
    spawnPoints,
    seed: mapSeed,
  };
}
