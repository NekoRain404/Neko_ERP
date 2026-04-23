import type { ModuleKey } from '@/config/module-manifest'
import type { ChainContacts, PilotChainKey } from '@/stores/cutover'
import type {
  CutoverExceptionExportRecord,
  CutoverPilotSignoffRecord,
  CutoverRollbackDrillRecord,
} from '@/utils/cutover-ops'
import {
  PAYMENT_LINKAGE_REMINDER_TYPES,
  QUANT_IMPACT_REMINDER_TYPES,
} from '@/utils/cutover-governance'

export interface CloseRoleSnapshot {
  owner: string
  fallbackOwner: string
  reviewer: string
  financeOwner: string
  signoffOwner: string
  companyLabel: string
}

export interface CloseChecklistItem {
  key: string
  label: string
  ready: boolean
  description: string
}

function listOrDash(items: string[]) {
  return items.length ? items.join(' / ') : '-'
}

function financeScoped(moduleKey?: ModuleKey, chainKey?: PilotChainKey) {
  if (moduleKey && ['saleOrder', 'purchaseOrder', 'accountInvoice', 'accountPayment', 'accountMove', 'stockPicking'].includes(moduleKey)) {
    return true
  }
  return chainKey === 'sales' || chainKey === 'purchase'
}

export function countReminderIssueTypes(reminders: Array<Pick<{ type: string }, 'type'>>, types: readonly string[]) {
  return reminders.filter((item) => types.includes(item.type)).length
}

export function countPaymentLinkageIssues(reminders: Array<Pick<{ type: string }, 'type'>>) {
  return countReminderIssueTypes(reminders, PAYMENT_LINKAGE_REMINDER_TYPES)
}

export function countQuantImpactIssues(reminders: Array<Pick<{ type: string }, 'type'>>) {
  return countReminderIssueTypes(reminders, QUANT_IMPACT_REMINDER_TYPES)
}

export function buildCloseRoleSnapshot(input: {
  contacts: ChainContacts
  isEnglish: boolean
  moduleKey?: ModuleKey
  chainKey?: PilotChainKey
  companyLabel?: string
}) : CloseRoleSnapshot {
  const hasFinanceScope = financeScoped(input.moduleKey, input.chainKey)
  return {
    owner: input.contacts.owner || '-',
    fallbackOwner: input.contacts.fallbackOwner || '-',
    reviewer: input.contacts.reviewerOwner || input.contacts.rehearsalOwner || input.contacts.pilotConfirmOwner || input.contacts.owner || '-',
    financeOwner: hasFinanceScope
      ? (input.contacts.financeOwner || input.contacts.pilotConfirmOwner || input.contacts.owner || '-')
      : '-',
    signoffOwner: input.contacts.pilotConfirmOwner || input.contacts.owner || '-',
    companyLabel: input.companyLabel || (input.isEnglish ? 'Default Company Scope' : '默认公司范围'),
  }
}

function invoiceReadyLabel(isEnglish: boolean, moduleKey?: ModuleKey, chainKey?: PilotChainKey) {
  if (moduleKey === 'stockPicking') return isEnglish ? 'Execution Ready' : '执行就绪'
  if (chainKey === 'masterData' || moduleKey === 'resPartner') return isEnglish ? 'Master Data Ready' : '主数据就绪'
  return isEnglish ? 'Invoice / Bill Ready' : '发票 / 账单就绪'
}

function paymentReadyLabel(isEnglish: boolean, moduleKey?: ModuleKey, chainKey?: PilotChainKey) {
  if (moduleKey === 'stockPicking') return isEnglish ? 'Inventory Impact Ready' : '库存影响就绪'
  if (chainKey === 'masterData' || moduleKey === 'resPartner') return isEnglish ? 'Reminder Ready' : '提醒就绪'
  return isEnglish ? 'Payment Ready' : '付款就绪'
}

function sourceDescription(isEnglish: boolean, count: number) {
  return count === 0
    ? (isEnglish ? 'Source linkage and origin continuity are green.' : '来源链接和来源连续性已通过。')
    : (isEnglish ? `${count} source or trace issues still need repair.` : `仍有 ${count} 项来源或追溯问题待修复。`)
}

function billingDescription(isEnglish: boolean, count: number, moduleKey?: ModuleKey) {
  if (moduleKey === 'stockPicking') {
    return count === 0
      ? (isEnglish ? 'Transfer execution feedback is consistent enough for cutover review.' : '调拨执行反馈已经达到可切换复核状态。')
      : (isEnglish ? `${count} settlement or execution issues still block transfer review.` : `仍有 ${count} 项结算或执行问题阻塞调拨复核。`)
  }
  return count === 0
    ? (isEnglish ? 'Billing or invoice continuity is ready.' : '发票或账单连续性已就绪。')
    : (isEnglish ? `${count} billing-side issues still need follow-up.` : `仍有 ${count} 项开票侧问题待跟进。`)
}

function paymentDescription(isEnglish: boolean, count: number, moduleKey?: ModuleKey) {
  if (moduleKey === 'stockPicking') {
    return count === 0
      ? (isEnglish ? 'Quant-side impact is explained and stable.' : 'quant 侧影响已解释且稳定。')
      : (isEnglish ? `${count} quant-side impact issues still need explanation.` : `仍有 ${count} 项 quant 侧影响需要解释。`)
  }
  return count === 0
    ? (isEnglish ? 'Payment linkage is continuous.' : '付款联动已连续。')
    : (isEnglish ? `${count} payment linkage issues are still open.` : `仍有 ${count} 项付款联动问题未关闭。`)
}

function journalDescription(isEnglish: boolean, count: number) {
  return count === 0
    ? (isEnglish ? 'Journal and trace continuity are ready.' : '凭证和追溯连续性已就绪。')
    : (isEnglish ? `${count} journal or trace issues still need repair.` : `仍有 ${count} 项凭证或追溯问题待修复。`)
}

function evidenceDescription(isEnglish: boolean, count: number) {
  return count === 0
    ? (isEnglish ? 'Drill, sign-off, and exception evidence are complete.' : '演练、签收和异常证据已经完整。')
    : (isEnglish ? `${count} evidence or closed-loop gaps remain.` : `仍有 ${count} 项证据或闭环缺口。`)
}

function releaseDescription(isEnglish: boolean, gatePendingCount: number, blockerCount: number) {
  if (gatePendingCount === 0 && blockerCount === 0) {
    return isEnglish ? 'Release gates are green.' : '放行门槛已全部通过。'
  }
  const labels = [
    gatePendingCount ? (isEnglish ? `${gatePendingCount} gates pending` : `${gatePendingCount} 项门槛待完成`) : null,
    blockerCount ? (isEnglish ? `${blockerCount} blockers` : `${blockerCount} 项阻塞`) : null,
  ].filter(Boolean)
  return labels.join(' · ')
}

export function buildModuleCloseChecklist(input: {
  moduleKey: ModuleKey
  isEnglish: boolean
  gatePendingCount: number
  settlementIssueCount: number
  financialTraceIssueCount: number
  closedLoopIssueCount: number
  paymentLinkageIssueCount: number
  quantImpactIssueCount: number
  blockerLabels?: string[]
}) : CloseChecklistItem[] {
  const blockerCount = input.blockerLabels?.length ?? 0
  return [
    {
      key: 'source',
      label: input.isEnglish ? 'Source Ready' : '来源就绪',
      ready: input.financialTraceIssueCount === 0,
      description: sourceDescription(input.isEnglish, input.financialTraceIssueCount),
    },
    {
      key: 'billing',
      label: invoiceReadyLabel(input.isEnglish, input.moduleKey),
      ready: input.settlementIssueCount === 0,
      description: billingDescription(input.isEnglish, input.settlementIssueCount, input.moduleKey),
    },
    {
      key: 'payment',
      label: paymentReadyLabel(input.isEnglish, input.moduleKey),
      ready: (input.moduleKey === 'stockPicking' ? input.quantImpactIssueCount : input.paymentLinkageIssueCount) === 0,
      description: paymentDescription(
        input.isEnglish,
        input.moduleKey === 'stockPicking' ? input.quantImpactIssueCount : input.paymentLinkageIssueCount,
        input.moduleKey,
      ),
    },
    {
      key: 'journal',
      label: input.isEnglish ? 'Journal Ready' : '凭证就绪',
      ready: input.financialTraceIssueCount === 0,
      description: journalDescription(input.isEnglish, input.financialTraceIssueCount),
    },
    {
      key: 'evidence',
      label: input.isEnglish ? 'Evidence Ready' : '证据就绪',
      ready: input.closedLoopIssueCount === 0,
      description: evidenceDescription(input.isEnglish, input.closedLoopIssueCount),
    },
    {
      key: 'release',
      label: input.isEnglish ? 'Release Ready' : '放行就绪',
      ready: input.gatePendingCount === 0 && blockerCount === 0,
      description: releaseDescription(input.isEnglish, input.gatePendingCount, blockerCount),
    },
  ]
}

export function buildChainCloseChecklist(input: {
  chainKey: PilotChainKey
  isEnglish: boolean
  gatePendingCount: number
  settlementIssueCount: number
  financialTraceIssueCount: number
  closedLoopIssueCount: number
  paymentLinkageIssueCount: number
  blockerLabels?: string[]
}) : CloseChecklistItem[] {
  const blockerCount = input.blockerLabels?.length ?? 0
  return [
    {
      key: 'source',
      label: input.isEnglish ? 'Source Ready' : '来源就绪',
      ready: input.financialTraceIssueCount === 0,
      description: sourceDescription(input.isEnglish, input.financialTraceIssueCount),
    },
    {
      key: 'billing',
      label: invoiceReadyLabel(input.isEnglish, undefined, input.chainKey),
      ready: input.settlementIssueCount === 0,
      description: billingDescription(input.isEnglish, input.settlementIssueCount),
    },
    {
      key: 'payment',
      label: paymentReadyLabel(input.isEnglish, undefined, input.chainKey),
      ready: input.paymentLinkageIssueCount === 0,
      description: paymentDescription(input.isEnglish, input.paymentLinkageIssueCount),
    },
    {
      key: 'journal',
      label: input.isEnglish ? 'Journal Ready' : '凭证就绪',
      ready: input.financialTraceIssueCount === 0,
      description: journalDescription(input.isEnglish, input.financialTraceIssueCount),
    },
    {
      key: 'evidence',
      label: input.isEnglish ? 'Evidence Ready' : '证据就绪',
      ready: input.closedLoopIssueCount === 0,
      description: evidenceDescription(input.isEnglish, input.closedLoopIssueCount),
    },
    {
      key: 'release',
      label: input.isEnglish ? 'Release Ready' : '放行就绪',
      ready: input.gatePendingCount === 0 && blockerCount === 0,
      description: releaseDescription(input.isEnglish, input.gatePendingCount, blockerCount),
    },
  ]
}

function rollbackDrillLabel(isEnglish: boolean, status?: string | null) {
  if (status === 'passed') return isEnglish ? 'Passed' : '已通过'
  if (status === 'blocked') return isEnglish ? 'Blocked' : '已阻塞'
  return isEnglish ? 'Not Recorded' : '未记录'
}

function pilotSignoffLabel(isEnglish: boolean, decision?: string | null) {
  if (decision === 'go') return isEnglish ? 'Go' : '放行'
  if (decision === 'hold') return isEnglish ? 'Hold' : '暂缓'
  if (decision === 'rollback') return isEnglish ? 'Rollback' : '回退'
  return isEnglish ? 'Not Recorded' : '未记录'
}

export function buildCloseRecentActivityLines(input: {
  isEnglish: boolean
  closeLabel: string
  latestDrill?: CutoverRollbackDrillRecord | null
  latestSignoff?: CutoverPilotSignoffRecord | null
  latestExceptionExport?: CutoverExceptionExportRecord | null
  formatDateTime: (value: string) => string
}) {
  return [
    `${input.isEnglish ? 'Latest Close Snapshot' : '最近关账快照'}: ${input.closeLabel}`,
    `${input.isEnglish ? 'Latest Drill' : '最近演练'}: ${input.latestDrill ? `${rollbackDrillLabel(input.isEnglish, input.latestDrill.status)} · ${input.latestDrill.owner || '-'} · ${input.formatDateTime(input.latestDrill.createdAt)}` : '-'}`,
    `${input.isEnglish ? 'Latest Sign-off' : '最近签收'}: ${input.latestSignoff ? `${pilotSignoffLabel(input.isEnglish, input.latestSignoff.decision)} · ${input.latestSignoff.owner || '-'} · ${input.formatDateTime(input.latestSignoff.createdAt)}` : '-'}`,
    `${input.isEnglish ? 'Latest Exception Export' : '最近异常导出'}: ${input.latestExceptionExport ? `${input.latestExceptionExport.filename} · ${input.latestExceptionExport.rowCount} · ${input.formatDateTime(input.latestExceptionExport.createdAt)}` : '-'}`,
  ]
}

export function summarizeCloseChecklist(items: CloseChecklistItem[], isEnglish: boolean) {
  const blockers = items.filter((item) => !item.ready)
  if (!blockers.length) {
    return isEnglish ? 'Checklist Ready' : '清单就绪'
  }
  return listOrDash(blockers.map((item) => item.label))
}
