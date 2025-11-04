import { getTargetUrls } from "./utils/manifest";
import { reloadExtension } from "./dev/reload";
import { reloadTargetTabs } from "./utils/reload-tabs";

const targetUrls = getTargetUrls();

type PermissionResponse = {
  permissions: chrome.permissions.Permissions;
  incognitoEnabled: boolean;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get-permissions") {
    const responseData: Partial<PermissionResponse> = {};

    chrome.permissions.getAll((result) => {
      responseData.permissions = result;

      chrome.extension.isAllowedIncognitoAccess((isAllowedAccess) => {
        responseData.incognitoEnabled = isAllowedAccess;
        sendResponse(responseData);
      });
    });

    return true;
  }

  if (request.action === "open-page") {
    chrome.tabs.create({ url: request.url });
    return true;
  }

  return false;
});

/**
 * バックグラウンドスクリプトを初期化
 */
function initialize(): void {
  console.log("現在の環境：", process.env.NODE_ENV);
  // 開発用ホットリロード機能を初期化
  if (process.env.NODE_ENV === "development") {
    reloadExtension();
  }
  // 拡張機能起動時にターゲットタブをリロード
  reloadTargetTabs(targetUrls);
}

initialize();
