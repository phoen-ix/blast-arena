import Phaser from 'phaser';
import { BombState, TILE_SIZE } from '@blast-arena/shared';
import { getSettings } from './Settings';

export class BombSpriteRenderer {
  private scene: Phaser.Scene;
  private sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private pulseTweens: Map<string, Phaser.Tweens.Tween> = new Map();
  private sparkEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(bombs: BombState[]): void {
    const activeIds = new Set(bombs.map(b => b.id));
    const settings = getSettings();

    // Remove bombs that no longer exist
    for (const [id] of this.sprites) {
      if (!activeIds.has(id)) {
        this.removeBomb(id);
      }
    }

    for (const bomb of bombs) {
      const posX = bomb.position.x * TILE_SIZE + TILE_SIZE / 2;
      const posY = bomb.position.y * TILE_SIZE + TILE_SIZE / 2;
      const existing = this.sprites.get(bomb.id);

      if (existing) {
        // Update position for sliding/kicked bombs
        existing.x = posX;
        existing.y = posY;

        // Urgency effects when ticksRemaining < 20 (last second at 20 tps)
        if (bomb.ticksRemaining < 20) {
          // Flash red tint on/off - faster as timer counts down
          // At 19 ticks: slow flash; at 1 tick: very fast flash
          const flashRate = Math.max(1, Math.floor(bomb.ticksRemaining / 4));
          const showTint = (bomb.ticksRemaining % (flashRate * 2)) < flashRate;
          if (showTint) {
            existing.setTint(0xff2222);
          } else {
            existing.clearTint();
          }

          // Increase spark rate for urgency
          if (settings.particles) {
            const emitter = this.sparkEmitters.get(bomb.id);
            if (emitter) {
              emitter.setPosition(posX + 6, posY - 17);
              emitter.frequency = Math.max(20, bomb.ticksRemaining * 5);
            }
          }
        } else {
          existing.clearTint();

          // Update spark emitter position for sliding bombs
          if (settings.particles) {
            const emitter = this.sparkEmitters.get(bomb.id);
            if (emitter) {
              emitter.setPosition(posX + 6, posY - 17);
            }
          }
        }
      } else {
        // Create new bomb sprite
        const sprite = this.scene.add.sprite(posX, posY, 'bomb');
        sprite.setDepth(5);
        this.sprites.set(bomb.id, sprite);

        // Add pulsing tween
        const tween = this.scene.tweens.add({
          targets: sprite,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 300,
          yoyo: true,
          repeat: -1,
        });
        this.pulseTweens.set(bomb.id, tween);

        // Add fuse spark particles
        if (settings.particles) {
          // Fuse tip is at roughly top-right of the bomb texture
          const fuseX = posX + 6;
          const fuseY = posY - 17;
          const emitter = this.scene.add.particles(fuseX, fuseY, 'particle_spark', {
            speed: { min: 15, max: 50 },
            lifespan: 250,
            scale: { start: 1, end: 0.2 },
            alpha: { start: 1, end: 0 },
            quantity: 1,
            frequency: 100,
            gravityY: -40,
            angle: { min: 230, max: 310 },
            tint: [0xffff88, 0xff8800, 0xffaa44],
          });
          this.sparkEmitters.set(bomb.id, emitter);
        }
      }
    }
  }

  destroy(): void {
    for (const [id] of this.sprites) {
      this.removeBomb(id);
    }
    this.sprites.clear();
    this.pulseTweens.clear();
    this.sparkEmitters.clear();
  }

  private removeBomb(id: string): void {
    const sprite = this.sprites.get(id);
    if (sprite) {
      sprite.destroy();
      this.sprites.delete(id);
    }

    const tween = this.pulseTweens.get(id);
    if (tween) {
      tween.destroy();
      this.pulseTweens.delete(id);
    }

    const emitter = this.sparkEmitters.get(id);
    if (emitter) {
      emitter.destroy();
      this.sparkEmitters.delete(id);
    }
  }
}
