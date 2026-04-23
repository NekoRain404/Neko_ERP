import { app, BrowserWindow, dialog, ipcMain, nativeTheme, Notification, session, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { promises as fs } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const INITIAL_ROUTE = '/splash'
const RUNTIME_SETTINGS_PATH = path.join(app.getPath('userData'), 'runtime-settings.json')
const runtimeSettings = loadRuntimeSettings()
const DESKTOP_GPU_MODE = {
  hardwareAcceleration: runtimeSettings.hardwareAcceleration,
  gpuRasterization: runtimeSettings.hardwareAcceleration,
  zeroCopy: runtimeSettings.hardwareAcceleration,
}

if (!DESKTOP_GPU_MODE.hardwareAcceleration) {
  app.disableHardwareAcceleration()
} else {
  if (DESKTOP_GPU_MODE.gpuRasterization) {
    app.commandLine.appendSwitch('enable-gpu-rasterization')
  }
  if (DESKTOP_GPU_MODE.zeroCopy) {
    app.commandLine.appendSwitch('enable-zero-copy')
  }
}

function emitWindowState(win) {
  if (win.isDestroyed()) return
  win.webContents.send('window:state-changed', {
    isMaximized: win.isMaximized(),
    isFocused: win.isFocused(),
    isFullScreen: win.isFullScreen(),
  })
}

function getSystemPreferencesPayload() {
  return {
    colorScheme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    locale: app.getLocale(),
  }
}

function getGpuStatusPayload() {
  return {
    hardwareAcceleration: DESKTOP_GPU_MODE.hardwareAcceleration,
    gpuRasterization: app.commandLine.hasSwitch('enable-gpu-rasterization'),
    zeroCopy: app.commandLine.hasSwitch('enable-zero-copy'),
    featureStatus: app.getGPUFeatureStatus(),
  }
}

function loadRuntimeSettings() {
  const defaults = {
    hardwareAcceleration: true,
  }
  try {
    if (!existsSync(RUNTIME_SETTINGS_PATH)) return defaults
    const raw = readFileSync(RUNTIME_SETTINGS_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      ...defaults,
      ...parsed,
      hardwareAcceleration: parsed?.hardwareAcceleration !== false,
    }
  } catch {
    return defaults
  }
}

async function persistRuntimeSettings(payload) {
  await fs.mkdir(path.dirname(RUNTIME_SETTINGS_PATH), { recursive: true })
  await fs.writeFile(RUNTIME_SETTINGS_PATH, JSON.stringify(payload, null, 2), 'utf-8')
}

function resolveWindowBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#11161b' : '#f5f6f8'
}

function emitSystemPreferences(win) {
  if (win.isDestroyed()) return
  win.webContents.send('system:preferences-changed', getSystemPreferencesPayload())
}

function broadcastSystemPreferences() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.setBackgroundColor(resolveWindowBackgroundColor())
      emitSystemPreferences(win)
    }
  }
}

async function applyProxySettings(proxyRules = '', proxyBypassRules = '') {
  if (!session.defaultSession) return
  if (!proxyRules) {
    await session.defaultSession.setProxy({ mode: 'direct' })
    return
  }
  await session.defaultSession.setProxy({
    mode: 'fixed_servers',
    proxyRules,
    proxyBypassRules,
  })
}

function resolveRouteHash(routePath = INITIAL_ROUTE) {
  if (!routePath) return ''
  return routePath.startsWith('#') ? routePath : `#${routePath}`
}

function createWindow(urlPath = INITIAL_ROUTE, options = {}) {
  const win = new BrowserWindow({
    width: options.width || 1440,
    height: options.height || 920,
    minWidth: 1100,
    minHeight: 720,
    titleBarStyle: 'hiddenInset', // 苹果风格沉浸式标题栏
    backgroundColor: resolveWindowBackgroundColor(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  const syncState = () => emitWindowState(win)
  win.on('maximize', syncState)
  win.on('unmaximize', syncState)
  win.on('focus', syncState)
  win.on('blur', syncState)
  win.on('enter-full-screen', syncState)
  win.on('leave-full-screen', syncState)

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    win.loadURL(`${devServerUrl}${resolveRouteHash(urlPath)}`)
    if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    win.loadFile(path.resolve(__dirname, '../dist/index.html'), { hash: urlPath })
  }
  win.webContents.once('did-finish-load', () => {
    emitWindowState(win)
    emitSystemPreferences(win)
  })

  return win
}

app.whenReady().then(() => {
  createWindow()

  // IPC: 发送系统通知
  ipcMain.on('notification:send', (event, { title, body }) => {
    new Notification({ title, body }).show()
  })

  // Keep the sound path minimal and native so desktop alerts remain cheap.
  ipcMain.on('sound:play', () => {
    shell.beep()
  })

  // IPC: 打开新单据窗口
  ipcMain.on('window:open', (event, { url, options }) => {
    createWindow(url, options)
  })

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
    emitWindowState(win)
  })

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:get-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      return { isMaximized: false, isFocused: true, isFullScreen: false }
    }
    return {
      isMaximized: win.isMaximized(),
      isFocused: win.isFocused(),
      isFullScreen: win.isFullScreen(),
    }
  })
  ipcMain.handle('window:print', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    return new Promise((resolve) => {
      win.webContents.print(
        {
          silent: Boolean(options?.silent),
          printBackground: true,
        },
        (success) => resolve(success),
      )
    })
  })

  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:restart', () => {
    app.relaunch()
    app.exit(0)
  })
  ipcMain.handle('system:get-preferences', () => getSystemPreferencesPayload())
  ipcMain.handle('system:get-gpu-status', () => getGpuStatusPayload())
  ipcMain.handle('system:get-runtime-settings', () => runtimeSettings)
  ipcMain.handle('system:set-theme-source', (_event, value) => {
    nativeTheme.themeSource = value
    broadcastSystemPreferences()
  })
  ipcMain.handle('system:set-proxy-settings', async (_event, payload) => {
    await applyProxySettings(payload?.proxyRules || '', payload?.proxyBypassRules || '')
  })
  ipcMain.handle('system:set-runtime-settings', async (_event, payload) => {
    runtimeSettings.hardwareAcceleration = payload?.hardwareAcceleration !== false
    await persistRuntimeSettings(runtimeSettings)
    return runtimeSettings
  })

  // File import stays in the desktop bridge so business pages can attach
  // contracts and invoices without leaking Node access into the renderer.
  ipcMain.handle('file:choose', async (_event, options) => {
    const result = await dialog.showOpenDialog({
      title: options?.title || 'Choose File',
      properties: ['openFile'],
      filters: options?.filters || [
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (result.canceled || !result.filePaths.length) return null
    const filePath = result.filePaths[0]
    const buffer = await fs.readFile(filePath)
    return {
      path: filePath,
      name: path.basename(filePath),
      dataBase64: buffer.toString('base64'),
    }
  })
  ipcMain.handle('file:save', async (_event, payload) => {
    const suggestedName = payload?.suggestedName || 'neko_erp_export.txt'
    const result = await dialog.showSaveDialog({
      title: 'Save File',
      defaultPath: suggestedName,
    })
    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }
    const buffer = Buffer.from(String(payload?.dataBase64 || ''), 'base64')
    await fs.writeFile(result.filePath, buffer)
    return {
      canceled: false,
      path: result.filePath,
    }
  })

  nativeTheme.on('updated', () => {
    broadcastSystemPreferences()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
