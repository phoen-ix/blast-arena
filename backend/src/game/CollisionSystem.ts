import { TileType, Position, Direction } from '@blast-arena/shared';

export class CollisionSystem {
  private tiles: TileType[][];
  private width: number;
  private height: number;

  constructor(tiles: TileType[][], width: number, height: number) {
    this.tiles = tiles;
    this.width = width;
    this.height = height;
  }

  updateTiles(tiles: TileType[][]): void {
    this.tiles = tiles;
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.tiles[y][x];
    return tile === 'empty' || tile === 'spawn';
  }

  canMoveTo(fromX: number, fromY: number, direction: Direction, bombPositions: Position[]): Position | null {
    let newX = fromX;
    let newY = fromY;

    switch (direction) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }

    if (!this.isWalkable(newX, newY)) return null;

    // Check for bombs blocking the path
    const bombBlocking = bombPositions.some(b => b.x === newX && b.y === newY);
    if (bombBlocking) return null;

    return { x: newX, y: newY };
  }

  getTileAt(x: number, y: number): TileType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 'wall';
    return this.tiles[y][x];
  }

  destroyTile(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    if (this.tiles[y][x] === 'destructible') {
      this.tiles[y][x] = 'empty';
      return true;
    }
    return false;
  }
}
