import Phaser from 'phaser';
import { GameState, PlayerState } from '@blast-arena/shared';

export class HUDScene extends Phaser.Scene {
  private hudContainer!: HTMLElement;
  private localPlayerDead: boolean = false;
  private localPlayerId!: number;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    const authManager = this.registry.get('authManager');
    this.localPlayerId = authManager.getUser()?.id ?? 0;
    this.localPlayerDead = false;
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
    // Track local player death
    if (!this.localPlayerDead) {
      const me = state.players.find((p: any) => p.id === this.localPlayerId);
      if (me && !me.alive) this.localPlayerDead = true;
    }

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

    // Player list (show all players, dead ones styled differently)
    const playersEl = document.getElementById('hud-players');
    if (playersEl) {
      // Sort: alive first, then dead
      const sorted = [...state.players].sort((a: any, b: any) => (b.alive ? 1 : 0) - (a.alive ? 1 : 0));
      playersEl.innerHTML = sorted.map((p: any) => `
        <div class="hud-player-item${p.alive ? '' : ' dead'}${p.alive && this.localPlayerDead ? ' clickable' : ''}" data-player-id="${p.id}">
          <span>${p.isBot ? '🤖 ' : ''}${p.displayName}</span>
        </div>
      `).join('');

      // When spectating, allow clicking alive players to follow them
      if (this.localPlayerDead) {
        playersEl.querySelectorAll('.hud-player-item.clickable').forEach(el => {
          el.addEventListener('click', () => {
            const id = parseInt(el.getAttribute('data-player-id')!);
            const gameScene = this.scene.get('GameScene');
            gameScene.events.emit('spectatePlayer', id);
          });
        });
      }
    }
  }

  shutdown(): void {
    this.hudContainer?.remove();
  }
}
