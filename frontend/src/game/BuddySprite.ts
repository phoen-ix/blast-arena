import Phaser from 'phaser';
import { BuddyState } from '@blast-arena/shared';

/**
 * Buddy sprite renderer stub — renders buddy mini-player when buddy mode is active.
 * Foundation only; not functional yet.
 */
export class BuddySpriteRenderer {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(_buddy: BuddyState | null): void {
    // Stub — no rendering yet
  }

  destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
