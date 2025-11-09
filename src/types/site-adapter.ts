export interface ISiteAdapter {
  findTabsContainer(): Element | null;
  findTabs(): Element[] | null;
  findTabsInfo(): TabInfo[] | null;
  hasCustomIcon(): boolean;
  siteName(): SiteName;
}

export type TabInfo = {
  title: string;
  url: string;
  more?: TabInfo[];
};

export type SiteName = 'google' | 'bing' | 'duckduckgo' | 'yahoo' | '';
