import type { ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import type { PilotChainKey } from '@/stores/cutover'
import { PAYMENT_LINKAGE_REMINDER_TYPES } from '@/utils/cutover-governance'

type SettlementSummaryShape = {
  statusLabel: string
  missingCount?: number
  warningCount?: number
  missingLabels: string[]
  warningLabels: string[]
}

type FinancialTraceSummaryShape = {
  statusLabel: string
  missingCount?: number
  warningCount?: number
  missingLabels: string[]
  warningLabels: string[]
  recordRefs?: string[]
  topRiskRefs?: string[]
}

export interface FinanceCockpitSummary {
  enabled: boolean
  issueCount: number
  label: string
  lines: string[]
}

function uniqueLabels(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as string[]))
}

function listOrDash(items: string[]) {
  return items.length ? items.join(' / ') : '-'
}

function countSummaryIssues(summary: SettlementSummaryShape | FinancialTraceSummaryShape) {
  return (summary.missingCount ?? summary.missingLabels.length) + (summary.warningCount ?? summary.warningLabels.length)
}

function formatIssueLabel(isEnglish: boolean, issueCount: number) {
  if (issueCount <= 0) {
    return isEnglish ? 'Ready' : '就绪'
  }
  return isEnglish ? `${issueCount} items pending` : `${issueCount} 项待处理`
}

function paymentDriverLabel(type: string, isEnglish: boolean) {
  if (type === 'finance_trace_gap') return isEnglish ? 'Finance Trace Gap' : '财务追溯缺口'
  if (type === 'settlement_gap') return isEnglish ? 'Settlement Gap' : '结算缺口'
  if (type === 'payment_linkage_gap') return isEnglish ? 'Payment Linkage Gap' : '付款联动缺口'
  return type
}

function paymentDriverLabels(reminders: Array<Pick<ReminderRecord, 'type'>>) {
  return reminders
    .filter((item) => PAYMENT_LINKAGE_REMINDER_TYPES.includes(item.type as (typeof PAYMENT_LINKAGE_REMINDER_TYPES)[number]))
    .map((item) => item.type)
}

function moduleFlowLabel(moduleKey: ModuleKey, isEnglish: boolean) {
  if (moduleKey === 'accountInvoice') {
    return isEnglish
      ? 'Posted Invoice -> Payment Artifact -> Journal Review'
      : '已过账发票 -> 付款结果对象 -> 凭证复核'
  }
  if (moduleKey === 'accountPayment') {
    return isEnglish
      ? 'Source Invoice / Bill -> Posted Payment -> Journal Entry'
      : '来源发票 / 账单 -> 已过账付款 -> 会计凭证'
  }
  if (moduleKey === 'accountMove') {
    return isEnglish
      ? 'Source Explanation -> Reconcile Context -> Reverse-safe Journal'
      : '来源解释 -> 对账上下文 -> 可安全冲销的凭证'
  }
  return isEnglish ? 'Not Applicable' : '不适用'
}

function chainFlowLabel(chainKey: PilotChainKey, isEnglish: boolean) {
  if (chainKey === 'sales') {
    return isEnglish
      ? 'Sale Order -> Customer Invoice -> Payment Artifact -> Journal'
      : '销售订单 -> 客户发票 -> 付款结果对象 -> 会计凭证'
  }
  if (chainKey === 'purchase') {
    return isEnglish
      ? 'Purchase Order -> Vendor Bill -> Vendor Payment -> Journal'
      : '采购订单 -> 供应商账单 -> 供应商付款 -> 会计凭证'
  }
  return isEnglish ? 'Not Applicable' : '不适用'
}

function moduleOperatorFocus(moduleKey: ModuleKey, isEnglish: boolean) {
  if (moduleKey === 'accountInvoice') {
    return isEnglish
      ? 'Treat invoice posting as the finance gate, then keep payment state and source anchors continuous.'
      : '把发票过账当成财务闸门，再持续保持付款状态和来源锚点连续。'
  }
  if (moduleKey === 'accountPayment') {
    return isEnglish
      ? 'Keep payment proof, source anchor, and generated journal entry reviewable from one shell.'
      : '把付款证据、来源锚点和生成凭证都固定在同一个壳层里可复核。'
  }
  if (moduleKey === 'accountMove') {
    return isEnglish
      ? 'Review open items, matched lines, and reverse impact before broadening finance close traffic.'
      : '在扩大财务关账流量前，先核对未清项、已匹配分录和冲销影响。'
  }
  return isEnglish ? 'No finance cockpit focus is required.' : '当前不需要财务驾驶舱重点。'
}

function chainOperatorFocus(chainKey: PilotChainKey, isEnglish: boolean) {
  if (chainKey === 'sales') {
    return isEnglish
      ? 'Do not widen the sales pilot until invoice, payment, and accounting evidence can still be reopened from one chain.'
      : '在同一条销售链还能持续重开发票、付款和会计证据之前，不要继续扩大销售试点。'
  }
  if (chainKey === 'purchase') {
    return isEnglish
      ? 'Keep bill, vendor payment, and accounting closure on one procurement lane before expanding traffic.'
      : '在继续扩大采购流量前，先把账单、供应商付款和会计关账固定在同一条采购链路上。'
  }
  return isEnglish ? 'No finance cockpit focus is required.' : '当前不需要财务驾驶舱重点。'
}

function reconcileFocusLine(moduleKey: ModuleKey, isEnglish: boolean, financialTraceSummary: FinancialTraceSummaryShape) {
  if (moduleKey !== 'accountMove') return null
  const warningLabels = uniqueLabels([
    ...financialTraceSummary.missingLabels,
    ...financialTraceSummary.warningLabels,
  ])
  return `${isEnglish ? 'Reconcile Focus' : '对账重点'}: ${warningLabels.length
    ? warningLabels.join(' / ')
    : (isEnglish ? 'Open items and matched lines are stable.' : '未清项和已匹配分录已经稳定。')}`
}

export function supportsFinanceCockpitModule(moduleKey: ModuleKey) {
  return ['accountInvoice', 'accountPayment', 'accountMove'].includes(moduleKey)
}

export function supportsFinanceCockpitChain(chainKey?: PilotChainKey) {
  return chainKey === 'sales' || chainKey === 'purchase'
}

export function buildModuleFinanceCockpitSummary(input: {
  moduleKey: ModuleKey
  isEnglish: boolean
  reminders: Array<Pick<ReminderRecord, 'type'>>
  settlementSummary: SettlementSummaryShape
  financialTraceSummary: FinancialTraceSummaryShape
  blockerLabels?: string[]
}) : FinanceCockpitSummary {
  if (!supportsFinanceCockpitModule(input.moduleKey)) {
    return {
      enabled: false,
      issueCount: 0,
      label: input.isEnglish ? 'Not Applicable' : '不适用',
      lines: [],
    }
  }

  const paymentDrivers = uniqueLabels(paymentDriverLabels(input.reminders).map((item) => paymentDriverLabel(item, input.isEnglish)))
  const settlementIssues = countSummaryIssues(input.settlementSummary)
  const traceIssues = countSummaryIssues(input.financialTraceSummary)
  const blockerLabels = uniqueLabels(input.blockerLabels || [])
  const traceAnchors = uniqueLabels([
    ...(input.financialTraceSummary.recordRefs || []).slice(0, 4),
    ...(input.financialTraceSummary.topRiskRefs || []).slice(0, 2),
  ])
  const issueCount = paymentDrivers.length + settlementIssues + traceIssues + (blockerLabels.length ? 1 : 0)

  return {
    enabled: true,
    issueCount,
    label: formatIssueLabel(input.isEnglish, issueCount),
    lines: [
      `- ${input.isEnglish ? 'Cockpit Status' : '驾驶舱状态'}: ${formatIssueLabel(input.isEnglish, issueCount)}`,
      `- ${input.isEnglish ? 'Expected Flow' : '预期流向'}: ${moduleFlowLabel(input.moduleKey, input.isEnglish)}`,
      `- ${input.isEnglish ? 'Payment Drivers' : '付款驱动'}: ${listOrDash(paymentDrivers)}`,
      `- ${input.isEnglish ? 'Settlement Closure' : '结算闭环'}: ${input.settlementSummary.statusLabel}`,
      `- ${input.isEnglish ? 'Financial Trace' : '财务追溯'}: ${input.financialTraceSummary.statusLabel}`,
      `- ${input.isEnglish ? 'Trace Anchors' : '追溯锚点'}: ${listOrDash(traceAnchors)}`,
      `- ${input.isEnglish ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(blockerLabels)}`,
      ...(reconcileFocusLine(input.moduleKey, input.isEnglish, input.financialTraceSummary)
        ? [`- ${reconcileFocusLine(input.moduleKey, input.isEnglish, input.financialTraceSummary)}`]
        : []),
      `- ${input.isEnglish ? 'Operator Focus' : '操作重点'}: ${moduleOperatorFocus(input.moduleKey, input.isEnglish)}`,
    ],
  }
}

export function buildChainFinanceCockpitSummary(input: {
  chainKey?: PilotChainKey
  isEnglish: boolean
  reminders: Array<Pick<ReminderRecord, 'type'>>
  settlementSummary: SettlementSummaryShape
  financialTraceSummary: FinancialTraceSummaryShape
  blockerLabels?: string[]
}) : FinanceCockpitSummary {
  if (!supportsFinanceCockpitChain(input.chainKey)) {
    return {
      enabled: false,
      issueCount: 0,
      label: input.isEnglish ? 'Not Applicable' : '不适用',
      lines: [],
    }
  }

  const paymentDrivers = uniqueLabels(paymentDriverLabels(input.reminders).map((item) => paymentDriverLabel(item, input.isEnglish)))
  const settlementIssues = countSummaryIssues(input.settlementSummary)
  const traceIssues = countSummaryIssues(input.financialTraceSummary)
  const blockerLabels = uniqueLabels(input.blockerLabels || [])
  const traceAnchors = uniqueLabels([
    ...(input.financialTraceSummary.recordRefs || []).slice(0, 4),
    ...(input.financialTraceSummary.topRiskRefs || []).slice(0, 2),
  ])
  const issueCount = paymentDrivers.length + settlementIssues + traceIssues + (blockerLabels.length ? 1 : 0)

  return {
    enabled: true,
    issueCount,
    label: formatIssueLabel(input.isEnglish, issueCount),
    lines: [
      `- ${input.isEnglish ? 'Cockpit Status' : '驾驶舱状态'}: ${formatIssueLabel(input.isEnglish, issueCount)}`,
      `- ${input.isEnglish ? 'Expected Flow' : '预期流向'}: ${chainFlowLabel(input.chainKey as PilotChainKey, input.isEnglish)}`,
      `- ${input.isEnglish ? 'Payment Drivers' : '付款驱动'}: ${listOrDash(paymentDrivers)}`,
      `- ${input.isEnglish ? 'Settlement Closure' : '结算闭环'}: ${input.settlementSummary.statusLabel}`,
      `- ${input.isEnglish ? 'Financial Trace' : '财务追溯'}: ${input.financialTraceSummary.statusLabel}`,
      `- ${input.isEnglish ? 'Trace Anchors' : '追溯锚点'}: ${listOrDash(traceAnchors)}`,
      `- ${input.isEnglish ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(blockerLabels)}`,
      `- ${input.isEnglish ? 'Operator Focus' : '操作重点'}: ${chainOperatorFocus(input.chainKey as PilotChainKey, input.isEnglish)}`,
    ],
  }
}
