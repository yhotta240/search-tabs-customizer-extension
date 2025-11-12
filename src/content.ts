import { ISiteAdapter } from 'types/site-adapter';
import { IconManager } from './content/icon-manager';
import { SiteAdapter } from './content/adapters/site-adapter';
import { ModalManager } from './content/modal-manager';
import { getAllSettings, saveSettings } from './utils/settings';
import { ISettings } from 'settings';

class ContentScript {
  private adapter: ISiteAdapter | null = null;
  private modalManager: ModalManager;
  private iconManager: IconManager;
  private settings: Promise<ISettings>;

  constructor() {
    this.modalManager = new ModalManager();
    this.iconManager = new IconManager();
    this.adapter = SiteAdapter.create(window.location.hostname);
    this.settings = getAllSettings();

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

    this.setupIcon(); // アイコンを表示

    this.adapter.setUpTabs(); // タブをセットアップ
    this.adapter.showTabs(); // タブを表示
    this.adapter.listenToSettingsChanges(); // 設定変更を監視
  }

  private async fetchAndSaveTabs(): Promise<void> {
    if (!this.adapter) return;

    const tabs = this.adapter.findTabsInfo();
    if (!tabs) return;

    const thisSettings = await this.settings;
    const siteName = this.adapter.siteName();

    const siteSetting = thisSettings[siteName];

    if (!siteSetting) {
      thisSettings[siteName] = {
        searchEngine: siteName,
        tabs: tabs,
      };
    } else {
      siteSetting.defaultTabs = tabs;
    }

    await saveSettings(thisSettings);
  }

  private setupIcon(): void {
    if (!this.adapter) return;

    const tabsContainer = this.adapter.findTabsContainer();
    if (!tabsContainer || this.adapter.hasCustomIcon()) return;

    this.iconManager.click(() => {
      this.modalManager.show(this.adapter);
    });

    this.iconManager.addIcon(tabsContainer);
  }
}

new ContentScript();