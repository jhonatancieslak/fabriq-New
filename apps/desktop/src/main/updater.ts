// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';

export function initUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:status', { state: 'downloading', version: info.version });
  });
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update:status', { state: 'ready', version: info.version });
  });
  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update:status', { state: 'error', message: err.message });
  });

  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 30 * 60 * 1000);
}

export function installUpdateNow(): void {
  autoUpdater.quitAndInstall();
}
