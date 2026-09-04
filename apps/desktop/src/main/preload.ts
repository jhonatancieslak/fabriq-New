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
    checkManual: () => ipcRenderer.invoke('update:checkManual'),
    downloadUpdate: () => ipcRenderer.invoke('update:downloadUpdate'),
    onStatus: (cb: (status: { state: string; version?: string; message?: string; percent?: number }) => void) => {
      const listener = (_e: unknown, status: { state: string; version?: string; message?: string; percent?: number }) => cb(status);
      ipcRenderer.on('update:status', listener);
      return () => ipcRenderer.removeListener('update:status', listener);
    },
  },
  billing: {
    openPortal: () => ipcRenderer.invoke('billing:openPortal'),
  },
  clients: {
    list: (search?: string) => ipcRenderer.invoke('clients:list', search),
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
