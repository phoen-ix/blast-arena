import { ILobbyView, ViewDeps } from './types';
import { OpenWorldScoreEntry } from '@blast-arena/shared';
import { API_URL } from '../../config';
import { escapeHtml } from '../../utils/html';
import { t } from '../../i18n';
import game from '../../main';

interface OpenWorldStatus {
  enabled: boolean;
  playerCount: number;
  maxPlayers: number;
  roundTimeRemaining: number;
  roundNumber: number;
  guestAccess: boolean;
}

interface OpenWorldInfo {
  playerCount: number;
  maxPlayers: number;
  roundTimeRemaining: number;
  roundNumber: number;
}

export class OpenWorldView implements ILobbyView {
  readonly viewId = 'openWorld';
  get title() {
    return t('ui:openWorld.title');
  }

  private deps: ViewDeps;
  private container: HTMLElement | null = null;
  private infoHandler: ((data: OpenWorldInfo) => void) | null = null;
  private scoreHandler: ((data: OpenWorldScoreEntry) => void) | null = null;
  private roundEndHandler:
    | ((data: {
        roundNumber: number;
        leaderboard: OpenWorldScoreEntry[];
        nextRoundIn: number;
      }) => void)
    | null = null;
  private roundStartHandler: ((data: { roundNumber: number }) => void) | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private roundTimeRemaining = 0;

  constructor(deps: ViewDeps) {
    this.deps = deps;
  }

  async render(container: HTMLElement): Promise<void> {
    this.container = container;
    container.innerHTML = `<div class="panel-content" style="padding:2rem; text-align:center;">
      <p style="color:var(--text-muted); font-size:1.1rem;">${t('ui:openWorld.joining')}</p>
    </div>`;

    // Fetch current status
    let status: OpenWorldStatus | null = null;
    try {
      const res = await fetch(`${API_URL}/admin/settings/open_world/status`);
      if (res.ok) {
        status = await res.json();
      }
    } catch {
      // Fall through to disabled state
    }

    if (!status?.enabled) {
      container.innerHTML = `
        <div class="panel-content" style="padding:2rem; text-align:center;">
          <p style="color:var(--text-muted); font-size:1.1rem;">${t('ui:openWorld.disabled')}</p>
        </div>`;
      return;
    }

    this.roundTimeRemaining = status.roundTimeRemaining;
    this.bindSocketListeners();
    this.startTimerCountdown();

    // Auto-join immediately
    this.joinWorld();
  }

  private joinWorld(): void {
    const socket = this.deps.socketClient.getSocket();
    if (!socket) {
      this.showError('Not connected');
      return;
    }

    socket.emit('openworld:join', {}, (response: any) => {
      if (response.success && response.state) {
        // Set guest identity if needed
        if (this.deps.authManager.isGuest && response.playerId && response.username) {
          this.deps.authManager.setGuestIdentity(response.playerId, response.username);
        }

        // Transition to GameScene with open world state
        game.registry.set('initialGameState', response.state);
        game.registry.set('openWorldMode', true);
        game.registry.set('openWorldPlayerId', response.playerId);

        // Clear DOM
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) {
          while (uiOverlay.firstChild) {
            uiOverlay.removeChild(uiOverlay.firstChild);
          }
        }

        const lobbyScene = game.scene.getScene('LobbyScene');
        if (lobbyScene) {
          lobbyScene.scene.start('GameScene');
          lobbyScene.scene.launch('HUDScene');
        }
      } else {
        this.showError(response.error || 'Failed to join');
      }
    });
  }

  private showError(message: string): void {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="panel-content" style="padding:2rem; text-align:center;">
        <p style="color:var(--text-muted); font-size:1.1rem;">${escapeHtml(message)}</p>
        <button class="btn btn-primary" id="ow-retry-btn" style="margin-top:1rem;">
          ${t('ui:openWorld.joinButton')}
        </button>
      </div>`;
    this.container.querySelector('#ow-retry-btn')?.addEventListener('click', () => {
      if (!this.container) return;
      this.container.innerHTML = `<div class="panel-content" style="padding:2rem; text-align:center;">
        <p style="color:var(--text-muted); font-size:1.1rem;">${t('ui:openWorld.joining')}</p>
      </div>`;
      this.joinWorld();
    });
  }

  private bindSocketListeners(): void {
    this.infoHandler = (data) => {
      this.roundTimeRemaining = data.roundTimeRemaining;
    };
    this.deps.socketClient.on('openworld:info', this.infoHandler);

    this.roundEndHandler = () => {
      // Round end handled by GameScene/HUD when in-game
    };
    this.deps.socketClient.on('openworld:roundEnd', this.roundEndHandler);

    this.roundStartHandler = () => {
      // Round start handled by GameScene/HUD when in-game
    };
    this.deps.socketClient.on('openworld:roundStart', this.roundStartHandler);
  }

  private startTimerCountdown(): void {
    this.stopTimerCountdown();
    this.timerInterval = setInterval(() => {
      this.roundTimeRemaining = Math.max(0, this.roundTimeRemaining - 1);
    }, 1000);
  }

  private stopTimerCountdown(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  destroy(): void {
    this.stopTimerCountdown();
    if (this.infoHandler) {
      this.deps.socketClient.off('openworld:info', this.infoHandler);
      this.infoHandler = null;
    }
    if (this.scoreHandler) {
      this.deps.socketClient.off('openworld:scoreUpdate', this.scoreHandler);
      this.scoreHandler = null;
    }
    if (this.roundEndHandler) {
      this.deps.socketClient.off('openworld:roundEnd', this.roundEndHandler);
      this.roundEndHandler = null;
    }
    if (this.roundStartHandler) {
      this.deps.socketClient.off('openworld:roundStart', this.roundStartHandler);
      this.roundStartHandler = null;
    }
    this.container = null;
  }
}
