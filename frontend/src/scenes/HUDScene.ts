import Phaser from 'phaser';
import { GameState } from '@blast-arena/shared';

export class HUDScene extends Phaser.Scene {
  private hudContainer!: HTMLElement;
  private playerListEl!: HTMLElement;
  private localPlayerDead: boolean = false;
  private localPlayerId!: number;
  private boundClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    // Clean up stale DOM from previous game (shutdown() may not have been called)
    if (this.boundClickHandler) {
      this.playerListEl?.removeEventListener('mousedown', this.boundClickHandler);
      this.boundClickHandler = null;
    }
    this.hudContainer?.remove();
    this.playerListEl?.remove();

    // Register shutdown handler (Phaser doesn't auto-call shutdown() methods)
    this.events.once('shutdown', this.shutdown, this);

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
    `;
    // Player list is a separate direct child of ui-overlay so it gets pointer-events: auto
    // (hud-container has pointer-events: none which blocks clicks)
    this.playerListEl = document.createElement('div');
    this.playerListEl.className = 'hud-players';
    this.playerListEl.id = 'hud-players';

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.hudContainer);
    overlay?.appendChild(this.playerListEl);

    // Spectate click handler — uses mousedown (not click) with event delegation
    // on the stable container. click events are unreliable because updateHUD()
    // rebuilds innerHTML 20x/sec, destroying the mousedown target before mouseup.
    this.boundClickHandler = (e: MouseEvent) => {
      if (!this.localPlayerDead) return;
      const item = (e.target as Element).closest('.hud-player-item[data-player-id]');
      if (!item || item.classList.contains('dead')) return;
      const id = parseInt(item.getAttribute('data-player-id')!);
      if (isNaN(id)) return;
      e.stopPropagation(); // prevent Phaser from also handling this
      console.log('[HUD] Spectate click: player', id);
      this.registry.set('spectateTargetId', id);
      // Visual feedback: briefly highlight the clicked item
      (item as HTMLElement).style.background = 'rgba(233, 69, 96, 0.6)';
      setTimeout(() => { (item as HTMLElement).style.background = ''; }, 300);
    };
    this.playerListEl.addEventListener('mousedown', this.boundClickHandler);

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
      playersEl.innerHTML = sorted.map((p: any) => {
        const dead = !p.alive;
        const clickable = p.alive && this.localPlayerDead;
        return `<div class="hud-player-item${dead ? ' dead' : ''}${clickable ? ' clickable' : ''}" data-player-id="${p.id}">
          <span>${p.isBot ? '🤖 ' : ''}${p.displayName}</span>
        </div>`;
      }).join('');
    }
  }

  shutdown(): void {
    if (this.boundClickHandler) {
      this.playerListEl?.removeEventListener('mousedown', this.boundClickHandler);
      this.boundClickHandler = null;
    }
    this.hudContainer?.remove();
    this.playerListEl?.remove();
  }
}
