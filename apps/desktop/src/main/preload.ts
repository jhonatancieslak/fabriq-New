// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('fabriq', {
  openDxfDwg: () => ipcRenderer.invoke('file:openDxfDwg'),
});
