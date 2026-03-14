import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x0f3460, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const loadingText = this.add.text(width / 2, height / 2 - 40, 'Loading...', {
      fontSize: '18px',
      color: '#e94560',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xe94560, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Generate placeholder textures
    this.generateTextures();
  }

  private generateTextures(): void {
    // Player sprite (colored square)
    const playerColors = [0xe94560, 0x44aaff, 0x44ff44, 0xff8800, 0xcc44ff, 0xffff44, 0xff44ff, 0x44ffff];
    playerColors.forEach((color, i) => {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(2, 2, 44, 44, 4);
      gfx.lineStyle(2, 0xffffff, 0.3);
      gfx.strokeRoundedRect(2, 2, 44, 44, 4);
      gfx.generateTexture(`player_${i}`, 48, 48);
      gfx.destroy();
    });

    // Wall (indestructible)
    const wallGfx = this.make.graphics({ x: 0, y: 0 });
    wallGfx.fillStyle(0x333355, 1);
    wallGfx.fillRect(0, 0, 48, 48);
    wallGfx.lineStyle(1, 0x444477, 1);
    wallGfx.strokeRect(0, 0, 48, 48);
    wallGfx.fillStyle(0x444466, 1);
    wallGfx.fillRect(2, 2, 20, 20);
    wallGfx.fillRect(26, 26, 20, 20);
    wallGfx.generateTexture('wall', 48, 48);
    wallGfx.destroy();

    // Destructible wall
    const destGfx = this.make.graphics({ x: 0, y: 0 });
    destGfx.fillStyle(0x886633, 1);
    destGfx.fillRect(0, 0, 48, 48);
    destGfx.lineStyle(1, 0x664422, 1);
    destGfx.strokeRect(0, 0, 48, 48);
    destGfx.lineStyle(1, 0x664422, 0.5);
    destGfx.lineBetween(0, 16, 48, 16);
    destGfx.lineBetween(0, 32, 48, 32);
    destGfx.lineBetween(24, 0, 24, 16);
    destGfx.lineBetween(12, 16, 12, 32);
    destGfx.lineBetween(36, 16, 36, 32);
    destGfx.lineBetween(24, 32, 24, 48);
    destGfx.generateTexture('destructible', 48, 48);
    destGfx.destroy();

    // Floor
    const floorGfx = this.make.graphics({ x: 0, y: 0 });
    floorGfx.fillStyle(0x2a2a3e, 1);
    floorGfx.fillRect(0, 0, 48, 48);
    floorGfx.lineStyle(1, 0x333348, 0.3);
    floorGfx.strokeRect(0, 0, 48, 48);
    floorGfx.generateTexture('floor', 48, 48);
    floorGfx.destroy();

    // Bomb
    const bombGfx = this.make.graphics({ x: 0, y: 0 });
    bombGfx.fillStyle(0x111111, 1);
    bombGfx.fillCircle(24, 26, 16);
    bombGfx.fillStyle(0x333333, 1);
    bombGfx.fillCircle(20, 22, 4);
    bombGfx.fillStyle(0xff4400, 1);
    bombGfx.fillCircle(24, 8, 5);
    bombGfx.generateTexture('bomb', 48, 48);
    bombGfx.destroy();

    // Explosion
    const expGfx = this.make.graphics({ x: 0, y: 0 });
    expGfx.fillStyle(0xff4400, 0.8);
    expGfx.fillRect(4, 4, 40, 40);
    expGfx.fillStyle(0xffaa00, 0.6);
    expGfx.fillRect(8, 8, 32, 32);
    expGfx.fillStyle(0xffff00, 0.4);
    expGfx.fillRect(14, 14, 20, 20);
    expGfx.generateTexture('explosion', 48, 48);
    expGfx.destroy();

    // Power-up icons
    const powerUpColors: Record<string, number> = {
      bomb_up: 0xff4444,
      fire_up: 0xff8800,
      speed_up: 0x44aaff,
      shield: 0x44ff44,
      kick: 0xcc44ff,
    };

    for (const [type, color] of Object.entries(powerUpColors)) {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(color, 0.8);
      gfx.fillRoundedRect(4, 4, 40, 40, 8);
      gfx.lineStyle(2, 0xffffff, 0.5);
      gfx.strokeRoundedRect(4, 4, 40, 40, 8);
      gfx.generateTexture(`powerup_${type}`, 48, 48);
      gfx.destroy();
    }
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
