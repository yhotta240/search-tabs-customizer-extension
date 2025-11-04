export class ModalPanel {
  private root: Document;
  private win: Window;
  private header: HTMLElement;
  private tabMenu: HTMLElement;
  private maximizeButton: HTMLButtonElement;
  private minimizeButton: HTMLButtonElement;
  private closeButton: HTMLButtonElement;
  private panelButton: HTMLButtonElement;
  private resizer: HTMLElement;
  private panel: HTMLElement;
  private messageDiv: HTMLElement;
  private clearButton: HTMLButtonElement;
  private messageClearIcon: HTMLImageElement;

  private startY: number = 0;
  private tmpPanelHeight: number = 0;
  private startHeightTop: number = 0;
  private emdHeight: number = 150;
  private isDragging: boolean = false;

  constructor(root: Document = document) {
    this.root = root;
    this.win = (this.root.defaultView as Window) || window;
    this.header = this.root.querySelector('#header')!;
    this.tabMenu = this.root.querySelector('#tab-menu')!;
    this.maximizeButton = this.root.querySelector("#maximize-button")!;
    this.minimizeButton = this.root.querySelector("#minimize-button")!;
    this.closeButton = this.root.querySelector("#close-button")!;
    this.panelButton = this.root.querySelector("#panel-button")!;
    this.resizer = this.root.querySelector('#resizer')!;
    this.panel = this.root.querySelector('#panel')!;
    this.messageDiv = this.root.querySelector('#message')!;
    this.clearButton = this.root.querySelector('#clear-button')!;
    this.messageClearIcon = this.root.querySelector('#message-clear-icon')!;

    this.initializePanel();
    this.addEventListeners();
  }

  private initializePanel(): void {
    this.panel.style.display = 'block';
    this.panel.style.height = '0';
    this.closeButton.style.display = 'none';
    this.messageClearIcon.src = chrome.runtime.getURL('icons/list_clear.png');

    this.switchMinMaxButtons();
  }

  private getPanelHeight(): number {
    return this.root.documentElement.clientHeight - this.tabMenu.offsetHeight - this.resizer.offsetHeight;
  }

  private togglePanel(isOpen: boolean): void {
    if (!this.isDragging) {
      this.panel.style.height = isOpen ? `${this.emdHeight}px` : '0px';
    }

    const panelHeight = parseFloat(this.panel.style.height);
    const isPanelVisible = panelHeight > 50 && isOpen;

    this.closeButton.style.display = isPanelVisible ? 'block' : 'none';
    this.closeButton.children[0].setAttribute('style', `display: ${isPanelVisible ? 'block' : 'none'}`);
    this.panelButton.style.display = isPanelVisible ? 'none' : 'block';
    this.panelButton.children[0].setAttribute('style', `display: ${isPanelVisible ? 'none' : 'block'}`);

    if (isOpen && (this.panel.offsetHeight === this.getPanelHeight())) {
      this.maximizeButton.style.display = 'none';
      this.minimizeButton.style.display = 'block';
    }
  }

  private switchMinMaxButtons(): void {
    const panelHeight = parseFloat(this.panel.style.height);
    const isMaximized = panelHeight > this.getPanelHeight() - 20;
    this.maximizeButton.style.display = isMaximized ? 'none' : 'block';
    this.minimizeButton.style.display = isMaximized ? 'block' : 'none';
  }

  private addEventListeners(): void {
    this.panelButton.addEventListener('click', () => {
      this.togglePanel(true);
      this.switchMinMaxButtons();
    });

    this.closeButton.addEventListener('click', () => {
      this.togglePanel(false);
      this.switchMinMaxButtons();
      this.emdHeight = this.panel.offsetHeight > this.getPanelHeight() - 20 ? 150 : this.panel.offsetHeight;
    });

    this.resizer.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      this.panel.classList.add('no-transition');
      this.resizer.style.backgroundColor = '#4688F1';
      this.startY = e.clientY;
      this.startHeightTop = this.panel.offsetHeight;
      this.tmpPanelHeight = (this.panel.offsetHeight === 0 || this.panel.offsetHeight === this.getPanelHeight() || parseFloat(this.panel.style.height) > this.getPanelHeight() - 15) ? 150 : this.panel.offsetHeight;
    });

    this.win.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDragging) {
        if (this.header.offsetHeight >= e.clientY - 20) {
          this.panel.style.height = `${this.getPanelHeight()}px`;
          return;
        }
        const dy = e.clientY - this.startY;
        const newHeightTop = this.startHeightTop - dy;
        this.panel.style.height = `${newHeightTop}px`;
        this.togglePanel(true);
        this.switchMinMaxButtons();
      }
    });

    this.win.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.panel.classList.remove('no-transition');
        this.resizer.style.backgroundColor = '';
        this.emdHeight = this.panel.offsetHeight;
        const panelHeights = this.panel.offsetHeight;
        if (panelHeights < 50) {
          this.emdHeight = 150;
          this.togglePanel(false);
        }
        if (panelHeights > this.getPanelHeight() - 20) {
          this.emdHeight = 150;
          this.panel.style.height = `${this.getPanelHeight()}px`;
        }
        this.switchMinMaxButtons();
      }
    });

    this.maximizeButton.addEventListener('click', () => {
      this.tmpPanelHeight = (this.panel.offsetHeight === 0 || this.panel.offsetHeight === this.getPanelHeight() || parseFloat(this.panel.style.height) > this.getPanelHeight() - 20) ? 150 : this.panel.offsetHeight;
      this.togglePanel(true);
      this.panel.style.height = `${this.getPanelHeight()}px`;
      this.switchMinMaxButtons();
    });

    this.minimizeButton.addEventListener('click', () => {
      this.togglePanel(true);
      this.panel.style.height = `${this.tmpPanelHeight}px`;
      this.switchMinMaxButtons();
    });

    this.clearButton.addEventListener('click', () => {
      this.clearMessage();
    });
  }

  public messageOutput(message: string, datetime: string): void {
    if (this.messageDiv) {
      this.messageDiv.innerHTML += `<p class="m-0">[${datetime}] ${message}</p>`;
    }
  }

  public clearMessage(): void {
    if (this.messageDiv) {
      this.messageDiv.innerHTML = '<p class="m-0"></p>';
    }
  }
}

