import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ModuleKey } from '@/config/module-manifest'

interface RecentRecordItem {
  moduleKey: ModuleKey
  id: number
  label: string
  subtitle?: string
  updatedAt: string
}

const RECENT_RECORDS_KEY = 'neko_erp_recent_records'
const MAX_RECENT_RECORDS = 12

export const useCommandCenterStore = defineStore('command-center', () => {
  const recentRecords = ref<RecentRecordItem[]>(loadRecentRecords())

  // Recent records are persisted so the command center can reopen the last
  // working context after Electron restarts.
  function rememberRecord(payload: Omit<RecentRecordItem, 'updatedAt'>) {
    const now = new Date().toISOString()
    const deduped = recentRecords.value.filter(
      (item) => !(item.moduleKey === payload.moduleKey && item.id === payload.id),
    )
    recentRecords.value = [
      {
        ...payload,
        updatedAt: now,
      },
      ...deduped,
    ].slice(0, MAX_RECENT_RECORDS)
    persistRecentRecords(recentRecords.value)
  }

  function latestRecordFor(moduleKey: ModuleKey) {
    return recentRecords.value.find((item) => item.moduleKey === moduleKey)
  }

  function clearRecentRecords() {
    recentRecords.value = []
    persistRecentRecords(recentRecords.value)
  }

  const groupedRecentRecords = computed(() =>
    recentRecords.value.reduce<Record<string, RecentRecordItem[]>>((acc, item) => {
      acc[item.moduleKey] ??= []
      acc[item.moduleKey].push(item)
      return acc
    }, {}),
  )

  return {
    clearRecentRecords,
    groupedRecentRecords,
    latestRecordFor,
    recentRecords,
    rememberRecord,
  }
})

function loadRecentRecords(): RecentRecordItem[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(RECENT_RECORDS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.moduleKey === 'string' &&
        typeof item.id === 'number' &&
        typeof item.label === 'string',
    )
  } catch {
    return []
  }
}

function persistRecentRecords(records: RecentRecordItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(RECENT_RECORDS_KEY, JSON.stringify(records))
}
