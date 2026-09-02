// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('fabriq', {
  openDxfDwg: () => ipcRenderer.invoke('file:openDxfDwg'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  auth: {
    login: (email: string, password: string) => ipcRenderer.invoke('auth:login', { email, password }),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getState: () => ipcRenderer.invoke('auth:getState'),
    checkLicense: () => ipcRenderer.invoke('auth:checkLicense'),
  },
  update: {
    installNow: () => ipcRenderer.invoke('update:installNow'),
    onStatus: (cb: (status: { state: string; version?: string; message?: string }) => void) => {
      const listener = (_e: unknown, status: { state: string; version?: string; message?: string }) => cb(status);
      ipcRenderer.on('update:status', listener);
      return () => ipcRenderer.removeListener('update:status', listener);
    },
  },
});
