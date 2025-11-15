export interface ISiteAdapter {
  findTabsContainer(): Element | null;
  findTabs(): Element[] | null;
  findTabsInfo(): TabInfo[] | null;
  showTabs(): void;
  siteName(): SiteName;
  setUpTabs(): void;
  hasCustomIcon(): boolean;
  listenToSettingsChanges(): void;
}

export type TabInfo = {
  title: string;
  url: string;
  visible?: boolean;
  more?: TabInfo[];
};

export type SiteName = 'google' | 'bing' | 'duckduckgo' | 'yahoo' | '';
