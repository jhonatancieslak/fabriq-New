// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';

let win: BrowserWindow | null = null;

function send(status: { state: string; version?: string; message?: string; percent?: number }): void {
  win?.webContents.send('update:status', status);
}

export function initUpdater(mainWindow: BrowserWindow): void {
  win = mainWindow;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => send({ state: 'up-to-date' }));
  autoUpdater.on('update-available', (info) => send({ state: 'found', version: info.version }));
  autoUpdater.on('download-progress', (progress) => {
    send({ state: 'downloading', percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    send({ state: 'ready', version: info.version, percent: 100 });
    autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', (err) => send({ state: 'error', message: err.message }));

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 30 * 60 * 1000);
}

// Usado no arranque, antes do login: verifica update e resolve assim que souber
// se há (para o renderer decidir se fica na tela de update ou segue para o login).
// Nunca rejeita — falha de rede/feed é tratada como "sem update" para não travar o utilizador.
export function checkForUpdatesOnce(): Promise<{ hasUpdate: boolean }> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (hasUpdate: boolean) => {
      if (done) return;
      done = true;
      resolve({ hasUpdate });
    };
    autoUpdater.once('update-available', () => finish(true));
    autoUpdater.once('update-not-available', () => finish(false));
    autoUpdater.once('error', () => finish(false));
    autoUpdater.checkForUpdates().catch(() => finish(false));
    setTimeout(() => finish(false), 10000);
  });
}

export function installUpdateNow(): void {
  autoUpdater.quitAndInstall();
}
