import type { ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import { summarizeReminderFamilies } from '@/utils/reminders'

export interface FirstWaveSettlementSummary {
  label: string
  statusLabel: string
  expectedCount: number
  readyCount: number
  warningCount: number
  missingCount: number
  expectedLabels: string[]
  missingLabels: string[]
  warningLabels: string[]
  lines: string[]
}

function resolveSettlementExpectedLabels(moduleKey: ModuleKey, english: boolean) {
  if (moduleKey === 'saleOrder') {
    return english
      ? ['Delivery Artifact', 'Invoice Artifact', 'Payment Artifact']
      : ['出库结果对象', '开票结果对象', '付款结果对象']
  }
  if (moduleKey === 'purchaseOrder') {
    return english
      ? ['Receipt Artifact', 'Bill Artifact', 'Payment Artifact']
      : ['收货结果对象', '账单结果对象', '付款结果对象']
  }
  if (moduleKey === 'accountInvoice') {
    return english
      ? ['Invoice Posting', 'Upstream Origin', 'Payment Artifact']
      : ['发票过账', '上游来源', '付款结果对象']
  }
  if (moduleKey === 'stockPicking') {
    return english
      ? ['Upstream Origin', 'Move Pack', 'Transfer Completion']
      : ['上游来源', '移动行包', '调拨完成']
  }
  if (moduleKey === 'accountPayment') {
    return english
      ? ['Source Anchor', 'Payment Posting', 'Journal Entry']
      : ['来源锚点', '付款过账', '会计凭证']
  }
  return []
}

export function buildModuleSettlementSummary(input: {
  moduleKey: ModuleKey
  isEnglish: boolean
  reminders?: Array<Pick<ReminderRecord, 'type' | 'severity'>>
}): FirstWaveSettlementSummary {
  const expectedLabels = resolveSettlementExpectedLabels(input.moduleKey, input.isEnglish)
  if (!expectedLabels.length) {
    return {
      label: input.isEnglish ? 'Settlement Closure' : '结算闭环',
      statusLabel: input.isEnglish ? 'Not Applicable' : '不适用',
      expectedCount: 0,
      readyCount: 0,
      warningCount: 0,
      missingCount: 0,
      expectedLabels: [],
      missingLabels: [],
      warningLabels: [],
      lines: [input.isEnglish ? 'No settlement closure checklist applies to this module.' : '当前模块没有适用的结算闭环检查。'],
    }
  }

  const reminderSummary = summarizeReminderFamilies(input.reminders || [])
  const hasCollectionsPressure = reminderSummary.collectionsCount > 0
  const hasCriticalPressure = reminderSummary.criticalCount > 0
  const hasWarningPressure = reminderSummary.warningCount > 0

  const missingLabels = hasCriticalPressure && hasCollectionsPressure ? expectedLabels : []
  const warningLabels = !missingLabels.length && (hasCollectionsPressure || hasWarningPressure) ? expectedLabels : []
  const readyCount = missingLabels.length
    ? 0
    : warningLabels.length
      ? 0
      : expectedLabels.length

  const statusLabel = missingLabels.length
    ? (input.isEnglish ? 'Closure Blocked' : '闭环阻塞')
    : warningLabels.length
      ? (input.isEnglish ? 'Closure In Progress' : '闭环推进中')
      : (input.isEnglish ? 'Closure Ready' : '闭环就绪')

  const lines = [
    `${input.isEnglish ? 'Status' : '状态'}: ${statusLabel}`,
    `${input.isEnglish ? 'Expected Steps' : '预期步骤'}: ${expectedLabels.join(' / ')}`,
  ]
  if (missingLabels.length) {
    lines.push(`${input.isEnglish ? 'Missing' : '缺失'}: ${missingLabels.join(' / ')}`)
  }
  if (warningLabels.length) {
    lines.push(`${input.isEnglish ? 'Pending' : '待推进'}: ${warningLabels.join(' / ')}`)
  }
  if (hasCollectionsPressure) {
    lines.push(input.isEnglish ? 'Collections or settlement reminders are still open.' : '收付款或结算提醒仍未关闭。')
  }

  return {
    label: input.isEnglish ? 'Settlement Closure' : '结算闭环',
    statusLabel,
    expectedCount: expectedLabels.length,
    readyCount,
    warningCount: warningLabels.length,
    missingCount: missingLabels.length,
    expectedLabels,
    missingLabels,
    warningLabels,
    lines,
  }
}

export function buildChainSettlementSummary(input: {
  moduleKeys: ModuleKey[]
  isEnglish: boolean
  reminders?: Array<Pick<ReminderRecord, 'moduleKey' | 'type' | 'severity'>>
}): FirstWaveSettlementSummary {
  const moduleSummaries = [...new Set(input.moduleKeys)]
    .map((moduleKey) =>
      buildModuleSettlementSummary({
        moduleKey,
        isEnglish: input.isEnglish,
        reminders: (input.reminders || []).filter((item) => item.moduleKey === moduleKey),
      }),
    )
    .filter((item) => item.expectedCount > 0)

  if (!moduleSummaries.length) {
    return {
      label: input.isEnglish ? 'Settlement Closure' : '结算闭环',
      statusLabel: input.isEnglish ? 'Not Applicable' : '不适用',
      expectedCount: 0,
      readyCount: 0,
      warningCount: 0,
      missingCount: 0,
      expectedLabels: [],
      missingLabels: [],
      warningLabels: [],
      lines: [input.isEnglish ? 'No settlement closure checklist applies to this chain.' : '当前链路没有适用的结算闭环检查。'],
    }
  }

  const expectedLabels = moduleSummaries.flatMap((item) => item.expectedLabels)
  const missingLabels = moduleSummaries.flatMap((item) => item.missingLabels)
  const warningLabels = moduleSummaries.flatMap((item) => item.warningLabels)
  const readyCount = moduleSummaries.reduce((sum, item) => sum + item.readyCount, 0)
  const expectedCount = moduleSummaries.reduce((sum, item) => sum + item.expectedCount, 0)
  const statusLabel = missingLabels.length
    ? (input.isEnglish ? 'Closure Blocked' : '闭环阻塞')
    : warningLabels.length
      ? (input.isEnglish ? 'Closure In Progress' : '闭环推进中')
      : (input.isEnglish ? 'Closure Ready' : '闭环就绪')

  return {
    label: input.isEnglish ? 'Settlement Closure' : '结算闭环',
    statusLabel,
    expectedCount,
    readyCount,
    warningCount: warningLabels.length,
    missingCount: missingLabels.length,
    expectedLabels,
    missingLabels,
    warningLabels,
    lines: [
      `${input.isEnglish ? 'Status' : '状态'}: ${statusLabel}`,
      ...moduleSummaries.map((item) => `${item.label}: ${item.statusLabel} (${item.expectedLabels.join(' / ')})`),
    ],
  }
}
