import { ILobbyView, ViewDeps } from './types';
import { AdminUI } from '../AdminUI';

export class AdminView implements ILobbyView {
  readonly viewId = 'admin';
  readonly title = 'Admin Panel';

  private panel: AdminUI;

  constructor(deps: ViewDeps, options?: Record<string, any>) {
    this.panel = new AdminUI(
      deps.socketClient,
      deps.authManager,
      deps.notifications,
      () => {},
      options?.initialTab,
    );
  }

  async render(container: HTMLElement): Promise<void> {
    await this.panel.renderEmbedded(container);
  }

  destroy(): void {
    this.panel.destroy();
  }
}
