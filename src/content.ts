import { ISiteAdapter } from 'types/site-adapter';
import { IconManager } from './content/icon-manager';
import { SiteAdapter } from './content/adapters/site-adapter';
import { ModalManager } from './content/modal-manager';
import { saveSettings } from './utils/settings';

class ContentScript {
  private adapter: ISiteAdapter | null = null;
  private modalManager: ModalManager;
  private iconManager: IconManager;

  constructor() {
    this.modalManager = new ModalManager();
    this.iconManager = new IconManager();
    this.adapter = SiteAdapter.create(window.location.hostname);

    if (this.adapter) {
      this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    if (!this.adapter) return;

    // Adapterの初期化を待つ（Google等の動的DOM生成対応）
    if ('initialize' in this.adapter && typeof this.adapter.initialize === 'function') {
      await this.adapter.initialize();
    }

    // タブ情報を取得して保存
    await this.fetchAndSaveTabs();

    // アイコンを表示
    this.setupIcon();
  }

  private async fetchAndSaveTabs(): Promise<void> {
    if (!this.adapter) return;

    const tabs = this.adapter.findTabsInfo();
    if (!tabs) return;

    console.log('Fetched Tabs Info:', tabs);

    // 設定を保存（ModalManagerが読み込む）
    await saveSettings({
      searchEngine: this.adapter.siteName(),
      tabs,
    });
  }

  private setupIcon(): void {
    if (!this.adapter) return;

    const tabsContainer = this.adapter.findTabsContainer();
    if (!tabsContainer || this.adapter.hasCustomIcon()) {
      return;
    }

    this.iconManager.click(() => {
      this.modalManager.show();
    });

    this.iconManager.addIcon(tabsContainer);
  }
}

new ContentScript();