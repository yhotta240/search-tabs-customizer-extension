import { SiteName, TabInfo } from 'types/site-adapter';
import { get, getAll } from '../../utils/dom';
import { BaseSiteAdapter } from './base';
import { getAllSettings } from '../../utils/settings';

export class YahooAdapter extends BaseSiteAdapter {
  findTabsContainer(): HTMLElement | null {
    return get('header nav ul');
  }

  findTabs(): HTMLElement[] | null {
    const container = this.findTabsContainer();
    if (!container) return null;
    return Array.from(getAll('li', container)) as HTMLElement[];
  }

  findTabsInfo(): TabInfo[] | null {
    const tabs = this.findTabs();
    if (!tabs) return null;
    const tabsInfo: TabInfo[] = [];
    tabs.forEach(tab => {
      const title = tab.textContent || '';
      const link = get<HTMLAnchorElement>('a', tab);
      tabsInfo.push({ title, url: link?.href || '' });
    });

    return tabsInfo;
  }

  showTabs(): void {
    const container = this.findTabsContainer();
    if (container) {
      container.style.visibility = 'visible';
    }
  }

  siteName(): SiteName {
    return 'yahoo';
  }

  async setUpTabs(): Promise<void> {
    const settings = await getAllSettings();
    const tabs = this.findTabs();
    if (!settings.yahoo || !tabs) return;

    // 設定に基づいてタブを並び替える
    settings.yahoo.tabs.forEach((tabSetting, index) => {
      const tabElement = tabs.find((tab: HTMLElement) => {
        const text = tab.textContent?.trim() || '';
        return text === tabSetting.title;
      });
      if (tabElement) {
        // タブの順序を設定
        tabElement.style.order = (-100 + index).toString();

        // タブの表示・非表示を設定
        tabElement.classList.toggle('hidden-tab', tabSetting.visible === false);
      }
    });
  }

  listenToSettingsChanges(): void {
    const onChanged = chrome.storage.local.onChanged;
    onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.settings.newValue.yahoo) {
        this.setUpTabs();
      }
    });
  }
}
