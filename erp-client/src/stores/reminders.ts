import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import { useAuthStore } from '@/stores/auth'
import { useCutoverStore } from '@/stores/cutover'
import { usePreferencesStore } from '@/stores/preferences'
import { resolveDefaultChainContacts, resolveDefaultChainGateState } from '@/utils/cutover'
import { resolveReminderFamilyLabel } from '@/utils/reminders'
import type { ModuleKey } from '@/config/module-manifest'

const REMINDER_SEEN_KEY = 'neko_erp_reminder_seen_ids'
const POLL_INTERVAL_MS = 60000

export const useReminderStore = defineStore('reminders', () => {
  const items = ref<ReminderRecord[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const seenIds = ref<string[]>(loadSeenIds())

  let timer: number | undefined

  const unreadCount = computed(() => items.value.filter((item) => !seenIds.value.includes(item.id)).length)

  async function refresh() {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      stopPolling()
      items.value = []
      initialized.value = false
      return
    }

    loading.value = true
    try {
      const previousIds = new Set(items.value.map((item) => item.id))
      const nextItems = await fetchReminders({ limit: 20 })
      items.value = nextItems

      // Initial load seeds the tray without replaying old reminders as new desktop notifications.
      if (!initialized.value) {
        initialized.value = true
        return
      }

      const freshItems = nextItems.filter((item) => !previousIds.has(item.id))
      notifyFreshItems(freshItems)
    } finally {
      loading.value = false
    }
  }

  function startPolling() {
    if (timer) return
    void refresh()
    timer = window.setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (!timer) return
    window.clearInterval(timer)
    timer = undefined
  }

  function markRead(id: string) {
    if (seenIds.value.includes(id)) return
    seenIds.value = [...seenIds.value, id].slice(-50)
    persistSeenIds(seenIds.value)
  }

  function isUnread(id: string) {
    return !seenIds.value.includes(id)
  }

  function markAllRead() {
    seenIds.value = items.value.map((item) => item.id).slice(-50)
    persistSeenIds(seenIds.value)
  }

  function notifyFreshItems(freshItems: ReminderRecord[]) {
    const preferencesStore = usePreferencesStore()
    const cutoverStore = useCutoverStore()
    if (!preferencesStore.notifications) return
    for (const item of freshItems) {
      // Reminders are already distilled server-side, so the desktop bridge can
      // forward them directly without extra client-side rule trees.
      const moduleKey = item.moduleKey as ModuleKey
      const chain = moduleKey ? cutoverStore.chainsForModule(moduleKey)[0] : undefined
      const contacts = chain
        ? cutoverStore.chainContactFor(chain.key, resolveDefaultChainContacts(chain.key, preferencesStore.language === 'en-US'))
        : null
      const gateState = chain
        ? cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
        : null
      const pendingGateCount = gateState
        ? [
            gateState.smokeReady,
            gateState.workbenchReady,
            gateState.rollbackReady,
            gateState.traceabilityReady,
            gateState.manualReady,
            gateState.pilotConfirmed,
          ].filter((value) => !value).length
        : 0
      const bodyParts = [
        resolveReminderFamilyLabel(item, preferencesStore.language === 'en-US'),
        contacts?.owner
          ? (preferencesStore.language === 'en-US' ? `Owner: ${contacts.owner}` : `负责人: ${contacts.owner}`)
          : '',
        item.content,
        item.relatedRef || '',
        pendingGateCount
          ? (preferencesStore.language === 'en-US' ? `${pendingGateCount} gate items pending` : `还有 ${pendingGateCount} 个门槛项待完成`)
          : '',
      ].filter(Boolean)
      const title = item.severity === 'critical'
        ? (preferencesStore.language === 'en-US' ? 'NEKO_ERP Critical Reminder' : 'NEKO_ERP 严重提醒')
        : (preferencesStore.language === 'en-US' ? 'NEKO_ERP Reminder' : 'NEKO_ERP 提醒')
      window.erpDesktop?.sendNotification(title, bodyParts.join(' · '))
      if (preferencesStore.sound) {
        window.erpDesktop?.playSystemSound(item.severity === 'critical' ? 'error' : 'warning')
      }
    }
  }

  return {
    items,
    isUnread,
    loading,
    markAllRead,
    markRead,
    refresh,
    startPolling,
    stopPolling,
    unreadCount,
  }
})

function loadSeenIds() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(REMINDER_SEEN_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function persistSeenIds(ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(REMINDER_SEEN_KEY, JSON.stringify(ids))
}
