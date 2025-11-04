import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { ISiteAdapter } from 'types/site-adapter';
import { IconManager } from './content/icon-manager';
import { SiteAdapter } from './content/adapters/site-adapter';
import { ModalManager } from './content/modal-manager';

class ContentScript {
  private adapter: ISiteAdapter | null = null;
  private modalManager: ModalManager;

  constructor() {
    this.modalManager = new ModalManager();

    this.init();
  }

  private init() {
    this.adapter = SiteAdapter.create(window.location.hostname);
    if (!this.adapter) return;

    this.initTabs(this.adapter);
  }

  private initTabs(adapter: ISiteAdapter) {
    const iconManager = new IconManager();
    iconManager.click(async () => {
      await this.modalManager.show();
    });

    const tabsContainer = adapter.findTabsContainer();

    if (!tabsContainer || adapter.hasCustomIcon()) {
      return;
    }

    iconManager.addIcon(tabsContainer);
  }
}

new ContentScript();
