import { SocketClient } from '../network/SocketClient';
import { AuthManager } from '../network/AuthManager';
import { ApiClient } from '../network/ApiClient';
import { NotificationUI } from './NotificationUI';
import { RoomListItem, Room } from '@blast-arena/shared';

export class LobbyUI {
  private container: HTMLElement;
  private socketClient: SocketClient;
  private authManager: AuthManager;
  private notifications: NotificationUI;
  private onJoinRoom: (room: Room) => void;

  constructor(
    socketClient: SocketClient,
    authManager: AuthManager,
    notifications: NotificationUI,
    onJoinRoom: (room: Room) => void
  ) {
    this.socketClient = socketClient;
    this.authManager = authManager;
    this.notifications = notifications;
    this.onJoinRoom = onJoinRoom;
    this.container = document.createElement('div');
    this.container.className = 'lobby-container';
  }

  show(): void {
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay && !uiOverlay.contains(this.container)) {
      uiOverlay.appendChild(this.container);
    }
    this.render();
    this.loadRooms();
  }

  hide(): void {
    this.container.remove();
  }

  private render(): void {
    const user = this.authManager.getUser();
    this.container.innerHTML = `
      <div class="lobby-header">
        <h1>BlastArena</h1>
        <div style="display:flex;gap:12px;align-items:center;">
          <span style="color:#a0a0b0;">Welcome, <strong style="color:#fff;">${user?.displayName || user?.username}</strong></span>
          ${user?.role === 'admin' ? '<button class="btn btn-secondary" id="admin-btn">Admin</button>' : ''}
          <button class="btn btn-primary" id="create-room-btn">Create Room</button>
          <button class="btn btn-secondary" id="logout-btn">Logout</button>
        </div>
      </div>
      <div style="margin-bottom:12px;display:flex;gap:12px;align-items:center;">
        <span style="color:#a0a0b0;">Available Rooms</span>
        <button class="btn btn-secondary" id="refresh-btn" style="padding:6px 12px;font-size:12px;">Refresh</button>
      </div>
      <div class="room-list" id="room-list">
        <div style="color:#a0a0b0;text-align:center;padding:40px;">Loading rooms...</div>
      </div>
    `;

    this.container.querySelector('#create-room-btn')!.addEventListener('click', () => this.showCreateRoomModal());
    this.container.querySelector('#refresh-btn')!.addEventListener('click', () => this.loadRooms());
    this.container.querySelector('#logout-btn')!.addEventListener('click', () => {
      this.authManager.logout();
      this.hide();
    });

    const adminBtn = this.container.querySelector('#admin-btn');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        this.notifications.info('Admin panel - coming soon');
      });
    }
  }

  private async loadRooms(): Promise<void> {
    try {
      const rooms = await ApiClient.get<RoomListItem[]>('/lobby/rooms');
      this.renderRooms(rooms);
    } catch (err: any) {
      this.notifications.error('Failed to load rooms: ' + err.message);
    }
  }

  private renderRooms(rooms: RoomListItem[]): void {
    const list = this.container.querySelector('#room-list')!;
    if (rooms.length === 0) {
      list.innerHTML = '<div style="color:#a0a0b0;text-align:center;padding:40px;">No rooms available. Create one!</div>';
      return;
    }

    list.innerHTML = rooms.map(room => `
      <div class="room-card" data-code="${room.code}">
        <h3>${this.escapeHtml(room.name)}</h3>
        <div class="room-info">
          <span>${room.playerCount}/${room.maxPlayers} players</span>
          <span class="room-mode">${room.gameMode.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div class="room-info" style="margin-top:4px;">
          <span>Host: ${this.escapeHtml(room.host)}</span>
          <span>${room.status}</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.room-card').forEach(card => {
      card.addEventListener('click', () => {
        const code = card.getAttribute('data-code')!;
        this.joinRoom(code);
      });
    });
  }

  private async joinRoom(code: string): Promise<void> {
    this.socketClient.emit('room:join', { code }, (response: any) => {
      if (response.success && response.room) {
        this.notifications.success(`Joined room: ${response.room.name}`);
        this.hide();
        this.onJoinRoom(response.room);
      } else {
        this.notifications.error(response.error || 'Failed to join room');
      }
    });
  }

  private showCreateRoomModal(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h2>Create Room</h2>
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
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-create">Create</button>
        </div>
      </div>
    `;

    modal.querySelector('#modal-cancel')!.addEventListener('click', () => modal.remove());
    modal.querySelector('#modal-create')!.addEventListener('click', () => {
      const name = (modal.querySelector('#room-name') as HTMLInputElement).value.trim();
      const gameMode = (modal.querySelector('#room-mode') as HTMLSelectElement).value as any;
      const maxPlayers = parseInt((modal.querySelector('#room-max-players') as HTMLSelectElement).value);

      if (!name || name.length < 3) {
        this.notifications.error('Room name must be at least 3 characters');
        return;
      }

      this.socketClient.emit('room:create', {
        name,
        config: { gameMode, maxPlayers, mapWidth: 15, mapHeight: 13, roundTime: 180 },
      }, (response: any) => {
        if (response.success && response.room) {
          modal.remove();
          this.notifications.success('Room created!');
          this.hide();
          this.onJoinRoom(response.room);
        } else {
          this.notifications.error(response.error || 'Failed to create room');
        }
      });
    });

    document.getElementById('ui-overlay')!.appendChild(modal);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
