// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { login, logout, getAuthState, checkLicense } from './auth';
import { initUpdater, installUpdateNow, checkForUpdatesOnce } from './updater';

const isDev = !app.isPackaged;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'FABRIQ',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5190');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  if (!isDev) initUpdater(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('file:openDxfDwg', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Desenho CAD', extensions: ['dxf', 'dwg'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.dwg') {
    // DWG requer conversão — v1 aceita apenas DXF nativo; DWG fica para fase 2 (ODA/Teigha no Windows)
    return { ok: false, error: 'Ficheiros .dwg ainda não suportados nesta versão — exporte para .dxf no seu CAD.' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return { ok: true, fileName: path.basename(filePath), content };
});

ipcMain.handle('auth:login', (_e, { email, password }: { email: string; password: string }) =>
  login(email, password),
);
ipcMain.handle('auth:logout', () => logout());
ipcMain.handle('auth:getState', () => getAuthState());
ipcMain.handle('auth:checkLicense', () => checkLicense());
ipcMain.handle('update:installNow', () => installUpdateNow());
ipcMain.handle('update:checkAndWait', () => (isDev ? Promise.resolve({ hasUpdate: false }) : checkForUpdatesOnce()));
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('billing:openPortal', () => shell.openExternal('https://app.fabriq.pt/billing'));
