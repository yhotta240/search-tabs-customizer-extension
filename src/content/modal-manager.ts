import { create, get } from "../utils/dom";
import { dateTime } from "../utils/date";
import { ModalPanel } from "../components/modal-panel";
import meta from '../../public/manifest.meta.json';
import { getSiteAccessText } from "../utils/permissions";
import { ISettings } from "settings";
import { getAllSettings } from "../utils/settings";

/**
 * モーダルウィンドウを管理するクラス
 */
export class ModalManager {
  private modalElement: HTMLElement | null = null;
  private enabled: boolean = true;
  private iframe: HTMLIFrameElement | null = null;
  private iframeDoc: Document | null = null;
  private panel: ModalPanel | null = null;
  private settings!: ISettings;

  constructor() {
    // enabled状態のみコンストラクタで読み込み
    chrome.storage.local.get(['enabled'], (data) => {
      this.enabled = data.enabled ?? true;
    });
  }

  async show(): Promise<void> {
    if (this.modalElement) {
      this.modalElement.style.display = 'flex';
      return;
    }

    // 設定を先に読み込んでからモーダルを作成
    await this._loadSettings();
    this.modalElement = await this.createModal();
    document.body.appendChild(this.modalElement);
  }

  hide(): void {
    if (this.modalElement) {
      this.modalElement.style.display = 'none';
    }
  }

  private async _loadSettings(): Promise<void> {
    this.settings = await getAllSettings();
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
    // modal.html を取得して Blob URL として iframe に設定する
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

    // iframe のロード完了で UI 初期化を行い、表示する
    const iframeLoadPromise = this._setupIframeOnLoad(iframe);
    iframeLoadPromise.then((doc) => {
      iframe.style.display = 'block';
      // iframe初期化完了後に設定を反映
      if (doc) {
        this._setUpSettings(doc);
      }
    });

    // srcdoc より互換性の高い Blob URL を使用
    const blob = new Blob([htmlText], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    iframe.src = blobUrl;

    // 読み込み完了時にオブジェクト URL を解放してメモリを開放
    iframe.addEventListener('load', () => {
      URL.revokeObjectURL(blobUrl);
    }, { once: true });

    return iframe;
  }

  private _setupIframeOnLoad(iframe: HTMLIFrameElement): Promise<Document | null> {
    // 要素作成ヘルパー（CSS/JS リソース）
    const makeLink = (href: string) => {
      const l = create('link', { rel: 'stylesheet' }) as HTMLLinkElement;
      l.href = href;
      return l;
    };
    const makeScript = (src: string) => {
      const s = create('script') as HTMLScriptElement;
      s.src = src;
      s.defer = true;
      return s;
    };

    const modalStyleLink = makeLink(chrome.runtime.getURL('modal.css'));
    const bootstrapLink = makeLink(chrome.runtime.getURL('bootstrap.css'));
    const iconLink = makeLink(chrome.runtime.getURL('bootstrap-icons.css'));
    const script = makeScript(chrome.runtime.getURL('bootstrap.js'));

    // リソース読み込み待ち（onload/onerror またはタイムアウトで解決）
    const waitForLoad = (el: HTMLLinkElement | HTMLScriptElement, timeout = 5000) => {
      return new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          try { (el as any).onload = null; (el as any).onerror = null; } catch { /* noop */ }
          resolve();
        };
        // onload/onerror が使える場合はそれを使う
        try {
          (el as any).onload = finish;
          (el as any).onerror = finish;
        } catch {
          // noop
        }
        // タイムアウトフォールバック
        setTimeout(finish, timeout);
      });
    };

    return new Promise((resolve) => {
      const initialize = async () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) {
            resolve(null);
            return;
          }
          this.iframeDoc = iframeDoc;

          // head にリソースを追加
          const head = iframeDoc.head || iframeDoc.getElementsByTagName('head')[0] || iframeDoc.documentElement;
          head.appendChild(modalStyleLink);
          head.appendChild(bootstrapLink);
          head.appendChild(iconLink);
          head.appendChild(script);

          // CSS/JS の読み込みを待つ（失敗しても進める）
          try {
            await Promise.all([
              waitForLoad(modalStyleLink),
              waitForLoad(bootstrapLink),
              waitForLoad(iconLink),
              waitForLoad(script)
            ]);
          } catch {
            // 無視して続行
          }

          // モーダル内のイベントや UI を初期化
          this.modalEventListeners(iframeDoc);
          try {
            this._setUpIframeUI(iframeDoc);
            this._setUpInfo(iframeDoc);
          } catch (e) {
            // 初期化に失敗しても落とさない
            console.error('Failed to set up iframe UI/info', e);
          }

          resolve(iframeDoc);
        } catch (e) {
          resolve(null);
        }
      };

      // iframe の load イベントで初期化を行う
      iframe.addEventListener('load', () => {
        // 非同期に実行して Promise の挙動を安定させる
        setTimeout(initialize, 0);
      }, { once: true });

      // すでに読み込み済みの場合は即時初期化（次の tick で）
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && (doc.readyState === 'complete' || doc.readyState === 'interactive')) {
          setTimeout(initialize, 0);
        }
      } catch {
        // cross-origin 等で参照不可なら無視
      }
    });
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

  private modalEventListeners(doc: Document): void {
    const closeButton = get('#modal-close-button', doc);
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hide());
    }
  }

  /** 設定のセットアップ */
  private _setUpSettings(doc: Document): void {
    const customTabList = get('#custom-tab-list', doc);
    if (!customTabList || !this.settings) return;

    // 設定からタブリストを構築
    this.settings.tabs.forEach((tab, index) => {
      const tabItem = create('div', { className: 'list-group-item list-group-item-action' }) as HTMLDivElement;
      tabItem.innerHTML = `
        <span class="tab-title">${tab.title || `タブ ${index + 1}`}</span>
      `;
      customTabList.appendChild(tabItem);
    });
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
