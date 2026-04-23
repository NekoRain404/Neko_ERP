<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ActivityCenter from '@/components/ActivityCenter.vue'
import ActivitySummaryPanel from '@/components/ActivitySummaryPanel.vue'
import SidebarMenu from '@/components/SidebarMenu.vue'
import { useActivityStore } from '@/stores/activity'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { readStoredApiBaseUrl, useConnectionStore } from '@/stores/connection'
import { useCutoverRemoteStore } from '@/stores/cutover-remote'
import { useReminderStore } from '@/stores/reminders'
import {
  isTypingElement,
  matchesShortcutBinding,
  SHORTCUT_DEFINITIONS,
  SHORTCUT_EVENT_MAP,
  shortcutAllowedWhileTyping,
  useShortcutStore,
  type ShortcutActionKey,
} from '@/stores/shortcuts'
import { useI18n } from '@/i18n'
import type { DesktopWindowState } from '@/types/desktop'

const appStore = useAppStore()
const activityStore = useActivityStore()
const authStore = useAuthStore()
const connectionStore = useConnectionStore()
const cutoverRemoteStore = useCutoverRemoteStore()
const reminderStore = useReminderStore()
const shortcutStore = useShortcutStore()
const route = useRoute()
const router = useRouter()
const desktopBridge = window.erpDesktop
const CommandPalette = defineAsyncComponent(() => import('@/components/CommandPalette.vue'))
const { routeTitle, t } = useI18n()

const windowState = ref<DesktopWindowState>({
  isMaximized: false,
  isFocused: true,
  isFullScreen: false,
})
const backendOnline = ref(true)
const backendChecking = ref(false)
const desktopVersion = ref('')

let backendTimer: number | undefined
let removeWindowStateListener: (() => void) | undefined

const currentTitle = computed(() =>
  routeTitle(String(route.meta.title || 'NEKO_ERP'), route.meta.moduleKey as any),
)
const isDesktop = computed(() => Boolean(desktopBridge?.isDesktop))
const isMac = computed(() => desktopBridge?.platform === 'darwin')
const frameThemeClass = computed(() => `route-${String(route.name || 'app')}`)
const shellBadgeText = computed(() => {
  if (!desktopBridge) return t('app.web')
  if (desktopBridge.platform === 'darwin') return t('app.desktopMac')
  if (desktopBridge.platform === 'win32') return t('app.desktopWindows')
  if (desktopBridge.platform === 'linux') return t('app.desktopLinux')
  return t('app.desktop')
})
const connectionBadgeText = computed(() => {
  if (backendChecking.value) return t('app.backendChecking')
  return backendOnline.value ? t('app.backendOnline') : t('app.backendOffline')
})
const connectionTargetLabel = computed(() => {
  try {
    const url = new URL(connectionStore.resolvedApiBaseUrl)
    return `${url.hostname}${url.port ? `:${url.port}` : ''}`
  } catch {
    return connectionStore.resolvedApiBaseUrl
  }
})
const windowButtonTitle = computed(() =>
  windowState.value.isMaximized ? t('app.restoreWindow') : t('app.maximizeWindow'),
)

async function syncWindowState() {
  if (!desktopBridge) return
  windowState.value = await desktopBridge.getWindowState()
}

async function refreshBackendStatus() {
  backendChecking.value = true
  try {
    await fetch(`${readStoredApiBaseUrl()}/base/res-company/list?current=1&size=1`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    backendOnline.value = true
  } catch {
    backendOnline.value = false
  } finally {
    backendChecking.value = false
  }
}

async function hydrateCutoverConfigFromServer() {
  if (!authStore.isAuthenticated || !backendOnline.value) return
  try {
    await cutoverRemoteStore.loadRemoteSnapshot()
  } catch {
    // Cutover hydration is a shared desktop enhancement. Failing closed here
    // should not block the shell from starting.
  }
}

function handleOffline() {
  backendOnline.value = false
}

function handleOnline() {
  void refreshBackendStatus()
}

watch(
  currentTitle,
  (title) => {
    document.title = `${title} | NEKO_ERP`
  },
  { immediate: true },
)

watch(
  () => authStore.isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      activityStore.startPolling()
      reminderStore.startPolling()
    } else {
      activityStore.stopPolling()
      reminderStore.stopPolling()
    }
  },
  { immediate: true },
)

async function minimizeWindow() {
  await desktopBridge?.minimizeWindow()
}

async function toggleMaximizeWindow() {
  await desktopBridge?.toggleMaximizeWindow()
}

async function closeWindow() {
  await desktopBridge?.closeWindow()
}

function dispatchShortcutEvent(actionKey: ShortcutActionKey) {
  window.dispatchEvent(new CustomEvent(SHORTCUT_EVENT_MAP[actionKey]))
}

function handleGlobalShortcuts(event: KeyboardEvent) {
  const shortcutRows: ShortcutActionKey[] = SHORTCUT_DEFINITIONS.map((item) => item.key)
  for (const actionKey of shortcutRows) {
    const binding = shortcutStore.bindingFor(actionKey)
    if (!matchesShortcutBinding(binding, event)) continue
    if (isTypingElement(event.target) && !shortcutAllowedWhileTyping(actionKey)) return
    event.preventDefault()
    if (actionKey === 'openSettings') {
      void router.push({ name: 'settings', query: { tab: 'general' } })
      return
    }
    dispatchShortcutEvent(actionKey)
    return
  }
}

function openConnectionSettings() {
  void router.push({ name: 'settings', query: { tab: 'connection' } })
}

async function handleLogout() {
  authStore.logout()
  await router.replace({ name: 'login' })
}

onMounted(async () => {
  if (desktopBridge) {
    desktopVersion.value = await desktopBridge.getAppVersion()
    await syncWindowState()
    removeWindowStateListener = desktopBridge.onWindowStateChanged((payload: DesktopWindowState) => {
      windowState.value = payload
    })
  }

  await refreshBackendStatus()
  await hydrateCutoverConfigFromServer()
  backendTimer = window.setInterval(() => {
    void refreshBackendStatus()
  }, 20000)

  window.addEventListener('offline', handleOffline)
  window.addEventListener('online', handleOnline)
  window.addEventListener('keydown', handleGlobalShortcuts)
})

onUnmounted(() => {
  if (backendTimer) {
    window.clearInterval(backendTimer)
  }
  activityStore.stopPolling()
  reminderStore.stopPolling()
  removeWindowStateListener?.()
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('keydown', handleGlobalShortcuts)
})
</script>

<template>
  <div class="desktop-app-frame" :class="[frameThemeClass, { unfocused: !windowState.isFocused }]">
    <CommandPalette />
    <ActivitySummaryPanel />

    <header class="app-title-bar">
      <div class="window-drag-region">
        <div class="app-logo">
          <div class="logo-dot"></div>
          <span>NEKO_ERP</span>
          <span class="title-divider"></span>
          <span class="current-page">{{ currentTitle }}</span>
        </div>
      </div>

      <div class="app-top-actions">
        <div class="desktop-badges">
          <button class="status-pill desktop-pill" type="button" :title="desktopVersion ? `${t('app.desktopVersionTitle')} ${desktopVersion}` : shellBadgeText">
            <el-icon><Monitor /></el-icon>
            <span>{{ shellBadgeText }}</span>
          </button>
          <button class="status-pill connection-pill" type="button" :title="t('app.openConnectionSettings')" @click="openConnectionSettings">
            <el-icon><Connection /></el-icon>
            <span>{{ connectionTargetLabel }}</span>
          </button>
          <button
            class="status-pill"
            :class="backendOnline ? 'online-pill' : 'offline-pill'"
            type="button"
            :title="t('app.recheckBackend')"
            @click="refreshBackendStatus"
          >
            <span class="status-dot"></span>
            <span>{{ connectionBadgeText }}</span>
          </button>
          <ActivityCenter />
        </div>

        <el-input :placeholder="t('app.searchPlaceholder')" class="top-search" prefix-icon="Search" />

        <button class="user-profile" type="button" :title="t('app.currentUser')">
          <el-avatar :size="24">{{ authStore.displayName.slice(0, 1).toUpperCase() }}</el-avatar>
          <span class="user-name">{{ authStore.displayName }}</span>
        </button>
        <button class="logout-btn" type="button" :title="t('app.logout')" @click="handleLogout">
          <el-icon><Back /></el-icon>
        </button>

        <div v-if="isDesktop && !isMac" class="window-controls">
          <button class="window-btn" type="button" :title="t('app.minimizeWindow')" @click="minimizeWindow">
            <el-icon><Minus /></el-icon>
          </button>
          <button class="window-btn" type="button" :title="windowButtonTitle" @click="toggleMaximizeWindow">
            <el-icon><component :is="windowState.isMaximized ? 'CopyDocument' : 'FullScreen'" /></el-icon>
          </button>
          <button class="window-btn close-btn" type="button" :title="t('app.closeWindow')" @click="closeWindow">
            <el-icon><CloseBold /></el-icon>
          </button>
        </div>
      </div>
    </header>

    <div class="app-body">
      <aside class="app-sidebar" :class="{ collapsed: appStore.collapsed }">
        <SidebarMenu />
      </aside>

      <main class="app-main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.desktop-app-frame {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--app-bg);
  color: var(--app-text);
}

.desktop-app-frame.unfocused .app-title-bar {
  opacity: 0.92;
}

.app-title-bar {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-backdrop);
  backdrop-filter: blur(10px);
  -webkit-app-region: drag;
}

.window-drag-region {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: -0.5px;
  min-width: 0;
}

.logo-dot {
  width: 10px;
  height: 10px;
  background: var(--app-primary);
  border-radius: 50%;
}

.title-divider {
  width: 1px;
  height: 14px;
  background: var(--app-border-strong);
  margin: 0 4px;
}

.current-page {
  font-size: 12px;
  color: var(--app-text-secondary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-top-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  -webkit-app-region: no-drag;
}

.desktop-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-pill {
  max-width: 190px;
}

.connection-pill span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0 12px;
  background: var(--app-panel-elevated);
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.status-pill:hover {
  background: var(--app-panel);
  border-color: var(--app-border-strong);
}

.desktop-pill {
  cursor: default;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px var(--app-ring);
}

.online-pill {
  color: var(--app-success);
  background: color-mix(in srgb, var(--app-success) 10%, transparent);
  border-color: color-mix(in srgb, var(--app-success) 18%, transparent);
}

.offline-pill {
  color: var(--app-warning);
  background: color-mix(in srgb, var(--app-warning) 12%, transparent);
  border-color: color-mix(in srgb, var(--app-warning) 18%, transparent);
}

.top-search {
  width: 240px;
}

:deep(.el-input__wrapper) {
  background: var(--app-muted-bg);
  border: none;
  box-shadow: none !important;
  border-radius: 8px;
}

.user-profile {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px 0 5px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel-elevated);
  color: var(--app-text);
  cursor: default;
}

.user-name {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}

.logout-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-panel-elevated);
  color: var(--app-text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.logout-btn:hover {
  background: color-mix(in srgb, var(--app-danger) 8%, var(--app-panel-elevated));
  border-color: color-mix(in srgb, var(--app-danger) 16%, var(--app-border));
  color: var(--app-danger);
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 2px;
}

.window-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-panel-elevated);
  color: var(--app-text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.window-btn:hover {
  background: var(--app-hover);
  border-color: var(--app-border-strong);
  color: var(--app-text);
}

.close-btn:hover {
  background: color-mix(in srgb, var(--app-danger) 12%, transparent);
  border-color: color-mix(in srgb, var(--app-danger) 18%, transparent);
  color: var(--app-danger);
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-sidebar {
  width: 240px;
  background: var(--app-sidebar);
  border-right: 1px solid var(--app-border);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-sidebar.collapsed {
  width: 64px;
}

.app-main-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: var(--app-surface);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 1200px) {
  .desktop-badges {
    display: none;
  }

  .user-name {
    display: none;
  }
}

@media (max-width: 960px) {
  .top-search {
    width: 180px;
  }

  .current-page {
    display: none;
  }

  .title-divider {
    display: none;
  }
}
</style>
