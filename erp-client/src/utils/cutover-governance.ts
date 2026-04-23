import type { ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'

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

export const PAYMENT_LINKAGE_REMINDER_TYPES = ['finance_trace_gap', 'settlement_gap', 'payment_linkage_gap'] as const
export const QUANT_IMPACT_REMINDER_TYPES = ['inventory_gap', 'traceability_gap', 'rollback_gap'] as const

type PaymentLinkageReminderType = (typeof PAYMENT_LINKAGE_REMINDER_TYPES)[number]
type QuantImpactReminderType = (typeof QUANT_IMPACT_REMINDER_TYPES)[number]

function uniqueLabels(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)))
}

function listOrDash(items: string[]) {
  return items.length ? items.join(' / ') : '-'
}

function formatIssueLabel(isEnglish: boolean, issueCount: number) {
  if (issueCount <= 0) {
    return isEnglish ? 'Ready' : '就绪'
  }
  return isEnglish ? `${issueCount} issues pending` : `${issueCount} 项待处理`
}

function paymentLinkageReminderLabel(type: PaymentLinkageReminderType, isEnglish: boolean) {
  if (type === 'finance_trace_gap') return isEnglish ? 'Finance Trace Gap' : '财务追溯缺口'
  if (type === 'settlement_gap') return isEnglish ? 'Settlement Gap' : '结算缺口'
  return isEnglish ? 'Payment Linkage Gap' : '付款联动缺口'
}

function quantImpactReminderLabel(type: QuantImpactReminderType, isEnglish: boolean) {
  if (type === 'inventory_gap') return isEnglish ? 'Inventory Gap' : '库存缺口'
  if (type === 'traceability_gap') return isEnglish ? 'Traceability Gap' : '追溯缺口'
  return isEnglish ? 'Rollback Gap' : '回退缺口'
}

export function supportsPaymentLinkageModule(moduleKey: ModuleKey) {
  return ['accountInvoice', 'accountPayment', 'accountMove'].includes(moduleKey)
}

export function supportsQuantImpactModule(moduleKey: ModuleKey) {
  return moduleKey === 'stockPicking'
}

export function buildPaymentLinkageGovernanceSummary(input: {
  moduleKey: ModuleKey
  isEnglish: boolean
  reminders: Array<Pick<ReminderRecord, 'type' | 'severity'>>
  settlementSummary: SettlementSummaryShape
  financialTraceSummary: FinancialTraceSummaryShape
}) {
  if (!supportsPaymentLinkageModule(input.moduleKey)) {
    return {
      enabled: false,
      issueCount: 0,
      label: input.isEnglish ? 'Not Applicable' : '不适用',
      lines: [] as string[],
    }
  }

  const reminderDrivers = uniqueLabels(
    input.reminders
      .filter((item): item is Pick<ReminderRecord, 'type' | 'severity'> & { type: PaymentLinkageReminderType } =>
        PAYMENT_LINKAGE_REMINDER_TYPES.includes(item.type as PaymentLinkageReminderType),
      )
      .map((item) => paymentLinkageReminderLabel(item.type, input.isEnglish)),
  )
  const traceRefs = uniqueLabels([
    ...(input.financialTraceSummary.recordRefs || []).slice(0, 4),
    ...(input.financialTraceSummary.topRiskRefs || []).slice(0, 2),
  ])
  const settlementMissingCount = input.settlementSummary.missingCount ?? input.settlementSummary.missingLabels.length
  const settlementWarningCount = input.settlementSummary.warningCount ?? input.settlementSummary.warningLabels.length
  const traceMissingCount = input.financialTraceSummary.missingCount ?? input.financialTraceSummary.missingLabels.length
  const traceWarningCount = input.financialTraceSummary.warningCount ?? input.financialTraceSummary.warningLabels.length
  const issueCount = reminderDrivers.length
    + settlementMissingCount
    + settlementWarningCount
    + traceMissingCount
    + traceWarningCount

  return {
    enabled: true,
    issueCount,
    label: formatIssueLabel(input.isEnglish, issueCount),
    lines: [
      `- ${input.isEnglish ? 'Module Status' : '模块状态'}: ${formatIssueLabel(input.isEnglish, issueCount)}`,
      `- ${input.isEnglish ? 'Reminder Drivers' : '提醒驱动'}: ${listOrDash(reminderDrivers)}`,
      `- ${input.isEnglish ? 'Settlement Closure' : '结算闭环'}: ${input.settlementSummary.statusLabel}`,
      `- ${input.isEnglish ? 'Financial Trace' : '财务追溯'}: ${input.financialTraceSummary.statusLabel}`,
      `- ${input.isEnglish ? 'Trace Anchors' : '追溯锚点'}: ${listOrDash(traceRefs)}`,
      `- ${input.isEnglish ? 'Operator Focus' : '操作重点'}: ${input.isEnglish
        ? 'Keep invoice, payment, and journal references continuous before widening finance traffic.'
        : '在继续放大财务流量前，先保持发票、付款和凭证引用连续。'}`,
    ],
  }
}

export function buildQuantImpactGovernanceSummary(input: {
  moduleKey: ModuleKey
  isEnglish: boolean
  reminders: Array<Pick<ReminderRecord, 'type' | 'severity'>>
  settlementSummary: SettlementSummaryShape
  financialTraceSummary: FinancialTraceSummaryShape
  pendingGateCount?: number
  blockerLabels?: string[]
}) {
  if (!supportsQuantImpactModule(input.moduleKey)) {
    return {
      enabled: false,
      issueCount: 0,
      label: input.isEnglish ? 'Not Applicable' : '不适用',
      lines: [] as string[],
    }
  }

  const reminderDrivers = uniqueLabels(
    input.reminders
      .filter((item): item is Pick<ReminderRecord, 'type' | 'severity'> & { type: QuantImpactReminderType } =>
        QUANT_IMPACT_REMINDER_TYPES.includes(item.type as QuantImpactReminderType),
      )
      .map((item) => quantImpactReminderLabel(item.type, input.isEnglish)),
  )
  const blockerLabels = uniqueLabels(input.blockerLabels || [])
  const gateIssueCount = input.pendingGateCount ? 1 : 0
  const blockerIssueCount = blockerLabels.length ? 1 : 0
  const traceMissingCount = input.financialTraceSummary.missingCount ?? input.financialTraceSummary.missingLabels.length
  const traceWarningCount = input.financialTraceSummary.warningCount ?? input.financialTraceSummary.warningLabels.length
  const issueCount = reminderDrivers.length
    + gateIssueCount
    + blockerIssueCount
    + traceMissingCount
    + traceWarningCount

  return {
    enabled: true,
    issueCount,
    label: formatIssueLabel(input.isEnglish, issueCount),
    lines: [
      `- ${input.isEnglish ? 'Module Status' : '模块状态'}: ${formatIssueLabel(input.isEnglish, issueCount)}`,
      `- ${input.isEnglish ? 'Reminder Drivers' : '提醒驱动'}: ${listOrDash(reminderDrivers)}`,
      `- ${input.isEnglish ? 'Pending Gates' : '待完成门槛'}: ${input.pendingGateCount ? String(input.pendingGateCount) : (input.isEnglish ? 'Ready' : '就绪')}`,
      `- ${input.isEnglish ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(blockerLabels)}`,
      `- ${input.isEnglish ? 'Financial Trace' : '财务追溯'}: ${input.financialTraceSummary.statusLabel}`,
      `- ${input.isEnglish ? 'Settlement Closure' : '结算闭环'}: ${input.settlementSummary.statusLabel}`,
      `- ${input.isEnglish ? 'Operator Focus' : '操作重点'}: ${input.isEnglish
        ? 'Keep source and destination quant pressure visible before rollback or pilot expansion.'
        : '在回退或继续扩大试点前，先看清来源库位和目标库位的 quant 压力。'}`,
    ],
  }
}
