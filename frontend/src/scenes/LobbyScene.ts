import Phaser from 'phaser';
import { AuthManager } from '../network/AuthManager';
import { SocketClient } from '../network/SocketClient';
import { NotificationUI } from '../ui/NotificationUI';
import { LobbyUI } from '../ui/LobbyUI';
import { ChatUI } from '../ui/ChatUI';
import { Room } from '@blast-arena/shared';

export class LobbyScene extends Phaser.Scene {
  private authManager!: AuthManager;
  private socketClient!: SocketClient;
  private notifications!: NotificationUI;
  private lobbyUI!: LobbyUI;
  private chatUI!: ChatUI;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create(): void {
    this.authManager = this.registry.get('authManager');
    this.socketClient = this.registry.get('socketClient');
    this.notifications = this.registry.get('notifications');

    // Listen for auth changes
    this.authManager.onChange((user) => {
      if (!user) {
        this.lobbyUI?.hide();
        this.chatUI?.hide();
        this.scene.start('MenuScene');
      }
    });

    this.lobbyUI = new LobbyUI(
      this.socketClient,
      this.authManager,
      this.notifications,
      (room: Room) => this.onJoinRoom(room)
    );
    this.lobbyUI.show();

    // Background
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
  }

  private onJoinRoom(room: Room): void {
    this.chatUI = new ChatUI(this.socketClient);
    this.chatUI.show();

    // Store room data
    this.registry.set('currentRoom', room);

    // Listen for game start
    this.socketClient.on('game:start', (state: any) => {
      this.chatUI?.hide();
      this.registry.set('initialGameState', state);
      this.scene.start('GameScene');
      this.scene.launch('HUDScene');
    });

    // TODO: Show room waiting UI with player list, ready buttons, etc.
    this.notifications.info(`In room: ${room.name} (${room.players.length}/${room.config.maxPlayers})`);
  }

  shutdown(): void {
    this.lobbyUI?.hide();
    this.chatUI?.hide();
  }
}
