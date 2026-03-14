import { describe, it, expect } from '@jest/globals';
import { CollisionSystem } from '../../../backend/src/game/CollisionSystem';
import { TileType } from '@blast-arena/shared';

describe('CollisionSystem', () => {
  function createTestGrid(): TileType[][] {
    // 5x5 grid
    // W W W W W
    // W . . . W
    // W . W . W
    // W . . . W
    // W W W W W
    return [
      ['wall', 'wall', 'wall', 'wall', 'wall'],
      ['wall', 'empty', 'empty', 'empty', 'wall'],
      ['wall', 'empty', 'wall', 'empty', 'wall'],
      ['wall', 'empty', 'empty', 'empty', 'wall'],
      ['wall', 'wall', 'wall', 'wall', 'wall'],
    ];
  }

  it('should allow movement to empty cells', () => {
    const cs = new CollisionSystem(createTestGrid(), 5, 5);
    const result = cs.canMoveTo(1, 1, 'right', []);
    expect(result).toEqual({ x: 2, y: 1 });
  });

  it('should block movement into walls', () => {
    const cs = new CollisionSystem(createTestGrid(), 5, 5);
    const result = cs.canMoveTo(1, 1, 'left', []);
    expect(result).toBeNull();
  });

  it('should block movement into indestructible walls', () => {
    const cs = new CollisionSystem(createTestGrid(), 5, 5);
    const result = cs.canMoveTo(1, 2, 'right', []);
    expect(result).toBeNull();
  });

  it('should block movement into bombs', () => {
    const cs = new CollisionSystem(createTestGrid(), 5, 5);
    const result = cs.canMoveTo(1, 1, 'right', [{ x: 2, y: 1 }]);
    expect(result).toBeNull();
  });

  it('should identify walkable tiles', () => {
    const cs = new CollisionSystem(createTestGrid(), 5, 5);
    expect(cs.isWalkable(1, 1)).toBe(true);
    expect(cs.isWalkable(0, 0)).toBe(false);
    expect(cs.isWalkable(2, 2)).toBe(false);
  });

  it('should destroy destructible tiles', () => {
    const tiles: TileType[][] = [
      ['wall', 'wall', 'wall'],
      ['wall', 'destructible', 'wall'],
      ['wall', 'wall', 'wall'],
    ];
    const cs = new CollisionSystem(tiles, 3, 3);

    expect(cs.destroyTile(1, 1)).toBe(true);
    expect(cs.isWalkable(1, 1)).toBe(true);
    expect(cs.destroyTile(0, 0)).toBe(false); // Can't destroy indestructible
  });

  it('should handle out-of-bounds', () => {
    const cs = new CollisionSystem(createTestGrid(), 5, 5);
    expect(cs.isWalkable(-1, 0)).toBe(false);
    expect(cs.isWalkable(0, -1)).toBe(false);
    expect(cs.isWalkable(5, 0)).toBe(false);
    expect(cs.isWalkable(0, 5)).toBe(false);
  });
});
