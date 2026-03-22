import { ApiClient } from '../../network/ApiClient';
import { NotificationUI } from '../NotificationUI';
import {
  Achievement,
  Cosmetic,
  AchievementConditionType,
  AchievementRewardType,
  CosmeticType,
  CosmeticRarity,
  CosmeticUnlockType,
  AchievementBundleExportData,
  AchievementImportConflict,
  getErrorMessage,
} from '@blast-arena/shared';
import { escapeHtml, escapeAttr } from '../../utils/html';

const CONDITION_TYPES: AchievementConditionType[] = [
  'cumulative',
  'per_game',
  'mode_specific',
  'campaign',
];

const CONDITION_LABELS: Record<AchievementConditionType, string> = {
  cumulative: 'Cumulative',
  per_game: 'Per Game',
  mode_specific: 'Mode Specific',
  campaign: 'Campaign',
};

const CUMULATIVE_STATS = [
  'total_kills',
  'total_wins',
  'total_matches',
  'total_deaths',
  'total_bombs',
  'total_powerups',
  'total_playtime',
  'win_streak',
  'best_win_streak',
];

const PER_GAME_STATS = [
  'kills',
  'deaths',
  'self_kills',
  'bombs_placed',
  'powerups_collected',
  'survived_seconds',
  'placement',
  'player_count',
  'is_winner',
];

const PER_GAME_OPERATORS = ['>=', '<=', '==', '>'];

const GAME_MODES = ['ffa', 'teams', 'battle_royale', 'sudden_death', 'deathmatch', 'koth'];

const MODE_SPECIFIC_STATS = ['wins', 'matches', 'kills'];

const CAMPAIGN_SUBTYPES = ['total_stars', 'levels_completed'];

const COSMETIC_TYPES: CosmeticType[] = ['color', 'eyes', 'trail', 'bomb_skin'];

const RARITY_OPTIONS: CosmeticRarity[] = ['common', 'rare', 'epic', 'legendary'];

const UNLOCK_TYPES: CosmeticUnlockType[] = ['achievement', 'campaign_stars', 'default'];

const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: 'var(--text-dim)',
  rare: 'var(--info)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--primary)',
};

export class AchievementsTab {
  private container: HTMLElement | null = null;
  private notifications: NotificationUI;
  private currentView: 'achievements' | 'cosmetics' = 'achievements';
  private achievements: Achievement[] = [];
  private cosmetics: Cosmetic[] = [];

  constructor(notifications: NotificationUI) {
    this.notifications = notifications;
    this.container = document.createElement('div');
  }

  async render(parent: HTMLElement): Promise<void> {
    this.container = parent;
    await this.renderView();
  }

  destroy(): void {
    if (this.container) this.container.innerHTML = '';
    this.achievements = [];
    this.cosmetics = [];
  }

  private async renderView(): Promise<void> {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="section-header">
        <h3 class="admin-section-title">Achievements &amp; Cosmetics</h3>
        <div class="btn-group">
          <button class="btn ${this.currentView === 'achievements' ? 'btn-primary' : 'btn-ghost'}" id="ach-view-achievements">Achievements</button>
          <button class="btn ${this.currentView === 'cosmetics' ? 'btn-primary' : 'btn-ghost'}" id="ach-view-cosmetics">Cosmetics</button>
        </div>
      </div>
      <div id="ach-content"></div>
    `;

    this.container.querySelector('#ach-view-achievements')!.addEventListener('click', () => {
      if (this.currentView !== 'achievements') {
        this.currentView = 'achievements';
        this.renderView();
      }
    });
    this.container.querySelector('#ach-view-cosmetics')!.addEventListener('click', () => {
      if (this.currentView !== 'cosmetics') {
        this.currentView = 'cosmetics';
        this.renderView();
      }
    });

    if (this.currentView === 'achievements') {
      await this.loadAchievements();
    } else {
      await this.loadCosmetics();
    }
  }

  // ─── Achievements ────────────────────────────────────────────────────

  private async loadAchievements(): Promise<void> {
    if (!this.container) return;
    const content = this.container.querySelector('#ach-content');
    if (!content) return;

    try {
      const res = await ApiClient.get<{ achievements: Achievement[] }>('/admin/achievements');
      this.achievements = res.achievements;
    } catch (err: unknown) {
      this.notifications.error(getErrorMessage(err));
      this.achievements = [];
    }

    content.innerHTML = `
      <div class="admin-section">
        <div class="section-header">
          <span class="admin-count">${this.achievements.length} achievement${this.achievements.length !== 1 ? 's' : ''}</span>
          <div class="btn-group">
            <button class="btn btn-secondary" id="ach-export-all">Export All</button>
            <button class="btn btn-secondary" id="ach-import">Import</button>
            <button class="btn btn-primary" id="ach-create">Create Achievement</button>
          </div>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Icon</th>
              <th>Name</th>
              <th>Description</th>
              <th>Condition</th>
              <th>Reward</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.achievements.map((a) => this.renderAchievementRow(a)).join('')}
          </tbody>
        </table>
      </div>
    `;

    content.querySelector('#ach-create')?.addEventListener('click', () => {
      this.showAchievementModal();
    });
    content.querySelector('#ach-export-all')?.addEventListener('click', () => {
      this.exportAllAchievements();
    });
    content.querySelector('#ach-import')?.addEventListener('click', () => {
      this.showImportAchievementsModal();
    });
    this.attachAchievementHandlers(content as HTMLElement);
  }

  private renderAchievementRow(a: Achievement): string {
    const statusBadge = a.isActive
      ? '<span class="text-success font-semibold">Active</span>'
      : '<span class="text-dim">Inactive</span>';
    const rewardLabel =
      a.rewardType === 'none'
        ? '<span class="text-dim">None</span>'
        : `<span class="text-accent">${escapeHtml(a.rewardType)}${a.rewardId ? ` #${a.rewardId}` : ''}</span>`;

    return `
      <tr>
        <td class="icon-cell">${escapeHtml(a.icon)}</td>
        <td>${escapeHtml(a.name)}</td>
        <td class="truncate-cell">${escapeHtml(a.description)}</td>
        <td><span class="badge">${escapeHtml(CONDITION_LABELS[a.conditionType] || a.conditionType)}</span></td>
        <td>${rewardLabel}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-sm btn-secondary ach-edit" data-id="${a.id}">Edit</button>
            <button class="btn-sm btn-secondary ach-export" data-id="${a.id}">Export</button>
            <button class="btn-sm btn-danger ach-delete" data-id="${a.id}" data-name="${escapeAttr(a.name)}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }

  private attachAchievementHandlers(container: HTMLElement): void {
    container.querySelectorAll('.ach-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt((btn as HTMLElement).dataset.id!);
        const ach = this.achievements.find((a) => a.id === id);
        if (ach) this.showAchievementModal(ach);
      });
    });

    container.querySelectorAll('.ach-export').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt((btn as HTMLElement).dataset.id!);
        try {
          const data = await ApiClient.get<Record<string, unknown>>(
            `/admin/achievements/${id}/export`,
          );
          this.downloadExport(data, `achievement-${id}.json`);
          this.notifications.success('Achievement exported');
        } catch (err: unknown) {
          this.notifications.error(getErrorMessage(err));
        }
      });
    });

    container.querySelectorAll('.ach-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt((btn as HTMLElement).dataset.id!);
        const name = (btn as HTMLElement).dataset.name!;
        this.confirmDelete('achievement', id, name, async () => {
          await ApiClient.delete(`/admin/achievements/${id}`);
          this.notifications.success('Achievement deleted');
          await this.loadAchievements();
        });
      });
    });
  }

  private showAchievementModal(existing?: Achievement): void {
    const isEdit = !!existing;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', isEdit ? 'Edit Achievement' : 'Create Achievement');

    const condCfg = existing?.conditionConfig || {};
    const currentCondType = existing?.conditionType || 'cumulative';

    overlay.innerHTML = `
      <div class="modal modal-scroll" style="max-width:520px;">
        <h2>${isEdit ? 'Edit' : 'Create'} Achievement</h2>
        <div class="form-stack">
          <div>
            <label class="field-label">Name *</label>
            <input type="text" class="admin-input mt-label" id="am-name" value="${escapeAttr(existing?.name || '')}" placeholder="Achievement name">
          </div>
          <div>
            <label class="field-label">Description *</label>
            <input type="text" class="admin-input mt-label" id="am-desc" value="${escapeAttr(existing?.description || '')}" placeholder="Short description">
          </div>
          <div class="form-row">
            <div>
              <label class="field-label">Icon</label>
              <input type="text" class="admin-input mt-label" id="am-icon" value="${escapeAttr(existing?.icon || '')}" placeholder="Emoji or text">
            </div>
            <div>
              <label class="field-label">Category</label>
              <input type="text" class="admin-input mt-label" id="am-category" value="${escapeAttr(existing?.category || '')}" placeholder="e.g. combat, survival">
            </div>
          </div>
          <div>
            <label class="field-label">Condition Type *</label>
            <select class="admin-select w-full mt-label" id="am-condType">
              ${CONDITION_TYPES.map((t) => `<option value="${t}" ${currentCondType === t ? 'selected' : ''}>${CONDITION_LABELS[t]}</option>`).join('')}
            </select>
          </div>
          <div id="am-cond-fields"></div>
          <div class="form-row">
            <div>
              <label class="field-label">Reward Type</label>
              <select class="admin-select w-full mt-label" id="am-rewardType">
                <option value="none" ${!existing || existing.rewardType === 'none' ? 'selected' : ''}>None</option>
                <option value="cosmetic" ${existing?.rewardType === 'cosmetic' ? 'selected' : ''}>Cosmetic</option>
                <option value="title" ${existing?.rewardType === 'title' ? 'selected' : ''}>Title</option>
              </select>
            </div>
            <div id="am-reward-id-wrap">
              <label class="field-label">Reward Cosmetic ID</label>
              <input type="number" class="admin-input mt-label" id="am-rewardId" value="${existing?.rewardId ?? ''}" placeholder="Cosmetic ID" min="0">
            </div>
          </div>
          <div>
            <label class="field-label">Sort Order</label>
            <input type="number" class="admin-input mt-label" id="am-sortOrder" value="${existing?.sortOrder ?? 0}" min="0">
          </div>
        </div>
        <div id="am-error" class="modal-error"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="am-cancel">Cancel</button>
          <button class="btn btn-primary" id="am-submit">${isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')!.appendChild(overlay);

    const condTypeSelect = overlay.querySelector('#am-condType') as HTMLSelectElement;
    const condFieldsEl = overlay.querySelector('#am-cond-fields') as HTMLElement;
    const rewardTypeSelect = overlay.querySelector('#am-rewardType') as HTMLSelectElement;
    const rewardIdWrap = overlay.querySelector('#am-reward-id-wrap') as HTMLElement;

    const updateCondFields = () => {
      this.renderConditionFields(
        condFieldsEl,
        condTypeSelect.value as AchievementConditionType,
        condCfg,
      );
    };

    const updateRewardVisibility = () => {
      const showId = rewardTypeSelect.value === 'cosmetic';
      rewardIdWrap.style.display = showId ? '' : 'none';
    };

    condTypeSelect.addEventListener('change', updateCondFields);
    rewardTypeSelect.addEventListener('change', updateRewardVisibility);
    updateCondFields();
    updateRewardVisibility();

    overlay.querySelector('#am-cancel')!.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#am-submit')!.addEventListener('click', async () => {
      const name = (overlay.querySelector('#am-name') as HTMLInputElement).value.trim();
      const description = (overlay.querySelector('#am-desc') as HTMLInputElement).value.trim();
      const icon = (overlay.querySelector('#am-icon') as HTMLInputElement).value.trim();
      const category = (overlay.querySelector('#am-category') as HTMLInputElement).value.trim();
      const conditionType = condTypeSelect.value as AchievementConditionType;
      const rewardType = rewardTypeSelect.value as AchievementRewardType;
      const rewardIdVal = (overlay.querySelector('#am-rewardId') as HTMLInputElement).value;
      const rewardId = rewardType === 'cosmetic' && rewardIdVal ? parseInt(rewardIdVal) : null;
      const sortOrder =
        parseInt((overlay.querySelector('#am-sortOrder') as HTMLInputElement).value) || 0;
      const errorEl = overlay.querySelector('#am-error') as HTMLElement;

      if (!name || !description) {
        errorEl.textContent = 'Name and description are required';
        errorEl.style.display = 'block';
        return;
      }

      const conditionConfig = this.readConditionConfig(overlay, conditionType);

      const payload = {
        name,
        description,
        icon,
        category,
        conditionType,
        conditionConfig,
        rewardType,
        rewardId,
        sortOrder,
      };

      try {
        if (isEdit) {
          await ApiClient.put(`/admin/achievements/${existing!.id}`, payload);
          this.notifications.success('Achievement updated');
        } else {
          await ApiClient.post('/admin/achievements', payload);
          this.notifications.success('Achievement created');
        }
        overlay.remove();
        await this.loadAchievements();
      } catch (err: unknown) {
        errorEl.textContent = getErrorMessage(err);
        errorEl.style.display = 'block';
      }
    });
  }

  private renderConditionFields(
    container: HTMLElement,
    type: AchievementConditionType,
    cfg: Record<string, unknown>,
  ): void {
    if (type === 'cumulative') {
      container.innerHTML = `
        <div class="form-row">
          <div>
            <label class="field-label">Stat</label>
            <select class="admin-select w-full mt-label" id="am-cond-stat">
              ${CUMULATIVE_STATS.map((s) => `<option value="${s}" ${cfg.stat === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-label">Threshold</label>
            <input type="number" class="admin-input mt-label" id="am-cond-threshold" value="${cfg.threshold ?? 1}" min="1">
          </div>
        </div>
      `;
    } else if (type === 'per_game') {
      container.innerHTML = `
        <div class="form-row">
          <div>
            <label class="field-label">Stat</label>
            <select class="admin-select w-full mt-label" id="am-cond-stat">
              ${PER_GAME_STATS.map((s) => `<option value="${s}" ${cfg.stat === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-row-half">
            <label class="field-label">Operator</label>
            <select class="admin-select w-full mt-label" id="am-cond-operator">
              ${PER_GAME_OPERATORS.map((o) => `<option value="${escapeAttr(o)}" ${cfg.operator === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
            </select>
          </div>
          <div class="form-row-half">
            <label class="field-label">Threshold</label>
            <input type="number" class="admin-input mt-label" id="am-cond-threshold" value="${cfg.threshold ?? 1}" min="0">
          </div>
        </div>
      `;
    } else if (type === 'mode_specific') {
      container.innerHTML = `
        <div class="form-row">
          <div>
            <label class="field-label">Game Mode</label>
            <select class="admin-select w-full mt-label" id="am-cond-mode">
              ${GAME_MODES.map((m) => `<option value="${m}" ${cfg.mode === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-label">Stat</label>
            <select class="admin-select w-full mt-label" id="am-cond-stat">
              ${MODE_SPECIFIC_STATS.map((s) => `<option value="${s}" ${cfg.stat === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-row-half">
            <label class="field-label">Threshold</label>
            <input type="number" class="admin-input mt-label" id="am-cond-threshold" value="${cfg.threshold ?? 1}" min="1">
          </div>
        </div>
      `;
    } else if (type === 'campaign') {
      container.innerHTML = `
        <div class="form-row">
          <div>
            <label class="field-label">Sub-Type</label>
            <select class="admin-select w-full mt-label" id="am-cond-subType">
              ${CAMPAIGN_SUBTYPES.map((s) => `<option value="${s}" ${cfg.subType === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-label">Threshold</label>
            <input type="number" class="admin-input mt-label" id="am-cond-threshold" value="${cfg.threshold ?? 1}" min="1">
          </div>
        </div>
      `;
    }
  }

  private readConditionConfig(
    overlay: HTMLElement,
    type: AchievementConditionType,
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const stat = (overlay.querySelector('#am-cond-stat') as HTMLSelectElement)?.value;
    const threshold = parseInt(
      (overlay.querySelector('#am-cond-threshold') as HTMLInputElement)?.value || '1',
    );

    if (type === 'cumulative') {
      config.stat = stat;
      config.threshold = threshold;
    } else if (type === 'per_game') {
      config.stat = stat;
      config.operator =
        (overlay.querySelector('#am-cond-operator') as HTMLSelectElement)?.value || '>=';
      config.threshold = threshold;
    } else if (type === 'mode_specific') {
      config.mode = (overlay.querySelector('#am-cond-mode') as HTMLSelectElement)?.value;
      config.stat = stat;
      config.threshold = threshold;
    } else if (type === 'campaign') {
      config.subType = (overlay.querySelector('#am-cond-subType') as HTMLSelectElement)?.value;
      config.threshold = threshold;
    }

    return config;
  }

  // ─── Cosmetics ───────────────────────────────────────────────────────

  private async loadCosmetics(): Promise<void> {
    if (!this.container) return;
    const content = this.container.querySelector('#ach-content');
    if (!content) return;

    try {
      const res = await ApiClient.get<{ cosmetics: Cosmetic[] }>('/admin/cosmetics');
      this.cosmetics = res.cosmetics;
    } catch (err: unknown) {
      this.notifications.error(getErrorMessage(err));
      this.cosmetics = [];
    }

    content.innerHTML = `
      <div class="admin-section">
        <div class="section-header">
          <span class="admin-count">${this.cosmetics.length} cosmetic${this.cosmetics.length !== 1 ? 's' : ''}</span>
          <div class="btn-group">
            <button class="btn btn-secondary" id="cos-import">Import</button>
            <button class="btn btn-primary" id="cos-create">Create Cosmetic</button>
          </div>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Rarity</th>
              <th>Unlock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.cosmetics.map((c) => this.renderCosmeticRow(c)).join('')}
          </tbody>
        </table>
      </div>
    `;

    content.querySelector('#cos-create')?.addEventListener('click', () => {
      this.showCosmeticModal();
    });
    content.querySelector('#cos-import')?.addEventListener('click', () => {
      this.importCosmetic();
    });
    this.attachCosmeticHandlers(content as HTMLElement);
  }

  private renderCosmeticRow(c: Cosmetic): string {
    const statusBadge = c.isActive
      ? '<span class="text-success font-semibold">Active</span>'
      : '<span class="text-dim">Inactive</span>';
    const rarityColor = RARITY_COLORS[c.rarity] || 'var(--text)';

    return `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td><span class="badge">${escapeHtml(c.type)}</span></td>
        <td><span class="font-semibold" style="color:${rarityColor};">${escapeHtml(c.rarity)}</span></td>
        <td class="text-dim">${escapeHtml(c.unlockType)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-sm btn-secondary cos-edit" data-id="${c.id}">Edit</button>
            <button class="btn-sm btn-secondary cos-export" data-id="${c.id}">Export</button>
            <button class="btn-sm btn-danger cos-delete" data-id="${c.id}" data-name="${escapeAttr(c.name)}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }

  private attachCosmeticHandlers(container: HTMLElement): void {
    container.querySelectorAll('.cos-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt((btn as HTMLElement).dataset.id!);
        const cos = this.cosmetics.find((c) => c.id === id);
        if (cos) this.showCosmeticModal(cos);
      });
    });

    container.querySelectorAll('.cos-export').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt((btn as HTMLElement).dataset.id!);
        try {
          const data = await ApiClient.get<Record<string, unknown>>(
            `/admin/cosmetics/${id}/export`,
          );
          this.downloadExport(data, `cosmetic-${id}.json`);
          this.notifications.success('Cosmetic exported');
        } catch (err: unknown) {
          this.notifications.error(getErrorMessage(err));
        }
      });
    });

    container.querySelectorAll('.cos-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt((btn as HTMLElement).dataset.id!);
        const name = (btn as HTMLElement).dataset.name!;
        this.confirmDelete('cosmetic', id, name, async () => {
          await ApiClient.delete(`/admin/cosmetics/${id}`);
          this.notifications.success('Cosmetic deleted');
          await this.loadCosmetics();
        });
      });
    });
  }

  private showCosmeticModal(existing?: Cosmetic): void {
    const isEdit = !!existing;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', isEdit ? 'Edit Cosmetic' : 'Create Cosmetic');

    const currentType = existing?.type || 'color';
    const cfg = existing?.config || {};

    overlay.innerHTML = `
      <div class="modal modal-scroll" style="max-width:520px;">
        <h2>${isEdit ? 'Edit' : 'Create'} Cosmetic</h2>
        <div class="form-stack">
          <div>
            <label class="field-label">Name *</label>
            <input type="text" class="admin-input mt-label" id="cm-name" value="${escapeAttr(existing?.name || '')}" placeholder="Cosmetic name">
          </div>
          <div class="form-row">
            <div>
              <label class="field-label">Type *</label>
              <select class="admin-select w-full mt-label" id="cm-type">
                ${COSMETIC_TYPES.map((t) => `<option value="${t}" ${currentType === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="field-label">Rarity</label>
              <select class="admin-select w-full mt-label" id="cm-rarity">
                ${RARITY_OPTIONS.map((r) => `<option value="${r}" ${existing?.rarity === r ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="cm-config-fields"></div>
          <div class="form-row">
            <div>
              <label class="field-label">Unlock Type</label>
              <select class="admin-select w-full mt-label" id="cm-unlockType">
                ${UNLOCK_TYPES.map((u) => `<option value="${u}" ${existing?.unlockType === u ? 'selected' : ''}>${u}</option>`).join('')}
              </select>
            </div>
            <div id="cm-unlock-req-wrap">
              <label class="field-label">Unlock Requirement</label>
              <textarea class="admin-input admin-textarea-mono" id="cm-unlockReq" rows="2" placeholder='{"threshold": 50}'>${existing?.unlockRequirement ? JSON.stringify(existing.unlockRequirement, null, 2) : ''}</textarea>
            </div>
          </div>
          <div>
            <label class="field-label">Sort Order</label>
            <input type="number" class="admin-input mt-label" id="cm-sortOrder" value="${existing?.sortOrder ?? 0}" min="0">
          </div>
        </div>
        <div id="cm-error" class="modal-error"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cm-cancel">Cancel</button>
          <button class="btn btn-primary" id="cm-submit">${isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')!.appendChild(overlay);

    const typeSelect = overlay.querySelector('#cm-type') as HTMLSelectElement;
    const configFieldsEl = overlay.querySelector('#cm-config-fields') as HTMLElement;
    const unlockTypeSelect = overlay.querySelector('#cm-unlockType') as HTMLSelectElement;
    const unlockReqWrap = overlay.querySelector('#cm-unlock-req-wrap') as HTMLElement;

    const updateConfigFields = () => {
      this.renderCosmeticConfigFields(configFieldsEl, typeSelect.value as CosmeticType, cfg);
    };

    const updateUnlockReqVisibility = () => {
      const show = unlockTypeSelect.value !== 'default';
      unlockReqWrap.style.display = show ? '' : 'none';
    };

    typeSelect.addEventListener('change', updateConfigFields);
    unlockTypeSelect.addEventListener('change', updateUnlockReqVisibility);
    updateConfigFields();
    updateUnlockReqVisibility();

    overlay.querySelector('#cm-cancel')!.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#cm-submit')!.addEventListener('click', async () => {
      const name = (overlay.querySelector('#cm-name') as HTMLInputElement).value.trim();
      const type = typeSelect.value as CosmeticType;
      const rarity = (overlay.querySelector('#cm-rarity') as HTMLSelectElement)
        .value as CosmeticRarity;
      const unlockType = unlockTypeSelect.value as CosmeticUnlockType;
      const sortOrder =
        parseInt((overlay.querySelector('#cm-sortOrder') as HTMLInputElement).value) || 0;
      const errorEl = overlay.querySelector('#cm-error') as HTMLElement;

      if (!name) {
        errorEl.textContent = 'Name is required';
        errorEl.style.display = 'block';
        return;
      }

      const config = this.readCosmeticConfig(overlay, type);
      if (config === null) {
        errorEl.textContent = 'Invalid config values';
        errorEl.style.display = 'block';
        return;
      }

      let unlockRequirement: Record<string, unknown> | null = null;
      if (unlockType !== 'default') {
        const reqStr = (overlay.querySelector('#cm-unlockReq') as HTMLTextAreaElement).value.trim();
        if (reqStr) {
          try {
            unlockRequirement = JSON.parse(reqStr);
          } catch {
            errorEl.textContent = 'Unlock requirement must be valid JSON';
            errorEl.style.display = 'block';
            return;
          }
        }
      }

      const payload = {
        name,
        type,
        config,
        rarity,
        unlockType,
        unlockRequirement,
        sortOrder,
      };

      try {
        if (isEdit) {
          await ApiClient.put(`/admin/cosmetics/${existing!.id}`, payload);
          this.notifications.success('Cosmetic updated');
        } else {
          await ApiClient.post('/admin/cosmetics', payload);
          this.notifications.success('Cosmetic created');
        }
        overlay.remove();
        await this.loadCosmetics();
      } catch (err: unknown) {
        errorEl.textContent = getErrorMessage(err);
        errorEl.style.display = 'block';
      }
    });
  }

  private renderCosmeticConfigFields(
    container: HTMLElement,
    type: CosmeticType,
    cfg: Record<string, unknown>,
  ): void {
    if (type === 'color') {
      const hex = typeof cfg.hex === 'string' ? cfg.hex : '#ff6b35';
      container.innerHTML = `
        <div>
          <label class="field-label">Hex Color</label>
          <div class="color-picker-row">
            <input type="color" id="cm-cfg-hex" value="${escapeAttr(hex)}" class="color-picker-swatch">
            <input type="text" class="admin-input flex-1" id="cm-cfg-hex-text" value="${escapeAttr(hex)}" placeholder="#ff6b35">
          </div>
        </div>
      `;
      const colorPicker = container.querySelector('#cm-cfg-hex') as HTMLInputElement;
      const colorText = container.querySelector('#cm-cfg-hex-text') as HTMLInputElement;
      colorPicker.addEventListener('input', () => {
        colorText.value = colorPicker.value;
      });
      colorText.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) {
          colorPicker.value = colorText.value;
        }
      });
    } else if (type === 'eyes') {
      const style = typeof cfg.style === 'string' ? cfg.style : 'round';
      container.innerHTML = `
        <div>
          <label class="field-label">Eye Style</label>
          <input type="text" class="admin-input mt-label" id="cm-cfg-style" value="${escapeAttr(style)}" placeholder="e.g. round, angry, cute">
        </div>
      `;
    } else if (type === 'trail') {
      container.innerHTML = `
        <div class="form-row">
          <div>
            <label class="field-label">Particle Key</label>
            <input type="text" class="admin-input mt-label" id="cm-cfg-particleKey" value="${escapeAttr(String(cfg.particleKey || 'particle_fire'))}" placeholder="particle_fire">
          </div>
          <div>
            <label class="field-label">Tint (hex number)</label>
            <input type="text" class="admin-input mt-label" id="cm-cfg-tint" value="${cfg.tint != null ? '0x' + (Number(cfg.tint) >>> 0).toString(16).padStart(6, '0') : '0xff6b35'}" placeholder="0xff6b35">
          </div>
        </div>
        <div>
          <label class="field-label">Frequency</label>
          <input type="number" class="admin-input mt-label" id="cm-cfg-frequency" value="${cfg.frequency ?? 100}" min="1" max="1000">
        </div>
      `;
    } else if (type === 'bomb_skin') {
      container.innerHTML = `
        <div class="form-row">
          <div>
            <label class="field-label">Base Color (hex number)</label>
            <input type="text" class="admin-input mt-label" id="cm-cfg-baseColor" value="${cfg.baseColor != null ? '0x' + (Number(cfg.baseColor) >>> 0).toString(16).padStart(6, '0') : '0x333333'}" placeholder="0x333333">
          </div>
          <div>
            <label class="field-label">Fuse Color (hex number)</label>
            <input type="text" class="admin-input mt-label" id="cm-cfg-fuseColor" value="${cfg.fuseColor != null ? '0x' + (Number(cfg.fuseColor) >>> 0).toString(16).padStart(6, '0') : '0xff4400'}" placeholder="0xff4400">
          </div>
        </div>
        <div>
          <label class="field-label">Label</label>
          <input type="text" class="admin-input mt-label" id="cm-cfg-label" value="${escapeAttr(String(cfg.label || ''))}" placeholder="Short label">
        </div>
      `;
    }
  }

  private readCosmeticConfig(
    overlay: HTMLElement,
    type: CosmeticType,
  ): Record<string, unknown> | null {
    if (type === 'color') {
      const hex = (overlay.querySelector('#cm-cfg-hex-text') as HTMLInputElement)?.value.trim();
      if (!hex) return null;
      return { hex };
    } else if (type === 'eyes') {
      const style = (overlay.querySelector('#cm-cfg-style') as HTMLInputElement)?.value.trim();
      if (!style) return null;
      return { style };
    } else if (type === 'trail') {
      const particleKey = (
        overlay.querySelector('#cm-cfg-particleKey') as HTMLInputElement
      )?.value.trim();
      const tintStr = (overlay.querySelector('#cm-cfg-tint') as HTMLInputElement)?.value.trim();
      const frequency = parseInt(
        (overlay.querySelector('#cm-cfg-frequency') as HTMLInputElement)?.value || '100',
      );
      const tint = parseInt(tintStr, 16) || parseInt(tintStr) || 0;
      if (!particleKey) return null;
      return { particleKey, tint, frequency };
    } else if (type === 'bomb_skin') {
      const baseStr = (
        overlay.querySelector('#cm-cfg-baseColor') as HTMLInputElement
      )?.value.trim();
      const fuseStr = (
        overlay.querySelector('#cm-cfg-fuseColor') as HTMLInputElement
      )?.value.trim();
      const label = (overlay.querySelector('#cm-cfg-label') as HTMLInputElement)?.value.trim();
      const baseColor = parseInt(baseStr, 16) || parseInt(baseStr) || 0;
      const fuseColor = parseInt(fuseStr, 16) || parseInt(fuseStr) || 0;
      return { baseColor, fuseColor, label: label || '' };
    }
    return {};
  }

  // ─── Export/Import ─────────────────────────────────────────────────

  private downloadExport(data: unknown, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async exportAllAchievements(): Promise<void> {
    try {
      const data = await ApiClient.get<AchievementBundleExportData>(
        '/admin/achievements/export-all',
      );
      this.downloadExport(data, 'achievements-bundle.json');
      this.notifications.success('Achievement bundle exported');
    } catch (err: unknown) {
      this.notifications.error(getErrorMessage(err));
    }
  }

  private showImportAchievementsModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Import Achievements');

    overlay.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <h2>Import Achievements</h2>
        <p class="modal-desc">
          Select a JSON file (single achievement or achievement bundle).
        </p>
        <input type="file" accept=".json" id="ach-import-file" class="file-input">
        <div id="ach-import-error" class="modal-error" style="margin-bottom:8px;"></div>
        <div id="ach-import-preview" class="import-preview"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="ach-import-cancel">Cancel</button>
          <button class="btn btn-primary" id="ach-import-submit" disabled>Import</button>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')!.appendChild(overlay);

    const fileInput = overlay.querySelector('#ach-import-file') as HTMLInputElement;
    const errorEl = overlay.querySelector('#ach-import-error') as HTMLElement;
    const previewEl = overlay.querySelector('#ach-import-preview') as HTMLElement;
    const submitBtn = overlay.querySelector('#ach-import-submit') as HTMLButtonElement;

    let parsedData: AchievementBundleExportData | null = null;

    fileInput.addEventListener('change', async () => {
      errorEl.style.display = 'none';
      previewEl.style.display = 'none';
      submitBtn.disabled = true;
      parsedData = null;

      const file = fileInput.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (json._format === 'blast-arena-achievement-bundle') {
          parsedData = json;
          previewEl.innerHTML = `<span class="text-accent">Bundle: ${json.achievements?.length || 0} achievements, ${json.cosmetics?.length || 0} cosmetics</span>`;
        } else if (json._format === 'blast-arena-achievement') {
          // Wrap single achievement into bundle format
          parsedData = {
            _format: 'blast-arena-achievement-bundle',
            _version: 1,
            achievements: [
              {
                name: json.name,
                description: json.description,
                icon: json.icon,
                category: json.category,
                conditionType: json.conditionType,
                conditionConfig: json.conditionConfig,
                rewardType: json.rewardType,
                reward: json.reward,
                sortOrder: json.sortOrder,
              },
            ],
            cosmetics: json.reward
              ? [
                  {
                    originalId: 0,
                    data: json.reward,
                  },
                ]
              : [],
          };
          previewEl.innerHTML = `<span class="text-accent">Single achievement: ${escapeHtml(json.name)}</span>`;
        } else {
          errorEl.textContent =
            'Invalid file format. Expected blast-arena-achievement or blast-arena-achievement-bundle.';
          errorEl.style.display = 'block';
          return;
        }

        previewEl.style.display = 'block';
        submitBtn.disabled = false;
      } catch {
        errorEl.textContent = 'Invalid JSON file';
        errorEl.style.display = 'block';
      }
    });

    overlay.querySelector('#ach-import-cancel')!.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    submitBtn.addEventListener('click', async () => {
      if (!parsedData) return;
      submitBtn.disabled = true;

      try {
        // Phase 1: check for conflicts
        const result = await ApiClient.post<{
          conflicts?: AchievementImportConflict[];
          message?: string;
          created?: number;
        }>('/admin/achievements/import', {
          achievements: parsedData.achievements,
          cosmetics: parsedData.cosmetics,
        });

        if (result.conflicts && result.conflicts.length > 0) {
          overlay.remove();
          this.showCosmeticConflictModal(result.conflicts, parsedData);
        } else {
          // No conflicts, or no cosmetics — all imported directly
          overlay.remove();
          this.notifications.success(result.message || 'Achievements imported');
          await this.loadAchievements();
        }
      } catch (err: unknown) {
        errorEl.textContent = getErrorMessage(err);
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
      }
    });
  }

  private showCosmeticConflictModal(
    conflicts: AchievementImportConflict[],
    bundleData: AchievementBundleExportData,
  ): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Resolve Cosmetic Conflicts');

    const rows = conflicts
      .map((c, i) => {
        const existingInfo = c.existingId
          ? `<span class="text-accent">Existing: "${escapeHtml(c.existingName || '')}" (ID ${c.existingId})</span>`
          : '<span class="text-dim">No existing match</span>';

        return `
        <div class="conflict-card">
          <div class="conflict-card-name">${escapeHtml(c.cosmeticName)}</div>
          <div class="conflict-card-info">${existingInfo}</div>
          <div class="conflict-card-options">
            <label>
              <input type="radio" name="conflict-${i}" value="create" checked> Create new
            </label>
            ${
              c.existingId
                ? `<label>
              <input type="radio" name="conflict-${i}" value="${c.existingId}"> Use existing
            </label>`
                : ''
            }
            <label>
              <input type="radio" name="conflict-${i}" value="skip"> Skip (no reward)
            </label>
          </div>
        </div>
      `;
      })
      .join('');

    overlay.innerHTML = `
      <div class="modal modal-scroll" style="max-width:560px;">
        <h2>Resolve Cosmetic Conflicts</h2>
        <p class="modal-desc" style="margin-bottom:16px;">
          The following cosmetics are referenced by achievements in the import. Choose how to handle each:
        </p>
        ${rows}
        <div class="modal-actions">
          <button class="btn btn-secondary" id="conflict-cancel">Cancel</button>
          <button class="btn btn-primary" id="conflict-submit">Import</button>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')!.appendChild(overlay);

    overlay.querySelector('#conflict-cancel')!.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#conflict-submit')!.addEventListener('click', async () => {
      const cosmeticIdMap: Record<string, 'create' | 'skip' | number> = {};
      conflicts.forEach((c, i) => {
        const selected = (
          overlay.querySelector(`input[name="conflict-${i}"]:checked`) as HTMLInputElement
        )?.value;
        if (selected === 'create') {
          cosmeticIdMap[String(c.originalCosmeticId)] = 'create';
        } else if (selected === 'skip') {
          cosmeticIdMap[String(c.originalCosmeticId)] = 'skip';
        } else {
          cosmeticIdMap[String(c.originalCosmeticId)] = parseInt(selected || '0');
        }
      });

      try {
        const result = await ApiClient.post<{ message: string; created: number }>(
          '/admin/achievements/import',
          {
            achievements: bundleData.achievements,
            cosmetics: bundleData.cosmetics,
            cosmeticIdMap,
          },
        );
        overlay.remove();
        this.notifications.success(result.message);
        await this.loadAchievements();
      } catch (err: unknown) {
        this.notifications.error(getErrorMessage(err));
      }
    });
  }

  private importCosmetic(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (json._format && json._format !== 'blast-arena-cosmetic') {
          this.notifications.error('Invalid file format. Expected blast-arena-cosmetic.');
          return;
        }

        await ApiClient.post('/admin/cosmetics/import', json);
        this.notifications.success('Cosmetic imported');
        await this.loadCosmetics();
      } catch (err: unknown) {
        this.notifications.error(getErrorMessage(err));
      }
    });
    input.click();
  }

  // ─── Shared utilities ────────────────────────────────────────────────

  private confirmDelete(
    entity: string,
    id: number,
    name: string,
    onConfirm: () => Promise<void>,
  ): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Delete ${entity}`);

    overlay.innerHTML = `
      <div class="modal" style="max-width:420px;">
        <h2 class="text-danger">Delete ${escapeHtml(entity)}</h2>
        <p class="modal-desc" style="font-size:14px;">This will permanently delete <strong>${escapeHtml(name)}</strong>. This action cannot be undone.</p>
        <p class="modal-hint">Type the name to confirm:</p>
        <input type="text" class="admin-input mt-label" id="del-confirm-input" placeholder="${escapeAttr(name)}" aria-label="Type name to confirm deletion">
        <div class="modal-actions">
          <button class="btn btn-secondary" id="del-cancel">Cancel</button>
          <button class="btn-danger btn-confirm" id="del-confirm" style="opacity:0.5;" disabled>Delete</button>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay')!.appendChild(overlay);

    const input = overlay.querySelector('#del-confirm-input') as HTMLInputElement;
    const confirmBtn = overlay.querySelector('#del-confirm') as HTMLButtonElement;

    input.addEventListener('input', () => {
      const matches = input.value === name;
      confirmBtn.disabled = !matches;
      confirmBtn.style.opacity = matches ? '1' : '0.5';
    });

    overlay.querySelector('#del-cancel')!.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    confirmBtn.addEventListener('click', async () => {
      overlay.remove();
      try {
        await onConfirm();
      } catch (err: unknown) {
        this.notifications.error(getErrorMessage(err));
      }
    });
  }
}
