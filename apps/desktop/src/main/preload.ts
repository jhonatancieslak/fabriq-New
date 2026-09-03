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
    checkAndWait: () => ipcRenderer.invoke('update:checkAndWait'),
    onStatus: (cb: (status: { state: string; version?: string; message?: string }) => void) => {
      const listener = (_e: unknown, status: { state: string; version?: string; message?: string }) => cb(status);
      ipcRenderer.on('update:status', listener);
      return () => ipcRenderer.removeListener('update:status', listener);
    },
  },
  billing: {
    openPortal: () => ipcRenderer.invoke('billing:openPortal'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximizeToggle: () => ipcRenderer.invoke('window:maximizeToggle'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (cb: (maximized: boolean) => void) => {
      const listener = (_e: unknown, maximized: boolean) => cb(maximized);
      ipcRenderer.on('window:maximized', listener);
      return () => ipcRenderer.removeListener('window:maximized', listener);
    },
  },
});
