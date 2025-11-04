import { create, get } from "../utils/dom";
import { dateTime } from "../utils/date";
import { ModalPanel } from "../components/modal-panel";
import meta from '../../public/manifest.meta.json';
import { getSiteAccessText } from "../utils/permissions";

/**
 * モーダルウィンドウを管理するクラス
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
    const modalStyleLink = create('link', { rel: 'stylesheet' }) as HTMLLinkElement;
    modalStyleLink.href = chrome.runtime.getURL('modal.css');

    const bootstrapLink = create('link', { rel: 'stylesheet' }) as HTMLLinkElement;
    bootstrapLink.href = chrome.runtime.getURL('bootstrap.css');

    const script = create('script') as HTMLScriptElement;
    script.src = chrome.runtime.getURL('bootstrap.js');
    script.defer = true;

    const iconLink = create('link', { rel: 'stylesheet' }) as HTMLLinkElement;
    iconLink.href = chrome.runtime.getURL('bootstrap-icons.css');

    return new Promise((resolve) => {
      const handler = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) {
            resolve(null);
            return;
          }
          this.iframeDoc = iframeDoc;

          this.iframeDoc.head.appendChild(modalStyleLink);
          this.iframeDoc.head.appendChild(bootstrapLink);
          this.iframeDoc.head.appendChild(iconLink);
          this.iframeDoc.head.appendChild(script);

          // 必要ならここでイベントを追加
          this.modalEventListeners(this.iframeDoc);

          // iframe 内の UI を初期化
          try {
            this._setUpIframeUI(this.iframeDoc);
            this._setUpInfo(this.iframeDoc);
          } catch (e) {
            console.error('Failed to set up iframe info', e);
          }

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
    const closeButton = get('#modal-close-button', doc);
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hide());
    }
  }

  private _setUpIframeUI(doc: Document): void {
    const modalStyles = get<HTMLLinkElement>('#modal-styles', doc);
    if (modalStyles) {
      modalStyles.href = chrome.runtime.getURL('modal.css');
    }

    // create panel UI helper
    this.panel = new ModalPanel(doc);

    const enabledElement = get<HTMLInputElement>('#enabled', doc);
    const manifestData = chrome.runtime.getManifest();

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
    const title = get('#title', doc);
    if (title) title.textContent = short_name;
    const titleIcon = get<HTMLImageElement>('#title-icon', doc);
    if (titleIcon) titleIcon.src = chrome.runtime.getURL('icons/icon.png');
    const titleHeader = get('#title-header', doc);
    if (titleHeader) titleHeader.textContent = short_name;
    const enabledLabel = get('#enabled-label', doc);
    if (enabledLabel) enabledLabel.textContent = `${short_name} を有効にする`;
  }

  /** 拡張機能の情報をセットアップ */
  private _setUpInfo(doc: Document): void {
    const manifestData = chrome.runtime.getManifest();

    const storeLink = get<HTMLAnchorElement>('#store_link', doc);
    storeLink?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: "open-page", url: `https://chrome.google.com/webstore/detail/${chrome.runtime.id}` });
    }, { once: true });

    const extensionLink = get<HTMLAnchorElement>('#extension_link', doc);
    extensionLink?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: "open-page", url: `chrome://extensions/?id=${chrome.runtime.id}` });
    }, { once: true });

    const issueLink = get<HTMLAnchorElement>('#issue-link', doc);
    issueLink?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: "open-page", url: `https://forms.gle/qkaaa2E49GQ5QKMT8` });
    }, { once: true });

    const extensionId = get('#extension-id', doc);
    if (extensionId) extensionId.textContent = chrome.runtime.id;
    const extensionName = get('#extension-name', doc);
    if (extensionName) extensionName.textContent = manifestData.name;
    const extensionVersion = get('#extension-version', doc);
    if (extensionVersion) extensionVersion.textContent = manifestData.version;
    const extensionDescription = get('#extension-description', doc);
    if (extensionDescription) extensionDescription.textContent = manifestData.description ?? '';

    chrome.runtime.sendMessage({ action: 'get-permissions' }, (result) => {
      const permissions = result.permissions;
      const siteAccess = getSiteAccessText(permissions.origins);

      get('#site-access', doc)!.innerHTML = siteAccess;
      get('#permission-info', doc)!.innerHTML = permissions.permissions.join(", ");

      const incognitoEnabled = result.incognitoEnabled;
      get('#incognito-enabled', doc)!.innerHTML = incognitoEnabled ? "有効" : "無効";
    });

    const languageMap: { [key: string]: string } = { 'en': '英語', 'ja': '日本語' };
    const language = get<HTMLElement>('#language', doc);
    const langs = (meta as any)?.languages || [];
    if (language && langs) {
      language.textContent = langs.map((lang: string) => languageMap[lang]).join(', ');
    }

    const publisherName = get<HTMLElement>('#publisher-name', doc);
    const publisher = (meta as any)?.publisher || '不明';
    if (publisherName) publisherName.textContent = publisher;

    const developerName = get<HTMLElement>('#developer-name', doc);
    const developer = (meta as any)?.developer || '不明';
    if (developerName) developerName.textContent = developer;

    const githubLink = get<HTMLAnchorElement>('#github-link', doc);
    if (githubLink) {
      githubLink.href = (meta as any)?.github_url || '';
      githubLink.textContent = (meta as any)?.github_url || '';
      githubLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: "open-page", url: githubLink.href });
      });
    }
  }
}
