import Phaser from 'phaser';
import { EnemyTypeEntry, EnemySpriteConfig, EnemyBodyShape, EnemyEyeStyle } from '@blast-arena/shared';

const SIZE = 48;
const DIRECTIONS = ['down', 'up', 'left', 'right'] as const;

type EyeOffsets = { lx: number; ly: number; rx: number; ry: number; px: number; py: number };

const EYE_OFFSETS: Record<string, EyeOffsets> = {
  down: { lx: -7, ly: 2, rx: 7, ry: 2, px: 0, py: 2 },
  up: { lx: -7, ly: -4, rx: 7, ry: -4, px: 0, py: -2 },
  left: { lx: -8, ly: -1, rx: -1, ry: -1, px: -2, py: 0 },
  right: { lx: 1, ly: -1, rx: 8, ry: -1, px: 2, py: 0 },
};

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export class EnemyTextureGenerator {
  /**
   * Generate textures for all enemy types needed in a level.
   * Called in GameScene.create() and LevelEditorScene.create().
   */
  static generateForLevel(scene: Phaser.Scene, enemyTypes: EnemyTypeEntry[]): void {
    for (const et of enemyTypes) {
      for (const dir of DIRECTIONS) {
        const key = `enemy_${et.id}_${dir}`;
        if (scene.textures.exists(key)) continue;

        const gfx = scene.make.graphics({ x: 0, y: 0 });
        EnemyTextureGenerator.drawEnemy(gfx, et.config.sprite, dir, et.config.sizeMultiplier);
        gfx.generateTexture(key, SIZE, SIZE);
        gfx.destroy();
      }
    }
  }

  /**
   * Generate a preview image on a raw Canvas2D element (no Phaser needed).
   * Used in admin enemy type editor.
   */
  static generatePreview(canvas: HTMLCanvasElement, sprite: EnemySpriteConfig, size = 64): void {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    const primary = sprite.primaryColor;
    const secondary = sprite.secondaryColor;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.4;

    // Body
    ctx.fillStyle = primary;
    EnemyTextureGenerator.drawBodyCanvas(ctx, sprite.bodyShape, cx, cy, r);

    // Secondary detail
    ctx.fillStyle = secondary;
    ctx.globalAlpha = 0.4;
    EnemyTextureGenerator.drawBodyCanvas(ctx, sprite.bodyShape, cx, cy + 2, r * 0.85);
    ctx.globalAlpha = 1;

    // Eyes
    EnemyTextureGenerator.drawEyesCanvas(ctx, sprite.eyeStyle, cx, cy, r);

    // Features
    if (sprite.hasTeeth) {
      ctx.fillStyle = '#ffffff';
      const tw = r * 0.15;
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(cx + i * tw * 1.5 - tw / 2, cy + r * 0.6, tw, tw * 1.2);
      }
    }
    if (sprite.hasHorns) {
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy - r * 0.7);
      ctx.lineTo(cx - r * 0.3, cy - r * 1.1);
      ctx.lineTo(cx - r * 0.1, cy - r * 0.6);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.5, cy - r * 0.7);
      ctx.lineTo(cx + r * 0.3, cy - r * 1.1);
      ctx.lineTo(cx + r * 0.1, cy - r * 0.6);
      ctx.fill();
    }
  }

  private static drawEnemy(
    gfx: Phaser.GameObjects.Graphics,
    sprite: EnemySpriteConfig,
    direction: string,
    sizeMultiplier: number,
  ): void {
    const primary = hexToNumber(sprite.primaryColor);
    const secondary = hexToNumber(sprite.secondaryColor);
    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // Body
    const bodyFn = EnemyTextureGenerator.getBodyRenderer(sprite.bodyShape);
    bodyFn(gfx, cx, cy, primary, secondary, sizeMultiplier);

    // Eyes
    EnemyTextureGenerator.drawEyes(gfx, sprite.eyeStyle, cx, cy, direction);

    // Features
    if (sprite.hasTeeth) {
      gfx.fillStyle(0xffffff, 0.9);
      for (let i = -2; i <= 2; i++) {
        gfx.fillTriangle(
          cx + i * 4 - 2, cy + 14,
          cx + i * 4 + 2, cy + 14,
          cx + i * 4, cy + 18,
        );
      }
    }
    if (sprite.hasHorns) {
      gfx.fillStyle(secondary, 0.9);
      gfx.fillTriangle(cx - 10, cy - 14, cx - 6, cy - 22, cx - 2, cy - 12);
      gfx.fillTriangle(cx + 10, cy - 14, cx + 6, cy - 22, cx + 2, cy - 12);
    }
  }

  private static getBodyRenderer(shape: EnemyBodyShape) {
    switch (shape) {
      case 'blob':
        return EnemyTextureGenerator.drawBlob;
      case 'spiky':
        return EnemyTextureGenerator.drawSpiky;
      case 'ghost':
        return EnemyTextureGenerator.drawGhost;
      case 'robot':
        return EnemyTextureGenerator.drawRobot;
      case 'bug':
        return EnemyTextureGenerator.drawBug;
      case 'skull':
        return EnemyTextureGenerator.drawSkull;
      default:
        return EnemyTextureGenerator.drawBlob;
    }
  }

  // --- Body shape renderers (Phaser Graphics) ---

  private static drawBlob(
    gfx: Phaser.GameObjects.Graphics, cx: number, cy: number,
    primary: number, _secondary: number, _scale: number,
  ): void {
    const darker = Phaser.Display.Color.IntegerToColor(primary).darken(20).color;
    gfx.fillStyle(darker, 1);
    gfx.fillCircle(cx, cy + 2, 20);
    gfx.fillStyle(primary, 1);
    gfx.fillCircle(cx, cy - 1, 19);
    // Highlight
    gfx.fillStyle(0xffffff, 0.2);
    gfx.fillCircle(cx - 5, cy - 8, 6);
  }

  private static drawSpiky(
    gfx: Phaser.GameObjects.Graphics, cx: number, cy: number,
    primary: number, secondary: number, _scale: number,
  ): void {
    // Pentagon body with spikes
    gfx.fillStyle(primary, 1);
    const points: number[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      points.push(cx + Math.cos(angle) * 18, cy + Math.sin(angle) * 18);
    }
    gfx.fillPoints(points.map((v, i) => new Phaser.Geom.Point(
      i % 2 === 0 ? points[i] : points[i],
      i % 2 === 0 ? points[i] : points[i],
    )));

    // Simple filled polygon
    gfx.beginPath();
    gfx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      gfx.lineTo(points[i], points[i + 1]);
    }
    gfx.closePath();
    gfx.fillPath();

    // Spikes
    gfx.fillStyle(secondary, 0.8);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const bx = cx + Math.cos(angle) * 18;
      const by = cy + Math.sin(angle) * 18;
      const tx = cx + Math.cos(angle) * 24;
      const ty = cy + Math.sin(angle) * 24;
      const perpAngle = angle + Math.PI / 2;
      gfx.fillTriangle(
        bx + Math.cos(perpAngle) * 3, by + Math.sin(perpAngle) * 3,
        bx - Math.cos(perpAngle) * 3, by - Math.sin(perpAngle) * 3,
        tx, ty,
      );
    }
  }

  private static drawGhost(
    gfx: Phaser.GameObjects.Graphics, cx: number, cy: number,
    primary: number, _secondary: number, _scale: number,
  ): void {
    // Semicircle top + wavy bottom
    gfx.fillStyle(primary, 0.85);
    gfx.fillCircle(cx, cy - 2, 18);
    gfx.fillRect(cx - 18, cy - 2, 36, 16);
    // Wavy bottom edge
    gfx.fillStyle(primary, 0.85);
    for (let i = 0; i < 4; i++) {
      const wx = cx - 14 + i * 9;
      gfx.fillCircle(wx, cy + 14, 5);
    }
    // Highlight
    gfx.fillStyle(0xffffff, 0.15);
    gfx.fillCircle(cx - 5, cy - 8, 7);
  }

  private static drawRobot(
    gfx: Phaser.GameObjects.Graphics, cx: number, cy: number,
    primary: number, secondary: number, _scale: number,
  ): void {
    const darker = Phaser.Display.Color.IntegerToColor(primary).darken(15).color;
    // Rectangular body with beveled edges
    gfx.fillStyle(darker, 1);
    gfx.fillRoundedRect(cx - 16, cy - 16, 32, 34, 3);
    gfx.fillStyle(primary, 1);
    gfx.fillRoundedRect(cx - 15, cy - 15, 30, 28, 3);
    // Antenna
    gfx.lineStyle(2, secondary, 0.8);
    gfx.lineBetween(cx, cy - 16, cx, cy - 22);
    gfx.fillStyle(secondary, 1);
    gfx.fillCircle(cx, cy - 22, 3);
    // Chest plate detail
    gfx.fillStyle(secondary, 0.3);
    gfx.fillRect(cx - 8, cy + 2, 16, 8);
  }

  private static drawBug(
    gfx: Phaser.GameObjects.Graphics, cx: number, cy: number,
    primary: number, secondary: number, _scale: number,
  ): void {
    // Oval body
    gfx.fillStyle(primary, 1);
    gfx.fillEllipse(cx, cy, 32, 36);
    // Darker segments
    gfx.lineStyle(1, Phaser.Display.Color.IntegerToColor(primary).darken(30).color, 0.5);
    gfx.lineBetween(cx - 14, cy - 2, cx + 14, cy - 2);
    gfx.lineBetween(cx - 12, cy + 6, cx + 12, cy + 6);
    // Leg stubs
    gfx.fillStyle(secondary, 0.7);
    for (const yOff of [-6, 2, 10]) {
      gfx.fillRect(cx - 19, cy + yOff, 5, 3);
      gfx.fillRect(cx + 14, cy + yOff, 5, 3);
    }
    // Antennae
    gfx.lineStyle(1, secondary, 0.6);
    gfx.lineBetween(cx - 6, cy - 16, cx - 12, cy - 22);
    gfx.lineBetween(cx + 6, cy - 16, cx + 12, cy - 22);
  }

  private static drawSkull(
    gfx: Phaser.GameObjects.Graphics, cx: number, cy: number,
    primary: number, secondary: number, _scale: number,
  ): void {
    // Circle with concave jaw
    gfx.fillStyle(primary, 1);
    gfx.fillCircle(cx, cy - 3, 18);
    // Jaw
    gfx.fillStyle(Phaser.Display.Color.IntegerToColor(primary).darken(10).color, 1);
    gfx.fillRoundedRect(cx - 12, cy + 8, 24, 12, 4);
    // Dark eye sockets
    gfx.fillStyle(secondary, 0.8);
    gfx.fillCircle(cx - 7, cy - 4, 6);
    gfx.fillCircle(cx + 7, cy - 4, 6);
    // Nose
    gfx.fillStyle(secondary, 0.5);
    gfx.fillTriangle(cx, cy + 2, cx - 3, cy + 7, cx + 3, cy + 7);
  }

  // --- Eye renderers (Phaser Graphics) ---

  private static drawEyes(
    gfx: Phaser.GameObjects.Graphics,
    style: EnemyEyeStyle,
    cx: number, cy: number,
    direction: string,
  ): void {
    const off = EYE_OFFSETS[direction] || EYE_OFFSETS.down;

    switch (style) {
      case 'round': {
        gfx.fillStyle(0xffffff, 0.95);
        gfx.fillCircle(cx + off.lx, cy + off.ly, 5);
        gfx.fillCircle(cx + off.rx, cy + off.ry, 5);
        gfx.fillStyle(0x111111, 1);
        gfx.fillCircle(cx + off.lx + off.px, cy + off.ly + off.py, 2.5);
        gfx.fillCircle(cx + off.rx + off.px, cy + off.ry + off.py, 2.5);
        break;
      }
      case 'angry': {
        gfx.fillStyle(0xff4444, 0.95);
        gfx.fillCircle(cx + off.lx, cy + off.ly, 5);
        gfx.fillCircle(cx + off.rx, cy + off.ry, 5);
        gfx.fillStyle(0x111111, 1);
        gfx.fillCircle(cx + off.lx + off.px, cy + off.ly + off.py, 2.5);
        gfx.fillCircle(cx + off.rx + off.px, cy + off.ry + off.py, 2.5);
        // Angry eyebrows
        gfx.lineStyle(2, 0x111111, 0.8);
        gfx.lineBetween(cx + off.lx - 4, cy + off.ly - 6, cx + off.lx + 4, cy + off.ly - 4);
        gfx.lineBetween(cx + off.rx + 4, cy + off.ry - 6, cx + off.rx - 4, cy + off.ry - 4);
        break;
      }
      case 'sleepy': {
        // Half-closed eyes
        gfx.fillStyle(0xffffff, 0.7);
        gfx.fillEllipse(cx + off.lx, cy + off.ly, 10, 6);
        gfx.fillEllipse(cx + off.rx, cy + off.ry, 10, 6);
        gfx.fillStyle(0x111111, 1);
        gfx.fillCircle(cx + off.lx + off.px, cy + off.ly + 1, 2);
        gfx.fillCircle(cx + off.rx + off.px, cy + off.ry + 1, 2);
        break;
      }
      case 'crazy': {
        // Asymmetric eyes
        gfx.fillStyle(0xffff44, 0.95);
        gfx.fillCircle(cx + off.lx, cy + off.ly, 6);
        gfx.fillCircle(cx + off.rx, cy + off.ry, 4);
        gfx.fillStyle(0x111111, 1);
        gfx.fillCircle(cx + off.lx + off.px * 1.5, cy + off.ly + off.py, 3);
        gfx.fillCircle(cx + off.rx + off.px * 0.5, cy + off.ry + off.py, 1.5);
        break;
      }
    }
  }

  // --- Canvas2D helpers for preview ---

  private static drawBodyCanvas(
    ctx: CanvasRenderingContext2D,
    shape: EnemyBodyShape,
    cx: number, cy: number, r: number,
  ): void {
    ctx.beginPath();
    switch (shape) {
      case 'blob':
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        break;
      case 'spiky': {
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      }
      case 'ghost':
        ctx.arc(cx, cy - r * 0.2, r, Math.PI, 0);
        ctx.lineTo(cx + r, cy + r * 0.6);
        for (let i = 3; i >= 0; i--) {
          const wx = cx - r + (i + 0.5) * (r * 2 / 4);
          ctx.quadraticCurveTo(wx, cy + r * 0.9, cx - r + i * (r * 2 / 4), cy + r * 0.6);
        }
        break;
      case 'robot':
        ctx.roundRect(cx - r, cy - r, r * 2, r * 2, r * 0.15);
        break;
      case 'bug':
        ctx.ellipse(cx, cy, r * 0.85, r, 0, 0, Math.PI * 2);
        break;
      case 'skull':
        ctx.arc(cx, cy - r * 0.1, r * 0.9, 0, Math.PI * 2);
        break;
    }
    ctx.fill();
  }

  private static drawEyesCanvas(
    ctx: CanvasRenderingContext2D,
    style: EnemyEyeStyle,
    cx: number, cy: number, r: number,
  ): void {
    const eyeR = r * 0.2;
    const eyeSpacing = r * 0.4;

    ctx.fillStyle = style === 'angry' ? '#ff4444' : style === 'crazy' ? '#ffff44' : '#ffffff';

    // Left eye
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing, cy - r * 0.1, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing, cy - r * 0.1, style === 'crazy' ? eyeR * 0.7 : eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing, cy - r * 0.1, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing, cy - r * 0.1, eyeR * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}
