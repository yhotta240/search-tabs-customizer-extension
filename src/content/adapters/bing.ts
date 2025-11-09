import { get } from '../../utils/dom';
import { BaseSiteAdapter } from './base';

export class BingAdapter extends BaseSiteAdapter {
  findTabsContainer(): Element | null {
    const ul = get('nav[role="navigation"] ul');
    ul?.style.setProperty('display', 'flex');
    return ul;
  }

  findTabs(): HTMLElement[] | null {
    const container = this.findTabsContainer();
    if (!container) return null;
    return Array.from(container.querySelectorAll('li')) as HTMLElement[];
  }

  findTabsInfo(): { title: string; url: string }[] | null {
    const tabs = this.findTabs();
    if (!tabs) return null;

    return tabs.map(tab => {
      const title = tab.querySelector('h3')?.innerText || '';
      const url = tab.querySelector('a')?.getAttribute('href') || '';
      return { title, url };
    });
  }
}
