export interface ISiteAdapter {
  findTabsContainer(): Element | null;
  findTabs(): Element[] | null;
  findTabsInfo(): TabInfo[] | null;
  hasCustomIcon(): boolean;
}

export type TabInfo = {
  title: string;
  url: string;
  more?: TabInfo[];
};