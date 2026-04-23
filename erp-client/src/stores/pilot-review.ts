import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ReminderRecord } from '@/api/reminders'

const REVIEWED_KEY = 'neko_erp_pilot_reviewed_reminders'
const SNOOZED_KEY = 'neko_erp_pilot_snoozed_reminders'
const MAX_LOCAL_STATE = 500
const DEFAULT_SNOOZE_HOURS = 24

export const usePilotReviewStore = defineStore('pilotReview', () => {
  const reviewedIds = ref<string[]>(loadStringList(REVIEWED_KEY))
  const snoozedUntil = ref<Record<string, string>>(loadRecord(SNOOZED_KEY))

  const reviewedCount = computed(() => reviewedIds.value.length)
  const snoozedCount = computed(() => Object.keys(activeSnoozes()).length)

  function isReviewed(id: string) {
    return reviewedIds.value.includes(id)
  }

  function isSnoozed(id: string) {
    const until = snoozedUntil.value[id]
    if (!until) return false
    return new Date(until).getTime() > Date.now()
  }

  function isHidden(item: ReminderRecord) {
    return isReviewed(item.id) || isSnoozed(item.id)
  }

  function markReviewed(ids: string | string[]) {
    const next = new Set(reviewedIds.value)
    for (const id of normalizeIds(ids)) {
      next.add(id)
      delete snoozedUntil.value[id]
    }
    reviewedIds.value = [...next].slice(-MAX_LOCAL_STATE)
    persist()
  }

  function snooze(ids: string | string[], hours = DEFAULT_SNOOZE_HOURS) {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    const next = activeSnoozes()
    for (const id of normalizeIds(ids)) {
      if (reviewedIds.value.includes(id)) continue
      next[id] = until
    }
    snoozedUntil.value = trimRecord(next)
    persist()
  }

  function clearReviewState() {
    reviewedIds.value = []
    snoozedUntil.value = {}
    persist()
  }

  function activeSnoozes() {
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(snoozedUntil.value).filter(([, until]) => new Date(until).getTime() > now),
    )
  }

  function persist() {
    // Review state is deliberately local to the Electron client so pilot users
    // can triage reminders without changing server-side business data.
    if (typeof window === 'undefined') return
    window.localStorage.setItem(REVIEWED_KEY, JSON.stringify(reviewedIds.value))
    window.localStorage.setItem(SNOOZED_KEY, JSON.stringify(activeSnoozes()))
  }

  return {
    clearReviewState,
    isHidden,
    isReviewed,
    isSnoozed,
    markReviewed,
    reviewedCount,
    reviewedIds,
    snooze,
    snoozedCount,
    snoozedUntil,
  }
})

function normalizeIds(ids: string | string[]) {
  return (Array.isArray(ids) ? ids : [ids]).filter(Boolean)
}

function loadStringList(key: string) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function loadRecord(key: string) {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

function trimRecord(value: Record<string, string>) {
  return Object.fromEntries(Object.entries(value).slice(-MAX_LOCAL_STATE))
}
