import type { PilotChainKey } from '@/stores/cutover'

export type CutoverRollbackDrillStatus = 'passed' | 'blocked'
export type CutoverPilotSignoffDecision = 'go' | 'hold' | 'rollback'
export type CutoverExceptionExportScopeType = 'chain' | 'module' | 'global'
export type CutoverRoleDeskTaskStatus = 'claimed' | 'assigned' | 'reassigned' | 'blocked' | 'done'
export type CutoverRoleDeskSlaStatus = 'open' | 'risk' | 'overdue' | 'met'
export type CutoverFinanceBatchReviewStatus = 'reviewed' | 'blocked' | 'reconciled'
export type CutoverCloseTaskStatus = 'open' | 'in_progress' | 'blocked' | 'done'
export type CutoverRoleDeskActorKey = 'owner' | 'reviewer' | 'financeOwner' | 'signoffOwner' | 'fallbackOwner'
export type CutoverClosedLoopTone = 'success' | 'warning' | 'danger' | 'info'

export interface CutoverRollbackDrillRecord {
  id: string
  chainKey: PilotChainKey
  status: CutoverRollbackDrillStatus
  owner: string
  note: string
  blockerSummary?: string
  evidenceSummary?: string
  createdAt: string
}

export interface CutoverPilotSignoffRecord {
  id: string
  chainKey: PilotChainKey
  decision: CutoverPilotSignoffDecision
  owner: string
  note: string
  createdAt: string
}

export interface CutoverExceptionExportRecord {
  id: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  filename: string
  rowCount: number
  exportedBy: string
  createdAt: string
}

export interface CutoverRoleDeskTaskRecord {
  id: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  roleKey: CutoverRoleDeskActorKey
  roleLabel: string
  owner: string
  assignee: string
  status: CutoverRoleDeskTaskStatus
  dueAt: string
  slaStatus: CutoverRoleDeskSlaStatus
  note: string
  updatedBy: string
  createdAt: string
}

export interface CutoverFinanceBatchReviewRecord {
  id: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  status: CutoverFinanceBatchReviewStatus
  note: string
  updatedBy: string
  createdAt: string
}

export interface CutoverFinanceResultPackRecord {
  id: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  packType: string
  filename: string
  rowCount: number
  summary: string
  createdBy: string
  createdAt: string
}

export interface CutoverCloseTaskRecord {
  id: string
  scopeType: CutoverExceptionExportScopeType
  scopeKey: string
  scopeLabel: string
  moduleKey: string
  taskType: string
  taskLabel: string
  status: CutoverCloseTaskStatus
  note: string
  updatedBy: string
  createdAt: string
}

export interface CutoverOperationsSnapshot {
  rollbackDrills: CutoverRollbackDrillRecord[]
  pilotSignoffs: CutoverPilotSignoffRecord[]
  exceptionExports: CutoverExceptionExportRecord[]
  roleDeskTasks: CutoverRoleDeskTaskRecord[]
  financeBatchReviews: CutoverFinanceBatchReviewRecord[]
  financeResultPacks: CutoverFinanceResultPackRecord[]
  closeTasks: CutoverCloseTaskRecord[]
}

export interface CutoverRoleTaskSummary {
  totalCount: number
  latestCreatedAt: string
  statusCounts: Record<string, number>
  roleCounts: Record<string, number>
  ownerCounts: Record<string, number>
  assigneeCounts: Record<string, number>
  slaCounts: Record<string, number>
}

export interface CutoverFinanceReviewSummary {
  totalCount: number
  latestCreatedAt: string
  statusCounts: Record<string, number>
  reviewerCounts: Record<string, number>
  scopeTypeCounts: Record<string, number>
}

export interface CutoverFinanceResultPackSummary {
  totalCount: number
  latestCreatedAt: string
  packTypeCounts: Record<string, number>
  creatorCounts: Record<string, number>
}

export interface CutoverCloseTaskSummary {
  totalCount: number
  latestCreatedAt: string
  statusCounts: Record<string, number>
  taskTypeCounts: Record<string, number>
  moduleCounts: Record<string, number>
}

export interface CutoverOpsBoard {
  roleDeskTasks: CutoverRoleDeskTaskRecord[]
  financeBatchReviews: CutoverFinanceBatchReviewRecord[]
  financeResultPacks: CutoverFinanceResultPackRecord[]
  closeTasks: CutoverCloseTaskRecord[]
  roleDeskSummary: CutoverRoleTaskSummary
  financeBatchSummary: CutoverFinanceReviewSummary
  financeResultPackSummary: CutoverFinanceResultPackSummary
  closeTaskSummary: CutoverCloseTaskSummary
}

export interface CutoverClosedLoopSummary {
  ready: boolean
  tone: CutoverClosedLoopTone
  score: number
  label: string
  missingLabels: string[]
  staleLabels: string[]
}

export function normalizeCutoverOperationsSnapshot(input?: Partial<CutoverOperationsSnapshot> | null): CutoverOperationsSnapshot {
  return {
    rollbackDrills: normalizeRollbackDrills(input?.rollbackDrills),
    pilotSignoffs: normalizePilotSignoffs(input?.pilotSignoffs),
    exceptionExports: normalizeExceptionExports(input?.exceptionExports),
    roleDeskTasks: normalizeRoleDeskTasks(input?.roleDeskTasks),
    financeBatchReviews: normalizeFinanceBatchReviews(input?.financeBatchReviews),
    financeResultPacks: normalizeFinanceResultPacks(input?.financeResultPacks),
    closeTasks: normalizeCloseTasks(input?.closeTasks),
  }
}

export function normalizeCutoverOpsBoard(input: unknown): CutoverOpsBoard {
  const source = input && typeof input === 'object' ? (input as any) : {}
  return {
    roleDeskTasks: normalizeRoleDeskTasks(source.roleDeskTasks),
    financeBatchReviews: normalizeFinanceBatchReviews(source.financeBatchReviews),
    financeResultPacks: normalizeFinanceResultPacks(source.financeResultPacks),
    closeTasks: normalizeCloseTasks(source.closeTasks),
    roleDeskSummary: normalizeRoleDeskTaskSummary(source.roleDeskSummary),
    financeBatchSummary: normalizeFinanceReviewSummary(source.financeBatchSummary),
    financeResultPackSummary: normalizeFinanceResultPackSummary(source.financeResultPackSummary),
    closeTaskSummary: normalizeCloseTaskSummary(source.closeTaskSummary),
  }
}

export function buildCutoverClosedLoopSummary(input: {
  isEnglish: boolean
  latestDrill?: CutoverRollbackDrillRecord | null
  latestSignoff?: CutoverPilotSignoffRecord | null
  latestExceptionExport?: CutoverExceptionExportRecord | null
  maxAgeDays?: number
}): CutoverClosedLoopSummary {
  const maxAgeDays = input.maxAgeDays ?? 14
  const missingLabels: string[] = []
  const staleLabels: string[] = []

  if (!input.latestDrill) {
    missingLabels.push(input.isEnglish ? 'Rollback Drill' : '回退演练')
  } else {
    if (input.latestDrill.status !== 'passed') {
      missingLabels.push(input.isEnglish ? 'Passed Drill' : '演练通过')
    }
    if (!isFresh(input.latestDrill.createdAt, maxAgeDays)) {
      staleLabels.push(input.isEnglish ? 'Rollback Drill' : '回退演练')
    }
  }

  if (!input.latestSignoff) {
    missingLabels.push(input.isEnglish ? 'Pilot Sign-off' : '试点签收')
  } else {
    if (input.latestSignoff.decision !== 'go') {
      missingLabels.push(input.isEnglish ? 'Go Sign-off' : '放行签收')
    }
    if (!isFresh(input.latestSignoff.createdAt, maxAgeDays)) {
      staleLabels.push(input.isEnglish ? 'Pilot Sign-off' : '试点签收')
    }
  }

  if (!input.latestExceptionExport) {
    missingLabels.push(input.isEnglish ? 'Exception Export' : '异常导出')
  } else if (!isFresh(input.latestExceptionExport.createdAt, maxAgeDays)) {
    staleLabels.push(input.isEnglish ? 'Exception Export' : '异常导出')
  }

  const blocked = input.latestDrill?.status === 'blocked' || input.latestSignoff?.decision === 'rollback'
  const hold = input.latestSignoff?.decision === 'hold'
  const ready = !blocked && !hold && missingLabels.length === 0 && staleLabels.length === 0

  let tone: CutoverClosedLoopTone = 'info'
  let label = input.isEnglish ? 'No Closed Loop Yet' : '闭环未建立'
  if (blocked) {
    tone = 'danger'
    label = input.isEnglish ? 'Rollback Blocked' : '回退阻塞'
  } else if (ready) {
    tone = 'success'
    label = input.isEnglish ? 'Closed Loop Ready' : '闭环就绪'
  } else if (missingLabels.length || staleLabels.length || hold) {
    tone = 'warning'
    label = hold
      ? (input.isEnglish ? 'Awaiting Sign-off' : '等待签收')
      : staleLabels.length
        ? (input.isEnglish ? 'Closed Loop Stale' : '闭环过期')
        : (input.isEnglish ? 'Closed Loop Missing' : '闭环缺失')
  }

  const score = [input.latestDrill, input.latestSignoff, input.latestExceptionExport].filter(Boolean).length

  return {
    ready,
    tone,
    score,
    label,
    missingLabels,
    staleLabels,
  }
}

export function normalizeRollbackDrills(input: unknown): CutoverRollbackDrillRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      chainKey: normalizeChainKey(item.chainKey),
      status: (item.status === 'passed' ? 'passed' : 'blocked') as CutoverRollbackDrillStatus,
      owner: String(item.owner || ''),
      note: String(item.note || ''),
      blockerSummary: item.blockerSummary ? String(item.blockerSummary) : '',
      evidenceSummary: item.evidenceSummary ? String(item.evidenceSummary) : '',
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function normalizePilotSignoffs(input: unknown): CutoverPilotSignoffRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      chainKey: normalizeChainKey(item.chainKey),
      decision: normalizeDecision(item.decision) as CutoverPilotSignoffDecision,
      owner: String(item.owner || ''),
      note: String(item.note || ''),
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function normalizeExceptionExports(input: unknown): CutoverExceptionExportRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      scopeType: normalizeScopeType(item.scopeType),
      scopeKey: String(item.scopeKey || ''),
      scopeLabel: String(item.scopeLabel || ''),
      filename: String(item.filename || ''),
      rowCount: Number(item.rowCount || 0),
      exportedBy: String(item.exportedBy || ''),
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.scopeKey && item.filename && item.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function normalizeRoleDeskTasks(input: unknown): CutoverRoleDeskTaskRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      scopeType: normalizeScopeType(item.scopeType),
      scopeKey: String(item.scopeKey || ''),
      scopeLabel: String(item.scopeLabel || ''),
      roleKey: normalizeRoleKey(item.roleKey),
      roleLabel: String(item.roleLabel || ''),
      owner: String(item.owner || ''),
      assignee: String(item.assignee || item.owner || ''),
      status: normalizeRoleDeskStatus(item.status),
      dueAt: String(item.dueAt || ''),
      slaStatus: normalizeRoleDeskSlaStatus(item.slaStatus, item.status, item.dueAt),
      note: String(item.note || ''),
      updatedBy: String(item.updatedBy || ''),
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.scopeKey && item.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function normalizeFinanceBatchReviews(input: unknown): CutoverFinanceBatchReviewRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      scopeType: normalizeScopeType(item.scopeType),
      scopeKey: String(item.scopeKey || ''),
      scopeLabel: String(item.scopeLabel || ''),
      status: normalizeFinanceReviewStatus(item.status),
      note: String(item.note || ''),
      updatedBy: String(item.updatedBy || ''),
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.scopeKey && item.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function normalizeFinanceResultPacks(input: unknown): CutoverFinanceResultPackRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      scopeType: normalizeScopeType(item.scopeType),
      scopeKey: String(item.scopeKey || ''),
      scopeLabel: String(item.scopeLabel || ''),
      packType: String(item.packType || 'panel-packet'),
      filename: String(item.filename || ''),
      rowCount: Number(item.rowCount || 0),
      summary: String(item.summary || ''),
      createdBy: String(item.createdBy || ''),
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.scopeKey && item.filename && item.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function normalizeCloseTasks(input: unknown): CutoverCloseTaskRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      scopeType: normalizeScopeType(item.scopeType),
      scopeKey: String(item.scopeKey || ''),
      scopeLabel: String(item.scopeLabel || ''),
      moduleKey: String(item.moduleKey || ''),
      taskType: String(item.taskType || ''),
      taskLabel: String(item.taskLabel || ''),
      status: normalizeCloseTaskStatus(item.status),
      note: String(item.note || ''),
      updatedBy: String(item.updatedBy || ''),
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.scopeKey && item.moduleKey && item.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function normalizeRoleDeskTaskSummary(input: unknown): CutoverRoleTaskSummary {
  const source = input && typeof input === 'object' ? (input as any) : {}
  return {
    totalCount: Number(source.totalCount || 0),
    latestCreatedAt: String(source.latestCreatedAt || ''),
    statusCounts: normalizeCountMap(source.statusCounts),
    roleCounts: normalizeCountMap(source.roleCounts),
    ownerCounts: normalizeCountMap(source.ownerCounts),
    assigneeCounts: normalizeCountMap(source.assigneeCounts),
    slaCounts: normalizeCountMap(source.slaCounts),
  }
}

export function normalizeFinanceReviewSummary(input: unknown): CutoverFinanceReviewSummary {
  const source = input && typeof input === 'object' ? (input as any) : {}
  return {
    totalCount: Number(source.totalCount || 0),
    latestCreatedAt: String(source.latestCreatedAt || ''),
    statusCounts: normalizeCountMap(source.statusCounts),
    reviewerCounts: normalizeCountMap(source.reviewerCounts),
    scopeTypeCounts: normalizeCountMap(source.scopeTypeCounts),
  }
}

export function normalizeFinanceResultPackSummary(input: unknown): CutoverFinanceResultPackSummary {
  const source = input && typeof input === 'object' ? (input as any) : {}
  return {
    totalCount: Number(source.totalCount || 0),
    latestCreatedAt: String(source.latestCreatedAt || ''),
    packTypeCounts: normalizeCountMap(source.packTypeCounts),
    creatorCounts: normalizeCountMap(source.creatorCounts),
  }
}

export function normalizeCloseTaskSummary(input: unknown): CutoverCloseTaskSummary {
  const source = input && typeof input === 'object' ? (input as any) : {}
  return {
    totalCount: Number(source.totalCount || 0),
    latestCreatedAt: String(source.latestCreatedAt || ''),
    statusCounts: normalizeCountMap(source.statusCounts),
    taskTypeCounts: normalizeCountMap(source.taskTypeCounts),
    moduleCounts: normalizeCountMap(source.moduleCounts),
  }
}

function normalizeChainKey(value: unknown): PilotChainKey {
  if (value === 'sales' || value === 'purchase') return value
  return 'masterData'
}

function normalizeDecision(value: unknown): CutoverPilotSignoffDecision {
  if (value === 'go' || value === 'rollback') return value
  return 'hold'
}

function normalizeScopeType(value: unknown): CutoverExceptionExportScopeType {
  if (value === 'chain' || value === 'module') return value
  return 'global'
}

function normalizeRoleKey(value: unknown): CutoverRoleDeskActorKey {
  if (value === 'reviewer' || value === 'financeOwner' || value === 'signoffOwner' || value === 'fallbackOwner') {
    return value
  }
  return 'owner'
}

function normalizeRoleDeskStatus(value: unknown): CutoverRoleDeskTaskStatus {
  if (value === 'assigned' || value === 'reassigned' || value === 'blocked' || value === 'done') return value
  return 'claimed'
}

function normalizeRoleDeskSlaStatus(value: unknown, status?: unknown, dueAt?: unknown): CutoverRoleDeskSlaStatus {
  if (value === 'risk' || value === 'overdue' || value === 'met') return value
  if (status === 'done') return 'met'
  const due = typeof dueAt === 'string' ? new Date(dueAt).getTime() : Number.NaN
  if (!Number.isNaN(due)) {
    if (due < Date.now()) return 'overdue'
    if (due - Date.now() <= 6 * 60 * 60 * 1000) return 'risk'
  }
  return 'open'
}

function normalizeFinanceReviewStatus(value: unknown): CutoverFinanceBatchReviewStatus {
  if (value === 'blocked' || value === 'reconciled') return value
  return 'reviewed'
}

function normalizeCloseTaskStatus(value: unknown): CutoverCloseTaskStatus {
  if (value === 'in_progress' || value === 'blocked' || value === 'done') return value
  return 'open'
}

function normalizeCountMap(input: unknown): Record<string, number> {
  if (!input || typeof input !== 'object') return {}
  return Object.entries(input as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, value]) => {
    const normalizedKey = String(key || '').trim()
    if (!normalizedKey) return acc
    acc[normalizedKey] = Number(value || 0)
    return acc
  }, {})
}

function isFresh(value: string, maxAgeDays: number) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return false
  return Date.now() - timestamp <= maxAgeDays * 24 * 60 * 60 * 1000
}
