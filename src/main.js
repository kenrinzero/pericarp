const { app, BrowserWindow, ipcMain, WebContentsView, session, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { isAllowed } = require('./allowlist');

let mainWindow;
let sess;
let views = [];
let activeViewIndex = 0;
let secondaryViewIndex = null;
let sidebarPos = 'left';
const SIDEBAR_WIDTH = 250;

let sessionLog = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('resize', () => {
    resizeViews();
  });

  // Stage 3: Window Close Interception for Export
  mainWindow.on('close', (e) => {
    if (sessionLog && sessionLog.startTime) {
      e.preventDefault(); // Pause the close
      
      const durationMinutes = Math.round((Date.now() - sessionLog.startTime) / 60000);
      const stats = {
        duration: durationMinutes,
        blocked: sessionLog.blockedClicks.length,
        redirects: sessionLog.redirects.length
      };
      
      mainWindow.webContents.send('show-summary', stats);
    }
  });

  mainWindow.on('closed', () => {
    if (sess) {
      sess.clearStorageData();
    }
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

function resizeViews() {
  if (!mainWindow || !views[activeViewIndex]) return;
  const [contentWidth, contentHeight] = mainWindow.getContentSize();
  const viewWidth = contentWidth - SIDEBAR_WIDTH;
  const x = sidebarPos === 'left' ? SIDEBAR_WIDTH : 0;
  
  if (secondaryViewIndex !== null && views[secondaryViewIndex]) {
    const halfWidth = Math.floor(viewWidth / 2);
    views[activeViewIndex].setBounds({ x, y: 0, width: halfWidth, height: contentHeight });
    views[secondaryViewIndex].setBounds({ x: x + halfWidth, y: 0, width: viewWidth - halfWidth, height: contentHeight });
  } else {
    views[activeViewIndex].setBounds({ x, y: 0, width: viewWidth, height: contentHeight });
  }
}

// Initialize Session
ipcMain.on('start-session', (event, payload) => {
  const allowlist = payload.allowlist;
  
  // Stage 3: Initialize Session Log state
  sessionLog = {
    startTime: Date.now(),
    allowlist: allowlist,
    duration: payload.duration,
    visited: [],
    blockedClicks: [],
    redirects: []
  };

  // Create in-memory session
  sess = session.fromPartition('in-memory', { cache: false });
  sess.clearStorageData();

  if (payload.duration) {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('session-time-up');
      }
    }, payload.duration * 60000);
  }

  sess.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
      try {
        if (!isAllowed(new URL(details.url), allowlist)) {
          return callback({ cancel: true });
        }
      } catch (e) {
        return callback({ cancel: true });
      }
    }
    callback({ cancel: false });
  });

  allowlist.forEach((entry, index) => {
    const view = new WebContentsView({
      session: sess,
      webPreferences: {
        preload: path.join(__dirname, 'session_preload.js'),
        additionalArguments: [`--allowlist=${JSON.stringify(allowlist)}`]
      }
    });

    view.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    view.webContents.on('will-navigate', (e, url) => {
      try {
        if (!isAllowed(new URL(url), allowlist)) {
          e.preventDefault();
          sessionLog.redirects.push({ timestamp: Date.now(), url });
          if (mainWindow) {
            mainWindow.webContents.send('redirect-blocked', url);
          }
        }
      } catch (err) {
        e.preventDefault();
      }
    });

    view.webContents.on('will-redirect', (e, url) => {
      try {
        if (!isAllowed(new URL(url), allowlist)) {
          e.preventDefault();
          sessionLog.redirects.push({ timestamp: Date.now(), url });
          if (mainWindow) {
            mainWindow.webContents.send('redirect-blocked', url);
          }
        }
      } catch (err) {
        e.preventDefault();
      }
    });

    view.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        if ((input.control || input.meta) && input.key === 'ArrowLeft') {
          if (view.webContents.canGoBack()) view.webContents.goBack();
          event.preventDefault();
        } else if ((input.control || input.meta) && input.key === 'ArrowRight') {
          if (view.webContents.canGoForward()) view.webContents.goForward();
          event.preventDefault();
        } else if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
          view.webContents.reload();
          event.preventDefault();
        } else if (input.key === 'F5') {
          view.webContents.reload();
          event.preventDefault();
        }
      }
    });

    // Stage 3: Log URL visits
    const logNav = (e, url) => { sessionLog.visited.push({ timestamp: Date.now(), url }); };
    view.webContents.on('did-navigate', logNav);
    view.webContents.on('did-navigate-in-page', logNav);

    view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      // Ignore aborts (e.g. from will-navigate/preventDefault) and subframes
      if (errorCode === -3 || !event.isMainFrame) return;
      view.webContents.loadURL(`data:text/html,${encodeURIComponent(
        `<html><body style="background:#171615;color:#888;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">` +
        `<p>Failed to load page.<br>${errorDescription} (${errorCode})</p></body></html>`
      )}`);
    });

    const startUrl = entry.startsWith('http') ? entry : `https://${entry}`;
    view.webContents.loadURL(startUrl);

    views.push(view);
  });

  activeViewIndex = 0;
  mainWindow.contentView.addChildView(views[0]);
  resizeViews();
});

ipcMain.on('switch-view', (event, index) => {
  if (index === activeViewIndex || !views[index]) return;
  
  if (views[activeViewIndex]) {
    mainWindow.contentView.removeChildView(views[activeViewIndex]);
  }
  if (secondaryViewIndex !== null && views[secondaryViewIndex]) {
    mainWindow.contentView.removeChildView(views[secondaryViewIndex]);
  }
  
  activeViewIndex = index;
  secondaryViewIndex = null;
  mainWindow.contentView.addChildView(views[activeViewIndex]);
  resizeViews();
});

ipcMain.on('split-view', (event, index) => {
  if (index === activeViewIndex || !views[index] || index === secondaryViewIndex) return;
  
  if (secondaryViewIndex !== null && views[secondaryViewIndex]) {
    mainWindow.contentView.removeChildView(views[secondaryViewIndex]);
  }
  
  secondaryViewIndex = index;
  mainWindow.contentView.addChildView(views[secondaryViewIndex]);
  resizeViews();
});

ipcMain.on('toggle-sidebar', (event, pos) => {
  sidebarPos = pos;
  resizeViews();
});

// Stage 3: Log inert clicks from preload
ipcMain.on('log-inert-click', (event, url) => {
  if (sessionLog) {
    sessionLog.blockedClicks.push({ timestamp: Date.now(), url });
  }
});

// Stage 4: Templates
function parseTemplate(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let allowlist = [];
    let duration = null;
    
    if (filePath.endsWith('.md')) {
      let inAllowlist = false;
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('## Allowlist')) {
          inAllowlist = true;
          continue;
        }
        if (inAllowlist && line.startsWith('- ')) {
          allowlist.push(line.substring(2).trim());
        } else if (inAllowlist && line.startsWith('##')) {
          inAllowlist = false;
        }
        
        const durationMatch = line.match(/\*\*Planned Duration:\*\*\s*(\d+)/);
        if (durationMatch) {
          duration = parseInt(durationMatch[1], 10);
        }
      }
    } else {
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          allowlist.push(trimmed);
        } else if (trimmed.startsWith('# Duration:')) {
          const match = trimmed.match(/# Duration:\s*(\d+)/);
          if (match) duration = parseInt(match[1], 10);
        }
      }
    }
    return { allowlist, duration };
  } catch (e) {
    return null;
  }
}

ipcMain.handle('import-template', async () => {
  const result = dialog.showOpenDialogSync(mainWindow, {
    title: 'Import Template',
    filters: [{ name: 'Templates or Logs', extensions: ['txt', 'md'] }]
  });
  
  if (!result || result.length === 0) return null;
  return parseTemplate(result[0]);
});

ipcMain.handle('parse-template-file', async (event, filePath) => {
  return parseTemplate(filePath);
});

ipcMain.handle('save-template', async (event, payload) => {
  const savePath = dialog.showSaveDialogSync(mainWindow, {
    title: 'Save Template',
    defaultPath: `pericarp-template.txt`,
    filters: [{ name: 'Text', extensions: ['txt'] }]
  });
  
  if (savePath) {
    let content = `# Pericarp Template\n`;
    if (payload.duration) {
      content += `# Duration: ${payload.duration}\n`;
    }
    content += `\n`;
    payload.allowlist.forEach(item => content += `${item}\n`);
    fs.writeFileSync(savePath, content, 'utf-8');
    return true;
  }
  return false;
});

// Summary Overlay Close actions
ipcMain.on('export-and-close', (event) => {
  if (sessionLog) {
    sessionLog.endTime = Date.now();
    const durationMinutes = Math.round((sessionLog.endTime - sessionLog.startTime) / 60000);
    
    let md = `# Pericarp Session Log\n\n`;
    md += `**Date:** ${new Date(sessionLog.startTime).toLocaleString()}\n`;
    md += `**Duration:** ${durationMinutes} minutes\n`;
    if (sessionLog.duration) {
      md += `**Planned Duration:** ${sessionLog.duration} minutes\n`;
    }
    md += `\n## Allowlist\n`;
    sessionLog.allowlist.forEach(item => md += `- ${item}\n`);
    
    md += `\n## Visited Pages\n`;
    sessionLog.visited.forEach(v => md += `- [${new Date(v.timestamp).toLocaleTimeString()}] ${v.url}\n`);
    
    md += `\n## Blocked Clicks\n`;
    sessionLog.blockedClicks.forEach(b => md += `- [${new Date(b.timestamp).toLocaleTimeString()}] ${b.url}\n`);
    
    md += `\n## Redirects Blocked\n`;
    sessionLog.redirects.forEach(r => md += `- [${new Date(r.timestamp).toLocaleTimeString()}] ${r.url}\n`);
    
    const savePath = dialog.showSaveDialogSync(mainWindow, {
      title: 'Save Session Log',
      defaultPath: `pericarp-session-${Date.now()}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Text', extensions: ['txt'] }]
    });
    
    if (savePath) {
      fs.writeFileSync(savePath, md, 'utf-8');
      require('electron').shell.openPath(savePath);
    }
  }
  
  sessionLog = null; 
  if (mainWindow) mainWindow.destroy();
});

ipcMain.on('force-close', () => {
  sessionLog = null;
  if (mainWindow) mainWindow.destroy();
});
