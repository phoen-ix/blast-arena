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
    // Timer
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
      const seconds = Math.max(0, Math.floor(state.timeElapsed));
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Player list
    const playersEl = document.getElementById('hud-players');
    if (playersEl) {
      playersEl.innerHTML = state.players.map((p: any) => `
        <div class="hud-player-item ${p.alive ? '' : 'dead'}">
          <span>${p.displayName}</span>
        </div>
      `).join('');
    }
  }

  shutdown(): void {
    this.hudContainer?.remove();
  }
}
