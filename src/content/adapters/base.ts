import { get } from '../../utils/dom';
import { ISiteAdapter } from '../../types/site-adapter';

export abstract class BaseSiteAdapter implements ISiteAdapter {
  protected observers: MutationObserver[] = [];

  abstract findTabsContainer(): Element | null;

  hasCustomIcon(): boolean {
    return get('.custom-tab-icon') !== null;
  }
}
