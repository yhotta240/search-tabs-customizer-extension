import { TabInfo } from '../../types/site-adapter';
import { get, getAll } from '../../utils/dom';
import { BaseSiteAdapter } from './base';

export class GoogleAdapter extends BaseSiteAdapter {
  // 「もっと見る」ボタン内の隠れたタブ要素のセレクタ
  private static readonly MORE_ITEM_SELECTOR = '.bsmXxe[role="none"]';
  private static readonly MORE_ITEM_LINK_SELECTOR = '.bsmXxe[role="none"] a';
  private static readonly MAX_RETRIES = 10;
  private static readonly RETRY_DELAY_MS = 200;

  private initialized = false;
  private initPromise: Promise<void> | null = null;

  findTabsContainer(): Element | null {
    return get('#main div[jscontroller] div[role="list"]');
  }

  findTabs(): HTMLElement[] | null {
    const container = this.findTabsContainer();
    if (!container) return null;
    return Array.from(getAll('div[role="listitem"]', container)) as HTMLElement[];
  }

  findTabsInfo(): TabInfo[] | null {
    const tabs = this.findTabs();
    if (!tabs) return null;

    // タブ情報を処理する
    const processedTabs = tabs.map(tab => {
      const direct = tab.querySelector('a') as HTMLAnchorElement | null;
      const title = direct?.innerText?.trim() || '';
      const url = direct?.getAttribute('href') || '';

      // 「もっと見る」ボタン内のタブを処理
      const more = Array.from(getAll(GoogleAdapter.MORE_ITEM_LINK_SELECTOR, tab))
        .map(a => ({ title: a.textContent?.trim() || '', url: a.getAttribute('href') || '' }))
        .filter(m => m.title);

      if (more.length) {
        const btn = tab.querySelector('[role="button"], button') as HTMLElement | null;
        return { title: btn?.textContent?.trim() || null, url: '', more };
      }

      return { title, url };
    }).filter((tab): tab is TabInfo => !!tab.title);

    return processedTabs;
  }

  // GoogleのJavaScriptが動的にDOM要素を生成するのを待つ
  private async waitForBsmLinks(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve) => {
      const checkLinks = (retries = 0) => {
        const container = this.findTabsContainer();

        if (!container) {
          this.retryOrResolve(retries, checkLinks, resolve);
          return;
        }

        const moreItems = getAll(GoogleAdapter.MORE_ITEM_SELECTOR, container);
        const hasLinks = moreItems.length > 0 && get(GoogleAdapter.MORE_ITEM_LINK_SELECTOR, container);

        if (moreItems.length === 0 || hasLinks) {
          this.initialized = true;
          resolve();
        } else {
          this.retryOrResolve(retries, checkLinks, resolve);
        }
      };

      checkLinks();
    });

    return this.initPromise;
  }

  private retryOrResolve(retries: number, checkLinks: (retries: number) => void, resolve: () => void): void {
    if (retries < GoogleAdapter.MAX_RETRIES) {
      setTimeout(() => checkLinks(retries + 1), GoogleAdapter.RETRY_DELAY_MS);
    } else {
      this.initialized = true;
      resolve();
    }
  }

  async initialize(): Promise<void> {
    await this.waitForBsmLinks();
  }
}
