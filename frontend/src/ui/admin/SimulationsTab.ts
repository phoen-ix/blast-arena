import { ApiClient } from '../../network/ApiClient';
import { SocketClient } from '../../network/SocketClient';
import { NotificationUI } from '../NotificationUI';
import {
  SimulationBatchStatus,
  SimulationGameResult,
  SimulationConfig,
  SimulationDefaults,
  GameState,
  ReplayData,
  PowerUpType,
  POWERUP_DEFINITIONS,
  GAME_MODES,
  BotAIEntry,
} from '@blast-arena/shared';
import { escapeHtml } from '../../utils/html';
import game from '../../main';

type ViewMode = 'list' | 'detail';

export class SimulationsTab {
  private container: HTMLElement | null = null;
  private notifications: NotificationUI;
  private socketClient: SocketClient;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private viewMode: ViewMode = 'list';
  private detailBatchId: string | null = null;
  private detailResults: SimulationGameResult[] = [];
  private activeBatch: SimulationBatchStatus | null = null;

  // Pagination and sorting for detail view
  private detailPage: number = 1;
  private detailPageSize: number = 25;
  private detailSortKey: string = 'gameIndex';
  private detailSortAsc: boolean = true;

  constructor(notifications: NotificationUI, socketClient: SocketClient) {
    this.notifications = notifications;
    this.socketClient = socketClient;
  }

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div');
    parent.appendChild(this.container);

    // Listen for simulation socket events
    this.socketClient.on('sim:progress' as any, this.handleProgress);
    this.socketClient.on('sim:gameResult' as any, this.handleGameResult);
    this.socketClient.on('sim:completed' as any, this.handleCompleted);
    this.socketClient.on('sim:queueUpdate' as any, this.handleQueueUpdate);

    await this.loadBatchList();
    this.refreshInterval = setInterval(() => {
      if (this.viewMode === 'list') this.loadBatchList();
    }, 5000);
  }

  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.socketClient.off('sim:progress' as any, this.handleProgress);
    this.socketClient.off('sim:gameResult' as any, this.handleGameResult);
    this.socketClient.off('sim:completed' as any, this.handleCompleted);
    this.socketClient.off('sim:queueUpdate' as any, this.handleQueueUpdate);
    this.container?.remove();
    this.container = null;
    this.viewMode = 'list';
    this.detailBatchId = null;
    this.detailResults = [];
    this.activeBatch = null;
  }

  private handleProgress = (data: SimulationBatchStatus) => {
    this.activeBatch = data;
    if (this.viewMode === 'list') {
      this.loadBatchList();
    } else if (this.viewMode === 'detail' && this.detailBatchId === data.batchId) {
      this.renderDetailView(data);
    }
  };

  private handleGameResult = (data: { batchId: string; result: SimulationGameResult }) => {
    if (this.detailBatchId === data.batchId) {
      this.detailResults.push(data.result);
      if (this.activeBatch) {
        this.renderDetailView(this.activeBatch);
      }
    }
  };

  private handleQueueUpdate = () => {
    if (this.viewMode === 'list') {
      this.loadBatchList();
    }
  };

  private handleCompleted = (data: { batchId: string; status: SimulationBatchStatus }) => {
    this.activeBatch = null;
    this.notifications.success(`Simulation batch completed (${data.status.gamesCompleted} games)`);
    if (this.viewMode === 'list') {
      this.loadBatchList();
    } else if (this.detailBatchId === data.batchId) {
      this.renderDetailView(data.status);
    }
  };

  private async loadBatchList(): Promise<void> {
    if (!this.container) return;
    this.viewMode = 'list';

    try {
      const resp = await ApiClient.get<{ batches: SimulationBatchStatus[]; total: number }>(
        '/admin/simulations',
      );
      const batches = resp.batches ?? [];

      this.container.innerHTML = `
        <div class="sim-section-header">
          <h3>Bot Simulations</h3>
          <button class="btn btn-primary" id="sim-new-batch">New Simulation</button>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Bots</th>
              <th>Difficulty</th>
              <th>Map</th>
              <th>Games</th>
              <th>Speed</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${batches.map((b) => this.renderBatchRow(b)).join('')}
            ${batches.length === 0 ? '<tr><td colspan="8" class="sim-empty-row">No simulations yet</td></tr>' : ''}
          </tbody>
        </table>
      `;

      this.container.querySelector('#sim-new-batch')?.addEventListener('click', () => {
        this.showConfigModal();
      });

      this.container.addEventListener('click', this.handleListClick);
    } catch {
      if (this.container) {
        this.container.innerHTML = '<div class="sim-error">Failed to load simulations</div>';
      }
    }
  }

  private renderBatchRow(b: SimulationBatchStatus): string {
    const pct = b.totalGames > 0 ? Math.round((b.gamesCompleted / b.totalGames) * 100) : 0;
    const statusClass =
      b.status === 'queued'
        ? 'text-info'
        : b.status === 'running'
          ? 'text-accent'
          : b.status === 'completed'
            ? 'text-success'
            : b.status === 'cancelled'
              ? 'text-warning'
              : 'text-danger';
    const modeLabel = GAME_MODES[b.config.gameMode]?.name || b.config.gameMode;

    return `
      <tr>
        <td>${escapeHtml(modeLabel)}</td>
        <td>${b.config.botCount}</td>
        <td>${escapeHtml(b.config.botDifficulty)}</td>
        <td>${b.config.mapWidth}x${b.config.mapHeight}</td>
        <td>
          <div class="sim-games-cell">
            <span>${b.gamesCompleted}/${b.totalGames}</span>
            ${
              b.status === 'running'
                ? `
              <div class="sim-progress-mini">
                <div class="sim-progress-fill" style="width:${pct}%;"></div>
              </div>
            `
                : ''
            }
          </div>
        </td>
        <td>${b.config.speed === 'fast' ? 'Fast' : 'Real-time'}</td>
        <td><span class="sim-status ${statusClass}">${b.status === 'queued' ? `Queued (#${b.queuePosition})` : b.status}</span></td>
        <td class="sim-td-actions">
          ${
            b.status === 'queued'
              ? `<button class="btn-warn btn-sm" data-action="dequeue" data-batch="${escapeHtml(b.batchId)}">Remove</button>`
              : `
            <button class="btn btn-secondary btn-sm" data-action="view" data-batch="${escapeHtml(b.batchId)}">View</button>
            ${
              b.status !== 'running'
                ? `<button class="btn-warn btn-sm" data-action="delete" data-batch="${escapeHtml(b.batchId)}">Delete</button>`
                : ''
            }
            ${
              b.status === 'running'
                ? `
              ${b.config.speed === 'realtime' ? `<button class="btn btn-secondary btn-sm" data-action="spectate" data-batch="${escapeHtml(b.batchId)}">Spectate</button>` : ''}
              <button class="btn-warn btn-sm" data-action="cancel" data-batch="${escapeHtml(b.batchId)}">Cancel</button>
            `
                : ''
            }
          `
          }
        </td>
      </tr>
    `;
  }

  private handleListClick = async (e: Event) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const batchId = target.dataset.batch;
    if (!action || !batchId) return;

    if (action === 'view') {
      await this.showBatchDetail(batchId);
    } else if (action === 'cancel') {
      this.socketClient.emit('sim:cancel' as any, { batchId }, (res: any) => {
        if (res.success) {
          this.notifications.success('Batch cancellation requested');
        } else {
          this.notifications.error(res.error || 'Failed to cancel');
        }
      });
    } else if (action === 'spectate') {
      this.startSpectating(batchId);
    } else if (action === 'dequeue') {
      this.socketClient.emit('sim:cancel' as any, { batchId }, (res: any) => {
        if (res.success) {
          this.notifications.success('Simulation removed from queue');
          this.loadBatchList();
        } else {
          this.notifications.error(res.error || 'Failed to remove from queue');
        }
      });
    } else if (action === 'delete') {
      if (confirm(`Delete simulation batch and all its logs?`)) {
        try {
          await ApiClient.delete(`/admin/simulations/${batchId}`);
          this.notifications.success('Simulation deleted');
          this.loadBatchList();
        } catch {
          this.notifications.error('Failed to delete simulation');
        }
      }
    }
  };

  private startSpectating(batchId: string): void {
    this.socketClient.emit('sim:spectate' as any, { batchId }, (res: any) => {
      if (!res.success) {
        this.notifications.error(res.error || 'Failed to spectate');
        return;
      }

      // Wait for the first sim:state to get the initial game state, then launch GameScene
      const stateHandler = (data: { batchId: string; state: GameState }) => {
        if (data.batchId !== batchId) return;
        this.socketClient.off('sim:state' as any, stateHandler as any);

        this.launchGameScene(batchId, data.state);
      };
      this.socketClient.on('sim:state' as any, stateHandler as any);

      // Timeout in case no state arrives (game between transitions)
      setTimeout(() => {
        this.socketClient.off('sim:state' as any, stateHandler as any);
      }, 5000);
    });
  }

  private launchGameScene(batchId: string, initialState: GameState): void {
    // Clear all DOM overlays (admin panel, lobby, etc.)
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) {
      while (uiOverlay.firstChild) {
        uiOverlay.removeChild(uiOverlay.firstChild);
      }
    }

    // Set registry values for GameScene
    const registry = game.registry;
    registry.set('initialGameState', initialState);
    registry.set('simulationSpectate', { batchId });

    // Get a running scene to use its ScenePlugin for scene transitions
    const activeScene = game.scene.getScene('LobbyScene') || game.scene.getScene('MenuScene');
    if (activeScene) {
      activeScene.scene.start('GameScene');
      activeScene.scene.launch('HUDScene');
    }
  }

  private async launchSimulationReplay(batchId: string, gameIndex: number): Promise<void> {
    try {
      this.notifications.info('Loading replay...');
      const replayData = await ApiClient.get<ReplayData>(
        `/admin/simulations/${batchId}/replay/${gameIndex}`,
      );

      if (!replayData || !replayData.frames || replayData.frames.length === 0) {
        this.notifications.error('Replay data is empty or corrupted');
        return;
      }

      // Reconstruct initial GameState from first frame + stored map
      const firstFrame = replayData.frames[0];
      const initialState: GameState = {
        tick: firstFrame.tick,
        players: firstFrame.players,
        bombs: firstFrame.bombs,
        explosions: firstFrame.explosions,
        powerUps: firstFrame.powerUps,
        map: replayData.map,
        status: firstFrame.status,
        winnerId: firstFrame.winnerId,
        winnerTeam: firstFrame.winnerTeam,
        roundTime: firstFrame.roundTime,
        timeElapsed: firstFrame.timeElapsed,
      };
      if (firstFrame.zone) initialState.zone = firstFrame.zone;
      if (firstFrame.hillZone) initialState.hillZone = firstFrame.hillZone;
      if (firstFrame.kothScores) initialState.kothScores = firstFrame.kothScores;

      // Clear all DOM overlays (admin panel, lobby, etc.)
      const uiOverlay = document.getElementById('ui-overlay');
      if (uiOverlay) {
        while (uiOverlay.firstChild) {
          uiOverlay.removeChild(uiOverlay.firstChild);
        }
      }

      // Set registry values for GameScene
      const registry = game.registry;
      registry.set('initialGameState', initialState);
      registry.set('replayMode', true);
      registry.set('replayData', replayData);

      // Start GameScene and HUDScene
      const activeScene = game.scene.getScene('LobbyScene') || game.scene.getScene('MenuScene');
      if (activeScene) {
        activeScene.scene.start('GameScene');
        activeScene.scene.launch('HUDScene');
      }
    } catch {
      this.notifications.error('Failed to load replay');
    }
  }

  private async showBatchDetail(batchId: string): Promise<void> {
    if (!this.container) return;
    this.viewMode = 'detail';
    this.detailBatchId = batchId;

    try {
      const data = await ApiClient.get<{ results: SimulationGameResult[]; summary: any }>(
        `/admin/simulations/${batchId}`,
      );
      this.detailResults = data.results || [];

      const status: SimulationBatchStatus =
        this.activeBatch?.batchId === batchId ? this.activeBatch : data.summary;

      this.renderDetailView(status);
    } catch {
      this.notifications.error('Failed to load batch details');
      this.loadBatchList();
    }
  }

  private renderDetailView(status: SimulationBatchStatus): void {
    if (!this.container || this.viewMode !== 'detail') return;

    const pct =
      status.totalGames > 0 ? Math.round((status.gamesCompleted / status.totalGames) * 100) : 0;
    const modeLabel = GAME_MODES[status.config.gameMode]?.name || status.config.gameMode;

    // Build win distribution
    const winCounts: Record<string, number> = {};
    for (const r of this.detailResults) {
      if (r.winnerName) {
        winCounts[r.winnerName] = (winCounts[r.winnerName] || 0) + 1;
      }
    }
    const winEntries = Object.entries(winCounts).sort((a, b) => b[1] - a[1]);

    const detailStatusClass =
      status.status === 'running'
        ? 'text-accent'
        : status.status === 'completed'
          ? 'text-success'
          : 'text-warning';

    this.container.innerHTML = `
      <div class="sim-back-row">
        <button class="btn btn-secondary btn-sm" id="sim-back-to-list">Back to List</button>
      </div>

      <div class="sim-info-card">
        <div class="sim-detail-header">
          <h3>${escapeHtml(modeLabel)} Simulation</h3>
          <span class="sim-status ${detailStatusClass}">${status.status}</span>
        </div>
        <div class="sim-info-grid">
          <div>Bots: <strong>${status.config.botCount} (${status.config.botDifficulty})</strong></div>
          <div>Map: <strong>${status.config.mapWidth}x${status.config.mapHeight}</strong></div>
          <div>Time: <strong>${Math.floor(status.config.roundTime / 60)}m</strong></div>
          <div>Speed: <strong>${status.config.speed === 'fast' ? 'Fast' : 'Real-time'}</strong></div>
          <div>Verbosity: <strong>${status.config.logVerbosity}</strong></div>
        </div>
        <div class="sim-progress-section">
          <div class="sim-progress-row">
            <span class="sim-progress-label">${status.gamesCompleted}/${status.totalGames} games (${pct}%)</span>
            <div class="sim-progress-track">
              <div class="sim-progress-fill" style="width:${pct}%;"></div>
            </div>
          </div>
          ${
            status.status === 'running' && status.currentGameTick !== null
              ? `
            <div class="sim-tick-info">
              Current game: tick ${status.currentGameTick}/${status.currentGameMaxTicks || '?'}
            </div>
          `
              : ''
          }
        </div>
        ${
          status.status === 'running'
            ? `
          <div class="sim-action-row">
            ${status.config.speed === 'realtime' ? `<button class="btn btn-secondary btn-sm" id="sim-detail-spectate">Spectate Current Game</button>` : ''}
            <button class="btn-warn btn-sm" id="sim-detail-cancel">Cancel Batch</button>
          </div>
        `
            : ''
        }
      </div>

      ${
        winEntries.length > 0
          ? `
        <div class="sim-info-card">
          <h4>Win Distribution</h4>
          <div class="sim-win-chips">
            ${winEntries
              .map(
                ([name, count]) => `
              <div class="sim-win-chip">
                <span class="sim-win-chip-name">${escapeHtml(name)}</span>
                <span class="sim-win-chip-count">${count} wins</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      ${this.renderResultsTable()}
    `;

    this.container.querySelector('#sim-back-to-list')?.addEventListener('click', () => {
      this.detailBatchId = null;
      this.detailResults = [];
      this.detailPage = 1;
      this.detailSortKey = 'gameIndex';
      this.detailSortAsc = true;
      this.loadBatchList();
    });

    this.container.querySelector('#sim-detail-spectate')?.addEventListener('click', () => {
      if (this.detailBatchId) {
        this.startSpectating(this.detailBatchId);
      }
    });

    this.container.querySelector('#sim-detail-cancel')?.addEventListener('click', () => {
      if (this.detailBatchId) {
        this.socketClient.emit('sim:cancel' as any, { batchId: this.detailBatchId }, (res: any) => {
          if (res.success) {
            this.notifications.success('Batch cancellation requested');
          } else {
            this.notifications.error(res.error || 'Failed to cancel');
          }
        });
      }
    });

    this.attachResultsTableListeners();
  }

  private renderResultsTable(): string {
    // Sort results
    const sorted = [...this.detailResults].sort((a, b) => {
      let cmp = 0;
      switch (this.detailSortKey) {
        case 'gameIndex':
          cmp = a.gameIndex - b.gameIndex;
          break;
        case 'winner':
          cmp = (a.winnerName || '').localeCompare(b.winnerName || '');
          break;
        case 'duration':
          cmp = a.durationSeconds - b.durationSeconds;
          break;
        case 'kills': {
          const aKills = Math.max(...a.placements.map((p) => p.kills));
          const bKills = Math.max(...b.placements.map((p) => p.kills));
          cmp = aKills - bKills;
          break;
        }
        case 'reason':
          cmp = a.finishReason.localeCompare(b.finishReason);
          break;
      }
      return this.detailSortAsc ? cmp : -cmp;
    });

    // Paginate
    const totalPages = Math.max(1, Math.ceil(sorted.length / this.detailPageSize));
    if (this.detailPage > totalPages) this.detailPage = totalPages;
    const start = (this.detailPage - 1) * this.detailPageSize;
    const pageResults = sorted.slice(start, start + this.detailPageSize);

    const sortIcon = (key: string) => {
      if (this.detailSortKey !== key) return '';
      return this.detailSortAsc ? ' ↑' : ' ↓';
    };

    return `
      <table class="admin-table" id="sim-results-table">
        <thead>
          <tr>
            <th class="sortable-th" data-sort="gameIndex">#${sortIcon('gameIndex')}</th>
            <th class="sortable-th" data-sort="winner">Winner${sortIcon('winner')}</th>
            <th class="sortable-th" data-sort="duration">Duration${sortIcon('duration')}</th>
            <th class="sortable-th" data-sort="kills">Kill Leader${sortIcon('kills')}</th>
            <th class="sortable-th" data-sort="reason">Reason${sortIcon('reason')}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${pageResults
            .map((r) => {
              const killLeader = [...r.placements].sort((a, b) => b.kills - a.kills)[0];
              const mins = Math.floor(r.durationSeconds / 60);
              const secs = r.durationSeconds % 60;
              return `
              <tr>
                <td>${r.gameIndex + 1}</td>
                <td class="sim-winner-cell">${r.winnerName ? escapeHtml(r.winnerName) : '<span class="text-dim">Draw</span>'}</td>
                <td>${mins}:${String(secs).padStart(2, '0')}</td>
                <td>${killLeader ? `${escapeHtml(killLeader.name)} (${killLeader.kills})` : '-'}</td>
                <td class="sim-reason-cell">${escapeHtml(r.finishReason)}</td>
                <td>${r.hasReplay ? `<button class="btn btn-secondary btn-sm" data-action="watch-replay" data-game-index="${r.gameIndex}">Replay</button>` : ''}</td>
              </tr>
            `;
            })
            .join('')}
          ${sorted.length === 0 ? '<tr><td colspan="6" class="sim-empty-row">No results yet</td></tr>' : ''}
        </tbody>
      </table>
      ${
        totalPages > 1
          ? `
        <div class="sim-pagination">
          <button class="btn btn-secondary btn-sm" id="sim-page-prev" ${this.detailPage <= 1 ? 'disabled' : ''}>Prev</button>
          <span class="sim-pagination-info">Page ${this.detailPage} of ${totalPages} (${sorted.length} results)</span>
          <button class="btn btn-secondary btn-sm" id="sim-page-next" ${this.detailPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      `
          : ''
      }
    `;
  }

  private attachResultsTableListeners(): void {
    if (!this.container) return;

    // Watch replay buttons
    this.container.querySelectorAll('[data-action="watch-replay"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gameIndex = parseInt((btn as HTMLElement).dataset.gameIndex!);
        if (this.detailBatchId != null && !isNaN(gameIndex)) {
          this.launchSimulationReplay(this.detailBatchId, gameIndex);
        }
      });
    });

    // Sort headers
    this.container.querySelectorAll('#sim-results-table th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = (th as HTMLElement).dataset.sort!;
        if (this.detailSortKey === key) {
          this.detailSortAsc = !this.detailSortAsc;
        } else {
          this.detailSortKey = key;
          this.detailSortAsc = true;
        }
        this.detailPage = 1;
        this.refreshResultsTable();
      });
    });

    // Pagination
    this.container.querySelector('#sim-page-prev')?.addEventListener('click', () => {
      if (this.detailPage > 1) {
        this.detailPage--;
        this.refreshResultsTable();
      }
    });
    this.container.querySelector('#sim-page-next')?.addEventListener('click', () => {
      this.detailPage++;
      this.refreshResultsTable();
    });
  }

  private refreshResultsTable(): void {
    if (!this.container) return;
    const tableContainer = this.container.querySelector('#sim-results-table')?.parentElement;
    if (!tableContainer) return;

    // Find the table and pagination wrapper, replace them
    const oldTable = this.container.querySelector('#sim-results-table');
    const oldPagination = oldTable?.nextElementSibling;

    const temp = document.createElement('div');
    temp.innerHTML = this.renderResultsTable();

    if (oldTable) {
      oldTable.replaceWith(temp.querySelector('#sim-results-table')!);
    }
    if (oldPagination?.id === 'sim-page-prev' || oldPagination?.querySelector('#sim-page-prev')) {
      oldPagination.replaceWith(...Array.from(temp.children));
    } else {
      // Append pagination if it wasn't there before
      const newPagination = temp.querySelector('#sim-page-prev')?.parentElement;
      if (newPagination && oldTable?.parentElement) {
        oldTable.parentElement.appendChild(newPagination);
      }
    }

    this.attachResultsTableListeners();
  }

  private async showConfigModal(): Promise<void> {
    let simDefaults: SimulationDefaults = {};
    let activeAIs: BotAIEntry[] = [];
    try {
      const [defResp, aiResp] = await Promise.all([
        ApiClient.get<{ defaults: SimulationDefaults }>('/admin/settings/simulation_defaults'),
        ApiClient.get<{ ais: BotAIEntry[] }>('/admin/ai/active'),
      ]);
      simDefaults = defResp.defaults ?? {};
      activeAIs = aiResp.ais ?? [];
    } catch {
      // Use hardcoded defaults on failure
    }

    const allPowerUps = Object.values(POWERUP_DEFINITIONS);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal sim-modal">
        <h2>New Simulation Batch</h2>

        <div class="sim-modal-grid">
          <div class="form-group mb-0">
            <label>Game Mode</label>
            <select id="sim-mode">
              <option value="ffa">Free for All</option>
              <option value="teams">Teams</option>
              <option value="battle_royale">Battle Royale</option>
              <option value="sudden_death">Sudden Death</option>
              <option value="deathmatch">Deathmatch</option>
              <option value="king_of_the_hill">King of the Hill</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label>Bot Count</label>
            <select id="sim-bot-count">
              <option value="2">2 Bots</option>
              <option value="3">3 Bots</option>
              <option value="4" selected>4 Bots</option>
              <option value="5">5 Bots</option>
              <option value="6">6 Bots</option>
              <option value="7">7 Bots</option>
              <option value="8">8 Bots</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label>Bot Difficulty</label>
            <select id="sim-difficulty">
              <option value="easy">Easy</option>
              <option value="normal" selected>Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          ${
            activeAIs.length > 1
              ? `
          <div class="form-group mb-0">
            <label>Bot AI</label>
            <select id="sim-bot-ai">
              ${activeAIs.map((ai) => `<option value="${ai.id}"${ai.isBuiltin ? ' selected' : ''}>${escapeHtml(ai.name)}</option>`).join('')}
            </select>
          </div>
          `
              : ''
          }
          <div class="form-group mb-0">
            <label>Map Size</label>
            <select id="sim-map-size">
              <option value="21">21x21 (Small)</option>
              <option value="31" selected>31x31 (Normal)</option>
              <option value="39">39x39 (Large)</option>
              <option value="51">51x51 (Huge)</option>
              <option value="61">61x61 (Massive)</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label>Match Time</label>
            <select id="sim-round-time">
              <option value="60">1 min</option>
              <option value="120">2 min</option>
              <option value="180" selected>3 min</option>
              <option value="300">5 min</option>
              <option value="600">10 min</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label>Wall Density</label>
            <select id="sim-wall-density">
              <option value="0.3">Low (30%)</option>
              <option value="0.5">Medium (50%)</option>
              <option value="0.65" selected>High (65%)</option>
              <option value="0.8">Very High (80%)</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label>Power-Up Rate</label>
            <select id="sim-powerup-rate">
              <option value="0">None (0%)</option>
              <option value="0.15">Low (15%)</option>
              <option value="0.3" selected>Normal (30%)</option>
              <option value="0.5">High (50%)</option>
              <option value="0.8">Very High (80%)</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label>Total Games</label>
            <input type="number" id="sim-total-games" value="10" min="1" max="1000" class="w-full">
          </div>
          <div class="form-group mb-0">
            <label>Speed</label>
            <select id="sim-speed">
              <option value="fast" selected>Fast (max speed)</option>
              <option value="realtime">Real-time (20 tps)</option>
            </select>
          </div>
        </div>

        <div class="sim-modal-grid mt-sm">
          <div class="form-group mb-0">
            <label>Log Verbosity</label>
            <select id="sim-verbosity">
              <option value="normal" selected>Normal</option>
              <option value="detailed">Detailed</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>

        <div class="sim-checkbox-row">
          <label class="sim-checkbox-label">
            <input type="checkbox" id="sim-reinforced"> Reinforced Walls
          </label>
          <label class="sim-checkbox-label">
            <input type="checkbox" id="sim-map-events"> Map Events
          </label>
          <label class="sim-checkbox-label">
            <input type="checkbox" id="sim-hazard-tiles"> Hazard Tiles
          </label>
          <label class="sim-checkbox-label" id="sim-ff-label">
            <input type="checkbox" id="sim-friendly-fire" checked> Friendly Fire
          </label>
          <label class="sim-checkbox-label accent-label">
            <input type="checkbox" id="sim-record-replays" checked>
            <span>Record Replays</span>
          </label>
        </div>

        <div class="sim-powerup-section">
          <label>Power-Ups</label>
          <div class="sim-powerup-chips">
            ${allPowerUps
              .map(
                (pu) => `
              <label class="sim-powerup-label">
                <input type="checkbox" class="sim-powerup-check" value="${pu.type}" checked>
                ${pu.name}
              </label>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="modal-actions sim-modal-actions">
          <button class="btn btn-secondary" id="sim-config-cancel">Cancel</button>
          <button class="btn btn-primary" id="sim-config-start">Start Batch</button>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')!.appendChild(modal);

    // Apply admin-configured simulation defaults
    this.applySimulationDefaults(modal, simDefaults);

    // Show/hide friendly fire based on game mode
    const modeSelect = modal.querySelector('#sim-mode') as HTMLSelectElement;
    const ffLabel = modal.querySelector('#sim-ff-label') as HTMLElement;
    const updateFFVisibility = () => {
      ffLabel.style.display = modeSelect.value === 'teams' ? '' : 'none';
    };
    modeSelect.addEventListener('change', updateFFVisibility);
    updateFFVisibility();

    modal.querySelector('#sim-config-cancel')!.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#sim-config-start')!.addEventListener('click', () => {
      const mapSize = parseInt((modal.querySelector('#sim-map-size') as HTMLSelectElement).value);
      const enabledPowerUps = Array.from(modal.querySelectorAll('.sim-powerup-check:checked')).map(
        (el) => (el as HTMLInputElement).value,
      );
      const speed = (modal.querySelector('#sim-speed') as HTMLSelectElement).value as
        | 'fast'
        | 'realtime';

      const config: SimulationConfig = {
        gameMode: (modal.querySelector('#sim-mode') as HTMLSelectElement).value as any,
        botCount: parseInt((modal.querySelector('#sim-bot-count') as HTMLSelectElement).value),
        botDifficulty: (modal.querySelector('#sim-difficulty') as HTMLSelectElement).value as any,
        mapWidth: mapSize,
        mapHeight: mapSize,
        roundTime: parseInt((modal.querySelector('#sim-round-time') as HTMLSelectElement).value),
        wallDensity: parseFloat(
          (modal.querySelector('#sim-wall-density') as HTMLSelectElement).value,
        ),
        enabledPowerUps: enabledPowerUps as any[],
        powerUpDropRate: parseFloat(
          (modal.querySelector('#sim-powerup-rate') as HTMLSelectElement).value,
        ),
        friendlyFire: (modal.querySelector('#sim-friendly-fire') as HTMLInputElement).checked,
        hazardTiles: (modal.querySelector('#sim-hazard-tiles') as HTMLInputElement).checked,
        reinforcedWalls: (modal.querySelector('#sim-reinforced') as HTMLInputElement).checked,
        enableMapEvents: (modal.querySelector('#sim-map-events') as HTMLInputElement).checked,
        totalGames: Math.min(
          1000,
          Math.max(
            1,
            parseInt((modal.querySelector('#sim-total-games') as HTMLInputElement).value) || 10,
          ),
        ),
        speed,
        logVerbosity: (modal.querySelector('#sim-verbosity') as HTMLSelectElement).value as any,
        recordReplays: (modal.querySelector('#sim-record-replays') as HTMLInputElement).checked,
        botAiId:
          (modal.querySelector('#sim-bot-ai') as HTMLSelectElement | null)?.value || undefined,
      };

      // Validate bot count for Teams mode (minimum 4)
      const modeConfig = GAME_MODES[config.gameMode];
      if (config.botCount < modeConfig.minPlayers) {
        this.notifications.error(
          `${modeConfig.name} requires at least ${modeConfig.minPlayers} bots`,
        );
        return;
      }

      modal.remove();

      this.socketClient.emit('sim:start' as any, config, (res: any) => {
        if (!res.success) {
          this.notifications.error(res.error || 'Failed to start simulation');
          return;
        }

        const batchId = res.batchId;

        if (res.queued) {
          this.notifications.success(
            `Simulation queued (position #${res.queuePosition}, ${config.totalGames} games)`,
          );
          this.loadBatchList();
        } else {
          this.notifications.success(`Simulation batch started (${config.totalGames} games)`);

          if (speed === 'realtime') {
            // For realtime: immediately spectate so the game plays in the browser
            this.startSpectating(batchId);
          } else {
            // For fast mode: show detail view with progress
            this.showBatchDetail(batchId);
          }
        }
      });
    });
  }

  private applySimulationDefaults(modal: HTMLElement, defaults: SimulationDefaults): void {
    const setSelect = (id: string, value: string | number | undefined) => {
      if (value === undefined) return;
      const el = modal.querySelector(id) as HTMLSelectElement | null;
      if (el) el.value = String(value);
    };
    const setCheckbox = (id: string, value: boolean | undefined) => {
      if (value === undefined) return;
      const el = modal.querySelector(id) as HTMLInputElement | null;
      if (el) el.checked = value;
    };

    setSelect('#sim-mode', defaults.gameMode);
    setSelect('#sim-bot-count', defaults.botCount);
    setSelect('#sim-difficulty', defaults.botDifficulty);
    setSelect('#sim-map-size', defaults.mapWidth);
    setSelect('#sim-round-time', defaults.roundTime);
    setSelect('#sim-wall-density', defaults.wallDensity);
    setSelect('#sim-powerup-rate', defaults.powerUpDropRate);
    setSelect('#sim-speed', defaults.speed);
    setSelect('#sim-verbosity', defaults.logVerbosity);

    if (defaults.totalGames !== undefined) {
      const el = modal.querySelector('#sim-total-games') as HTMLInputElement | null;
      if (el) el.value = String(defaults.totalGames);
    }

    setCheckbox('#sim-reinforced', defaults.reinforcedWalls);
    setCheckbox('#sim-map-events', defaults.enableMapEvents);
    setCheckbox('#sim-hazard-tiles', defaults.hazardTiles);
    setCheckbox('#sim-friendly-fire', defaults.friendlyFire);
    setCheckbox('#sim-record-replays', defaults.recordReplays);
    setSelect('#sim-bot-ai', defaults.botAiId);

    if (defaults.enabledPowerUps) {
      const enabled = new Set(defaults.enabledPowerUps);
      modal.querySelectorAll('.sim-powerup-check').forEach((cb) => {
        const input = cb as HTMLInputElement;
        input.checked = enabled.has(input.value as PowerUpType);
      });
    }
  }
}
