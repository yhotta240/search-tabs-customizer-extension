import { ISiteAdapter } from '../../types/site-adapter';
import { GoogleAdapter } from './google';
import { BingAdapter } from './bing';
import { YahooAdapter } from './yahoo';

export class SiteAdapter {

  static create(hostname: string): ISiteAdapter | null {
    // match google.* and bing.* (includes country TLDs like google.co.jp)
    if (/(^|\.)google\./i.test(hostname)) {
      return new GoogleAdapter();
    }

    if (/(^|\.)bing\./i.test(hostname)) {
      return new BingAdapter();
    }

    if (/(^|\.)yahoo.co.jp/i.test(hostname)) {
      return new YahooAdapter();
    }

    return null;
  }
}
