import { create, clickURL } from "../utils/dom";
import { dateTime } from "../utils/date";
import { getSiteAccessText } from "../utils/permissions";
import { ModalPanel } from "../components/modal-panel";
import meta from '../../public/manifest.meta.json';

/**
 * モーダルウィンドウを管理するクラス。
 */
export class ModalManager {
  private modalElement: HTMLElement | null = null;
  private enabled: boolean = true;
  private iframe: HTMLIFrameElement | null = null;
  private iframeDoc: Document | null = null;
  private panel: ModalPanel | null = null;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    chrome.storage.local.get(['enabled'], (data) => {
      this.enabled = data.enabled ?? true;
    });
  }

  async show(): Promise<void> {
    if (this.modalElement) {
      this.modalElement.style.display = 'flex';
      return;
    }

    // モーダルを作成して表示
    this.modalElement = await this.createModal();
    document.body.appendChild(this.modalElement);
  }

  hide(): void {
    if (this.modalElement) {
      this.modalElement.style.display = 'none';
    }
  }

  private async createModal(): Promise<HTMLDivElement> {
    const modal = create('div', { className: 'search-tabs-modal' }) as HTMLDivElement;
    modal.style.cssText = `
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      justify-content: center;
      align-items: center;
    `;

    // iframe を生成してモーダルに追加します。iframe のロードは別で待機可能です。
    this.iframe = await this.createFrame();
    modal.appendChild(this.iframe);

    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hide();
      }
    });

    return modal;
  }

  private async createFrame(): Promise<HTMLIFrameElement> {
    const htmlURL = chrome.runtime.getURL('modal.html');
    const res = await fetch(htmlURL);
    const htmlText = await res.text();

    const iframe = create('iframe', { id: 'search-tabs-modal-iframe' }) as HTMLIFrameElement;
    iframe.style.cssText = `
      display: none;
      border: none;
      border-radius: 8px;
      width: 90%;
      max-width: 720px;
      height: 70vh;
      background: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    // setupIframeOnLoad はロード完了を解決する Promise を返す
    const iframeLoadPromise = this.setupIframeOnLoad(iframe);
    iframeLoadPromise.then(() => {
      iframe.style.display = 'block';
    });

    // srcdoc を設定して読み込みを開始
    iframe.srcdoc = htmlText;

    return iframe;
  }

  private setupIframeOnLoad(iframe: HTMLIFrameElement): Promise<Document | null> {
    const link = create('link', { rel: 'stylesheet' }) as HTMLLinkElement;
    link.href = chrome.runtime.getURL('bootstrap.css');

    const script = create('script') as HTMLScriptElement;
    script.src = chrome.runtime.getURL('bootstrap.js');
    script.defer = true;

    return new Promise((resolve) => {
      const handler = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) {
            resolve(null);
            return;
          }
          this.iframeDoc = iframeDoc;

          // CSS の重複挿入を防ぐ
          const exists = Array.from(this.iframeDoc.head.querySelectorAll('link')).some(l => (l as HTMLLinkElement).href === link.href);
          if (!exists) {
            this.iframeDoc.head.appendChild(link);
          }

          // 必要ならここでイベントを追加
          this.modalEventListeners(this.iframeDoc);

          // iframe 内の UI を初期化（PopupManager 相当の処理）
          try {
            this.initializeIframeUI(this.iframeDoc);
          } catch (e) {
            // 初期化に失敗してもロード自体は解決する
            console.error('Failed to initialize iframe UI', e);
          }

          this.iframeDoc.head.appendChild(script);

          resolve(this.iframeDoc);
        } catch (e) {
          resolve(null);
        }
      };

      // 単純に onload をセット
      iframe.onload = handler;

      // 既に読み込み済みの場合は即時ハンドラを呼ぶ
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && (doc.readyState === 'complete' || doc.readyState === 'interactive')) {
          // Promise の非同期性を保つため次のtickで実行
          setTimeout(handler, 0);
        }
      } catch (e) {
        // cross-origin の場合は無視
      }
    });
  }

  private modalEventListeners(doc: Document): void {
    const content = doc.body;
    const closeButton = content.querySelector('#modal-close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hide());
    }
  }

  private initializeIframeUI(doc: Document): void {
    const modalStyles = doc.getElementById('modal-styles') as HTMLLinkElement;
    if (modalStyles) {
      modalStyles.href = chrome.runtime.getURL('modal.css');
    }

    // create panel UI helper
    this.panel = new ModalPanel(doc);

    const enabledElement = doc.getElementById('enabled') as HTMLInputElement | null;
    const manifestData = chrome.runtime.getManifest();
    const manifestMetadata: { [key: string]: any } = (meta as any) || {};

    // load initial state
    chrome.storage.local.get(['settings', 'enabled'], (data) => {
      if (enabledElement) {
        const enabled = data.enabled ?? this.enabled;
        enabledElement.checked = enabled;
      }
      if (this.panel) this.panel.messageOutput(`${manifestData.short_name} が起動しました`, dateTime());
    });

    // enabled toggle listener (additional to attachEventListeners)
    if (enabledElement) {
      enabledElement.addEventListener('change', (event) => {
        const checked = (event.target as HTMLInputElement).checked;
        chrome.storage.local.set({ enabled: checked }, () => {
          if (this.panel) this.panel.messageOutput(checked ? `${manifestData.short_name} は有効になっています` : `${manifestData.short_name} は無効になっています`, dateTime());
        });
      });
    }

    // initialize UI texts and links
    const short_name = manifestData.short_name || manifestData.name;
    const title = doc.getElementById('title');
    if (title) title.textContent = short_name;
    const titleIcon = doc.getElementById('title-icon') as HTMLImageElement;
    if (titleIcon) titleIcon.src = chrome.runtime.getURL('icons/icon.png');
    const titleHeader = doc.getElementById('title-header');
    if (titleHeader) titleHeader.textContent = short_name;
    const enabledLabel = doc.getElementById('enabled-label');
    if (enabledLabel) enabledLabel.textContent = `${short_name} を有効にする`;
    const newTabButton = doc.getElementById('new-tab-button');
    if (newTabButton) {
      newTabButton.addEventListener('click', () => {
        chrome.tabs.create({ url: 'modal.html' });
      });
    }

    // setup info tab
    const storeLink = doc.getElementById('store_link') as HTMLAnchorElement;
    if (storeLink) {
      storeLink.href = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}`;
      clickURL(storeLink);
    }

    const extensionLink = doc.getElementById('extension_link') as HTMLAnchorElement;
    if (extensionLink) {
      extensionLink.href = `chrome://extensions/?id=${chrome.runtime.id}`;
      clickURL(extensionLink);
    }

    const issueLink = doc.getElementById('issue-link') as HTMLAnchorElement;
    if (issueLink) {
      issueLink.href = `https://forms.gle/qkaaa2E49GQ5QKMT8`;
      clickURL(issueLink);
    }

    const extensionId = doc.getElementById('extension-id');
    if (extensionId) extensionId.textContent = chrome.runtime.id;
    const extensionName = doc.getElementById('extension-name');
    if (extensionName) extensionName.textContent = manifestData.name;
    const extensionVersion = doc.getElementById('extension-version');
    if (extensionVersion) extensionVersion.textContent = manifestData.version;
    const extensionDescription = doc.getElementById('extension-description');
    if (extensionDescription) extensionDescription.textContent = manifestData.description ?? '';

    // chrome.permissions.getAll((result) => {
    //   const permissionInfo = doc.getElementById('permission-info');
    //   const permissions = result.permissions;
    //   if (permissionInfo && permissions) {
    //     permissionInfo.textContent = permissions.join(', ');
    //   }

    //   const siteAccess = getSiteAccessText(result.origins);
    //   const siteAccessElement = doc.getElementById('site-access');
    //   if (siteAccessElement) siteAccessElement.innerHTML = siteAccess;
    // });

    // chrome.extension.isAllowedIncognitoAccess((isAllowedAccess) => {
    //   const incognitoEnabled = doc.getElementById('incognito-enabled');
    //   if (incognitoEnabled) incognitoEnabled.textContent = isAllowedAccess ? '有効' : '無効';
    // });

    const languageMap: { [key: string]: string } = { 'en': '英語', 'ja': '日本語' };
    const language = doc.getElementById('language') as HTMLElement;
    const languages = (meta as any)?.languages;
    if (language && languages) {
      language.textContent = languages.map((lang: string) => languageMap[lang]).join(', ');
    }

    const publisherName = doc.getElementById('publisher-name') as HTMLElement;
    const publisher = (meta as any)?.publisher || '不明';
    if (publisherName) publisherName.textContent = publisher;

    const developerName = doc.getElementById('developer-name') as HTMLElement;
    const developer = (meta as any)?.developer || '不明';
    if (developerName) developerName.textContent = developer;

    const githubLink = doc.getElementById('github-link') as HTMLAnchorElement;
    if (githubLink) {
      githubLink.href = (meta as any)?.github_url || '';
      githubLink.textContent = (meta as any)?.github_url || '';
      clickURL(githubLink);
    }
  }

}
