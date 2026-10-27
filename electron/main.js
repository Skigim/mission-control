import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../server/server.js';
import {
  registerElectronFolderPicker,
  inspectLocalDirectory,
  openLocalDirectory
} from '../server/localFs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.argv.includes('--dev') || Boolean(process.env.VITE_DEV_SERVER_URL);

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('log-level', '3');
app.setAppUserModelId('com.skigim.missioncontrol');

let mainWindow = null;

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    focusMainWindow();
  });
}

// Register native Electron folder dialog for both IPC and REST calls
registerElectronFolderPicker(async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Local Project Directory',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('desktop:pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Local Project Directory',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { cancelled: true, path: null, inspection: null };
  }
  const selectedPath = result.filePaths[0];
  const inspection = inspectLocalDirectory(selectedPath);
  return { cancelled: false, path: selectedPath, inspection };
});

ipcMain.handle('desktop:inspect-folder', async (_event, targetPath) => {
  return inspectLocalDirectory(targetPath);
});

ipcMain.handle('desktop:open-folder', async (_event, targetPath, target) => {
  return openLocalDirectory(targetPath, target);
});

async function waitForUrl(url, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/html' },
        signal: AbortSignal.timeout(800)
      });
      if (res.ok) return true;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

async function createWindow() {
  await startServer(3001);

  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '..', 'assets', 'icon.ico')
    : path.join(__dirname, '..', 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1420,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: true,
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    title: 'Mission Control',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  focusMainWindow();

  let targetUrl = 'http://localhost:3001';
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    const ready = await waitForUrl(devUrl, 6000);
    if (ready) {
      targetUrl = devUrl;
    }
  }

  await mainWindow.loadURL(targetUrl);
  focusMainWindow();
}

if (gotTheLock) {
  app.whenReady().then(createWindow);
}

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
