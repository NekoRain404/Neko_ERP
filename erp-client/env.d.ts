/// <reference types="vite/client" />

export {}

import type { DesktopBridge } from './src/types/desktop'

declare global {
  interface Window {
    erpDesktop?: DesktopBridge
  }
}
