import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchCurrentCutoverConfig, saveCurrentCutoverConfig } from '@/api/cutover'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import { useCutoverStore } from '@/stores/cutover'

export const useCutoverRemoteStore = defineStore('cutoverRemote', () => {
  const cutoverStore = useCutoverStore()
  const cutoverOpsStore = useCutoverOpsStore()

  const remoteLoading = ref(false)
  const remoteSaving = ref(false)
  const remoteUpdatedAt = ref('')
  const remoteUpdatedBy = ref('')
  const hasRemoteSnapshot = ref(false)
  const remoteFingerprint = ref('')

  function applySnapshot(snapshot: any) {
    cutoverStore.replaceCutoverConfig({
      chainStates: snapshot?.chainStates,
      moduleOverrides: snapshot?.moduleOverrides,
      chainContacts: snapshot?.chainContacts,
      chainGateStates: snapshot?.chainGateStates,
    })
    cutoverOpsStore.replaceFromSnapshot(snapshot?.operations)
  }

  function updateRemoteMeta(payload?: { updatedTime?: string | null; updatedBy?: string | null } | null) {
    remoteUpdatedAt.value = String(payload?.updatedTime || '')
    remoteUpdatedBy.value = String(payload?.updatedBy || '')
  }

  function fingerprintSnapshot(snapshot: any) {
    return JSON.stringify(sortSnapshotValue(snapshot ?? {}))
  }

  function isSnapshotDirty(snapshot: any) {
    const fingerprint = fingerprintSnapshot(snapshot)
    if (!hasRemoteSnapshot.value || !remoteFingerprint.value) {
      return fingerprint !== '{}'
    }
    return fingerprint !== remoteFingerprint.value
  }

  async function loadRemoteSnapshot() {
    remoteLoading.value = true
    try {
      const remote = await fetchCurrentCutoverConfig()
      const snapshot = remote?.configData
      if (!snapshot || !Object.keys(snapshot).length) {
        hasRemoteSnapshot.value = false
        remoteFingerprint.value = ''
        updateRemoteMeta(null)
        return { found: false as const, remote: null }
      }
      applySnapshot(snapshot)
      hasRemoteSnapshot.value = true
      remoteFingerprint.value = fingerprintSnapshot(snapshot)
      updateRemoteMeta(remote)
      return { found: true as const, remote }
    } finally {
      remoteLoading.value = false
    }
  }

  async function saveRemoteSnapshot(configData: Record<string, any>, updatedBy?: string) {
    remoteSaving.value = true
    try {
      const remote = await saveCurrentCutoverConfig(configData, updatedBy)
      hasRemoteSnapshot.value = Boolean(remote?.configData && Object.keys(remote.configData).length)
      remoteFingerprint.value = hasRemoteSnapshot.value ? fingerprintSnapshot(remote?.configData || {}) : ''
      updateRemoteMeta(remote)
      return remote
    } finally {
      remoteSaving.value = false
    }
  }

  return {
    applySnapshot,
    hasRemoteSnapshot,
    isSnapshotDirty,
    loadRemoteSnapshot,
    remoteLoading,
    remoteFingerprint,
    remoteSaving,
    remoteUpdatedAt,
    remoteUpdatedBy,
    saveRemoteSnapshot,
    updateRemoteMeta,
  }
})

function sortSnapshotValue(input: any): any {
  if (Array.isArray(input)) {
    return input.map((item) => sortSnapshotValue(item))
  }
  if (input && typeof input === 'object') {
    return Object.keys(input)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        acc[key] = sortSnapshotValue(input[key])
        return acc
      }, {})
  }
  return input
}
