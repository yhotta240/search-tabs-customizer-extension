import { ModalPanel } from './components/modal-panel';
import { clickURL } from './utils/dom';
import { dateTime } from './utils/date';
import { getSiteAccessText } from './utils/permissions';
import meta from '../public/manifest.meta.json';

// Modal entry script: initialize modal UI when modal.html (standalone) is opened
document.addEventListener('DOMContentLoaded', () => {
  try {
    const doc = document;
    const panel = new ModalPanel(doc);

    const manifestData = chrome.runtime.getManifest();

    const enabledElement = doc.getElementById('enabled') as HTMLInputElement | null;

    // load initial state
    chrome.storage.local.get(['settings', 'enabled'], (data) => {
      if (enabledElement) {
        const enabled = data.enabled ?? true;
        enabledElement.checked = enabled;
      }
      panel.messageOutput(`${manifestData.short_name} が起動しました`, dateTime());
    });

    if (enabledElement) {
      enabledElement.addEventListener('change', (event) => {
        const checked = (event.target as HTMLInputElement).checked;
        chrome.storage.local.set({ enabled: checked }, () => {
          panel.messageOutput(checked ? `${manifestData.short_name} は有効になっています` : `${manifestData.short_name} は無効になっています`, dateTime());
        });
      });
    }

    // initialize UI texts and links
    const short_name = manifestData.short_name || manifestData.name;
    const title = doc.getElementById('title');
    if (title) title.textContent = short_name;
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

    chrome.permissions.getAll((result) => {
      const permissionInfo = doc.getElementById('permission-info');
      const permissions = result.permissions;
      if (permissionInfo && permissions) {
        permissionInfo.textContent = permissions.join(', ');
      }

      const siteAccess = getSiteAccessText(result.origins);
      const siteAccessElement = doc.getElementById('site-access');
      if (siteAccessElement) siteAccessElement.innerHTML = siteAccess;
    });

    chrome.extension.isAllowedIncognitoAccess((isAllowedAccess) => {
      const incognitoEnabled = doc.getElementById('incognito-enabled');
      if (incognitoEnabled) incognitoEnabled.textContent = isAllowedAccess ? '有効' : '無効';
    });

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

  } catch (e) {
    console.error('Failed to initialize modal page UI', e);
  }
});
