import {
  LocalCoopConfig,
  loadLocalCoopConfig,
  saveLocalCoopConfig,
} from '../../game/LocalCoopInput';
import { createControlsSection, createCameraModeSection } from './LocalCoopModal';
import { UIGamepadNavigator } from '../../game/UIGamepadNavigator';
import { PLAYER_COLORS } from '../../scenes/BootScene';
import { ApiClient } from '../../network/ApiClient';
import type { BuddySettings } from '@blast-arena/shared';

const SECTION_HEADING_STYLE = `
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
`;

export interface BuddyLaunchConfig extends LocalCoopConfig {
  buddySettings: BuddySettings;
}

const BUDDY_DEFAULTS: BuddySettings = {
  name: 'Buddy',
  color: '#44aaff',
  size: 0.6,
};

/** Draw a player sprite icon using Canvas2D (matches BootScene's Phaser rendering) */
function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hexColor: string,
): void {
  const r = size * 0.12;
  const pad = size * 0.04;

  // Body darker bottom
  const darkerColor = darkenHex(hexColor, 0.7);
  ctx.fillStyle = darkerColor;
  roundRect(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, r);
  ctx.fill();

  // Body lighter top
  ctx.fillStyle = hexColor;
  roundRect(ctx, x + pad, y + pad, size - pad * 2, size * 0.75, r);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = Math.max(1, size * 0.04);
  roundRect(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, r);
  ctx.stroke();

  // Highlight shine
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  roundRect(ctx, x + size * 0.12, y + size * 0.1, size * 0.22, size * 0.13, size * 0.06);
  ctx.fill();

  // Eyes (white sclera)
  const eyeR = size * 0.1;
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(cx - size * 0.15, cy + size * 0.04, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + size * 0.15, cy + size * 0.04, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#111';
  const pupilR = size * 0.05;
  ctx.beginPath();
  ctx.arc(cx - size * 0.15, cy + size * 0.08, pupilR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + size * 0.15, cy + size * 0.08, pupilR, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function darkenHex(hex: string, factor: number): string {
  const c = hex.replace('#', '');
  const r = Math.round(parseInt(c.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(c.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(c.substring(4, 6), 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function showBuddyModal(
  onStart: (config: BuddyLaunchConfig) => void,
  onCancel: () => void,
): void {
  const config = loadLocalCoopConfig();
  let buddySettings: BuddySettings = { ...BUDDY_DEFAULTS };
  let editingBuddy = false;
  let loading = true;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Buddy Mode');

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      onCancel();
    }
  };
  function closeModal(): void {
    document.removeEventListener('keydown', escHandler);
    UIGamepadNavigator.getInstance().popContext('buddy-modal');
    overlay.remove();
  }

  function hasConflict(): boolean {
    return config.p1Controls === config.p2Controls;
  }

  // Load buddy settings from server
  ApiClient.get<BuddySettings>('/user/buddy-settings')
    .then((settings) => {
      buddySettings = settings;
      loading = false;
      render();
    })
    .catch(() => {
      loading = false;
      render();
    });

  function colorToHex(color: number): string {
    return '#' + color.toString(16).padStart(6, '0');
  }

  function createBuddySummary(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText =
      'border: 1px solid var(--border); border-radius: var(--radius); padding: 16px;';

    const headerRow = document.createElement('div');
    headerRow.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';

    const sectionTitle = document.createElement('div');
    sectionTitle.style.cssText = SECTION_HEADING_STYLE + 'margin-bottom:0;font-size:16px;';
    sectionTitle.textContent = 'Buddy';
    headerRow.appendChild(sectionTitle);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-ghost btn-sm';
    editBtn.textContent = editingBuddy ? 'Done' : 'Edit';
    editBtn.addEventListener('click', () => {
      editingBuddy = !editingBuddy;
      if (!editingBuddy) {
        // Save to server when done editing
        ApiClient.put('/user/buddy-settings', buddySettings).catch(() => {});
      }
      render();
    });
    headerRow.appendChild(editBtn);
    section.appendChild(headerRow);

    if (editingBuddy) {
      section.appendChild(createBuddyEditor());
    } else {
      // Summary with sprite preview
      const summary = document.createElement('div');
      summary.style.cssText =
        'display:flex;align-items:center;gap:14px;font-size:14px;color:var(--text-dim);';

      // Canvas preview: regular player (P1) + buddy side by side
      const previewCanvas = document.createElement('canvas');
      const refSize = 40;
      const buddySize = Math.round(refSize * buddySettings.size);
      const canvasWidth = refSize + 16 + buddySize;
      const canvasHeight = refSize + 4;
      previewCanvas.width = canvasWidth;
      previewCanvas.height = canvasHeight;
      previewCanvas.style.cssText = `width:${canvasWidth}px;height:${canvasHeight}px;flex-shrink:0;`;
      const ctx = previewCanvas.getContext('2d')!;

      // Draw P1 (reference player) — use first PLAYER_COLOR
      const p1Color = `#${PLAYER_COLORS[0].toString(16).padStart(6, '0')}`;
      drawPlayerSprite(ctx, 0, canvasHeight - refSize, refSize, p1Color);

      // Draw buddy at its relative size
      const buddyX = refSize + 16;
      const buddyY = canvasHeight - buddySize;
      drawPlayerSprite(ctx, buddyX, buddyY, buddySize, buddySettings.color);

      summary.appendChild(previewCanvas);

      const textCol = document.createElement('div');
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'font-weight:600;color:var(--text);';
      nameSpan.textContent = buddySettings.name;
      const sizeSpan = document.createElement('span');
      sizeSpan.style.cssText = 'margin-left:6px;';
      sizeSpan.textContent = `${Math.round(buddySettings.size * 100)}% size`;
      textCol.appendChild(nameSpan);
      textCol.appendChild(sizeSpan);
      summary.appendChild(textCol);

      section.appendChild(summary);
    }

    return section;
  }

  function createBuddyEditor(): HTMLElement {
    const editor = document.createElement('div');
    editor.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

    // Name input
    const nameGroup = document.createElement('div');
    const nameLabel = document.createElement('label');
    nameLabel.style.cssText =
      'font-size:13px;color:var(--text-dim);display:block;margin-bottom:4px;';
    nameLabel.textContent = 'Name';
    nameGroup.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.className = 'input';
    nameInput.type = 'text';
    nameInput.maxLength = 20;
    nameInput.value = buddySettings.name;
    nameInput.placeholder = 'Buddy';
    nameInput.style.cssText = 'width:100%;';
    nameInput.addEventListener('input', () => {
      buddySettings.name = nameInput.value || 'Buddy';
    });
    nameGroup.appendChild(nameInput);
    editor.appendChild(nameGroup);

    // Color swatches
    const colorGroup = document.createElement('div');
    const colorLabel = document.createElement('label');
    colorLabel.style.cssText =
      'font-size:13px;color:var(--text-dim);display:block;margin-bottom:4px;';
    colorLabel.textContent = 'Color';
    colorGroup.appendChild(colorLabel);

    const swatches = document.createElement('div');
    swatches.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

    for (const color of PLAYER_COLORS) {
      const hex = colorToHex(color);
      const swatch = document.createElement('div');
      swatch.style.cssText = `
        width:32px;height:32px;border-radius:50%;cursor:pointer;
        background:${hex};
        border:3px solid ${buddySettings.color === hex ? 'var(--text)' : 'transparent'};
        box-shadow:${buddySettings.color === hex ? '0 0 0 2px var(--primary)' : 'none'};
        transition:border-color 0.15s,box-shadow 0.15s;
      `;
      swatch.addEventListener('click', () => {
        buddySettings.color = hex;
        render();
      });
      swatches.appendChild(swatch);
    }
    colorGroup.appendChild(swatches);
    editor.appendChild(colorGroup);

    // Size slider
    const sizeGroup = document.createElement('div');
    const sizeLabel = document.createElement('label');
    sizeLabel.style.cssText =
      'font-size:13px;color:var(--text-dim);display:block;margin-bottom:4px;';
    sizeLabel.textContent = `Size: ${Math.round(buddySettings.size * 100)}%`;
    sizeGroup.appendChild(sizeLabel);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '40';
    slider.max = '80';
    slider.step = '5';
    slider.value = String(Math.round(buddySettings.size * 100));
    slider.style.cssText = 'width:100%;accent-color:var(--primary);';
    // Live preview canvas
    const previewRow = document.createElement('div');
    previewRow.style.cssText =
      'display:flex;align-items:flex-end;gap:8px;justify-content:center;padding:8px 0;';
    const previewLabel = document.createElement('span');
    previewLabel.style.cssText = 'font-size:11px;color:var(--text-muted);margin-bottom:2px;';
    previewLabel.textContent = 'P1';
    previewRow.appendChild(previewLabel);

    const previewCanvas = document.createElement('canvas');
    const refSize = 44;

    function updatePreview(): void {
      const bSize = Math.round(refSize * buddySettings.size);
      const cw = refSize + 20 + bSize;
      const ch = refSize + 4;
      previewCanvas.width = cw;
      previewCanvas.height = ch;
      previewCanvas.style.cssText = `width:${cw}px;height:${ch}px;`;
      const pCtx = previewCanvas.getContext('2d')!;
      pCtx.clearRect(0, 0, cw, ch);
      const p1Color = `#${PLAYER_COLORS[0].toString(16).padStart(6, '0')}`;
      drawPlayerSprite(pCtx, 0, ch - refSize, refSize, p1Color);
      drawPlayerSprite(pCtx, refSize + 20, ch - bSize, bSize, buddySettings.color);
    }
    updatePreview();
    previewRow.appendChild(previewCanvas);

    const buddyLabel = document.createElement('span');
    buddyLabel.style.cssText = 'font-size:11px;color:var(--text-muted);margin-bottom:2px;';
    buddyLabel.textContent = 'Buddy';
    previewRow.appendChild(buddyLabel);

    slider.addEventListener('input', () => {
      buddySettings.size = parseInt(slider.value, 10) / 100;
      sizeLabel.textContent = `Size: ${slider.value}%`;
      updatePreview();
    });
    sizeGroup.appendChild(slider);
    editor.appendChild(sizeGroup);
    editor.appendChild(previewRow);

    return editor;
  }

  function render(): void {
    overlay.innerHTML = '';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';

    const title = document.createElement('h2');
    title.style.cssText = 'margin:0;font-size:20px;';
    title.textContent = 'Buddy Mode';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-ghost btn-sm';
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = 'font-size:18px;padding:4px 8px;';
    closeBtn.addEventListener('click', () => {
      closeModal();
      onCancel();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.cssText = 'display:flex;flex-direction:column;gap:20px;';

    if (loading) {
      const loadingText = document.createElement('div');
      loadingText.style.cssText = 'text-align:center;color:var(--text-dim);padding:20px;';
      loadingText.textContent = 'Loading buddy settings...';
      body.appendChild(loadingText);
    } else {
      // Buddy summary/editor
      body.appendChild(createBuddySummary());

      // Player 1 Controls
      body.appendChild(
        createControlsSection(
          'Player 1 Controls',
          config.p1Controls,
          (preset) => {
            config.p1Controls = preset;
            render();
          },
          config.p2Controls,
        ),
      );

      // Buddy Controls
      body.appendChild(
        createControlsSection(
          'Buddy Controls',
          config.p2Controls,
          (preset) => {
            config.p2Controls = preset;
            render();
          },
          config.p1Controls,
        ),
      );

      // Camera mode
      body.appendChild(
        createCameraModeSection(config.cameraMode, (mode) => {
          config.cameraMode = mode;
          render();
        }),
      );

      // Conflict warning
      if (hasConflict()) {
        const warning = document.createElement('div');
        warning.style.cssText = `
          color: var(--warning);
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          padding: 8px;
          background: rgba(255,180,0,0.1);
          border-radius: var(--radius);
          border: 1px solid rgba(255,180,0,0.3);
        `;
        warning.textContent = 'Player 1 and Buddy cannot use the same controls';
        body.appendChild(warning);
      }
    }

    modal.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText =
      'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border);';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      closeModal();
      onCancel();
    });

    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-primary';
    startBtn.textContent = 'Start';
    startBtn.disabled = hasConflict() || loading;
    if (hasConflict() || loading) {
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
    }
    startBtn.addEventListener('click', () => {
      if (hasConflict() || loading) return;
      saveLocalCoopConfig(config);
      // Save buddy settings to server
      ApiClient.put('/user/buddy-settings', buddySettings).catch(() => {});
      closeModal();
      onStart({ ...config, buddySettings });
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(startBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);

    // Gamepad context
    UIGamepadNavigator.getInstance().pushContext({
      id: 'buddy-modal',
      elements: () => [
        ...overlay.querySelectorAll<HTMLElement>('.option-chip'),
        ...overlay.querySelectorAll<HTMLElement>('.btn'),
        ...overlay.querySelectorAll<HTMLElement>('input,select'),
      ],
      onBack: () => {
        closeModal();
        onCancel();
      },
    });
  }

  document.addEventListener('keydown', escHandler);

  const uiOverlay = document.getElementById('ui-overlay');
  if (uiOverlay) {
    uiOverlay.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }
  render();
}
