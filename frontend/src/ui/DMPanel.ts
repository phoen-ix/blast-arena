import { SocketClient } from '../network/SocketClient';
import { ApiClient } from '../network/ApiClient';
import { NotificationUI } from './NotificationUI';
import {
  DirectMessage,
  DMConversation,
  ChatMode,
  UserRole,
  DM_MAX_LENGTH,
} from '@blast-arena/shared';
import { escapeHtml } from '../utils/html';

export class DMPanel {
  private container: HTMLElement;
  private socketClient: SocketClient;
  private notifications: NotificationUI;
  private userId: number;
  private userRole: UserRole;
  private isOpen = false;
  private dmMode: ChatMode = 'everyone';

  // View state
  private activeConversation: { userId: number; username: string } | null = null;
  private conversations: DMConversation[] = [];
  private messages: DirectMessage[] = [];
  private loadingConversations = false;
  private loadingMessages = false;

  // Socket handler references for cleanup
  private dmReceiveHandler: (message: DirectMessage) => void;
  private dmReadHandler: (data: { fromUserId: number; readAt: string }) => void;
  private settingsChangedHandler: (data: { key: string; value?: unknown }) => void;

  constructor(
    socketClient: SocketClient,
    notifications: NotificationUI,
    userId: number,
    userRole: UserRole,
  ) {
    this.socketClient = socketClient;
    this.notifications = notifications;
    this.userId = userId;
    this.userRole = userRole;
    this.container = document.createElement('div');
    this.container.className = 'slide-panel dm-panel';

    this.dmReceiveHandler = (message: DirectMessage) => {
      this.handleDMReceive(message);
    };

    this.dmReadHandler = (data: { fromUserId: number; readAt: string }) => {
      this.handleDMRead(data);
    };

    this.settingsChangedHandler = (data: { key: string; value?: unknown }) => {
      if (data.key === 'dm_mode') {
        this.dmMode = data.value as ChatMode;
        this.renderCurrentView();
      }
    };

    this.setupSocketListeners();
    this.loadDMMode();
  }

  private async loadDMMode(): Promise<void> {
    try {
      const resp = await ApiClient.get<{ mode: ChatMode }>('/admin/settings/dm_mode');
      this.dmMode = resp.mode ?? 'everyone';
    } catch {
      // Default to everyone on failure
    }
  }

  private canSend(): boolean {
    if (this.dmMode === 'everyone') return true;
    if (this.dmMode === 'disabled') return false;
    if (this.dmMode === 'admin_only') return this.userRole === 'admin';
    if (this.dmMode === 'staff') return this.userRole === 'admin' || this.userRole === 'moderator';
    return false;
  }

  private setupSocketListeners(): void {
    this.socketClient.on('dm:receive', this.dmReceiveHandler);
    this.socketClient.on('dm:read', this.dmReadHandler);
    this.socketClient.on('admin:settingsChanged', this.settingsChangedHandler);
  }

  private handleDMReceive(message: DirectMessage): void {
    // If viewing the conversation with this sender, append and auto-read
    if (this.activeConversation && message.senderId === this.activeConversation.userId) {
      this.messages.push(message);
      this.renderMessages();
      this.scrollToBottom();
      this.socketClient.emit('dm:read', { fromUserId: message.senderId });
    } else {
      // Update unread count in conversation list
      const conv = this.conversations.find((c) => c.userId === message.senderId);
      if (conv) {
        conv.unreadCount++;
        conv.lastMessage = message.message;
        conv.lastMessageAt = message.createdAt;
      } else {
        // New conversation from unknown sender
        this.conversations.unshift({
          userId: message.senderId,
          username: message.senderUsername,
          lastMessage: message.message,
          lastMessageAt: message.createdAt,
          unreadCount: 1,
        });
      }
      if (!this.activeConversation) {
        this.renderConversationList();
      }
    }
  }

  private handleDMRead(data: { fromUserId: number; readAt: string }): void {
    if (this.activeConversation && this.activeConversation.userId === data.fromUserId) {
      // Mark all sent messages to this user as read
      for (const msg of this.messages) {
        if (msg.senderId === this.userId && msg.recipientId === data.fromUserId && !msg.readAt) {
          msg.readAt = data.readAt;
        }
      }
      this.renderMessages();
    }
  }

  mount(): void {
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay && !uiOverlay.contains(this.container)) {
      uiOverlay.appendChild(this.container);
    }
  }

  unmount(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  destroy(): void {
    this.socketClient.off('dm:receive', this.dmReceiveHandler);
    this.socketClient.off('dm:read', this.dmReadHandler);
    this.socketClient.off('admin:settingsChanged', this.settingsChangedHandler);
    this.container.remove();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  close(): void {
    this.isOpen = false;
    this.container.classList.remove('open');
  }

  openConversation(userId: number, username: string): void {
    this.isOpen = true;
    this.container.classList.add('open');
    this.activeConversation = { userId, username };
    this.messages = [];
    this.renderCurrentView();
    this.loadMessages(userId);
    this.socketClient.emit('dm:read', { fromUserId: userId });
    // Clear unread for this conversation
    const conv = this.conversations.find((c) => c.userId === userId);
    if (conv) conv.unreadCount = 0;
  }

  private open(): void {
    this.isOpen = true;
    this.container.classList.add('open');
    if (!this.activeConversation) {
      this.loadConversations();
    }
    this.renderCurrentView();
  }

  private renderCurrentView(): void {
    if (this.activeConversation) {
      this.renderActiveConversation();
    } else {
      this.renderConversationListView();
    }
  }

  // ── Conversation List View ──

  private async loadConversations(): Promise<void> {
    this.loadingConversations = true;
    this.renderConversationListView();
    try {
      const resp = await ApiClient.get<{ conversations: DMConversation[] }>('/messages');
      this.conversations = resp.conversations;
    } catch {
      this.notifications.error('Failed to load messages');
    }
    this.loadingConversations = false;
    this.renderConversationListView();
  }

  private renderConversationListView(): void {
    this.container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <h3 class="panel-header-title">Messages</h3>
      <button class="panel-header-close">&times;</button>
    `;
    header.querySelector('button')!.addEventListener('click', () => this.close());
    this.container.appendChild(header);

    // List
    const list = document.createElement('div');
    list.className = 'dm-list';

    if (this.loadingConversations) {
      list.innerHTML = '<div class="dm-empty">Loading...</div>';
    } else if (this.conversations.length === 0) {
      list.innerHTML = '<div class="dm-empty">No conversations yet</div>';
    } else {
      this.conversations.forEach((conv) => {
        const item = this.createConversationItem(conv);
        list.appendChild(item);
      });
    }

    this.container.appendChild(list);
  }

  private renderConversationList(): void {
    // Only re-render the list portion if we're in list view
    if (this.activeConversation) return;
    const listEl = this.container.querySelector('[data-dm-list]') as HTMLElement;
    if (!listEl) {
      // Full re-render if structure not found
      this.renderConversationListView();
      return;
    }
    listEl.innerHTML = '';
    this.conversations.forEach((conv) => {
      const item = this.createConversationItem(conv);
      listEl.appendChild(item);
    });
  }

  private createConversationItem(conv: DMConversation): HTMLElement {
    const item = document.createElement('div');
    item.className = 'dm-conv-item';

    const colors = [
      'var(--primary)',
      'var(--info)',
      'var(--success)',
      'var(--warning)',
      '#bb44ff',
      'var(--accent)',
    ];
    const color = colors[conv.userId % colors.length];

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'dm-avatar';
    avatar.style.background = color;
    avatar.textContent = conv.username.charAt(0).toUpperCase();
    item.appendChild(avatar);

    // Info
    const info = document.createElement('div');
    info.className = 'dm-conv-info';

    const nameRow = document.createElement('div');
    nameRow.className = 'dm-conv-name-row';

    const name = document.createElement('span');
    name.className = 'dm-conv-name';
    name.textContent = conv.username;

    const time = document.createElement('span');
    time.className = 'dm-conv-time';
    time.textContent = this.formatTimeAgo(conv.lastMessageAt);

    nameRow.appendChild(name);
    nameRow.appendChild(time);
    info.appendChild(nameRow);

    const preview = document.createElement('div');
    preview.className = 'dm-conv-preview';
    preview.textContent =
      conv.lastMessage.length > 50 ? conv.lastMessage.slice(0, 50) + '...' : conv.lastMessage;
    info.appendChild(preview);

    item.appendChild(info);

    // Unread badge
    if (conv.unreadCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'dm-unread-badge';
      badge.textContent = conv.unreadCount > 99 ? '99+' : String(conv.unreadCount);
      item.appendChild(badge);
    }

    item.addEventListener('click', () => {
      this.openConversation(conv.userId, conv.username);
    });

    return item;
  }

  // ── Active Conversation View ──

  private async loadMessages(userId: number): Promise<void> {
    this.loadingMessages = true;
    this.renderMessages();
    try {
      const resp = await ApiClient.get<{
        messages: DirectMessage[];
        total: number;
        page: number;
        limit: number;
      }>(`/messages/${userId}`);
      // API returns DESC order; reverse to chronological
      this.messages = resp.messages.reverse();
    } catch {
      this.notifications.error('Failed to load messages');
    }
    this.loadingMessages = false;
    this.renderMessages();
    this.scrollToBottom();
  }

  private renderActiveConversation(): void {
    if (!this.activeConversation) return;

    this.container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';

    const backBtn = document.createElement('button');
    backBtn.className = 'dm-panel-back';
    backBtn.innerHTML = '&#8592;';
    backBtn.addEventListener('click', () => {
      this.activeConversation = null;
      this.messages = [];
      this.loadConversations();
    });
    header.appendChild(backBtn);

    const headerName = document.createElement('span');
    headerName.className = 'panel-header-title dm-conv-title';
    headerName.textContent = this.activeConversation.username;
    header.appendChild(headerName);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-header-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    this.container.appendChild(header);

    // Messages area
    const messagesArea = document.createElement('div');
    messagesArea.setAttribute('data-dm-messages', '');
    messagesArea.className = 'dm-messages';
    this.container.appendChild(messagesArea);

    this.renderMessages();

    // Input area (only if allowed to send)
    if (this.canSend()) {
      const inputArea = document.createElement('div');
      inputArea.className = 'dm-input-area';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type a message...';
      input.maxLength = DM_MAX_LENGTH;
      input.className = 'dm-input';

      const sendBtn = document.createElement('button');
      sendBtn.className = 'dm-send-btn';
      sendBtn.textContent = 'Send';

      const sendMessage = () => {
        const text = input.value.trim();
        if (!text || !this.activeConversation) return;

        this.socketClient.emit(
          'dm:send',
          { toUserId: this.activeConversation.userId, message: text },
          (res) => {
            if (res.success && res.message) {
              this.messages.push(res.message);
              this.renderMessages();
              this.scrollToBottom();
              // Update conversation list preview
              const conv = this.conversations.find(
                (c) => c.userId === this.activeConversation?.userId,
              );
              if (conv) {
                conv.lastMessage = text;
                conv.lastMessageAt = res.message.createdAt;
              }
            } else {
              this.notifications.error(res.error || 'Failed to send message');
            }
          },
        );
        input.value = '';
      };

      sendBtn.addEventListener('click', sendMessage);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });

      inputArea.appendChild(input);
      inputArea.appendChild(sendBtn);
      this.container.appendChild(inputArea);

      // Focus input
      requestAnimationFrame(() => input.focus());
    } else if (this.dmMode === 'disabled') {
      const disabledNotice = document.createElement('div');
      disabledNotice.className = 'dm-disabled-notice';
      disabledNotice.textContent = 'Direct messages are disabled';
      this.container.appendChild(disabledNotice);
    }

    this.scrollToBottom();
  }

  private renderMessages(): void {
    const messagesEl = this.container.querySelector('[data-dm-messages]') as HTMLElement;
    if (!messagesEl) return;

    if (this.loadingMessages) {
      messagesEl.innerHTML = '<div class="dm-empty">Loading...</div>';
      return;
    }

    if (this.messages.length === 0) {
      messagesEl.innerHTML = '<div class="dm-empty">No messages yet. Say hello!</div>';
      return;
    }

    messagesEl.innerHTML = this.messages
      .map((msg) => {
        const isSent = msg.senderId === this.userId;
        const direction = isSent ? 'sent' : 'received';
        const timeStr = this.formatMessageTime(msg.createdAt);
        const readIndicator =
          isSent && msg.readAt ? '<span class="dm-msg-read">&#10003;&#10003;</span>' : '';

        return `
          <div class="dm-msg-row ${direction}">
            <div class="dm-msg-bubble">${escapeHtml(msg.message)}</div>
            <div class="dm-msg-time">${timeStr}${readIndicator}</div>
          </div>
        `;
      })
      .join('');
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const messagesEl = this.container.querySelector('[data-dm-messages]') as HTMLElement;
      if (messagesEl) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });
  }

  // ── Formatting Helpers ──

  private formatTimeAgo(isoStr: string): string {
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private formatMessageTime(isoStr: string): string {
    const date = new Date(isoStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`;
  }
}
