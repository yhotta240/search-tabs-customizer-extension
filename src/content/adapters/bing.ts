import { SiteName, TabInfo } from 'types/site-adapter';
import { get, getAll } from '../../utils/dom';
import { BaseSiteAdapter } from './base';
import { getAllSettings } from '../../utils/settings';

export class BingAdapter extends BaseSiteAdapter {
  findTabsContainer(): HTMLElement | null {
    return get('nav[role="navigation"]');
  }

  findTabs(): HTMLElement[] | null {
    const container = this.findTabsContainer();
    if (!container) return null;
    get('ul', container)?.style.setProperty('display', 'flex');
    return Array.from(getAll('ul li', container)) as HTMLElement[];
  }

  findTabsInfo(): TabInfo[] | null {
    const tabs = this.findTabs();
    if (!tabs) return null;
    const tabsInfo: TabInfo[] = [];

    tabs.forEach(tab => {
      const title = tab.textContent || '';
      const link = get<HTMLAnchorElement>('a', tab);
      if (!link) return { title, url: '' };
      if (tab.classList.contains('b_sp_over_item')) return;

      // さらに表示
      if (link.target === '_self') {
        const moreTitle = link.textContent || '';
        const moreTabs = getAll('li.b_sp_over_item a', tab).map(a => ({
          title: a.textContent?.trim() || '',
          url: a.getAttribute('href') || '',
        })).filter(m => m.title);

        tabsInfo.push({ title: moreTitle, url: '', more: moreTabs });
        return;
      }

      tabsInfo.push({ title, url: link.href || '' });
    });

    return tabsInfo;
  }

  showTabs(): void {
    const container = this.findTabsContainer();
    if (container) {
      // Bingのタブ内を横並びに表示するためにflexに設定
      container.style.display = 'flex';
      container.style.visibility = 'visible';
    }
  }

  siteName(): SiteName {
    return 'bing';
  }

  async setUpTabs(): Promise<void> {
    const settings = await getAllSettings();
    const tabs = this.findTabs();
    if (!settings.bing || !tabs) return;

    // 設定に基づいてタブを並び替える
    settings.bing.tabs.forEach((tabSetting, index) => {
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
      if (changes.settings.newValue.bing) {
        this.setUpTabs();
      }
    });
  }
}
