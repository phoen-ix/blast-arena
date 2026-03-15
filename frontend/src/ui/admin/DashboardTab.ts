import { ApiClient } from '../../network/ApiClient';
import { NotificationUI } from '../NotificationUI';

export class DashboardTab {
  private container: HTMLElement | null = null;
  private notifications: NotificationUI;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(notifications: NotificationUI) {
    this.notifications = notifications;
  }

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement('div');
    parent.appendChild(this.container);
    await this.loadStats();
    this.refreshInterval = setInterval(() => this.loadStats(), 30000);
  }

  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.container?.remove();
    this.container = null;
  }

  private async loadStats(): Promise<void> {
    if (!this.container) return;
    try {
      const stats = await ApiClient.get<any>('/admin/stats');
      this.container.innerHTML = `
        <div class="admin-stats">
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
          <div class="stat-card">
            <div class="stat-value">${stats.activePlayers}</div>
            <div class="stat-label">Online Players</div>
          </div>
        </div>
      `;
    } catch {
      this.notifications.error('Failed to load stats');
    }
  }
}
