import { ILobbyView, ViewDeps } from './types';
import { ApiClient } from '../../network/ApiClient';
import {
  PowerUpType,
  POWERUP_DEFINITIONS,
  Room,
  GameDefaults,
  BotAIEntry,
  CustomMapSummary,
} from '@blast-arena/shared';
import game from '../../main';

export class CreateRoomView implements ILobbyView {
  readonly viewId = 'create-room';
  readonly title = 'Create Room';

  private deps: ViewDeps;
  private container: HTMLElement | null = null;
  private onRoomCreated: (room: Room) => void;
  private onCancel: () => void;
  private recordingsEnabled = false;
  private gameDefaults: GameDefaults = {};
  private activeAIs: BotAIEntry[] = [];
  private myMaps: CustomMapSummary[] = [];
  private publishedMaps: CustomMapSummary[] = [];

  constructor(deps: ViewDeps, onRoomCreated: (room: Room) => void, onCancel: () => void) {
    this.deps = deps;
    this.onRoomCreated = onRoomCreated;
    this.onCancel = onCancel;
  }

  async render(container: HTMLElement): Promise<void> {
    this.container = container;

    // Load settings in parallel
    try {
      const [recResp, defResp, aiResp, myMapsResp, pubMapsResp] = await Promise.all([
        ApiClient.get<{ enabled: boolean }>('/admin/settings/recordings_enabled'),
        ApiClient.get<{ defaults: GameDefaults }>('/admin/settings/game_defaults'),
        ApiClient.get<{ ais: BotAIEntry[] }>('/admin/ai/active'),
        ApiClient.get<{ maps: CustomMapSummary[] }>('/maps/mine').catch(() => ({ maps: [] })),
        ApiClient.get<{ maps: CustomMapSummary[] }>('/maps/published').catch(() => ({ maps: [] })),
      ]);
      this.recordingsEnabled = recResp.enabled;
      this.gameDefaults = defResp.defaults ?? {};
      this.activeAIs = aiResp.ais ?? [];
      this.myMaps = myMapsResp.maps ?? [];
      this.publishedMaps = pubMapsResp.maps ?? [];
    } catch {
      // defaults
    }

    this.renderForm();
  }

  destroy(): void {
    this.container = null;
  }

  private renderForm(): void {
    if (!this.container) return;

    const allPowerUps = Object.values(POWERUP_DEFINITIONS);
    const hasMultipleAIs = this.activeAIs.length > 1;

    this.container.innerHTML = `
      <div class="create-room-page">
        <div class="create-room-content">
          <div class="create-room-section">
            <h3 class="create-room-section-title">General</h3>
            <div class="create-room-grid">
              <div class="form-group">
                <label>Room Name</label>
                <input type="text" class="input" id="cr-name" placeholder="Leave blank for random name" maxlength="30">
              </div>
              <div class="form-group">
                <label>Game Mode</label>
                <select class="select" id="cr-mode">
                  <option value="ffa">Free for All</option>
                  <option value="teams">Teams</option>
                  <option value="battle_royale">Battle Royale</option>
                  <option value="sudden_death">Sudden Death</option>
                  <option value="deathmatch">Deathmatch</option>
                  <option value="king_of_the_hill">King of the Hill</option>
                </select>
              </div>
              <div class="form-group">
                <label>Max Players</label>
                <select class="select" id="cr-max-players">
                  <option value="2">2</option>
                  <option value="4" selected>4</option>
                  <option value="6">6</option>
                  <option value="8">8</option>
                </select>
              </div>
              <div class="form-group">
                <label>Match Time</label>
                <select class="select" id="cr-round-time">
                  <option value="60">1 min</option>
                  <option value="120">2 min</option>
                  <option value="180" selected>3 min</option>
                  <option value="300">5 min</option>
                  <option value="600">10 min</option>
                </select>
              </div>
            </div>
          </div>

          <div class="create-room-section">
            <h3 class="create-room-section-title">Map</h3>
            <div class="create-room-grid">
              <div class="form-group" style="grid-column:1/-1;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <label style="flex:1;">Map</label>
                  <button class="btn btn-sm btn-ghost" id="cr-new-map" style="font-size:11px;padding:2px 8px;">+ New Map</button>
                </div>
                <select class="select" id="cr-custom-map">
                  <option value="">Random (Generated)</option>
                  ${this.buildMapOptions()}
                </select>
                <div id="cr-map-hint" style="font-size:10px;color:var(--text-dim);margin-top:2px;display:none;"></div>
              </div>
              <div class="form-group">
                <label>Map Size</label>
                <select class="select" id="cr-map-size">
                  <option value="21">21x21 (Small)</option>
                  <option value="31" selected>31x31 (Normal)</option>
                  <option value="39">39x39 (Large)</option>
                  <option value="51">51x51 (Huge)</option>
                  <option value="61">61x61 (Massive)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Wall Density</label>
                <select class="select" id="cr-wall-density">
                  <option value="0.3">Low (30%)</option>
                  <option value="0.5">Medium (50%)</option>
                  <option value="0.65" selected>High (65%)</option>
                  <option value="0.8">Very High (80%)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Power-Up Rate</label>
                <select class="select" id="cr-powerup-rate">
                  <option value="0">None (0%)</option>
                  <option value="0.15">Low (15%)</option>
                  <option value="0.3" selected>Normal (30%)</option>
                  <option value="0.5">High (50%)</option>
                  <option value="0.8">Very High (80%)</option>
                </select>
              </div>
            </div>
          </div>

          <div class="create-room-section">
            <h3 class="create-room-section-title">Bots</h3>
            <div class="create-room-grid">
              <div class="form-group">
                <label>Bot Count</label>
                <select class="select" id="cr-bots">
                  <option value="0" selected>None</option>
                  <option value="1">1 Bot</option>
                  <option value="2">2 Bots</option>
                  <option value="3">3 Bots</option>
                  <option value="4">4 Bots</option>
                  <option value="5">5 Bots</option>
                  <option value="6">6 Bots</option>
                  <option value="7">7 Bots</option>
                </select>
              </div>
              <div class="form-group">
                <label>Bot Difficulty</label>
                <select class="select" id="cr-bot-difficulty" disabled>
                  <option value="easy">Easy</option>
                  <option value="normal" selected>Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              ${
                hasMultipleAIs
                  ? `
              <div class="form-group">
                <label>Bot AI</label>
                <select class="select" id="cr-bot-ai" disabled>
                  ${this.activeAIs.map((ai) => `<option value="${ai.id}"${ai.isBuiltin ? ' selected' : ''}>${ai.name}</option>`).join('')}
                </select>
              </div>
              `
                  : ''
              }
            </div>
          </div>

          <div class="create-room-section">
            <h3 class="create-room-section-title">Options</h3>
            <div class="create-room-options">
              <label class="option-chip">
                <input type="checkbox" id="cr-reinforced-walls" style="accent-color:var(--warning);">
                <span style="color:var(--warning);">Reinforced Walls</span>
              </label>
              <label class="option-chip">
                <input type="checkbox" id="cr-map-events" style="accent-color:var(--warning);">
                <span style="color:var(--warning);">Map Events</span>
              </label>
              <label class="option-chip">
                <input type="checkbox" id="cr-hazard-tiles" style="accent-color:var(--info);">
                <span style="color:var(--info);">Hazard Tiles</span>
              </label>
              ${
                this.recordingsEnabled
                  ? `
              <label class="option-chip">
                <input type="checkbox" id="cr-record-game" checked style="accent-color:var(--accent);">
                <span style="color:var(--accent);">Record Game</span>
              </label>`
                  : ''
              }
              <span id="cr-ff-row" style="display:none;">
                <label class="option-chip">
                  <input type="checkbox" id="cr-friendly-fire" checked style="accent-color:var(--danger);">
                  <span style="color:var(--danger);">Friendly Fire</span>
                </label>
              </span>
            </div>
          </div>

          <div class="create-room-section">
            <h3 class="create-room-section-title">Power-Ups</h3>
            <div class="create-room-options">
              ${allPowerUps
                .map(
                  (pu) => `
                <label class="option-chip">
                  <input type="checkbox" class="powerup-check" value="${pu.type}" checked style="accent-color:${pu.color};">
                  <span style="color:${pu.color};">${pu.name}</span>
                </label>
              `,
                )
                .join('')}
            </div>
          </div>

          <div class="create-room-actions">
            <button class="btn btn-ghost" id="cr-cancel">Cancel</button>
            <button class="btn btn-primary" id="cr-submit">Create Room</button>
          </div>
        </div>
      </div>
    `;

    this.applyDefaults();
    this.bindEvents();
  }

  private applyDefaults(): void {
    if (!this.container || !this.gameDefaults) return;
    const d = this.gameDefaults;

    const setSelect = (id: string, value: string | number | undefined) => {
      if (value === undefined) return;
      const el = this.container!.querySelector(id) as HTMLSelectElement | null;
      if (el) el.value = String(value);
    };
    const setCheckbox = (id: string, value: boolean | undefined) => {
      if (value === undefined) return;
      const el = this.container!.querySelector(id) as HTMLInputElement | null;
      if (el) el.checked = value;
    };

    setSelect('#cr-mode', d.gameMode);
    setSelect('#cr-max-players', d.maxPlayers);
    setSelect('#cr-round-time', d.roundTime);
    setSelect('#cr-map-size', d.mapWidth);
    setSelect('#cr-wall-density', d.wallDensity);
    setSelect('#cr-powerup-rate', d.powerUpDropRate);
    setSelect('#cr-bots', d.botCount);
    setSelect('#cr-bot-difficulty', d.botDifficulty);
    setCheckbox('#cr-reinforced-walls', d.reinforcedWalls);
    setCheckbox('#cr-map-events', d.enableMapEvents);
    setCheckbox('#cr-hazard-tiles', d.hazardTiles);
    setCheckbox('#cr-friendly-fire', d.friendlyFire);
    setSelect('#cr-bot-ai', d.botAiId);

    if (d.enabledPowerUps) {
      const enabled = new Set(d.enabledPowerUps);
      this.container.querySelectorAll('.powerup-check').forEach((cb) => {
        (cb as HTMLInputElement).checked = enabled.has(
          (cb as HTMLInputElement).value as PowerUpType,
        );
      });
    }
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Friendly fire visibility
    const modeSelect = this.container.querySelector('#cr-mode') as HTMLSelectElement;
    const ffRow = this.container.querySelector('#cr-ff-row') as HTMLElement;
    const updateFF = () => {
      ffRow.style.display = modeSelect.value === 'teams' ? 'inline' : 'none';
    };
    modeSelect.addEventListener('change', updateFF);
    updateFF();

    // Bot difficulty/AI enable
    const botsSelect = this.container.querySelector('#cr-bots') as HTMLSelectElement;
    const botDiffSelect = this.container.querySelector('#cr-bot-difficulty') as HTMLSelectElement;
    const botAiSelect = this.container.querySelector('#cr-bot-ai') as HTMLSelectElement | null;
    const maxPlayersSelect = this.container.querySelector('#cr-max-players') as HTMLSelectElement;

    const updateBots = () => {
      const bots = parseInt(botsSelect.value);
      const hasBots = bots > 0;
      botDiffSelect.disabled = !hasBots;
      botDiffSelect.style.opacity = hasBots ? '1' : '0.4';
      if (botAiSelect) {
        botAiSelect.disabled = !hasBots;
        botAiSelect.style.opacity = hasBots ? '1' : '0.4';
      }
      const needed = bots + 1;
      const currentMax = parseInt(maxPlayersSelect.value);
      if (needed > currentMax) {
        const options = Array.from(maxPlayersSelect.options).map((o) => parseInt(o.value));
        const fit = options.find((v) => v >= needed);
        if (fit) maxPlayersSelect.value = String(fit);
      }
    };
    botsSelect.addEventListener('change', updateBots);
    updateBots();

    // Custom map selection
    const customMapSelect = this.container.querySelector('#cr-custom-map') as HTMLSelectElement;
    const mapSizeSelect = this.container.querySelector('#cr-map-size') as HTMLSelectElement;
    const wallDensitySelect = this.container.querySelector('#cr-wall-density') as HTMLSelectElement;
    const mapHint = this.container.querySelector('#cr-map-hint') as HTMLElement;
    const allMaps = [...this.myMaps, ...this.publishedMaps];
    const mapById = new Map(allMaps.map((m) => [String(m.id), m]));

    const updateMapSelection = () => {
      const val = customMapSelect.value;
      const isCustom = val !== '';
      mapSizeSelect.disabled = isCustom;
      mapSizeSelect.style.opacity = isCustom ? '0.4' : '1';
      wallDensitySelect.disabled = isCustom;
      wallDensitySelect.style.opacity = isCustom ? '0.4' : '1';

      if (isCustom) {
        const map = mapById.get(val);
        if (map) {
          const maxP = parseInt(maxPlayersSelect.value);
          if (map.spawnCount < maxP) {
            mapHint.textContent = `This map has ${map.spawnCount} spawn points (${map.spawnCount} players max)`;
            mapHint.style.display = 'block';
            mapHint.style.color = 'var(--warning)';
          } else {
            mapHint.textContent = `${map.mapWidth}x${map.mapHeight} map`;
            mapHint.style.display = 'block';
            mapHint.style.color = 'var(--text-dim)';
          }
        }
      } else {
        mapHint.style.display = 'none';
      }
    };
    customMapSelect.addEventListener('change', updateMapSelection);
    maxPlayersSelect.addEventListener('change', updateMapSelection);

    // New Map button
    this.container.querySelector('#cr-new-map')!.addEventListener('click', () => {
      game.registry.set('editorMode', 'custom_map');
      game.registry.set('customMapId', null);
      const lobbyScene = game.scene.getScene('LobbyScene');
      if (lobbyScene) lobbyScene.scene.start('LevelEditorScene');
    });

    // Cancel
    this.container.querySelector('#cr-cancel')!.addEventListener('click', () => {
      this.onCancel();
    });

    // Create
    this.container.querySelector('#cr-submit')!.addEventListener('click', () => {
      this.submitRoom();
    });
  }

  private submitRoom(): void {
    if (!this.container) return;

    const name = (this.container.querySelector('#cr-name') as HTMLInputElement).value.trim();
    const gameMode = (this.container.querySelector('#cr-mode') as HTMLSelectElement).value as any;
    const maxPlayers = parseInt(
      (this.container.querySelector('#cr-max-players') as HTMLSelectElement).value,
    );
    const roundTime = parseInt(
      (this.container.querySelector('#cr-round-time') as HTMLSelectElement).value,
    );
    const wallDensity = parseFloat(
      (this.container.querySelector('#cr-wall-density') as HTMLSelectElement).value,
    );
    const powerUpDropRate = parseFloat(
      (this.container.querySelector('#cr-powerup-rate') as HTMLSelectElement).value,
    );
    const botCount = parseInt(
      (this.container.querySelector('#cr-bots') as HTMLSelectElement).value,
    );
    const botDifficulty = (this.container.querySelector('#cr-bot-difficulty') as HTMLSelectElement)
      .value as 'easy' | 'normal' | 'hard';
    const botAiSelect = this.container.querySelector('#cr-bot-ai') as HTMLSelectElement | null;
    const mapSize = parseInt(
      (this.container.querySelector('#cr-map-size') as HTMLSelectElement).value,
    );
    const customMapValue = (this.container.querySelector('#cr-custom-map') as HTMLSelectElement)
      .value;
    const customMapId = customMapValue ? parseInt(customMapValue, 10) : undefined;

    const enabledPowerUps: PowerUpType[] = [];
    this.container.querySelectorAll('.powerup-check:checked').forEach((cb: any) => {
      enabledPowerUps.push(cb.value as PowerUpType);
    });

    const roomName = name || this.generateRoomName();
    const effectiveBots = Math.min(botCount, maxPlayers - 1);
    if (effectiveBots < botCount) {
      this.deps.notifications.info(
        `Bot count capped to ${effectiveBots} (max ${maxPlayers} players)`,
      );
    }

    const friendlyFire =
      gameMode === 'teams'
        ? (this.container.querySelector('#cr-friendly-fire') as HTMLInputElement).checked
        : true;
    const reinforcedWalls = (
      this.container.querySelector('#cr-reinforced-walls') as HTMLInputElement
    ).checked;
    const enableMapEvents = (this.container.querySelector('#cr-map-events') as HTMLInputElement)
      .checked;
    const hazardTiles = (this.container.querySelector('#cr-hazard-tiles') as HTMLInputElement)
      .checked;
    const recordGame = this.recordingsEnabled
      ? ((this.container.querySelector('#cr-record-game') as HTMLInputElement)?.checked ?? true)
      : false;

    this.deps.socketClient.emit(
      'room:create',
      {
        name: roomName,
        config: {
          gameMode,
          maxPlayers,
          mapWidth: mapSize,
          mapHeight: mapSize,
          roundTime,
          wallDensity,
          enabledPowerUps,
          powerUpDropRate,
          botCount: effectiveBots,
          botDifficulty: effectiveBots > 0 ? botDifficulty : undefined,
          friendlyFire,
          reinforcedWalls,
          enableMapEvents,
          hazardTiles,
          recordGame,
          botAiId: effectiveBots > 0 && botAiSelect ? botAiSelect.value : undefined,
          customMapId,
        },
      },
      (response: any) => {
        if (response.success && response.room) {
          this.deps.notifications.success('Room created!');
          this.onRoomCreated(response.room);
        } else {
          this.deps.notifications.error(response.error || 'Failed to create room');
        }
      },
    );
  }

  private buildMapOptions(): string {
    const myMapIds = new Set(this.myMaps.map((m) => m.id));
    // Community maps = published maps not created by this user
    const communityMaps = this.publishedMaps.filter((m) => !myMapIds.has(m.id));
    let html = '';
    if (this.myMaps.length > 0) {
      html += '<optgroup label="My Maps">';
      for (const m of this.myMaps) {
        html += `<option value="${m.id}">${m.name} (${m.mapWidth}x${m.mapHeight}, ${m.spawnCount} spawns)</option>`;
      }
      html += '</optgroup>';
    }
    if (communityMaps.length > 0) {
      html += '<optgroup label="Community Maps">';
      for (const m of communityMaps) {
        const by = m.creatorUsername ? ` by ${m.creatorUsername}` : '';
        html += `<option value="${m.id}">${m.name}${by} (${m.mapWidth}x${m.mapHeight}, ${m.spawnCount} spawns)</option>`;
      }
      html += '</optgroup>';
    }
    return html;
  }

  private generateRoomName(): string {
    const adjectives = [
      'Explosive',
      'Chaotic',
      'Blazing',
      'Fiery',
      'Reckless',
      'Volatile',
      'Scorched',
      'Molten',
      'Infernal',
      'Savage',
    ];
    const nouns = [
      'Arena',
      'Warzone',
      'Blitz',
      'Showdown',
      'Brawl',
      'Mayhem',
      'Rumble',
      'Frenzy',
      'Clash',
      'Carnage',
    ];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  }
}
