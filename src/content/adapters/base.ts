import { get } from '../../utils/dom';
import { ISiteAdapter, TabInfo } from '../../types/site-adapter';

export abstract class BaseSiteAdapter implements ISiteAdapter {
  protected observers: MutationObserver[] = [];

  abstract findTabsContainer(): Element | null;
  abstract findTabs(): HTMLElement[] | null;
  abstract findTabsInfo(): TabInfo[] | null;

  hasCustomIcon(): boolean {
    return get('.custom-tab-icon') !== null;
  }
}
