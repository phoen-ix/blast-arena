import { ILobbyView, ViewDeps } from './types';
import { CampaignUI } from '../CampaignUI';

export class CampaignView implements ILobbyView {
  readonly viewId = 'campaign';
  readonly title = 'Campaign';

  private panel: CampaignUI;

  constructor(deps: ViewDeps) {
    this.panel = new CampaignUI(deps.socketClient, deps.notifications, () => {});
  }

  async render(container: HTMLElement): Promise<void> {
    await this.panel.renderEmbedded(container);
  }

  destroy(): void {
    this.panel.destroy();
  }
}
