import type { CutoverFinancialTraceState } from '@/utils/cutover-financial-trace'
import type { CutoverClosedLoopSummary, CutoverClosedLoopTone } from '@/utils/cutover-ops'
import type { FirstWaveSettlementSummary } from '@/utils/first-wave-settlement'

export interface CutoverCloseSummary {
  ready: boolean
  tone: CutoverClosedLoopTone
  label: string
  blockerCount: number
  gatePendingCount: number
  settlementIssueCount: number
  financialTraceIssueCount: number
  closedLoopIssueCount: number
  paymentLinkageIssueCount: number
  quantImpactIssueCount: number
  reminderBlockerCount: number
  lines: string[]
}

export function buildAggregateClosedLoopSummary(input: {
  isEnglish: boolean
  summaries: CutoverClosedLoopSummary[]
}): CutoverClosedLoopSummary {
  if (!input.summaries.length) {
    return {
      ready: false,
      tone: 'info',
      score: 0,
      label: input.isEnglish ? 'No Closed Loop Yet' : '闭环未建立',
      missingLabels: [],
      staleLabels: [],
    }
  }

  const readyCount = input.summaries.filter((item) => item.ready).length
  const missingLabels = Array.from(new Set(input.summaries.flatMap((item) => item.missingLabels)))
  const staleLabels = Array.from(new Set(input.summaries.flatMap((item) => item.staleLabels)))
  const hasDanger = input.summaries.some((item) => item.tone === 'danger')
  const ready = readyCount === input.summaries.length

  return {
    ready,
    tone: ready ? 'success' : hasDanger ? 'danger' : missingLabels.length || staleLabels.length ? 'warning' : 'info',
    score: input.summaries.reduce((sum, item) => sum + item.score, 0) / input.summaries.length,
    label: ready
      ? (input.isEnglish ? 'Closed Loop Ready' : '闭环就绪')
      : input.isEnglish
        ? `${readyCount}/${input.summaries.length} chains ready`
        : `${readyCount}/${input.summaries.length} 条链路就绪`,
    missingLabels,
    staleLabels,
  }
}

export function buildCutoverCloseSummary(input: {
  isEnglish: boolean
  gatePendingCount: number
  settlementSummary: Pick<FirstWaveSettlementSummary, 'statusLabel' | 'missingCount' | 'warningCount'>
  financialTraceSummary: Pick<CutoverFinancialTraceState, 'statusLabel' | 'missingCount' | 'warningCount'>
  closedLoopSummary: Pick<CutoverClosedLoopSummary, 'label' | 'ready' | 'tone' | 'missingLabels' | 'staleLabels'>
  paymentLinkageIssueCount?: number
  quantImpactIssueCount?: number
  blockerLabels?: string[]
}): CutoverCloseSummary {
  const settlementIssueCount = input.settlementSummary.missingCount + input.settlementSummary.warningCount
  const financialTraceIssueCount = input.financialTraceSummary.missingCount + input.financialTraceSummary.warningCount
  const closedLoopIssueCount = input.closedLoopSummary.missingLabels.length + input.closedLoopSummary.staleLabels.length
  const paymentLinkageIssueCount = input.paymentLinkageIssueCount ?? 0
  const quantImpactIssueCount = input.quantImpactIssueCount ?? 0
  const reminderBlockerCount = input.blockerLabels?.length ?? 0
  const blockerCount = input.gatePendingCount
    + settlementIssueCount
    + financialTraceIssueCount
    + closedLoopIssueCount
    + paymentLinkageIssueCount
    + quantImpactIssueCount
  const displayCount = blockerCount + reminderBlockerCount
  const ready = blockerCount === 0 && reminderBlockerCount === 0 && input.closedLoopSummary.ready

  let tone: CutoverClosedLoopTone = 'info'
  if (ready) {
    tone = 'success'
  } else if (
    input.settlementSummary.missingCount > 0
    || input.financialTraceSummary.missingCount > 0
    || input.closedLoopSummary.tone === 'danger'
    || input.gatePendingCount >= 3
  ) {
    tone = 'danger'
  } else {
    tone = 'warning'
  }

  return {
    ready,
    tone,
    label: ready
      ? (input.isEnglish ? 'Close Ready' : '关账就绪')
      : input.isEnglish
        ? `${displayCount} close blockers`
        : `${displayCount} 个关账阻塞项`,
    blockerCount: displayCount,
    gatePendingCount: input.gatePendingCount,
    settlementIssueCount,
    financialTraceIssueCount,
    closedLoopIssueCount,
    paymentLinkageIssueCount,
    quantImpactIssueCount,
    reminderBlockerCount,
    lines: [
      `${input.isEnglish ? 'Gates' : '门槛'}: ${input.gatePendingCount === 0 ? (input.isEnglish ? 'Ready' : '就绪') : `${input.gatePendingCount} ${input.isEnglish ? 'pending' : '项待完成'}`}`,
      `${input.isEnglish ? 'Settlement' : '结算'}: ${input.settlementSummary.statusLabel}`,
      `${input.isEnglish ? 'Trace' : '追溯'}: ${input.financialTraceSummary.statusLabel}`,
      `${input.isEnglish ? 'Closed Loop' : '闭环'}: ${input.closedLoopSummary.label}`,
      `${input.isEnglish ? 'Payment Linkage' : '付款联动'}: ${paymentLinkageIssueCount === 0 ? (input.isEnglish ? 'Ready' : '就绪') : (input.isEnglish ? `${paymentLinkageIssueCount} pending` : `${paymentLinkageIssueCount} 项待处理`)}`,
      `${input.isEnglish ? 'Quant Impact' : '库存影响'}: ${quantImpactIssueCount === 0 ? (input.isEnglish ? 'Ready' : '就绪') : (input.isEnglish ? `${quantImpactIssueCount} pending` : `${quantImpactIssueCount} 项待处理`)}`,
      reminderBlockerCount
        ? `${input.isEnglish ? 'Suggested Blockers' : '建议阻塞项'}: ${reminderBlockerCount}`
        : `${input.isEnglish ? 'Suggested Blockers' : '建议阻塞项'}: ${input.isEnglish ? 'None' : '无'}`,
    ],
  }
}
