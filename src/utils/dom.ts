/**
 * HTML要素を作成し，オプションでプロパティや属性を設定する
 * @param tagName - 作成するHTML要素のタグ名
 * @param options - 設定するプロパティや属性のオブジェクト
 * @returns 作成されたHTML要素
  * @example
 * const div = create('div', { id: 'my-div', className: 'container' });
 * const link = create('a', { href: 'https://example.com', target: '_blank', innerText: 'Example' });
 */
export function create<K extends keyof HTMLElementTagNameMap>(tagName: K, options: Partial<HTMLElementTagNameMap[K]> & Record<string, any> = {}): HTMLElementTagNameMap[K] {
  const el = document.createElement(tagName);
  for (const [key, value] of Object.entries(options)) {
    if (key in el) {
      // 既知プロパティなら代入
      (el as any)[key] = value;
    } else {
      // 未知なら属性として設定
      el.setAttribute(key, String(value));
    }
  }
  return el;
}

/**
 * 指定したセレクターに一致する最初の要素を返す
 * @param selector - CSSセレクター文字列
 * @param root - 検索のルート要素（デフォルトはdocument）
 * @returns 指定したセレクターに一致する最初の要素またはnull
 */
export function get<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

/**
 * 指定したセレクターに一致するすべての要素を配列で返す
 * @param selector - CSSセレクター文字列
 * @param root - 検索のルート要素（デフォルトはdocument）
 * @returns 指定したセレクターに一致するすべての要素の配列
 */
export function getAll<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/**
 * HTML要素にクリックイベントを追加し，新しいタブでURLを開く
 * @param link - URLを開くHTML要素または文字列
 * @example
 * const link = document.getElementById('my-link');
 * clickURL(link);
 */
export function clickURL(link: HTMLElement | string | null): void {
  if (!link) return;

  const url = (link instanceof HTMLElement && link.hasAttribute('href')) ? (link as HTMLAnchorElement).href : (typeof link === 'string' ? link : null);
  if (!url) return;

  if (link instanceof HTMLElement) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      chrome.tabs.create({ url });
    });
  }
}
