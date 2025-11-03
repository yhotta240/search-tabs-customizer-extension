import { getTargetUrls } from "./utils/manifest";
import { reloadExtension } from "./dev/reload";
import { reloadTargetTabs } from "./utils/reload-tabs";

const targetUrls = getTargetUrls();

/**
 * バックグラウンドスクリプトを初期化
 */
function initialize(): void {
  console.log("現在の環境：", process.env.NODE_ENV);
  // 開発用ホットリロード機能を初期化
  if (process.env.NODE_ENV === "development"){
    reloadExtension();
  }
  // 拡張機能起動時にターゲットタブをリロード
  reloadTargetTabs(targetUrls);
}

initialize();
