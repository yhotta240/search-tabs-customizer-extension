import { ISiteAdapter } from 'types/site-adapter';
import { IconManager } from './content/icon-manager';
import { SiteAdapter } from './content/adapters/site-adapter';
import { ModalManager } from './content/modal-manager';

class ContentScript {
  private adapter: ISiteAdapter | null = null;
  private modalManager: ModalManager;

  constructor() {
    this.modalManager = new ModalManager();
    this._init();
  }

  private _init() {
    this.adapter = SiteAdapter.create(window.location.hostname);
    if (!this.adapter) return;

    this._initTabs(this.adapter);
  }

  private _initTabs(adapter: ISiteAdapter) {
    const iconManager = new IconManager();
    iconManager.click(() => {
      this.modalManager.show();
    });

    const tabsContainer = adapter.findTabsContainer();

    if (!tabsContainer || adapter.hasCustomIcon()) {
      return;
    }

    iconManager.addIcon(tabsContainer);
  }
}

const contentScript = new ContentScript();