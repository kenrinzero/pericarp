const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startSession: (payload) => ipcRenderer.send('start-session', payload),
  switchView: (index) => ipcRenderer.send('switch-view', index),
  toggleSidebar: (position) => ipcRenderer.send('toggle-sidebar', position),
  onRedirectBlocked: (callback) => ipcRenderer.on('redirect-blocked', (_event, url) => callback(url)),
  importTemplate: () => ipcRenderer.invoke('import-template'),
  parseTemplateFile: (filePath) => ipcRenderer.invoke('parse-template-file', filePath),
  saveTemplate: (payload) => ipcRenderer.invoke('save-template', payload),
  splitView: (index) => ipcRenderer.send('split-view', index),
  onSessionTimeUp: (callback) => ipcRenderer.on('session-time-up', callback),
  onShowSummary: (callback) => ipcRenderer.on('show-summary', (_event, stats) => callback(stats)),
  exportAndClose: () => ipcRenderer.send('export-and-close'),
  forceClose: () => ipcRenderer.send('force-close')
});
