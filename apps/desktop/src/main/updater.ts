// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';

let win: BrowserWindow | null = null;

function send(status: { state: string; version?: string; message?: string; percent?: number }): void {
  win?.webContents.send('update:status', status);
}

export function initUpdater(mainWindow: BrowserWindow): void {
  win = mainWindow;
  // Download não é mais automático: fluxo forçado do pré-login chama downloadUpdate()
  // ele próprio; fluxo manual (botão "Atualizar" na titlebar) só baixa depois do
  // utilizador confirmar no modal.
  autoUpdater.autoDownload = false;
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
// Encontrando update, baixa sozinho (fluxo forçado, sem confirmação do utilizador).
// Falha real (rede/feed) é reportada via evento 'error' — quem escuta decide o que fazer;
// aqui resolve hasUpdate:false só pra não travar o login.
export function checkForUpdatesOnce(): Promise<{ hasUpdate: boolean }> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (hasUpdate: boolean) => {
      if (done) return;
      done = true;
      resolve({ hasUpdate });
    };
    autoUpdater.once('update-available', () => {
      autoUpdater.downloadUpdate().catch(() => {});
      finish(true);
    });
    autoUpdater.once('update-not-available', () => finish(false));
    autoUpdater.once('error', () => finish(false));
    autoUpdater.checkForUpdates().catch(() => finish(false));
    setTimeout(() => finish(false), 10000);
  });
}

// Fluxo manual (botão "Atualizar" na titlebar): dispara a verificação e deixa os
// eventos ('checking'/'found'/'up-to-date'/'error') fluírem pro modal via update:status.
// Não baixa sozinho — espera confirmação via downloadUpdate().
export function checkForUpdatesManual(): void {
  autoUpdater.checkForUpdates().catch((err) => send({ state: 'error', message: err.message }));
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((err) => send({ state: 'error', message: err.message }));
}

export function installUpdateNow(): void {
  autoUpdater.quitAndInstall();
}
