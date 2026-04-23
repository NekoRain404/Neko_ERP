import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchIncrementalActivityLogs, fetchRecentActivityLogs, type LoggingActivityRecord } from '@/api/logging'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'

const LAST_SEEN_KEY = 'neko_erp_activity_last_seen_id'
const SUMMARY_SEEN_KEY = 'neko_erp_activity_summary_seen_date'
const POLL_INTERVAL_MS = 30000
const INTERESTING_TYPES = new Set(['CREATE', 'UPDATE', 'ACTION'])

export const useActivityStore = defineStore('activity', () => {
  const items = ref<LoggingActivityRecord[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const lastFetchedId = ref(0)
  const lastSeenId = ref(loadLastSeenId())
  const panelOpen = ref(false)
  const summaryOpen = ref(false)

  let timer: number | undefined

  const unreadCount = computed(() => items.value.filter((item) => item.id > lastSeenId.value).length)
  const latestId = computed(() => items.value[0]?.id || 0)
  const dailySummary = computed(() => {
    const createCount = items.value.filter((item) => item.type === 'CREATE').length
    const updateCount = items.value.filter((item) => item.type === 'UPDATE').length
    const actionCount = items.value.filter((item) => item.type === 'ACTION').length
    const topModels = buildTopModels(items.value)
    return { createCount, updateCount, actionCount, topModels }
  })

  async function refresh() {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      stopPolling()
      items.value = []
      initialized.value = false
      lastFetchedId.value = 0
      summaryOpen.value = false
      return
    }

    loading.value = true
    try {
      if (!initialized.value) {
        const response = await fetchRecentActivityLogs(20)
        const nextItems = response.records.filter((item) => INTERESTING_TYPES.has(String(item.type || '').toUpperCase()))
        items.value = nextItems
        lastFetchedId.value = nextItems[0]?.id || 0
        initialized.value = true
        if (!lastSeenId.value) {
          markAllRead()
        }
        maybeOpenDailySummary()
        return
      }

      // Incremental polling keeps the desktop shell cheap even when more modules are added.
      const freshItems = (await fetchIncrementalActivityLogs({
        sinceId: lastFetchedId.value,
        size: 20,
      }))
        .filter((item) => INTERESTING_TYPES.has(String(item.type || '').toUpperCase()))
        .sort((left, right) => left.id - right.id)

      if (!freshItems.length) {
        return
      }

      items.value = mergeActivityItems(freshItems, items.value)
      lastFetchedId.value = Math.max(lastFetchedId.value, freshItems[freshItems.length - 1]?.id || 0)
      notifyFreshItems(freshItems.slice(-3))
      maybeOpenDailySummary()
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

  function setPanelOpen(value: boolean) {
    panelOpen.value = value
    if (value) {
      markAllRead()
    }
  }

  function setSummaryOpen(value: boolean) {
    summaryOpen.value = value
    if (!value) {
      persistSummarySeenDate(todayKey())
    }
  }

  function markAllRead() {
    const nextSeen = latestId.value
    if (!nextSeen) return
    lastSeenId.value = nextSeen
    persistLastSeenId(nextSeen)
  }

  function markRead(id: number) {
    if (id > lastSeenId.value) {
      lastSeenId.value = id
      persistLastSeenId(id)
    }
  }

  function notifyFreshItems(freshItems: LoggingActivityRecord[]) {
    const preferencesStore = usePreferencesStore()
    if (!preferencesStore.notifications) {
      return
    }
    for (const item of freshItems) {
      const title = 'NEKO_ERP'
      const body = formatNotificationText(item)
      window.erpDesktop?.sendNotification(title, body)
      if (preferencesStore.sound) {
        window.erpDesktop?.playSystemSound(item.type === 'ACTION' ? 'success' : 'default')
      }
    }
  }

  function maybeOpenDailySummary() {
    const preferencesStore = usePreferencesStore()
    if (!preferencesStore.dailySummary) {
      return
    }
    if (readSummarySeenDate() === todayKey()) {
      return
    }
    if (!items.value.length) {
      return
    }
    summaryOpen.value = true
  }

  return {
    dailySummary,
    items,
    lastSeenId,
    loading,
    panelOpen,
    summaryOpen,
    refresh,
    latestId,
    markAllRead,
    markRead,
    setPanelOpen,
    setSummaryOpen,
    startPolling,
    stopPolling,
    unreadCount,
  }
})

function loadLastSeenId() {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(LAST_SEEN_KEY)
  const value = Number(raw || '0')
  return Number.isFinite(value) ? value : 0
}

function persistLastSeenId(value: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LAST_SEEN_KEY, String(value))
}

function readSummarySeenDate() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(SUMMARY_SEEN_KEY) || ''
}

function persistSummarySeenDate(value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SUMMARY_SEEN_KEY, value)
}

function formatNotificationText(item: LoggingActivityRecord) {
  const model = item.resModel || item.name || 'Record'
  const tail = item.resId ? ` #${item.resId}` : ''
  const action = item.metadata ? ` · ${item.metadata}` : ''
  return `${model}${tail}${action}`
}

function mergeActivityItems(nextItems: LoggingActivityRecord[], currentItems: LoggingActivityRecord[]) {
  const merged = [...nextItems, ...currentItems]
  const unique = new Map<number, LoggingActivityRecord>()
  for (const item of merged) {
    unique.set(item.id, item)
  }
  return [...unique.values()].sort((left, right) => right.id - left.id).slice(0, 20)
}

function buildTopModels(items: LoggingActivityRecord[]) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = item.resModel || item.name || 'Unknown'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([model, count]) => ({ model, count }))
}

function todayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
