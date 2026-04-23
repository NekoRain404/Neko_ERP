import type { FinancialTraceCockpit } from '@/api/financial-trace'
import type { ModuleKey } from '@/config/module-manifest'
import { buildFinancialTraceRecordRefLabel } from '@/utils/financial-trace-packets'
import { supportsFinancialTraceDetailModule } from '@/utils/financial-trace-packets'

export interface CutoverFinancialTraceSummaryShape {
  statusLabel: string
  expectedCount: number
  readyCount: number
  warningCount: number
  missingCount: number
  missingLabels: string[]
  warningLabels: string[]
  lines: string[]
}

export interface CutoverFinancialTraceState extends CutoverFinancialTraceSummaryShape {
  recordLines: string[]
  recordRefs: string[]
  topRiskRefs: string[]
  topRiskModuleKey?: ModuleKey
  topRiskRecordId?: number
  topRiskRecordRef?: string
}

export function supportsCutoverFinancialTraceModule(moduleKey: ModuleKey) {
  return supportsFinancialTraceDetailModule(moduleKey)
}

export function translateCutoverFinancialTraceKey(key: string, english: boolean) {
  const dictionary = english
    ? {
        'origin-ref': 'Origin Anchor',
        'payment-linkage': 'Payment Linkage',
        'payment-state-open': 'Settlement Open',
        'journal-entry': 'Journal Entry',
        'journal-entry-missing': 'Journal Missing',
        'journal-reversal': 'Reversal Trace',
        'invoice-origin': 'Invoice Origin',
        'invoice-payment': 'Invoice Payment',
        'invoice-evidence': 'Invoice Evidence',
        'source-anchor': 'Source Anchor',
        'journal-trace': 'Journal Trace',
        'payment-proof': 'Payment Proof',
        'source-explanation': 'Source Explanation',
        'reconcile-context': 'Reconcile Context',
        'journal-item-review': 'Journal Item Review',
      }
    : {
        'origin-ref': '来源锚点',
        'payment-linkage': '付款链接',
        'payment-state-open': '结算未闭环',
        'journal-entry': '凭证生成',
        'journal-entry-missing': '凭证缺失',
        'journal-reversal': '冲销追溯',
        'invoice-origin': '发票来源',
        'invoice-payment': '发票付款',
        'invoice-evidence': '发票证据',
        'source-anchor': '来源锚点',
        'journal-trace': '凭证追溯',
        'payment-proof': '付款证据',
        'source-explanation': '来源解释',
        'reconcile-context': '对账上下文',
        'journal-item-review': '分录审查',
      }
  return dictionary[key as keyof typeof dictionary] || key
}

export function buildCutoverFinancialTraceState(input: {
  moduleKey: ModuleKey
  moduleLabel: string
  isEnglish: boolean
  summary: CutoverFinancialTraceSummaryShape
  cockpit?: FinancialTraceCockpit | null
}): CutoverFinancialTraceState {
  const { moduleKey, moduleLabel, isEnglish, summary, cockpit } = input
  if (!supportsCutoverFinancialTraceModule(moduleKey) || !cockpit || cockpit.recordCount <= 0) {
    return {
      ...summary,
      recordLines: [],
      recordRefs: [],
      topRiskRefs: [],
    }
  }

  const missingLabels = (cockpit.missingKeys || []).map((key) => translateCutoverFinancialTraceKey(key, isEnglish))
  const warningLabels = (cockpit.warningKeys || []).map((key) => translateCutoverFinancialTraceKey(key, isEnglish))
  const statusLabel = cockpit.missingCount > 0
    ? (isEnglish ? 'Trace Blocked' : '追溯阻塞')
    : cockpit.warningCount > 0
      ? (isEnglish ? 'Trace In Progress' : '追溯推进中')
      : (isEnglish ? 'Trace Ready' : '追溯就绪')
  const recordLines = cockpit.records.slice(0, 4).map((record) => {
    const riskLabels = [
      ...(record.missingKeys || []).map((key) => translateCutoverFinancialTraceKey(key, isEnglish)),
      ...(record.warningKeys || []).map((key) => translateCutoverFinancialTraceKey(key, isEnglish)),
    ]
    const riskSuffix = riskLabels.length ? ` · ${riskLabels.join(' / ')}` : ''
    return `${record.ref || `#${record.id}`} · ${record.status}${riskSuffix}`
  })
  const recordRefs = cockpit.records.slice(0, 4).map((record) =>
    buildFinancialTraceRecordRefLabel({
      english: isEnglish,
      moduleLabel,
      recordId: record.id,
      recordRef: record.ref,
      status: record.status,
    }),
  )
  const topRiskRecord = cockpit.records.find((record) => record.status !== 'ready') || cockpit.records[0]
  const topRiskRefs = cockpit.records
    .filter((record) => record.status !== 'ready')
    .slice(0, 3)
    .map((record) =>
      buildFinancialTraceRecordRefLabel({
        english: isEnglish,
        moduleLabel,
        recordId: record.id,
        recordRef: record.ref,
        status: record.status,
      }),
    )

  return {
    statusLabel,
    expectedCount: cockpit.recordCount,
    readyCount: cockpit.readyCount,
    warningCount: cockpit.warningCount,
    missingCount: cockpit.missingCount,
    missingLabels,
    warningLabels,
    lines: [
      `${isEnglish ? 'Status' : '状态'}: ${statusLabel}`,
      `${isEnglish ? 'Reviewed Records' : '已审记录'}: ${cockpit.recordCount}`,
      `${isEnglish ? 'Evidence Ready' : '证据就绪'}: ${cockpit.evidenceReadyCount}`,
      `${isEnglish ? 'Evidence Totals' : '证据总量'}: ${cockpit.attachmentCount}/${cockpit.noteCount}/${cockpit.logCount}`,
      ...recordLines,
    ],
    recordLines,
    recordRefs,
    topRiskRefs,
    topRiskModuleKey: topRiskRecord ? moduleKey : undefined,
    topRiskRecordId: topRiskRecord?.id,
    topRiskRecordRef: topRiskRecord?.ref || (topRiskRecord ? `#${topRiskRecord.id}` : undefined),
  }
}

export function buildChainCutoverFinancialTraceState(input: {
  isEnglish: boolean
  moduleStates: Array<{
    moduleKey: ModuleKey
    moduleLabel: string
    state: CutoverFinancialTraceState
  }>
}): CutoverFinancialTraceState {
  const missingLabels = Array.from(new Set(input.moduleStates.flatMap((item) => item.state.missingLabels)))
  const warningLabels = Array.from(new Set(input.moduleStates.flatMap((item) => item.state.warningLabels)))
  const recordLines = input.moduleStates.flatMap((item) =>
    item.state.recordLines.map((line) => `${item.moduleLabel} · ${line}`),
  ).slice(0, 6)
  const recordRefs = input.moduleStates.flatMap((item) => item.state.recordRefs).slice(0, 6)
  const topRiskRefs = input.moduleStates.flatMap((item) => item.state.topRiskRefs).slice(0, 4)
  const topRiskOwner = input.moduleStates.find((item) => item.state.topRiskModuleKey && item.state.topRiskRecordId)
  const missingCount = input.moduleStates.reduce((sum, item) => sum + item.state.missingCount, 0)
  const warningCount = input.moduleStates.reduce((sum, item) => sum + item.state.warningCount, 0)
  const readyCount = input.moduleStates.reduce((sum, item) => sum + item.state.readyCount, 0)
  const expectedCount = input.moduleStates.reduce((sum, item) => sum + item.state.expectedCount, 0)
  const statusLabel = missingCount > 0
    ? (input.isEnglish ? 'Trace Blocked' : '追溯阻塞')
    : warningCount > 0
      ? (input.isEnglish ? 'Trace In Progress' : '追溯推进中')
      : (input.isEnglish ? 'Trace Ready' : '追溯就绪')

  return {
    statusLabel,
    expectedCount,
    readyCount,
    warningCount,
    missingCount,
    missingLabels,
    warningLabels,
    lines: [
      `${input.isEnglish ? 'Status' : '状态'}: ${statusLabel}`,
      ...input.moduleStates.map((item) => `${item.moduleLabel}: ${item.state.statusLabel}`),
      ...recordLines,
    ],
    recordLines,
    recordRefs,
    topRiskRefs,
    topRiskModuleKey: topRiskOwner?.state.topRiskModuleKey,
    topRiskRecordId: topRiskOwner?.state.topRiskRecordId,
    topRiskRecordRef: topRiskOwner?.state.topRiskRecordRef,
  }
}
