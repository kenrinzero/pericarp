const { contextBridge, ipcRenderer } = require('electron');
const { isAllowed } = require('./allowlist');

let allowlist = [];
const arg = process.argv.find(a => a.startsWith('--allowlist='));
if (arg) {
  try {
    allowlist = JSON.parse(arg.substring('--allowlist='.length));
  } catch (e) {}
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
      
      try {
        if (!isAllowed(new URL(a.href, window.location.href), allowlist)) {
          a.setAttribute('data-pericarp-blocked', 'true');
          a.title = 'Blocked by Pericarp allowlist';
          a.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ipcRenderer.send('log-inert-click', a.href);
          });
        }
      } catch (e) {
        // Malformed URL — block it
        a.setAttribute('data-pericarp-blocked', 'true');
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
