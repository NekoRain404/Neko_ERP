import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchCutoverOpsBoard } from '@/api/cutover-ops'
import type { PilotChainKey } from '@/stores/cutover'
import type {
  CutoverCloseTaskRecord,
  CutoverCloseTaskStatus,
  CutoverCloseTaskSummary,
  CutoverExceptionExportRecord,
  CutoverExceptionExportScopeType,
  CutoverFinanceBatchReviewRecord,
  CutoverFinanceBatchReviewStatus,
  CutoverFinanceResultPackRecord,
  CutoverFinanceResultPackSummary,
  CutoverFinanceReviewSummary,
  CutoverOperationsSnapshot,
  CutoverPilotSignoffDecision,
  CutoverPilotSignoffRecord,
  CutoverRoleDeskActorKey,
  CutoverRoleDeskSlaStatus,
  CutoverRoleDeskTaskRecord,
  CutoverRoleDeskTaskStatus,
  CutoverRoleTaskSummary,
  CutoverRollbackDrillRecord,
  CutoverRollbackDrillStatus,
} from '@/utils/cutover-ops'
import {
  normalizeCloseTasks,
  normalizeCutoverOperationsSnapshot,
  normalizeExceptionExports,
  normalizeFinanceBatchReviews,
  normalizeFinanceResultPacks,
  normalizePilotSignoffs,
  normalizeRoleDeskTasks,
  normalizeRollbackDrills,
} from '@/utils/cutover-ops'

const ROLLBACK_DRILLS_KEY = 'neko_erp_cutover_rollback_drills'
const PILOT_SIGNOFFS_KEY = 'neko_erp_cutover_pilot_signoffs'
const EXCEPTION_EXPORTS_KEY = 'neko_erp_cutover_exception_exports'
const ROLE_DESK_TASKS_KEY = 'neko_erp_cutover_role_desk_tasks'
const FINANCE_BATCH_REVIEWS_KEY = 'neko_erp_cutover_finance_batch_reviews'
const FINANCE_RESULT_PACKS_KEY = 'neko_erp_cutover_finance_result_packs'
const CLOSE_TASKS_KEY = 'neko_erp_cutover_close_tasks'
const MAX_RECORDS = 160

export const useCutoverOpsStore = defineStore('cutoverOps', () => {
  const rollbackDrills = ref<CutoverRollbackDrillRecord[]>(loadRollbackDrills())
  const pilotSignoffs = ref<CutoverPilotSignoffRecord[]>(loadPilotSignoffs())
  const exceptionExports = ref<CutoverExceptionExportRecord[]>(loadExceptionExports())
  const roleDeskTasks = ref<CutoverRoleDeskTaskRecord[]>(loadRoleDeskTasks())
  const financeBatchReviews = ref<CutoverFinanceBatchReviewRecord[]>(loadFinanceBatchReviews())
  const financeResultPacks = ref<CutoverFinanceResultPackRecord[]>(loadFinanceResultPacks())
  const closeTasks = ref<CutoverCloseTaskRecord[]>(loadCloseTasks())

  const roleDeskSummary = ref<CutoverRoleTaskSummary>(emptyRoleDeskSummary())
  const financeBatchSummary = ref<CutoverFinanceReviewSummary>(emptyFinanceBatchSummary())
  const financeResultPackSummary = ref<CutoverFinanceResultPackSummary>(emptyFinanceResultPackSummary())
  const closeTaskSummary = ref<CutoverCloseTaskSummary>(emptyCloseTaskSummary())

  const serverSyncing = ref(false)
  const serverSyncedAt = ref('')
  const serverSyncError = ref('')
  let boardPromise: Promise<void> | null = null

  const rollbackDrillCount = computed(() => rollbackDrills.value.length)
  const pilotSignoffCount = computed(() => pilotSignoffs.value.length)
  const exceptionExportCount = computed(() => exceptionExports.value.length)
  const roleDeskTaskCount = computed(() => roleDeskTasks.value.length)
  const financeBatchReviewCount = computed(() => financeBatchReviews.value.length)
  const financeResultPackCount = computed(() => financeResultPacks.value.length)
  const closeTaskCount = computed(() => closeTasks.value.length)

  function replaceFromSnapshot(snapshot?: Partial<CutoverOperationsSnapshot> | null) {
    const normalized = normalizeCutoverOperationsSnapshot(snapshot)
    rollbackDrills.value = trim(normalized.rollbackDrills)
    pilotSignoffs.value = trim(normalized.pilotSignoffs)
    exceptionExports.value = trim(normalized.exceptionExports)
    roleDeskTasks.value = trim(normalized.roleDeskTasks)
    financeBatchReviews.value = trim(normalized.financeBatchReviews)
    financeResultPacks.value = trim(normalized.financeResultPacks)
    closeTasks.value = trim(normalized.closeTasks)
    persist()
  }

  function snapshotData(): CutoverOperationsSnapshot {
    return {
      rollbackDrills: rollbackDrills.value,
      pilotSignoffs: pilotSignoffs.value,
      exceptionExports: exceptionExports.value,
      roleDeskTasks: roleDeskTasks.value,
      financeBatchReviews: financeBatchReviews.value,
      financeResultPacks: financeResultPacks.value,
      closeTasks: closeTasks.value,
    }
  }

  function addRollbackDrill(input: {
    chainKey: PilotChainKey
    status: CutoverRollbackDrillStatus
    owner: string
    note: string
    blockerSummary?: string
    evidenceSummary?: string
  }) {
    rollbackDrills.value = trim([buildRollbackDrillRecord(input), ...rollbackDrills.value])
    persist()
  }

  function addPilotSignoff(input: {
    chainKey: PilotChainKey
    decision: CutoverPilotSignoffDecision
    owner: string
    note: string
  }) {
    pilotSignoffs.value = trim([buildPilotSignoffRecord(input), ...pilotSignoffs.value])
    persist()
  }

  function addExceptionExport(input: {
    scopeType: CutoverExceptionExportScopeType
    scopeKey: string
    scopeLabel: string
    filename: string
    rowCount: number
    exportedBy: string
  }) {
    exceptionExports.value = trim([buildExceptionExportRecord(input), ...exceptionExports.value])
    persist()
  }

  function addRoleDeskTask(input: {
    id?: string
    scopeType: CutoverExceptionExportScopeType
    scopeKey: string
    scopeLabel: string
    roleKey: CutoverRoleDeskActorKey
    roleLabel: string
    owner: string
    assignee?: string
    status: CutoverRoleDeskTaskStatus
    dueAt?: string
    slaStatus?: CutoverRoleDeskSlaStatus
    note: string
    updatedBy: string
    createdAt?: string
  }) {
    upsertRoleDeskTaskRecord(buildRoleDeskTaskRecord(input))
    persist()
  }

  function addFinanceBatchReview(input: {
    id?: string
    scopeType: CutoverExceptionExportScopeType
    scopeKey: string
    scopeLabel: string
    status: CutoverFinanceBatchReviewStatus
    note: string
    updatedBy: string
    createdAt?: string
  }) {
    upsertFinanceBatchReviewRecord(buildFinanceBatchReviewRecord(input))
    persist()
  }

  function addFinanceResultPack(input: {
    id?: string
    scopeType: CutoverExceptionExportScopeType
    scopeKey: string
    scopeLabel: string
    packType: string
    filename: string
    rowCount: number
    summary: string
    createdBy: string
    createdAt?: string
  }) {
    upsertFinanceResultPackRecord(buildFinanceResultPackRecord(input))
    persist()
  }

  function addCloseTask(input: {
    id?: string
    scopeType: CutoverExceptionExportScopeType
    scopeKey: string
    scopeLabel: string
    moduleKey: string
    taskType: string
    taskLabel: string
    status: CutoverCloseTaskStatus
    note: string
    updatedBy: string
    createdAt?: string
  }) {
    upsertCloseTaskRecord(buildCloseTaskRecord(input))
    persist()
  }

  function upsertRoleDeskTask(record: CutoverRoleDeskTaskRecord) {
    upsertRoleDeskTaskRecord(record)
    persist()
  }

  function upsertFinanceBatchReview(record: CutoverFinanceBatchReviewRecord) {
    upsertFinanceBatchReviewRecord(record)
    persist()
  }

  function upsertFinanceResultPack(record: CutoverFinanceResultPackRecord) {
    upsertFinanceResultPackRecord(record)
    persist()
  }

  function upsertCloseTask(record: CutoverCloseTaskRecord) {
    upsertCloseTaskRecord(record)
    persist()
  }

  function latestRollbackDrill(chainKey: PilotChainKey) {
    return rollbackDrills.value.find((item) => item.chainKey === chainKey) || null
  }

  function latestPilotSignoff(chainKey: PilotChainKey) {
    return pilotSignoffs.value.find((item) => item.chainKey === chainKey) || null
  }

  function latestExceptionExport(scopeType: CutoverExceptionExportScopeType, scopeKey: string) {
    return exceptionExports.value.find((item) => item.scopeType === scopeType && item.scopeKey === scopeKey) || null
  }

  function latestRoleDeskTask(
    scopeType: CutoverExceptionExportScopeType,
    scopeKey: string,
    roleKey?: CutoverRoleDeskActorKey,
    owner?: string,
  ) {
    return roleDeskTasks.value.find((item) =>
      item.scopeType === scopeType
      && item.scopeKey === scopeKey
      && (!roleKey || item.roleKey === roleKey)
      && (!owner || item.owner === owner),
    ) || null
  }

  function latestFinanceBatchReview(scopeType: CutoverExceptionExportScopeType, scopeKey: string) {
    return financeBatchReviews.value.find((item) => item.scopeType === scopeType && item.scopeKey === scopeKey) || null
  }

  function latestFinanceResultPack(scopeType: CutoverExceptionExportScopeType, scopeKey: string) {
    return financeResultPacks.value.find((item) => item.scopeType === scopeType && item.scopeKey === scopeKey) || null
  }

  function latestCloseTask(scopeType: CutoverExceptionExportScopeType, scopeKey: string, taskType?: string, moduleKey?: string) {
    return closeTasks.value.find((item) =>
      item.scopeType === scopeType
      && item.scopeKey === scopeKey
      && (!taskType || item.taskType === taskType)
      && (!moduleKey || item.moduleKey === moduleKey),
    ) || null
  }

  function exceptionExportCountFor(scopeType: CutoverExceptionExportScopeType, scopeKey: string) {
    return exceptionExports.value.filter((item) => item.scopeType === scopeType && item.scopeKey === scopeKey).length
  }

  function roleDeskHistoryFor(
    scopeType: CutoverExceptionExportScopeType,
    scopeKey: string,
    roleKey?: CutoverRoleDeskActorKey,
    owner?: string,
  ) {
    return roleDeskTasks.value.filter((item) =>
      item.scopeType === scopeType
      && item.scopeKey === scopeKey
      && (!roleKey || item.roleKey === roleKey)
      && (!owner || item.owner === owner),
    )
  }

  function financeBatchHistoryFor(scopeType: CutoverExceptionExportScopeType, scopeKey: string) {
    return financeBatchReviews.value.filter((item) => item.scopeType === scopeType && item.scopeKey === scopeKey)
  }

  function financeResultPackHistoryFor(scopeType: CutoverExceptionExportScopeType, scopeKey: string) {
    return financeResultPacks.value.filter((item) => item.scopeType === scopeType && item.scopeKey === scopeKey)
  }

  function closeTaskHistoryFor(
    scopeType: CutoverExceptionExportScopeType,
    scopeKey: string,
    moduleKey?: string,
    taskType?: string,
  ) {
    return closeTasks.value.filter((item) =>
      item.scopeType === scopeType
      && item.scopeKey === scopeKey
      && (!moduleKey || item.moduleKey === moduleKey)
      && (!taskType || item.taskType === taskType),
    )
  }

  async function syncServerBoard(limit = 240, force = false) {
    if (boardPromise && !force) {
      return boardPromise
    }
    serverSyncing.value = true
    serverSyncError.value = ''
    boardPromise = fetchCutoverOpsBoard(limit)
      .then((board) => {
        roleDeskSummary.value = board.roleDeskSummary
        financeBatchSummary.value = board.financeBatchSummary
        financeResultPackSummary.value = board.financeResultPackSummary
        closeTaskSummary.value = board.closeTaskSummary
        for (const row of board.roleDeskTasks) upsertRoleDeskTaskRecord(row)
        for (const row of board.financeBatchReviews) upsertFinanceBatchReviewRecord(row)
        for (const row of board.financeResultPacks) upsertFinanceResultPackRecord(row)
        for (const row of board.closeTasks) upsertCloseTaskRecord(row)
        serverSyncedAt.value = new Date().toISOString()
        persist()
      })
      .catch((error: any) => {
        serverSyncError.value = String(error?.message || 'sync-failed')
        throw error
      })
      .finally(() => {
        serverSyncing.value = false
        boardPromise = null
      })
    return boardPromise
  }

  function clearAll() {
    rollbackDrills.value = []
    pilotSignoffs.value = []
    exceptionExports.value = []
    roleDeskTasks.value = []
    financeBatchReviews.value = []
    financeResultPacks.value = []
    closeTasks.value = []
    roleDeskSummary.value = emptyRoleDeskSummary()
    financeBatchSummary.value = emptyFinanceBatchSummary()
    financeResultPackSummary.value = emptyFinanceResultPackSummary()
    closeTaskSummary.value = emptyCloseTaskSummary()
    serverSyncedAt.value = ''
    serverSyncError.value = ''
    persist()
  }

  function upsertRoleDeskTaskRecord(record: CutoverRoleDeskTaskRecord) {
    roleDeskTasks.value = trim([record, ...roleDeskTasks.value.filter((item) => item.id !== record.id)])
  }

  function upsertFinanceBatchReviewRecord(record: CutoverFinanceBatchReviewRecord) {
    financeBatchReviews.value = trim([record, ...financeBatchReviews.value.filter((item) => item.id !== record.id)])
  }

  function upsertFinanceResultPackRecord(record: CutoverFinanceResultPackRecord) {
    financeResultPacks.value = trim([record, ...financeResultPacks.value.filter((item) => item.id !== record.id)])
  }

  function upsertCloseTaskRecord(record: CutoverCloseTaskRecord) {
    closeTasks.value = trim([record, ...closeTasks.value.filter((item) => item.id !== record.id)])
  }

  function persist() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ROLLBACK_DRILLS_KEY, JSON.stringify(rollbackDrills.value))
    window.localStorage.setItem(PILOT_SIGNOFFS_KEY, JSON.stringify(pilotSignoffs.value))
    window.localStorage.setItem(EXCEPTION_EXPORTS_KEY, JSON.stringify(exceptionExports.value))
    window.localStorage.setItem(ROLE_DESK_TASKS_KEY, JSON.stringify(roleDeskTasks.value))
    window.localStorage.setItem(FINANCE_BATCH_REVIEWS_KEY, JSON.stringify(financeBatchReviews.value))
    window.localStorage.setItem(FINANCE_RESULT_PACKS_KEY, JSON.stringify(financeResultPacks.value))
    window.localStorage.setItem(CLOSE_TASKS_KEY, JSON.stringify(closeTasks.value))
  }

  return {
    addCloseTask,
    addFinanceBatchReview,
    addFinanceResultPack,
    addExceptionExport,
    addPilotSignoff,
    addRoleDeskTask,
    addRollbackDrill,
    clearAll,
    closeTaskCount,
    closeTaskHistoryFor,
    closeTaskSummary,
    closeTasks,
    exceptionExportCount,
    exceptionExportCountFor,
    exceptionExports,
    financeBatchHistoryFor,
    financeBatchReviewCount,
    financeBatchReviews,
    financeBatchSummary,
    financeResultPackCount,
    financeResultPackHistoryFor,
    financeResultPackSummary,
    financeResultPacks,
    latestCloseTask,
    latestExceptionExport,
    latestFinanceBatchReview,
    latestFinanceResultPack,
    latestPilotSignoff,
    latestRoleDeskTask,
    latestRollbackDrill,
    pilotSignoffCount,
    pilotSignoffs,
    replaceFromSnapshot,
    rollbackDrillCount,
    rollbackDrills,
    roleDeskHistoryFor,
    roleDeskSummary,
    roleDeskTaskCount,
    roleDeskTasks,
    serverSyncError,
    serverSyncedAt,
    serverSyncing,
    snapshotData,
    syncServerBoard,
    upsertCloseTask,
    upsertFinanceBatchReview,
    upsertFinanceResultPack,
    upsertRoleDeskTask,
  }
})

function buildRollbackDrillRecord(input: {
  chainKey: PilotChainKey
  status: CutoverRollbackDrillStatus
  owner: string
  note: string
  blockerSummary?: string
  evidenceSummary?: string
}): CutoverRollbackDrillRecord {
  return {
    id: buildId('drill'),
    chainKey: input.chainKey,
    status: input.status,
    owner: input.owner,
    note: input.note,
    blockerSummary: input.blockerSummary || '',
    evidenceSummary: input.evidenceSummary || '',
    createdAt: new Date().toISOString(),
  }
}

function buildPilotSignoffRecord(input: {
  chainKey: PilotChainKey
  decision: CutoverPilotSignoffDecision
  owner: string
  note: string
}): CutoverPilotSignoffRecord {
  return {
    id: buildId('signoff'),
    chainKey: input.chainKey,
    decision: input.decision,
    owner: input.owner,
    note: input.note,
    createdAt: new Date().toISOString(),
  }
}

function buildExceptionExportRecord(input: {
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  filename: string
  rowCount: number
  exportedBy: string
}): CutoverExceptionExportRecord {
  return {
    id: buildId('export'),
    scopeType: input.scopeType,
    scopeKey: input.scopeKey,
    scopeLabel: input.scopeLabel,
    filename: input.filename,
    rowCount: input.rowCount,
    exportedBy: input.exportedBy,
    createdAt: new Date().toISOString(),
  }
}

function buildRoleDeskTaskRecord(input: {
  id?: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  roleKey: CutoverRoleDeskActorKey
  roleLabel: string
  owner: string
  assignee?: string
  status: CutoverRoleDeskTaskStatus
  dueAt?: string
  slaStatus?: CutoverRoleDeskSlaStatus
  note: string
  updatedBy: string
  createdAt?: string
}): CutoverRoleDeskTaskRecord {
  const dueAt = input.dueAt || ''
  return {
    id: input.id || buildId('role-desk'),
    scopeType: input.scopeType,
    scopeKey: input.scopeKey,
    scopeLabel: input.scopeLabel,
    roleKey: input.roleKey,
    roleLabel: input.roleLabel,
    owner: input.owner,
    assignee: input.assignee || input.owner,
    status: input.status,
    dueAt,
    slaStatus: input.slaStatus || resolveSlaStatus(input.status, dueAt),
    note: input.note,
    updatedBy: input.updatedBy,
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

function buildFinanceBatchReviewRecord(input: {
  id?: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  status: CutoverFinanceBatchReviewStatus
  note: string
  updatedBy: string
  createdAt?: string
}): CutoverFinanceBatchReviewRecord {
  return {
    id: input.id || buildId('finance-batch'),
    scopeType: input.scopeType,
    scopeKey: input.scopeKey,
    scopeLabel: input.scopeLabel,
    status: input.status,
    note: input.note,
    updatedBy: input.updatedBy,
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

function buildFinanceResultPackRecord(input: {
  id?: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  packType: string
  filename: string
  rowCount: number
  summary: string
  createdBy: string
  createdAt?: string
}): CutoverFinanceResultPackRecord {
  return {
    id: input.id || buildId('finance-pack'),
    scopeType: input.scopeType,
    scopeKey: input.scopeKey,
    scopeLabel: input.scopeLabel,
    packType: input.packType,
    filename: input.filename,
    rowCount: input.rowCount,
    summary: input.summary,
    createdBy: input.createdBy,
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

function buildCloseTaskRecord(input: {
  id?: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  moduleKey: string
  taskType: string
  taskLabel: string
  status: CutoverCloseTaskStatus
  note: string
  updatedBy: string
  createdAt?: string
}): CutoverCloseTaskRecord {
  return {
    id: input.id || buildId('close-task'),
    scopeType: input.scopeType,
    scopeKey: input.scopeKey,
    scopeLabel: input.scopeLabel,
    moduleKey: input.moduleKey,
    taskType: input.taskType,
    taskLabel: input.taskLabel,
    status: input.status,
    note: input.note,
    updatedBy: input.updatedBy,
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

function loadRollbackDrills() {
  if (typeof window === 'undefined') return []
  try {
    return normalizeRollbackDrills(JSON.parse(window.localStorage.getItem(ROLLBACK_DRILLS_KEY) || '[]'))
  } catch {
    return []
  }
}

function loadPilotSignoffs() {
  if (typeof window === 'undefined') return []
  try {
    return normalizePilotSignoffs(JSON.parse(window.localStorage.getItem(PILOT_SIGNOFFS_KEY) || '[]'))
  } catch {
    return []
  }
}

function loadExceptionExports() {
  if (typeof window === 'undefined') return []
  try {
    return normalizeExceptionExports(JSON.parse(window.localStorage.getItem(EXCEPTION_EXPORTS_KEY) || '[]'))
  } catch {
    return []
  }
}

function loadRoleDeskTasks() {
  if (typeof window === 'undefined') return []
  try {
    return normalizeRoleDeskTasks(JSON.parse(window.localStorage.getItem(ROLE_DESK_TASKS_KEY) || '[]'))
  } catch {
    return []
  }
}

function loadFinanceBatchReviews() {
  if (typeof window === 'undefined') return []
  try {
    return normalizeFinanceBatchReviews(JSON.parse(window.localStorage.getItem(FINANCE_BATCH_REVIEWS_KEY) || '[]'))
  } catch {
    return []
  }
}

function loadFinanceResultPacks() {
  if (typeof window === 'undefined') return []
  try {
    return normalizeFinanceResultPacks(JSON.parse(window.localStorage.getItem(FINANCE_RESULT_PACKS_KEY) || '[]'))
  } catch {
    return []
  }
}

function loadCloseTasks() {
  if (typeof window === 'undefined') return []
  try {
    return normalizeCloseTasks(JSON.parse(window.localStorage.getItem(CLOSE_TASKS_KEY) || '[]'))
  } catch {
    return []
  }
}

function trim<T>(rows: T[]) {
  return rows.slice(0, MAX_RECORDS)
}

function buildId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveSlaStatus(status: CutoverRoleDeskTaskStatus, dueAt: string): CutoverRoleDeskSlaStatus {
  if (status === 'done') return 'met'
  const timestamp = new Date(dueAt).getTime()
  if (Number.isNaN(timestamp)) return 'open'
  if (timestamp < Date.now()) return 'overdue'
  if (timestamp - Date.now() <= 6 * 60 * 60 * 1000) return 'risk'
  return 'open'
}

function emptyRoleDeskSummary(): CutoverRoleTaskSummary {
  return {
    totalCount: 0,
    latestCreatedAt: '',
    statusCounts: {},
    roleCounts: {},
    ownerCounts: {},
    assigneeCounts: {},
    slaCounts: {},
  }
}

function emptyFinanceBatchSummary(): CutoverFinanceReviewSummary {
  return {
    totalCount: 0,
    latestCreatedAt: '',
    statusCounts: {},
    reviewerCounts: {},
    scopeTypeCounts: {},
  }
}

function emptyFinanceResultPackSummary(): CutoverFinanceResultPackSummary {
  return {
    totalCount: 0,
    latestCreatedAt: '',
    packTypeCounts: {},
    creatorCounts: {},
  }
}

function emptyCloseTaskSummary(): CutoverCloseTaskSummary {
  return {
    totalCount: 0,
    latestCreatedAt: '',
    statusCounts: {},
    taskTypeCounts: {},
    moduleCounts: {},
  }
}
