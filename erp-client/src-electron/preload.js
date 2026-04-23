import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('erpDesktop', {
  isDesktop: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getSystemPreferences: () => ipcRenderer.invoke('system:get-preferences'),
  getGpuStatus: () => ipcRenderer.invoke('system:get-gpu-status'),
  getRuntimeSettings: () => ipcRenderer.invoke('system:get-runtime-settings'),
  getWindowState: () => ipcRenderer.invoke('window:get-state'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  setNativeThemeSource: (value) => ipcRenderer.invoke('system:set-theme-source', value),
  setProxySettings: (payload) => ipcRenderer.invoke('system:set-proxy-settings', payload),
  setRuntimeSettings: (payload) => ipcRenderer.invoke('system:set-runtime-settings', payload),
  chooseFile: (options) => ipcRenderer.invoke('file:choose', options),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  printCurrentWindow: (options) => ipcRenderer.invoke('window:print', options),
  onWindowStateChanged: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('window:state-changed', listener)
    return () => ipcRenderer.removeListener('window:state-changed', listener)
  },
  onSystemPreferencesChanged: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('system:preferences-changed', listener)
    return () => ipcRenderer.removeListener('system:preferences-changed', listener)
  },
  sendNotification: (title, body) => ipcRenderer.send('notification:send', { title, body }),
  playSystemSound: (kind) => ipcRenderer.send('sound:play', { kind }),
  openWindow: (url, options) => ipcRenderer.send('window:open', { url, options }),
})
