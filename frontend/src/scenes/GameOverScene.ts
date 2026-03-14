import Phaser from 'phaser';
import { NotificationUI } from '../ui/NotificationUI';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const data = this.registry.get('gameOverData');

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    this.add.text(width / 2, height / 3, 'GAME OVER', {
      fontSize: '48px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    if (data?.placements) {
      const startY = height / 2;
      data.placements.forEach((p: any, i: number) => {
        const color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32';
        const botTag = p.isBot ? ' [BOT]' : '';
        const name = p.displayName || `Player ${p.userId}`;
        const kills = p.kills != null ? ` (${p.kills} kills)` : '';
        this.add.text(width / 2, startY + i * 30, `#${p.placement} - ${name}${botTag}${kills}`, {
          fontSize: '18px',
          color: i < 3 ? color : '#a0a0b0',
        }).setOrigin(0.5);
      });
    }

    // Back to lobby button
    const backBtn = this.add.text(width / 2, height * 0.8, '[ Back to Lobby ]', {
      fontSize: '20px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#ff6b81'));
    backBtn.on('pointerout', () => backBtn.setColor('#e94560'));
    backBtn.on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });
  }
}
