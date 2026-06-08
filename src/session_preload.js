const { contextBridge, ipcRenderer } = require('electron');

let allowlist = [];
const arg = process.argv.find(a => a.startsWith('--allowlist='));
if (arg) {
  try {
    allowlist = JSON.parse(arg.substring('--allowlist='.length));
  } catch (e) {}
}

function isAllowed(urlStr) {
  try {
    const url = new URL(urlStr, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return true; 
    const domainAndPath = url.host + url.pathname;
    return allowlist.some(entry => {
      const cleanEntry = entry.replace(/^https?:\/\//, '');
      if (cleanEntry.includes('*')) {
        const escaped = cleanEntry.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const regexStr = '^' + escaped.replace(/\\\*/g, '.*');
        return new RegExp(regexStr).test(domainAndPath);
      }
      if (cleanEntry.includes('/')) return domainAndPath.startsWith(cleanEntry);
      return url.host === cleanEntry;
    });
  } catch (e) {
    return false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    a[data-pericarp-blocked="true"] {
      color: #888 !important;
      text-decoration: line-through !important;
      cursor: not-allowed !important;
      opacity: 0.6 !important;
    }
  `;
  document.head.appendChild(style);
  
  function processLinks() {
    document.querySelectorAll('a').forEach(a => {
      if (a.hasAttribute('data-pericarp-blocked')) return;
      if (!a.href) return;
      
      if (!isAllowed(a.href)) {
        a.setAttribute('data-pericarp-blocked', 'true');
        a.title = 'Blocked by Pericarp allowlist';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          ipcRenderer.send('log-inert-click', a.href);
        });
      }
    });
  }

  processLinks();
  const observer = new MutationObserver(processLinks);
  observer.observe(document.body, { childList: true, subtree: true });
});
