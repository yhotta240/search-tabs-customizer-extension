import { get } from '../../utils/dom';
import { BaseSiteAdapter } from './base';

export class BingAdapter extends BaseSiteAdapter {
  findTabsContainer(): Element | null {
    const ul = get('nav[role="navigation"] ul');
    ul?.style.setProperty('display', 'flex');
    return ul;
  }
}
