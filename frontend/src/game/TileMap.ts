import Phaser from 'phaser';
import { TileType, Position } from '@blast-arena/shared';
import { TILE_SIZE } from '@blast-arena/shared';
import { getSettings } from './Settings';

export class TileMapRenderer {
  private scene: Phaser.Scene;
  private tileSprites: Phaser.GameObjects.Sprite[][] = [];
  private previousTiles: TileType[][] = [];
  private width: number;
  private height: number;

  constructor(scene: Phaser.Scene, tiles: TileType[][], width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.createTiles(tiles);
  }

  private createTiles(tiles: TileType[][]): void {
    this.tileSprites = [];
    this.previousTiles = [];

    for (let y = 0; y < this.height; y++) {
      this.tileSprites[y] = [];
      this.previousTiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        const tileType = tiles[y][x];
        const textureKey = this.getTileTexture(tileType, x, y);
        const sprite = this.scene.add.sprite(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          textureKey,
        );
        this.tileSprites[y][x] = sprite;
        this.previousTiles[y][x] = tileType;
      }
    }
  }

  private getTileTexture(type: TileType, x: number, y: number): string {
    switch (type) {
      case 'wall':
        return 'wall';
      case 'destructible':
        return 'destructible';
      case 'destructible_cracked' as TileType:
        return 'destructible_cracked';
      case 'teleporter_a' as TileType:
        return 'teleporter_a';
      case 'teleporter_b' as TileType:
        return 'teleporter_b';
      case 'conveyor_up' as TileType:
        return 'conveyor_up';
      case 'conveyor_down' as TileType:
        return 'conveyor_down';
      case 'conveyor_left' as TileType:
        return 'conveyor_left';
      case 'conveyor_right' as TileType:
        return 'conveyor_right';
      case 'exit' as TileType:
        return 'exit';
      case 'goal' as TileType:
        return 'goal';
      case 'empty':
      case 'spawn':
      default:
        return `floor_${(x + y) % 4}`;
    }
  }

  updateTiles(tiles: TileType[][]): Position[] {
    const destroyedPositions: Position[] = [];
    const settings = getSettings();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const newType = tiles[y][x];
        const prevType = this.previousTiles[y]?.[x];

        if (newType === prevType) continue;

        // A destructible block was destroyed (changed to empty/spawn)
        const wasDestructible =
          prevType === 'destructible' ||
          prevType === ('destructible_cracked' as TileType);
        const isNowEmpty = newType === 'empty' || newType === 'spawn';

        if (wasDestructible && isNowEmpty) {
          destroyedPositions.push({ x, y });

          if (settings.animations) {
            const oldSprite = this.tileSprites[y][x];
            // Animate destruction: scale down and fade out, then replace
            this.scene.tweens.add({
              targets: oldSprite,
              alpha: 0,
              scaleX: 0.3,
              scaleY: 0.3,
              duration: 300,
              ease: 'Power2',
              onComplete: () => {
                oldSprite.destroy();
              },
            });

            // Create the new floor sprite immediately underneath
            const newTexture = this.getTileTexture(newType, x, y);
            const newSprite = this.scene.add.sprite(
              x * TILE_SIZE + TILE_SIZE / 2,
              y * TILE_SIZE + TILE_SIZE / 2,
              newTexture,
            );
            this.tileSprites[y][x] = newSprite;
          } else {
            // No animation: just swap the texture
            const newTexture = this.getTileTexture(newType, x, y);
            this.tileSprites[y][x].setTexture(newTexture);
            this.tileSprites[y][x].setAlpha(1);
            this.tileSprites[y][x].setScale(1);
          }
        } else {
          // Non-destructive tile change (e.g. conveyor placed, teleporter toggled)
          const newTexture = this.getTileTexture(newType, x, y);
          this.tileSprites[y][x].setTexture(newTexture);
        }

        this.previousTiles[y][x] = newType;
      }
    }

    return destroyedPositions;
  }

  destroy(): void {
    for (let y = 0; y < this.tileSprites.length; y++) {
      for (let x = 0; x < this.tileSprites[y].length; x++) {
        this.tileSprites[y][x]?.destroy();
      }
    }
    this.tileSprites = [];
    this.previousTiles = [];
  }
}
