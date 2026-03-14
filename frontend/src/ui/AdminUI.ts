import { ApiClient } from '../network/ApiClient';
import { NotificationUI } from './NotificationUI';

export class AdminUI {
  private container: HTMLElement;
  private notifications: NotificationUI;
  private onClose: () => void;

  constructor(notifications: NotificationUI, onClose: () => void) {
    this.notifications = notifications;
    this.onClose = onClose;
    this.container = document.createElement('div');
    this.container.className = 'admin-container';
  }

  async show(): Promise<void> {
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay && !uiOverlay.contains(this.container)) {
      uiOverlay.appendChild(this.container);
    }
    await this.render();
  }

  hide(): void {
    this.container.remove();
  }

  private async render(): Promise<void> {
    this.container.innerHTML = `
      <div class="admin-header">
        <h1 style="color:#e94560;">Admin Panel</h1>
        <button class="btn btn-secondary" id="admin-close">Close</button>
      </div>
      <div class="admin-stats" id="admin-stats">Loading...</div>
      <h2 style="margin-bottom:12px;">Users</h2>
      <div id="admin-users">Loading...</div>
    `;

    this.container.querySelector('#admin-close')!.addEventListener('click', () => {
      this.hide();
      this.onClose();
    });

    await this.loadStats();
    await this.loadUsers();
  }

  private async loadStats(): Promise<void> {
    try {
      const stats = await ApiClient.get<any>('/admin/stats');
      const el = this.container.querySelector('#admin-stats')!;
      el.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${stats.totalUsers}</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.activeUsers24h}</div>
          <div class="stat-label">Active (24h)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalMatches}</div>
          <div class="stat-label">Total Matches</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.activeRooms}</div>
          <div class="stat-label">Active Rooms</div>
        </div>
      `;
    } catch (err: any) {
      this.notifications.error('Failed to load stats');
    }
  }

  private async loadUsers(): Promise<void> {
    try {
      const result = await ApiClient.get<any>('/admin/users');
      const el = this.container.querySelector('#admin-users')!;

      el.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Matches</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${result.users.map((u: any) => `
              <tr>
                <td>${this.escapeHtml(u.username)}</td>
                <td>${this.escapeHtml(u.email)}</td>
                <td><span class="badge badge-${u.role}">${u.role}</span></td>
                <td>${u.is_banned ? '<span class="badge badge-banned">Banned</span>' : 'Active'}</td>
                <td>${u.total_matches}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;"
                    onclick="window.__adminBan(${u.id}, ${!u.is_banned})">
                    ${u.is_banned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      (window as any).__adminBan = async (userId: number, ban: boolean) => {
        try {
          await ApiClient.put(`/admin/users/${userId}/ban`, { banned: ban });
          this.notifications.success(ban ? 'User banned' : 'User unbanned');
          await this.loadUsers();
        } catch (err: any) {
          this.notifications.error(err.message);
        }
      };
    } catch (err: any) {
      this.notifications.error('Failed to load users');
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
