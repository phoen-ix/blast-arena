import Phaser from 'phaser';
import { GameState } from '@blast-arena/shared';
import { getSettings, saveSettings, VisualSettings } from '../game/Settings';

export class HUDScene extends Phaser.Scene {
  private hudContainer!: HTMLElement;
  private playerListEl!: HTMLElement;
  private killFeedEl!: HTMLElement;
  private settingsPanel!: HTMLElement;
  private helpPanel!: HTMLElement;
  private localPlayerDead: boolean = false;
  private localPlayerId!: number;
  private boundClickHandler: ((e: MouseEvent) => void) | null = null;
  private socketClient: any = null;
  private playerDiedHandler: ((data: { playerId: number; killerId: number | null }) => void) | null = null;
  private killFeedEntries: { text: string; time: number }[] = [];
  private previousStats: { maxBombs: number; fireRange: number; speed: number; hasShield: boolean; hasKick: boolean } | null = null;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    if (this.boundClickHandler) {
      this.playerListEl?.removeEventListener('mousedown', this.boundClickHandler);
      this.boundClickHandler = null;
    }
    this.hudContainer?.remove();
    this.playerListEl?.remove();
    this.killFeedEl?.remove();
    this.settingsPanel?.remove();
    this.helpPanel?.remove();

    this.events.once('shutdown', this.shutdown, this);

    const authManager = this.registry.get('authManager');
    this.localPlayerId = authManager.getUser()?.id ?? 0;
    this.localPlayerDead = false;
    this.killFeedEntries = [];
    this.previousStats = null;

    this.socketClient = this.registry.get('socketClient');

    // Main HUD container
    this.hudContainer = document.createElement('div');
    this.hudContainer.className = 'hud-container';
    this.hudContainer.innerHTML = `
      <div class="hud-top">
        <div class="hud-timer" id="hud-timer">3:00</div>
        <div class="hud-stats" id="hud-stats"></div>
      </div>
      <div class="hud-spectator-banner" id="hud-spectator" style="display:none;">
        SPECTATOR — WASD/Arrows to pan, 1-9 or click player to follow
      </div>
    `;

    // Settings gear button
    const gearBtn = document.createElement('div');
    gearBtn.className = 'hud-settings-btn';
    gearBtn.innerHTML = '⚙';
    gearBtn.title = 'Visual Settings';
    gearBtn.addEventListener('click', () => this.toggleSettings());
    this.hudContainer.appendChild(gearBtn);

    // Help button
    const helpBtn = document.createElement('div');
    helpBtn.className = 'hud-help-btn';
    helpBtn.innerHTML = '?';
    helpBtn.title = 'Controls & Items';
    helpBtn.addEventListener('click', () => this.toggleHelp());
    this.hudContainer.appendChild(helpBtn);

    // Player list
    this.playerListEl = document.createElement('div');
    this.playerListEl.className = 'hud-players';
    this.playerListEl.id = 'hud-players';

    // Kill feed
    this.killFeedEl = document.createElement('div');
    this.killFeedEl.className = 'hud-killfeed';
    this.killFeedEl.id = 'hud-killfeed';

    // Settings panel (hidden by default)
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.className = 'hud-settings-panel';
    this.settingsPanel.style.display = 'none';
    this.settingsPanel.innerHTML = this.buildSettingsHTML();
    this.settingsPanel.addEventListener('change', (e) => this.onSettingChange(e));

    // Help panel (hidden by default)
    this.helpPanel = document.createElement('div');
    this.helpPanel.className = 'hud-help-panel';
    this.helpPanel.style.display = 'none';
    this.helpPanel.innerHTML = this.buildHelpHTML();

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.hudContainer);
    overlay?.appendChild(this.playerListEl);
    overlay?.appendChild(this.killFeedEl);
    overlay?.appendChild(this.settingsPanel);
    overlay?.appendChild(this.helpPanel);

    // Spectate click handler
    this.boundClickHandler = (e: MouseEvent) => {
      if (!this.localPlayerDead) return;
      const item = (e.target as Element).closest('.hud-player-item[data-player-id]');
      if (!item || item.classList.contains('dead')) return;
      const id = parseInt(item.getAttribute('data-player-id')!);
      if (isNaN(id)) return;
      e.stopPropagation();
      this.registry.set('spectateTargetId', id);
      (item as HTMLElement).style.background = 'rgba(233, 69, 96, 0.6)';
      setTimeout(() => { (item as HTMLElement).style.background = ''; }, 300);
    };
    this.playerListEl.addEventListener('mousedown', this.boundClickHandler);

    // Listen for kill events
    if (this.socketClient) {
      this.playerDiedHandler = (data: { playerId: number; killerId: number | null }) => {
        this.onPlayerDied(data);
      };
      this.socketClient.on('game:playerDied', this.playerDiedHandler);
    }

    // Listen for state updates from GameScene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('stateUpdate', (state: GameState) => {
      this.updateHUD(state);
    });
  }

  private buildSettingsHTML(): string {
    const settings = getSettings();
    return `
      <div class="settings-title">Visual Settings</div>
      <label class="settings-option">
        <input type="checkbox" name="animations" ${settings.animations ? 'checked' : ''}>
        <span>Animations</span>
      </label>
      <label class="settings-option">
        <input type="checkbox" name="screenShake" ${settings.screenShake ? 'checked' : ''}>
        <span>Screen Shake</span>
      </label>
      <label class="settings-option">
        <input type="checkbox" name="particles" ${settings.particles ? 'checked' : ''}>
        <span>Particles</span>
      </label>
    `;
  }

  private toggleSettings(): void {
    if (this.settingsPanel.style.display === 'none') {
      this.settingsPanel.innerHTML = this.buildSettingsHTML();
      this.settingsPanel.addEventListener('change', (e) => this.onSettingChange(e));
      this.settingsPanel.style.display = 'block';
    } else {
      this.settingsPanel.style.display = 'none';
    }
  }

  private onSettingChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (!target || target.type !== 'checkbox') return;
    const key = target.name as keyof VisualSettings;
    const settings = getSettings();
    (settings as any)[key] = target.checked;
    saveSettings(settings);
  }

  private toggleHelp(): void {
    if (this.helpPanel.style.display === 'none') {
      this.helpPanel.style.display = 'block';
      this.settingsPanel.style.display = 'none';
    } else {
      this.helpPanel.style.display = 'none';
    }
  }

  private buildHelpHTML(): string {
    return `
      <div class="help-close" onclick="this.parentElement.style.display='none'">&times;</div>
      <div class="help-title">Controls & Items</div>

      <div class="help-section">
        <div class="help-heading">Controls</div>
        <div class="help-row"><span class="help-key">WASD / Arrows</span> Move</div>
        <div class="help-row"><span class="help-key">Space</span> Place bomb</div>
        <div class="help-row"><span class="help-key">E</span> Detonate remote bombs</div>
        <div class="help-row"><span class="help-key">1-9</span> Spectate Nth player (when dead)</div>
      </div>

      <div class="help-section">
        <div class="help-heading">Power-Ups</div>
        <div class="help-row"><span class="help-icon" style="color:#FF4444">💣+</span> <b>Bomb Up</b> — +1 max bombs (up to 8)</div>
        <div class="help-row"><span class="help-icon" style="color:#FF8800">🔥+</span> <b>Fire Up</b> — +1 explosion range (up to 8)</div>
        <div class="help-row"><span class="help-icon" style="color:#44AAFF">⚡+</span> <b>Speed Up</b> — faster movement (up to 5)</div>
        <div class="help-row"><span class="help-icon" style="color:#44FF44">🛡️</span> <b>Shield</b> — absorbs one explosion (10s)</div>
        <div class="help-row"><span class="help-icon" style="color:#CC44FF">👢</span> <b>Kick</b> — walk into a bomb to slide it</div>
        <div class="help-row"><span class="help-icon" style="color:#FF2222">➜</span> <b>Pierce Bomb</b> — blasts go through breakable walls</div>
        <div class="help-row"><span class="help-icon" style="color:#4488FF">📡</span> <b>Remote Bomb</b> — bombs don't auto-explode; press <span class="help-key">E</span> to detonate all at once</div>
        <div class="help-row"><span class="help-icon" style="color:#FFAA44">●●●</span> <b>Line Bomb</b> — places a line of bombs in your facing direction</div>
      </div>

      <div class="help-section">
        <div class="help-heading">Tips</div>
        <div class="help-row">Stand behind a wall before your bomb explodes</div>
        <div class="help-row">Chain reactions: bombs caught in an explosion detonate instantly</div>
        <div class="help-row">Self-kills subtract from your score</div>
        <div class="help-row">You're invulnerable for 2s after spawning</div>
        <div class="help-row">Kicked bombs slide until they hit a wall, bomb, or player</div>
      </div>
    `;
  }

  private onPlayerDied(data: { playerId: number; killerId: number | null }): void {
    // Look up names from latest game state
    const state = this.registry.get('initialGameState') as GameState | undefined;
    if (!state) return;

    // We use the last known state stored in the event context
    const victim = this.lastKnownPlayers?.find(p => p.id === data.playerId);
    const killer = data.killerId ? this.lastKnownPlayers?.find(p => p.id === data.killerId) : null;

    let text: string;
    if (killer && killer.id !== data.playerId) {
      text = `${killer.displayName} eliminated ${victim?.displayName || '???'}`;
    } else {
      text = `${victim?.displayName || '???'} was eliminated`;
    }

    this.killFeedEntries.push({ text, time: Date.now() });
    if (this.killFeedEntries.length > 5) {
      this.killFeedEntries.shift();
    }
    this.renderKillFeed();
  }

  private lastKnownPlayers: any[] = [];

  private renderKillFeed(): void {
    const now = Date.now();
    // Remove entries older than 5 seconds
    this.killFeedEntries = this.killFeedEntries.filter(e => now - e.time < 5000);

    if (this.killFeedEl) {
      this.killFeedEl.innerHTML = this.killFeedEntries.map(e => {
        const age = now - e.time;
        const opacity = Math.max(0.3, 1 - age / 5000);
        return `<div class="killfeed-entry" style="opacity:${opacity}">${e.text}</div>`;
      }).join('');
    }
  }

  private updateHUD(state: GameState): void {
    this.lastKnownPlayers = state.players;

    // Track local player death
    const me = state.players.find((p: any) => p.id === this.localPlayerId);
    if (!this.localPlayerDead && me && !me.alive) {
      this.localPlayerDead = true;
    }

    // Spectator banner
    const specBanner = document.getElementById('hud-spectator');
    if (specBanner) {
      specBanner.style.display = this.localPlayerDead ? 'block' : 'none';
    }

    // Timer
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
      const remaining = Math.max(0, Math.ceil(state.roundTime - state.timeElapsed));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      timerEl.style.color = remaining <= 30 ? '#e94560' : '#fff';
    }

    // Player stats bar
    if (me && me.alive) {
      const statsEl = document.getElementById('hud-stats');
      if (statsEl) {
        const changed = (key: string) => {
          if (!this.previousStats) return '';
          const prev = (this.previousStats as any)[key];
          const curr = (me as any)[key];
          if (prev !== undefined && curr !== undefined && prev !== curr) {
            return ' stat-changed';
          }
          return '';
        };

        statsEl.innerHTML = `
          <span class="stat-item${changed('maxBombs')}">💣 ${me.maxBombs}</span>
          <span class="stat-item${changed('fireRange')}">🔥 ${me.fireRange}</span>
          <span class="stat-item${changed('speed')}">⚡ ${me.speed}</span>
          <span class="stat-item">${me.hasShield ? '🛡️' : '<span style="opacity:0.3">🛡️</span>'}</span>
          <span class="stat-item">${me.hasKick ? '👢' : '<span style="opacity:0.3">👢</span>'}</span>
        `;

        this.previousStats = {
          maxBombs: me.maxBombs,
          fireRange: me.fireRange,
          speed: me.speed,
          hasShield: me.hasShield,
          hasKick: me.hasKick,
        };
      }
    }

    // Player list
    const playersEl = document.getElementById('hud-players');
    if (playersEl) {
      const sorted = [...state.players].sort((a: any, b: any) => (b.alive ? 1 : 0) - (a.alive ? 1 : 0));
      playersEl.innerHTML = sorted.map((p: any) => {
        const dead = !p.alive;
        const clickable = p.alive && this.localPlayerDead;
        return `<div class="hud-player-item${dead ? ' dead' : ''}${clickable ? ' clickable' : ''}" data-player-id="${p.id}">
          <span>${p.isBot ? '🤖 ' : ''}${p.displayName}</span>
        </div>`;
      }).join('');
    }

    // Refresh kill feed (for age-based opacity)
    this.renderKillFeed();
  }

  shutdown(): void {
    if (this.boundClickHandler) {
      this.playerListEl?.removeEventListener('mousedown', this.boundClickHandler);
      this.boundClickHandler = null;
    }
    if (this.playerDiedHandler && this.socketClient) {
      this.socketClient.off('game:playerDied', this.playerDiedHandler);
      this.playerDiedHandler = null;
    }
    this.hudContainer?.remove();
    this.playerListEl?.remove();
    this.killFeedEl?.remove();
    this.settingsPanel?.remove();
    this.helpPanel?.remove();
  }
}
