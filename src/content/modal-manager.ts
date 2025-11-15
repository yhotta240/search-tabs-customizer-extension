import { create, get, getAll } from "../utils/dom";
import { dateTime } from "../utils/date";
import { ModalPanel } from "../components/modal-panel";
import meta from '../../public/manifest.meta.json';
import { getSiteAccessText } from "../utils/permissions";
import { ISetting, ISettings } from "settings";
import { getAllSettings, saveSettings } from "../utils/settings";
import { ISiteAdapter } from "types/site-adapter";
import Sortable from "sortablejs";

/**
 * モーダルウィンドウを管理するクラス
 */
export class ModalManager {
  private modalElement: HTMLElement | null = null;
  private enabled: boolean = true;
  private iframe: HTMLIFrameElement | null = null;
  private iframeDoc: Document | null = null;
  private panel: ModalPanel | null = null;
  private setting!: ISetting;
  private adapter: ISiteAdapter | null = null;

  constructor() {
    // enabled状態のみコンストラクタで読み込み
    chrome.storage.local.get(['enabled'], (data) => {
      this.enabled = data.enabled ?? true;
    });
  }

  async show(adapter: ISiteAdapter | null): Promise<void> {
    this.adapter = adapter;
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
    const siteKey = this.adapter?.siteName() || '';
    const settings = await getAllSettings();
    this.setting = settings[siteKey];
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
    chrome.storage.local.get(['enabled'], (data) => {
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
    if (!customTabList || !this.setting) return;

    const sortableBtn = get<HTMLInputElement>('#sortable-btn', doc);
    const visibleBtn = get<HTMLInputElement>('#visible-btn', doc);
    const defaultBtn = get<HTMLButtonElement>('#default-btn', doc);

    // タブリストを完全にクリア
    customTabList.innerHTML = '';
    // 並び替えモードが残っているなら解除（ループ内で毎回行わない）
    if (sortableBtn && sortableBtn.checked) sortableBtn.checked = false;
    if (visibleBtn && visibleBtn.checked) visibleBtn.checked = false;

    // 設定からタブリストを構築（タブアイテムの簡単な生成はここに戻す）
    this.setting.tabs.forEach((tab, index) => {
      const visibleClass = tab.visible !== false ? '' : 'bg-secondary';
      const tabItem = create('div', { id: `tab-item-${index}`, className: `list-group-item list-group-item-action ${visibleClass}` }) as HTMLDivElement;
      tabItem.innerHTML = `<span class="tab-title">${tab.title || `タブ ${index + 1}`}</span>`;
      customTabList.appendChild(tabItem);
    });

    // ボタンのセットアップ（クローンしてイベントの重複を避ける）
    if (sortableBtn) this._setupSortableToggle(customTabList, sortableBtn);

    if (visibleBtn) this._setUpVisibilityToggle(customTabList, visibleBtn);

    if (defaultBtn) {
      const newDefaultBtn = defaultBtn.cloneNode(true) as HTMLButtonElement;
      defaultBtn.parentNode?.replaceChild(newDefaultBtn, defaultBtn);
      newDefaultBtn.addEventListener('click', async () => {

        // デフォルトに戻すかどうか確認
        const confirmed = await this.confirmModal(doc, 'タブの設定をデフォルトに戻しますか？');
        if (!confirmed) return;

        if (!this.adapter) return;
        const settings = await getAllSettings();
        const siteKey = this.adapter.siteName() || '';
        const siteSetting = settings[siteKey];
        if (!siteSetting || !siteSetting.defaultTabs) return;

        this.setting.tabs = siteSetting.defaultTabs;
        await saveSettings({ [siteKey]: this.setting });
        if (this.panel) this.panel.messageOutput('タブがデフォルトにリセットされました', dateTime());

        if (sortableBtn) {
          const a = sortableBtn.nextElementSibling as HTMLElement | null;
          a?.click(); // 並び替えモードを再適用
        }

        // 再構築
        this._setUpSettings(doc);
      });
    }
  }

  /** 並び替えトグルのセットアップ */
  private _setupSortableToggle(customTabList: Element, sortableBtn: HTMLInputElement): void {
    const newSortableBtn = sortableBtn.cloneNode(true) as HTMLInputElement;
    sortableBtn.parentNode?.replaceChild(newSortableBtn, sortableBtn);

    newSortableBtn.addEventListener('click', () => {
      const sortableIcon = create('i', { className: 'bi bi-list pe-1 sortable-icon' }) as HTMLElement;
      sortableIcon.style.cssText = 'font-size: 16px; line-height: 1; cursor: grab;';

      Array.from(customTabList.children).forEach(tab => {
        const existingIcon = get<HTMLElement>('.sortable-icon', tab);
        if (existingIcon) {
          existingIcon.classList.toggle('d-none');
        } else {
          tab.insertBefore(sortableIcon.cloneNode(true), tab.firstChild);
        }
      });

      // Sortable 初期化
      new Sortable(customTabList as HTMLElement, {
        draggable: '.list-group-item',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: async evt => {
          const oldIndex = evt.oldIndex as number;
          const newIndex = evt.newIndex as number;
          const movedTab = this.setting!.tabs.splice(oldIndex, 1)[0];
          this.setting!.tabs.splice(newIndex, 0, movedTab);

          if (this.adapter) {
            const update: Partial<ISettings> = {};
            update[this.adapter.siteName()] = this.setting;
            await saveSettings(update);
            if (this.panel) this.panel.messageOutput('タブの並び順が変更されました', dateTime());
          }
        }
      });
    });
  }

  /** タブの表示切替 */
  private _setUpVisibilityToggle(customTabList: Element, visibleBtn: HTMLInputElement): void {

    visibleBtn.addEventListener('change', async (event) => {
      const existingIcons = getAll<HTMLElement>('.visible-icon', customTabList);
      const checked = (event.target as HTMLInputElement).checked;

      if (existingIcons.length > 0) {
        existingIcons.forEach(icon => icon.classList.toggle('d-none', !checked));
      } else {
        Array.from(customTabList.children).forEach(tab => {
          const isHidden = tab.classList.contains('bg-secondary');
          const icon = create('i', { className: `bi ${isHidden ? 'bi-eye-slash' : 'bi-eye'} pe-1 visible-icon` }) as HTMLElement;
          icon.style.cssText = 'font-size: 16px; line-height: 1; cursor: pointer;';
          tab.insertBefore(icon, tab.firstChild);

          icon.addEventListener('click', async () => {
            if (!this.adapter) return;

            tab.classList.toggle('bg-secondary');
            icon.classList.toggle('bi-eye-slash');
            icon.classList.toggle('bi-eye');

            const update: Partial<ISettings> = { [this.adapter.siteName()]: this.setting };
            update[this.adapter.siteName()]?.tabs.forEach((t, i) => {
              t.visible = !customTabList.children[i].classList.contains('bg-secondary');
            });
            await saveSettings(update);

            if (this.panel) this.panel.messageOutput('タブの表示が変更されました', dateTime());
          });
        });
      }
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

  // 確認モーダルを表示して結果を返す
  private confirmModal(doc: Document, messageText: string): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = create('div', { className: 'overlay' }) as HTMLDivElement;
      const dialog = create('div', { className: 'modal-dialog-element' }) as HTMLDivElement;
      const message = create('p', { textContent: messageText }) as HTMLParagraphElement;

      const buttons = create('div', { className: 'modal-buttons' }) as HTMLDivElement;
      const noBtn = create('button', { className: 'btn btn-secondary', textContent: 'いいえ' }) as HTMLButtonElement;
      const yesBtn = create('button', { className: 'btn btn-primary', textContent: 'はい' }) as HTMLButtonElement;
      noBtn.onclick = () => { overlay.remove(); resolve(false); };
      yesBtn.onclick = () => { overlay.remove(); resolve(true); };

      buttons.append(noBtn, yesBtn);
      dialog.append(message, buttons);
      overlay.appendChild(dialog);
      doc.body.appendChild(overlay);
    });
  }
}
