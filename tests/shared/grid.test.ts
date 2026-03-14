import { describe, it, expect } from '@jest/globals';
import { posToTile, tileToPos, getExplosionCells, manhattanDistance, isInBounds } from '../../shared/src/utils/grid';
import { TILE_SIZE } from '../../shared/src/constants/game';
import { TileType } from '../../shared/src/types/game';

describe('Grid Utils', () => {
  describe('posToTile', () => {
    it('should convert pixel position to tile position', () => {
      expect(posToTile(0, 0)).toEqual({ x: 0, y: 0 });
      expect(posToTile(TILE_SIZE - 1, TILE_SIZE - 1)).toEqual({ x: 0, y: 0 });
      expect(posToTile(TILE_SIZE, TILE_SIZE)).toEqual({ x: 1, y: 1 });
    });
  });

  describe('tileToPos', () => {
    it('should convert tile position to center pixel position', () => {
      const pos = tileToPos(0, 0);
      expect(pos.x).toBe(TILE_SIZE / 2);
      expect(pos.y).toBe(TILE_SIZE / 2);
    });

    it('should round-trip with posToTile', () => {
      const center = tileToPos(3, 4);
      const tile = posToTile(center.x, center.y);
      expect(tile).toEqual({ x: 3, y: 4 });
    });
  });

  describe('getExplosionCells', () => {
    function createEmptyGrid(w: number, h: number): TileType[][] {
      const tiles: TileType[][] = [];
      for (let y = 0; y < h; y++) {
        tiles[y] = [];
        for (let x = 0; x < w; x++) {
          tiles[y][x] = 'empty';
        }
      }
      return tiles;
    }

    it('should include origin cell', () => {
      const tiles = createEmptyGrid(5, 5);
      const cells = getExplosionCells(2, 2, 2, 5, 5, tiles);
      expect(cells).toContainEqual({ x: 2, y: 2 });
    });

    it('should spread in cross shape', () => {
      const tiles = createEmptyGrid(5, 5);
      const cells = getExplosionCells(2, 2, 1, 5, 5, tiles);
      expect(cells).toHaveLength(5); // center + 4 directions
      expect(cells).toContainEqual({ x: 2, y: 2 });
      expect(cells).toContainEqual({ x: 2, y: 1 }); // up
      expect(cells).toContainEqual({ x: 2, y: 3 }); // down
      expect(cells).toContainEqual({ x: 1, y: 2 }); // left
      expect(cells).toContainEqual({ x: 3, y: 2 }); // right
    });

    it('should stop at walls', () => {
      const tiles = createEmptyGrid(5, 5);
      tiles[2][3] = 'wall'; // wall to the right
      const cells = getExplosionCells(2, 2, 3, 5, 5, tiles);
      // Should not include or go past the wall
      expect(cells).not.toContainEqual({ x: 3, y: 2 });
      expect(cells).not.toContainEqual({ x: 4, y: 2 });
    });

    it('should include destructible wall but stop there', () => {
      const tiles = createEmptyGrid(5, 5);
      tiles[2][3] = 'destructible';
      const cells = getExplosionCells(2, 2, 3, 5, 5, tiles);
      expect(cells).toContainEqual({ x: 3, y: 2 }); // destructible is included
      expect(cells).not.toContainEqual({ x: 4, y: 2 }); // but stopped
    });

    it('should stop at map boundaries', () => {
      const tiles = createEmptyGrid(5, 5);
      const cells = getExplosionCells(0, 0, 3, 5, 5, tiles);
      // Should not go negative
      expect(cells.every(c => c.x >= 0 && c.y >= 0)).toBe(true);
    });
  });

  describe('manhattanDistance', () => {
    it('should calculate correctly', () => {
      expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
      expect(manhattanDistance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
    });
  });

  describe('isInBounds', () => {
    it('should return true for in-bounds coordinates', () => {
      expect(isInBounds(0, 0, 5, 5)).toBe(true);
      expect(isInBounds(4, 4, 5, 5)).toBe(true);
    });

    it('should return false for out-of-bounds coordinates', () => {
      expect(isInBounds(-1, 0, 5, 5)).toBe(false);
      expect(isInBounds(5, 0, 5, 5)).toBe(false);
      expect(isInBounds(0, 5, 5, 5)).toBe(false);
    });
  });
});
