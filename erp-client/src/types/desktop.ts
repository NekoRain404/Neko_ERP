export interface DesktopWindowState {
  isMaximized: boolean
  isFocused: boolean
  isFullScreen: boolean
}

export interface DesktopSystemPreferences {
  colorScheme: 'light' | 'dark'
  locale: string
}

export interface DesktopGpuStatus {
  hardwareAcceleration: boolean
  gpuRasterization: boolean
  zeroCopy: boolean
  featureStatus: Record<string, string>
}

export interface DesktopChosenFile {
  path: string
  name: string
  dataBase64: string
}

export interface DesktopSavedFile {
  canceled: boolean
  path?: string
}

export interface DesktopSaveFilePayload {
  suggestedName: string
  dataBase64: string
  mimeType?: string
}

export interface DesktopRuntimeSettings {
  hardwareAcceleration: boolean
}

export interface DesktopBridge {
  isDesktop: boolean
  platform: string
  getAppVersion: () => Promise<string>
  getSystemPreferences: () => Promise<DesktopSystemPreferences>
  getGpuStatus: () => Promise<DesktopGpuStatus>
  getRuntimeSettings: () => Promise<DesktopRuntimeSettings>
  getWindowState: () => Promise<DesktopWindowState>
  minimizeWindow: () => Promise<void>
  toggleMaximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  restartApp: () => Promise<void>
  setNativeThemeSource: (value: 'system' | 'light' | 'dark') => Promise<void>
  setProxySettings: (payload: { proxyRules: string; proxyBypassRules?: string }) => Promise<void>
  setRuntimeSettings: (payload: DesktopRuntimeSettings) => Promise<DesktopRuntimeSettings>
  chooseFile: (options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<DesktopChosenFile | null>
  saveFile: (payload: DesktopSaveFilePayload) => Promise<DesktopSavedFile>
  printCurrentWindow: (options?: { silent?: boolean }) => Promise<boolean>
  onWindowStateChanged: (callback: (payload: DesktopWindowState) => void) => () => void
  onSystemPreferencesChanged: (callback: (payload: DesktopSystemPreferences) => void) => () => void
  sendNotification: (title: string, body: string) => void
  playSystemSound: (kind?: 'default' | 'success' | 'warning' | 'error') => void
  openWindow: (url: string, options?: Record<string, unknown>) => void
}
