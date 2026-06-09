// Electron main process (CommonJS — no build step needed).
// Owns the fullscreen window and the atomic save-file I/O exposed over IPC.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';

let saveFile;
let backupFile;

function resolveSavePaths() {
  const dir = app.getPath('userData');
  saveFile = path.join(dir, 'menu-idle-save.json');
  backupFile = path.join(dir, 'menu-idle-save.bak.json');
}

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    backgroundColor: '#0b0c11',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.removeMenu();
  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // F11 toggles fullscreen, Escape leaves it — basic comfort for a fullscreen game.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false);
      event.preventDefault();
    }
  });
}

// --- Save IPC: atomic write (temp + rename) with a backup slot ---
ipcMain.handle('save:write', (_evt, json) => {
  try {
    if (fs.existsSync(saveFile)) {
      try { fs.copyFileSync(saveFile, backupFile); } catch (_) { /* best effort */ }
    }
    const tmp = saveFile + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, saveFile);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('save:read', () => {
  try {
    if (fs.existsSync(saveFile)) {
      return { ok: true, data: fs.readFileSync(saveFile, 'utf8') };
    }
    if (fs.existsSync(backupFile)) {
      return { ok: true, data: fs.readFileSync(backupFile, 'utf8'), fromBackup: true };
    }
    return { ok: true, data: null };
  } catch (err) {
    // Corrupt primary — try the backup before giving up.
    try {
      if (fs.existsSync(backupFile)) {
        return { ok: true, data: fs.readFileSync(backupFile, 'utf8'), fromBackup: true };
      }
    } catch (_) { /* ignore */ }
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('save:clear', () => {
  try {
    for (const f of [saveFile, backupFile]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

app.whenReady().then(() => {
  resolveSavePaths();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
