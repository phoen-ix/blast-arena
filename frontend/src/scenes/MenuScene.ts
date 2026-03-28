import Phaser from 'phaser';
import { AuthManager } from '../network/AuthManager';
import { SocketClient } from '../network/SocketClient';
import { AuthUI } from '../ui/AuthUI';
import { NotificationUI } from '../ui/NotificationUI';
import { themeManager } from '../themes/ThemeManager';
import { t } from '../i18n';

export class MenuScene extends Phaser.Scene {
  private authManager!: AuthManager;
  private socketClient!: SocketClient;
  private notifications!: NotificationUI;
  private authUI!: AuthUI;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.notifications = new NotificationUI();
    this.authManager = new AuthManager();
    this.socketClient = new SocketClient(this.authManager);

    // Store in registry for other scenes
    this.registry.set('authManager', this.authManager);
    this.registry.set('socketClient', this.socketClient);
    this.registry.set('notifications', this.notifications);

    // Title
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const titleStyle = {
      fontSize: '52px',
      fontFamily: 'Chakra Petch, sans-serif',
      fontStyle: 'bold',
    };
    const colors = themeManager.getCanvasColors();
    const blastText = this.add.text(0, 0, t('auth:login.title') + ' ', {
      ...titleStyle,
      color: colors.textHex,
    });
    const arenaText = this.add.text(0, 0, t('auth:login.titleAccent'), {
      ...titleStyle,
      color: colors.primaryHex,
    });
    const totalWidth = blastText.width + arenaText.width;
    blastText.setPosition(width / 2 - totalWidth / 2, height / 2 - 60 - blastText.height / 2);
    arenaText.setPosition(blastText.x + blastText.width, blastText.y);

    this.add
      .text(width / 2, height / 2, t('ui:menu.tagline'), {
        fontSize: '16px',
        color: colors.textDimHex,
        fontFamily: 'DM Sans, sans-serif',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 60, t('ui:menu.connecting'), {
        fontSize: '14px',
        color: colors.textMutedHex,
        fontFamily: 'DM Sans, sans-serif',
      })
      .setOrigin(0.5);

    // Try auto-login first
    this.authManager.tryAutoLogin().then((success) => {
      if (success) {
        this.onAuthenticated();
      } else {
        this.showAuth();
      }
    });
  }

  private showAuth(): void {
    this.authUI = new AuthUI(this.authManager, this.notifications, () => {
      this.onAuthenticated();
    });
    this.authUI.show();
  }

  private onAuthenticated(): void {
    this.socketClient.connect();
    this.scene.start('LobbyScene');
  }
}
