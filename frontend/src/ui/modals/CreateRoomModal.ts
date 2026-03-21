import { SocketClient } from '../../network/SocketClient';
import { NotificationUI } from '../NotificationUI';
import {
  PowerUpType,
  POWERUP_DEFINITIONS,
  Room,
  GameDefaults,
  BotAIEntry,
} from '@blast-arena/shared';
import { UIGamepadNavigator } from '../../game/UIGamepadNavigator';

export interface CreateRoomModalDeps {
  socketClient: SocketClient;
  notifications: NotificationUI;
  onRoomCreated: (room: Room) => void;
  generateRoomName: () => string;
  recordingsEnabled?: boolean;
  gameDefaults?: GameDefaults;
  activeAIs?: BotAIEntry[];
}

export function showCreateRoomModal(deps: CreateRoomModalDeps): void {
  const { socketClient, notifications, onRoomCreated, generateRoomName } = deps;
  const allPowerUps = Object.values(POWERUP_DEFINITIONS);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="width:760px;max-width:95vw;">
      <h2>Create Room</h2>

      <div class="form-grid">
        <div class="form-group">
          <label>Room Name</label>
          <input type="text" id="room-name" placeholder="My Arena" maxlength="30">
        </div>
        <div class="form-group">
          <label>Game Mode</label>
          <select id="room-mode">
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
          <select id="room-max-players">
            <option value="2">2</option>
            <option value="4" selected>4</option>
            <option value="6">6</option>
            <option value="8">8</option>
          </select>
        </div>
        <div class="form-group">
          <label>Match Time</label>
          <select id="room-round-time">
            <option value="60">1 min</option>
            <option value="120">2 min</option>
            <option value="180" selected>3 min</option>
            <option value="300">5 min</option>
            <option value="600">10 min</option>
          </select>
        </div>
        <div class="form-group">
          <label>Map Size</label>
          <select id="room-map-size">
            <option value="21">21x21 (Small)</option>
            <option value="31" selected>31x31 (Normal)</option>
            <option value="39">39x39 (Large)</option>
            <option value="51">51x51 (Huge)</option>
            <option value="61">61x61 (Massive)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Wall Density</label>
          <select id="room-wall-density">
            <option value="0.3">Low (30%)</option>
            <option value="0.5">Medium (50%)</option>
            <option value="0.65" selected>High (65%)</option>
            <option value="0.8">Very High (80%)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Power-Up Rate</label>
          <select id="room-powerup-rate">
            <option value="0">None (0%)</option>
            <option value="0.15">Low (15%)</option>
            <option value="0.3" selected>Normal (30%)</option>
            <option value="0.5">High (50%)</option>
            <option value="0.8">Very High (80%)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Bots</label>
          <select id="room-bots">
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
        <div class="form-group" id="bot-difficulty-row">
          <label>Bot Difficulty</label>
          <select id="room-bot-difficulty" disabled>
            <option value="easy">Easy</option>
            <option value="normal" selected>Normal</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        ${
          deps.activeAIs && deps.activeAIs.length > 1
            ? `
        <div class="form-group" id="bot-ai-row">
          <label>Bot AI</label>
          <select id="room-bot-ai" disabled>
            ${deps.activeAIs.map((ai) => `<option value="${ai.id}"${ai.isBuiltin ? ' selected' : ''}>${ai.name}</option>`).join('')}
          </select>
        </div>
        `
            : ''
        }
      </div>

      <div class="option-chips" style="margin-top:var(--sp-3);">
        <span class="settings-title" style="margin-bottom:0;margin-right:var(--sp-1);">Options</span>
        <label class="option-chip">
          <input type="checkbox" id="room-reinforced-walls" style="accent-color:var(--warning);">
          <span style="color:var(--warning);">Reinforced Walls</span>
        </label>
        <label class="option-chip">
          <input type="checkbox" id="room-map-events" style="accent-color:var(--warning);">
          <span style="color:var(--warning);">Map Events</span>
        </label>
        <label class="option-chip">
          <input type="checkbox" id="room-hazard-tiles" style="accent-color:var(--info);">
          <span style="color:var(--info);">Hazard Tiles</span>
        </label>
        ${
          deps.recordingsEnabled
            ? `<label class="option-chip">
          <input type="checkbox" id="room-record-game" checked style="accent-color:var(--accent);">
          <span style="color:var(--accent);">Record Game</span>
        </label>`
            : ''
        }
        <span id="friendly-fire-row" style="display:none;">
          <label class="option-chip">
            <input type="checkbox" id="room-friendly-fire" checked style="accent-color:var(--danger);">
            <span style="color:var(--danger);">Friendly Fire</span>
          </label>
        </span>
      </div>

      <div style="margin-top:var(--sp-3);">
        <div class="settings-title">Power-Ups</div>
        <div class="option-chips">
          ${allPowerUps
            .map(
              (pu) => `
            <label class="option-chip">
              <input type="checkbox" class="powerup-check" value="${pu.type}" checked
                style="accent-color:${pu.color};">
              <span style="color:${pu.color};">${pu.name}</span>
            </label>
          `,
            )
            .join('')}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-create">Create</button>
      </div>
    </div>
  `;

  // Apply admin-configured defaults
  if (deps.gameDefaults) {
    applyGameDefaults(modal, deps.gameDefaults);
  }

  // Show friendly fire option only for teams mode
  const modeSelect = modal.querySelector('#room-mode') as HTMLSelectElement;
  const ffRow = modal.querySelector('#friendly-fire-row') as HTMLElement;
  const updateFFVisibility = () => {
    ffRow.style.display = modeSelect.value === 'teams' ? 'inline' : 'none';
  };
  modeSelect.addEventListener('change', updateFFVisibility);
  updateFFVisibility();

  // Enable bot difficulty only when bots > 0
  const botsSelect = modal.querySelector('#room-bots') as HTMLSelectElement;
  const botDiffSelect = modal.querySelector('#room-bot-difficulty') as HTMLSelectElement;
  const botAiSelect = modal.querySelector('#room-bot-ai') as HTMLSelectElement | null;
  const maxPlayersSelect = modal.querySelector('#room-max-players') as HTMLSelectElement;
  const updateBotDiffEnabled = () => {
    const bots = parseInt(botsSelect.value);
    const hasBots = bots > 0;
    botDiffSelect.disabled = !hasBots;
    botDiffSelect.style.opacity = hasBots ? '1' : '0.4';
    if (botAiSelect) {
      botAiSelect.disabled = !hasBots;
      botAiSelect.style.opacity = hasBots ? '1' : '0.4';
    }
    // Auto-raise max players so bots + 1 host fit
    const needed = bots + 1;
    const currentMax = parseInt(maxPlayersSelect.value);
    if (needed > currentMax) {
      // Find the smallest option >= needed
      const options = Array.from(maxPlayersSelect.options).map((o) => parseInt(o.value));
      const fit = options.find((v) => v >= needed);
      if (fit) {
        maxPlayersSelect.value = String(fit);
      }
    }
  };
  botsSelect.addEventListener('change', updateBotDiffEnabled);
  updateBotDiffEnabled();

  const closeModal = () => {
    UIGamepadNavigator.getInstance().popContext('create-room-modal');
    modal.remove();
  };

  modal.querySelector('#modal-cancel')!.addEventListener('click', closeModal);
  modal.querySelector('#modal-create')!.addEventListener('click', () => {
    const name = (modal.querySelector('#room-name') as HTMLInputElement).value.trim();
    const gameMode = (modal.querySelector('#room-mode') as HTMLSelectElement).value as any;
    const maxPlayers = parseInt(maxPlayersSelect.value);
    const roundTime = parseInt(
      (modal.querySelector('#room-round-time') as HTMLSelectElement).value,
    );
    const wallDensity = parseFloat(
      (modal.querySelector('#room-wall-density') as HTMLSelectElement).value,
    );
    const powerUpDropRate = parseFloat(
      (modal.querySelector('#room-powerup-rate') as HTMLSelectElement).value,
    );
    const botCount = parseInt((modal.querySelector('#room-bots') as HTMLSelectElement).value);
    const botDifficulty = (modal.querySelector('#room-bot-difficulty') as HTMLSelectElement)
      .value as 'easy' | 'normal' | 'hard';

    const enabledPowerUps: PowerUpType[] = [];
    modal.querySelectorAll('.powerup-check:checked').forEach((cb: any) => {
      enabledPowerUps.push(cb.value as PowerUpType);
    });

    const roomName = name || generateRoomName();

    // Cap bots so total (1 host + bots) doesn't exceed maxPlayers
    const effectiveBots = Math.min(botCount, maxPlayers - 1);
    if (effectiveBots < botCount) {
      notifications.info(`Bot count capped to ${effectiveBots} (max ${maxPlayers} players)`);
    }

    const mapSize = parseInt((modal.querySelector('#room-map-size') as HTMLSelectElement).value);
    const friendlyFire =
      gameMode === 'teams'
        ? (modal.querySelector('#room-friendly-fire') as HTMLInputElement).checked
        : true;
    const reinforcedWalls = (modal.querySelector('#room-reinforced-walls') as HTMLInputElement)
      .checked;
    const enableMapEvents = (modal.querySelector('#room-map-events') as HTMLInputElement).checked;
    const hazardTiles = (modal.querySelector('#room-hazard-tiles') as HTMLInputElement).checked;
    const recordGame = deps.recordingsEnabled
      ? ((modal.querySelector('#room-record-game') as HTMLInputElement)?.checked ?? true)
      : false;

    socketClient.emit(
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
        },
      },
      (response: any) => {
        if (response.success && response.room) {
          closeModal();
          notifications.success('Room created!');
          onRoomCreated(response.room);
        } else {
          notifications.error(response.error || 'Failed to create room');
        }
      },
    );
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.getElementById('ui-overlay')!.appendChild(modal);

  UIGamepadNavigator.getInstance().pushContext({
    id: 'create-room-modal',
    elements: () => [
      ...modal.querySelectorAll<HTMLElement>(
        '.form-group input[type="text"], .form-group select:not([disabled])',
      ),
      ...modal.querySelectorAll<HTMLElement>('label:has(input[type="checkbox"])'),
      ...modal.querySelectorAll<HTMLElement>('#modal-cancel, #modal-create'),
    ],
    onBack: closeModal,
  });
}

function applyGameDefaults(modal: HTMLElement, defaults: GameDefaults): void {
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

  setSelect('#room-mode', defaults.gameMode);
  setSelect('#room-max-players', defaults.maxPlayers);
  setSelect('#room-round-time', defaults.roundTime);
  setSelect('#room-map-size', defaults.mapWidth);
  setSelect('#room-wall-density', defaults.wallDensity);
  setSelect('#room-powerup-rate', defaults.powerUpDropRate);
  setSelect('#room-bots', defaults.botCount);
  setSelect('#room-bot-difficulty', defaults.botDifficulty);
  setCheckbox('#room-reinforced-walls', defaults.reinforcedWalls);
  setCheckbox('#room-map-events', defaults.enableMapEvents);
  setCheckbox('#room-hazard-tiles', defaults.hazardTiles);
  setCheckbox('#room-friendly-fire', defaults.friendlyFire);
  setSelect('#room-bot-ai', defaults.botAiId);

  if (defaults.enabledPowerUps) {
    const enabled = new Set(defaults.enabledPowerUps);
    modal.querySelectorAll('.powerup-check').forEach((cb) => {
      const input = cb as HTMLInputElement;
      input.checked = enabled.has(input.value as PowerUpType);
    });
  }
}
