import Phaser from 'phaser';
import { GameState } from '@blast-arena/shared';

export class HUDScene extends Phaser.Scene {
  private hudContainer!: HTMLElement;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    this.hudContainer = document.createElement('div');
    this.hudContainer.className = 'hud-container';
    this.hudContainer.innerHTML = `
      <div class="hud-top">
        <div class="hud-timer" id="hud-timer">3:00</div>
        <div class="hud-powerups" id="hud-powerups"></div>
      </div>
      <div class="hud-players" id="hud-players"></div>
    `;
    document.getElementById('ui-overlay')?.appendChild(this.hudContainer);

    // Listen for state updates from GameScene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('stateUpdate', (state: GameState) => {
      this.updateHUD(state);
    });
  }

  private updateHUD(state: GameState): void {
    // Countdown timer
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
      const remaining = Math.max(0, Math.ceil(state.roundTime - state.timeElapsed));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

      // Flash red when under 30 seconds
      if (remaining <= 30) {
        timerEl.style.color = '#e94560';
      } else {
        timerEl.style.color = '#fff';
      }
    }

    // Player list (only show alive players)
    const playersEl = document.getElementById('hud-players');
    if (playersEl) {
      const alivePlayers = state.players.filter((p: any) => p.alive);
      playersEl.innerHTML = alivePlayers.map((p: any) => `
        <div class="hud-player-item">
          <span>${p.isBot ? '🤖 ' : ''}${p.displayName}</span>
        </div>
      `).join('');
    }
  }

  shutdown(): void {
    this.hudContainer?.remove();
  }
}
