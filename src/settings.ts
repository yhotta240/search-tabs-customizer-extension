import { SiteName, TabInfo } from "types/site-adapter";

export interface ISettings {
  [key: string]: ISetting;
}

/** 設定の型定義 */
export interface ISetting {
  searchEngine: SiteName;
  tabs: TabInfo[];
  defaultTabs?: TabInfo[];
}

/** 設定のデフォルト値 */
export const DEFAULT_SETTINGS: ISettings = {};

/**
 * 設定の説明やバリデーションルール
 * オプション：設定値の制約を定義できます
 */
export const SETTINGS_CONFIG = {
  // ========== サンプルの設定制約 ==========
  // fontSize: {
  //   min: 12,
  //   max: 24,
  //   step: 1,
  // },
  // maxItems: {
  //   min: 1,
  //   max: 100,
  // },
};
