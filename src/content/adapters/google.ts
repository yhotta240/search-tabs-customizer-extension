import { get } from '../../utils/dom';
import { BaseSiteAdapter } from './base';

export class GoogleAdapter extends BaseSiteAdapter {
  findTabsContainer(): Element | null {
    return get('#main div[jscontroller] div[role="list"]');
  }
}
