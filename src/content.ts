import { ISiteAdapter } from 'types/site-adapter';
import { IconManager } from './content/icon-manager';
import { SiteAdapter } from './content/adapters/site-adapter';

class ContentScript {
  private adapter: ISiteAdapter | null = null;

  constructor() {
    console.log("content scripts loaded from src/content.ts");
    this.init();
  }

  private init() {
    this.adapter = SiteAdapter.create(window.location.hostname);
    if (!this.adapter) return;

    this.initTabs(this.adapter);
  }

  private initTabs(adapter: ISiteAdapter) {
    const iconManager = new IconManager();
    iconManager.click(() => {
      console.log("Icon clicked callback from content.ts")
    });
    const tabsContainer = adapter.findTabsContainer();
    console.log("Tabs container found:", tabsContainer);

    if (!tabsContainer || adapter.hasCustomIcon()) {
      return;
    }

    iconManager.addIcon(tabsContainer);
  }
}

new ContentScript();