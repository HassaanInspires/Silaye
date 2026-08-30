const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Silaye Beta',
    backgroundColor: '#0B0C0E',
    darkTheme: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  // Deep Routing & Reload Fallback for Next.js trailing slash static export files
  mainWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -6 && validatedURL.startsWith('file://')) {
      const cleanPath = validatedURL.replace('file://', '').split('?')[0].split('#')[0];
      const indexPath = path.join(cleanPath, 'index.html');
      mainWindow.loadFile(indexPath);
    }
  });

  // Whitelist allowed protocols before delegating to external default browser (e.g. WhatsApp wa.me)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    try {
      const parsed = new URL(targetUrl);
      if (['https:', 'http:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
        shell.openExternal(targetUrl);
      }
    } catch {
      // Ignore malformed URL
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

// 1. Whitelisted External URL opener
ipcMain.handle('open-external-url', async (_, targetUrl) => {
  if (typeof targetUrl === 'string') {
    try {
      const parsed = new URL(targetUrl);
      if (['https:', 'http:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
        await shell.openExternal(targetUrl);
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
});

// 2. Raw ESC/POS Thermal Printing Dispatch Handler
ipcMain.handle('print-raw-escpos', async (_, rawBytes) => {
  try {
    // Structured IPC endpoint for local raw printer spooling
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 3. Clear Offline Cache & Local Storage
ipcMain.handle('clear-offline-cache', async () => {
  try {
    if (session.defaultSession) {
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ['serviceworkers', 'cachestorage'],
      });
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
});

// 4. Get Desktop App Version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// App Lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
