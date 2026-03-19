import { ApiClient } from '../../network/ApiClient';
import { NotificationUI } from '../NotificationUI';
import { BotAIEntry, getErrorMessage } from '@blast-arena/shared';
import { escapeHtml } from '../../utils/html';
import { API_URL } from '../../config';

export class AITab {
  private container: HTMLElement | null = null;
  private notifications: NotificationUI;

  constructor(notifications: NotificationUI) {
    this.notifications = notifications;
  }

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div');
    parent.appendChild(this.container);
    await this.loadList();
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }

  private async loadList(): Promise<void> {
    if (!this.container) return;

    let ais: BotAIEntry[] = [];
    try {
      const res = await ApiClient.get<{ ais: BotAIEntry[] }>('/admin/ai');
      ais = res.ais;
    } catch (err: unknown) {
      this.notifications.error(getErrorMessage(err));
    }

    this.container.innerHTML = `
      <div class="admin-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;">Bot AI Management</h3>
          <button class="btn btn-primary" id="ai-upload-btn">Upload New AI</button>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Version</th>
              <th>Uploaded By</th>
              <th>File</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="ai-table-body">
            ${ais.map((ai) => this.renderRow(ai)).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.container.querySelector('#ai-upload-btn')?.addEventListener('click', () => {
      this.showUploadModal();
    });

    this.attachRowHandlers(ais);
  }

  private renderRow(ai: BotAIEntry): string {
    const statusBadge = ai.isActive
      ? '<span style="color:var(--success);font-weight:600;">Active</span>'
      : '<span style="color:var(--text-dim);">Inactive</span>';
    const builtinBadge = ai.isBuiltin
      ? ' <span style="background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text-dim);">Built-in</span>'
      : '';
    const uploadedBy = ai.uploadedBy ? escapeHtml(ai.uploadedBy) : '—';
    const fileSize = ai.fileSize > 0 ? `${(ai.fileSize / 1024).toFixed(1)}KB` : '—';

    return `
      <tr data-ai-id="${escapeHtml(ai.id)}">
        <td>${escapeHtml(ai.name)}${builtinBadge}</td>
        <td style="color:var(--text-dim);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(ai.description || '—')}</td>
        <td>${statusBadge}</td>
        <td>v${ai.version}</td>
        <td>${uploadedBy}</td>
        <td>${escapeHtml(ai.filename)} (${fileSize})</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn-sm btn-secondary ai-toggle" data-id="${escapeHtml(ai.id)}" data-active="${ai.isActive}">${ai.isActive ? 'Deactivate' : 'Activate'}</button>
            <button class="btn-sm btn-secondary ai-download" data-id="${escapeHtml(ai.id)}">Download</button>
            ${!ai.isBuiltin ? `<button class="btn-sm btn-secondary ai-reupload" data-id="${escapeHtml(ai.id)}">Re-upload</button>` : ''}
            ${!ai.isBuiltin ? `<button class="btn-sm btn-secondary ai-edit" data-id="${escapeHtml(ai.id)}">Edit</button>` : ''}
            ${!ai.isBuiltin ? `<button class="btn-sm btn-danger ai-delete" data-id="${escapeHtml(ai.id)}" data-name="${escapeHtml(ai.name)}">Delete</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  private attachRowHandlers(ais: BotAIEntry[]): void {
    if (!this.container) return;

    // Toggle active
    this.container.querySelectorAll('.ai-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const isActive = (btn as HTMLElement).dataset.active === 'true';
        try {
          await ApiClient.put(`/admin/ai/${id}`, { isActive: !isActive });
          this.notifications.success(isActive ? 'AI deactivated' : 'AI activated');
          await this.loadList();
        } catch (err: unknown) {
          this.notifications.error(getErrorMessage(err));
        }
      });
    });

    // Download
    this.container.querySelectorAll('.ai-download').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id!;
        try {
          const response = await fetch(`${API_URL}/admin/ai/${id}/download`, {
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Download failed');
          const blob = await response.blob();
          const disposition = response.headers.get('Content-Disposition');
          const filenameMatch = disposition?.match(/filename="(.+)"/);
          const filename = filenameMatch ? filenameMatch[1] : 'BotAI.ts';
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
        } catch (err: unknown) {
          this.notifications.error(getErrorMessage(err));
        }
      });
    });

    // Re-upload
    this.container.querySelectorAll('.ai-reupload').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        this.showReuploadModal(id);
      });
    });

    // Edit
    this.container.querySelectorAll('.ai-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        const ai = ais.find((a) => a.id === id);
        if (ai) this.showEditModal(ai);
      });
    });

    // Delete
    this.container.querySelectorAll('.ai-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const name = (btn as HTMLElement).dataset.name!;
        this.showDeleteConfirmation(id, name);
      });
    });
  }

  private showUploadModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;';

    overlay.innerHTML = `
      <div class="modal-content" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;width:500px;max-width:90vw;">
        <h3 style="margin:0 0 16px;color:var(--primary);">Upload New Bot AI</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="display:block;margin-bottom:4px;color:var(--text-dim);font-size:13px;">Name *</label>
            <input type="text" id="ai-upload-name" class="admin-input" placeholder="My Custom AI" maxlength="100" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;color:var(--text-dim);font-size:13px;">Description</label>
            <textarea id="ai-upload-desc" class="admin-input" placeholder="Optional description..." maxlength="500" rows="3" style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;color:var(--text-dim);font-size:13px;">TypeScript File (.ts) *</label>
            <input type="file" id="ai-upload-file" accept=".ts" style="color:var(--text);">
          </div>
          <div id="ai-upload-errors" style="display:none;background:var(--bg-deep);border:1px solid var(--danger);border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;"></div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-secondary" id="ai-upload-cancel">Cancel</button>
            <button class="btn btn-primary" id="ai-upload-submit">Upload &amp; Compile</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#ai-upload-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#ai-upload-submit')?.addEventListener('click', async () => {
      const nameInput = overlay.querySelector('#ai-upload-name') as HTMLInputElement;
      const descInput = overlay.querySelector('#ai-upload-desc') as HTMLTextAreaElement;
      const fileInput = overlay.querySelector('#ai-upload-file') as HTMLInputElement;
      const errorsDiv = overlay.querySelector('#ai-upload-errors') as HTMLElement;
      const submitBtn = overlay.querySelector('#ai-upload-submit') as HTMLButtonElement;

      const name = nameInput.value.trim();
      if (!name) {
        this.notifications.error('Name is required');
        return;
      }
      if (!fileInput.files || fileInput.files.length === 0) {
        this.notifications.error('Please select a TypeScript file');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Compiling...';
      errorsDiv.style.display = 'none';

      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', descInput.value.trim());
      formData.append('file', fileInput.files[0]);

      try {
        await ApiClient.postForm<{ ai: BotAIEntry }>('/admin/ai', formData);
        this.notifications.success('AI uploaded and compiled successfully');
        overlay.remove();
        await this.loadList();
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        // Try to parse errors from response
        errorsDiv.style.display = 'block';
        errorsDiv.innerHTML = `
          <p style="color:var(--danger);font-weight:600;margin:0 0 8px;">Compilation/Validation Failed</p>
          <pre style="color:var(--text-dim);margin:0;white-space:pre-wrap;font-size:12px;">${escapeHtml(msg)}</pre>
        `;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload & Compile';
      }
    });
  }

  private showReuploadModal(id: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;';

    overlay.innerHTML = `
      <div class="modal-content" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;width:400px;max-width:90vw;">
        <h3 style="margin:0 0 16px;color:var(--primary);">Re-upload AI Source</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="display:block;margin-bottom:4px;color:var(--text-dim);font-size:13px;">TypeScript File (.ts) *</label>
            <input type="file" id="ai-reupload-file" accept=".ts" style="color:var(--text);">
          </div>
          <div id="ai-reupload-errors" style="display:none;background:var(--bg-deep);border:1px solid var(--danger);border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;"></div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-secondary" id="ai-reupload-cancel">Cancel</button>
            <button class="btn btn-primary" id="ai-reupload-submit">Upload &amp; Compile</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#ai-reupload-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#ai-reupload-submit')?.addEventListener('click', async () => {
      const fileInput = overlay.querySelector('#ai-reupload-file') as HTMLInputElement;
      const errorsDiv = overlay.querySelector('#ai-reupload-errors') as HTMLElement;
      const submitBtn = overlay.querySelector('#ai-reupload-submit') as HTMLButtonElement;

      if (!fileInput.files || fileInput.files.length === 0) {
        this.notifications.error('Please select a TypeScript file');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Compiling...';
      errorsDiv.style.display = 'none';

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);

      try {
        await ApiClient.putForm(`/admin/ai/${id}/upload`, formData);
        this.notifications.success('AI re-uploaded and compiled successfully');
        overlay.remove();
        await this.loadList();
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        errorsDiv.style.display = 'block';
        errorsDiv.innerHTML = `
          <p style="color:var(--danger);font-weight:600;margin:0 0 8px;">Compilation/Validation Failed</p>
          <pre style="color:var(--text-dim);margin:0;white-space:pre-wrap;font-size:12px;">${escapeHtml(msg)}</pre>
        `;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload & Compile';
      }
    });
  }

  private showEditModal(ai: BotAIEntry): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;';

    overlay.innerHTML = `
      <div class="modal-content" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;width:400px;max-width:90vw;">
        <h3 style="margin:0 0 16px;color:var(--primary);">Edit AI</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="display:block;margin-bottom:4px;color:var(--text-dim);font-size:13px;">Name</label>
            <input type="text" id="ai-edit-name" class="admin-input" value="${escapeHtml(ai.name)}" maxlength="100" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;color:var(--text-dim);font-size:13px;">Description</label>
            <textarea id="ai-edit-desc" class="admin-input" maxlength="500" rows="3" style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${escapeHtml(ai.description)}</textarea>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-secondary" id="ai-edit-cancel">Cancel</button>
            <button class="btn btn-primary" id="ai-edit-submit">Save</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#ai-edit-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#ai-edit-submit')?.addEventListener('click', async () => {
      const nameInput = overlay.querySelector('#ai-edit-name') as HTMLInputElement;
      const descInput = overlay.querySelector('#ai-edit-desc') as HTMLTextAreaElement;
      const name = nameInput.value.trim();
      if (!name) {
        this.notifications.error('Name is required');
        return;
      }
      try {
        await ApiClient.put(`/admin/ai/${ai.id}`, {
          name,
          description: descInput.value.trim(),
        });
        this.notifications.success('AI updated');
        overlay.remove();
        await this.loadList();
      } catch (err: unknown) {
        this.notifications.error(getErrorMessage(err));
      }
    });
  }

  private showDeleteConfirmation(id: string, name: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;';

    overlay.innerHTML = `
      <div class="modal-content" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;width:400px;max-width:90vw;">
        <h3 style="margin:0 0 12px;color:var(--danger);">Delete AI</h3>
        <p style="color:var(--text-dim);margin:0 0 12px;">This will permanently delete <strong style="color:var(--text);">${escapeHtml(name)}</strong> and its source files. Active games using this AI will fall back to the built-in default.</p>
        <p style="color:var(--text-dim);margin:0 0 16px;font-size:13px;">Type the AI name to confirm:</p>
        <input type="text" id="ai-delete-confirm" class="admin-input" placeholder="${escapeHtml(name)}" style="width:100%;box-sizing:border-box;margin-bottom:16px;">
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn btn-secondary" id="ai-delete-cancel">Cancel</button>
          <button class="btn btn-danger" id="ai-delete-submit" disabled>Delete</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const confirmInput = overlay.querySelector('#ai-delete-confirm') as HTMLInputElement;
    const deleteBtn = overlay.querySelector('#ai-delete-submit') as HTMLButtonElement;

    confirmInput.addEventListener('input', () => {
      deleteBtn.disabled = confirmInput.value !== name;
    });

    overlay.querySelector('#ai-delete-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    deleteBtn.addEventListener('click', async () => {
      try {
        await ApiClient.delete(`/admin/ai/${id}`);
        this.notifications.success('AI deleted');
        overlay.remove();
        await this.loadList();
      } catch (err: unknown) {
        this.notifications.error(getErrorMessage(err));
      }
    });
  }
}
