import { describe, it, expect } from '@jest/globals';
import { generateMap } from '../../../backend/src/game/Map';

describe('Map Generation', () => {
  it('should generate a map with correct dimensions', () => {
    const map = generateMap(15, 13, 12345);
    expect(map.width).toBe(15);
    expect(map.height).toBe(13);
    expect(map.tiles.length).toBe(13);
    expect(map.tiles[0].length).toBe(15);
  });

  it('should have walls on borders', () => {
    const map = generateMap(15, 13, 12345);
    for (let x = 0; x < 15; x++) {
      expect(map.tiles[0][x]).toBe('wall');
      expect(map.tiles[12][x]).toBe('wall');
    }
    for (let y = 0; y < 13; y++) {
      expect(map.tiles[y][0]).toBe('wall');
      expect(map.tiles[y][14]).toBe('wall');
    }
  });

  it('should have indestructible walls in grid pattern', () => {
    const map = generateMap(15, 13, 12345);
    for (let y = 2; y < 12; y += 2) {
      for (let x = 2; x < 14; x += 2) {
        expect(map.tiles[y][x]).toBe('wall');
      }
    }
  });

  it('should have spawn points', () => {
    const map = generateMap(15, 13, 12345);
    expect(map.spawnPoints.length).toBeGreaterThanOrEqual(4);
  });

  it('should clear area around spawn points', () => {
    const map = generateMap(15, 13, 12345);
    // Check first spawn point (1,1) - adjacent cells should be clear
    const sp = map.spawnPoints[0];
    expect(map.tiles[sp.y][sp.x]).toBe('spawn');
    // Adjacent cells should not be destructible
    const adjacent = [
      { x: sp.x + 1, y: sp.y },
      { x: sp.x, y: sp.y + 1 },
    ];
    for (const a of adjacent) {
      if (a.x > 0 && a.x < 14 && a.y > 0 && a.y < 12) {
        expect(map.tiles[a.y][a.x]).not.toBe('destructible');
      }
    }
  });

  it('should be deterministic with same seed', () => {
    const map1 = generateMap(15, 13, 42);
    const map2 = generateMap(15, 13, 42);
    expect(map1.tiles).toEqual(map2.tiles);
    expect(map1.seed).toEqual(map2.seed);
  });

  it('should produce different maps with different seeds', () => {
    const map1 = generateMap(15, 13, 1);
    const map2 = generateMap(15, 13, 2);
    // Maps should differ in at least some destructible wall placements
    let differences = 0;
    for (let y = 0; y < 13; y++) {
      for (let x = 0; x < 15; x++) {
        if (map1.tiles[y][x] !== map2.tiles[y][x]) differences++;
      }
    }
    expect(differences).toBeGreaterThan(0);
  });
});
