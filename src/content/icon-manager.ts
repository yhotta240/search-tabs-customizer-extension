import { create } from "../utils/dom";

/**
 * カスタムタブ用のアイコン要素を生成して管理する。
 */
export class IconManager {
  private iconElement: HTMLElement | null = null;
  private clickHandler?: () => void;

  constructor(clickHandler?: () => void) {
    this.clickHandler = clickHandler;
  }

  /**
   * コンテナにアイコンを追加．複数回呼んでも一度だけ追加される．
   */
  addIcon(container: Element): void {
    if (this.iconElement) return;

    const icon = this.createIcon();
    container.appendChild(icon);
    this.iconElement = icon;
  }

  /**
   * 現在追加されているアイコンを取り除く（DOMから削除して内部参照をクリア）
   */
  removeIcon(): void {
    if (!this.iconElement) return;
    this.iconElement.remove();
    this.iconElement = null;
  }

  private createIcon(): HTMLDivElement {
    const icon = create('div', { className: 'custom-tab-icon', title: 'Custom Tab Icon' }) as HTMLDivElement;
    icon.style.cssText = `
      display: flex;
      align-items: end;
      justify-content: center;
      padding: 10px 16px 10px 16px;
      cursor: pointer;
      color: #5f6368;
      border-radius: 10px 10px 0 0;
      transition: background-color 0.3s;
    `;

    // ホバー効果（簡易）
    icon.addEventListener('mouseover', () => {
      icon.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
    });
    icon.addEventListener('mouseout', () => {
      icon.style.backgroundColor = 'transparent';
    });

    const img = create('img', {
      src: chrome.runtime.getURL('icons/icon.png'),
      alt: 'Tab Customizer Icon',
      title: 'Tab Customizer Icon'
    }) as HTMLImageElement;
    img.style.cssText = 'width: 20px; height: 20px;';

    icon.appendChild(img);

    icon.addEventListener('click', this.handleIconClick);

    return icon;
  }

  private handleIconClick = (): void => {
    this.clickHandler?.();
  };

  /**
   * クリックハンドラを設定．既存のハンドラは上書きされる．
   */
  click(callback: () => void): void {
    this.clickHandler = callback;
  }

  /**
   * 管理状態をリセット（DOMからの削除を含む）
   */
  reset(): void {
    this.removeIcon();
  }
}
