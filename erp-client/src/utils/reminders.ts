import type { ReminderRecord } from '@/api/reminders'

export type ReminderFamilyKey = 'evidence' | 'context' | 'collections' | 'other'

export interface ReminderFamilySummary {
  totalCount: number
  evidenceCount: number
  contextCount: number
  collectionsCount: number
  otherCount: number
  criticalCount: number
  warningCount: number
}

export interface ReminderFamilyBadge {
  key: ReminderFamilyKey
  label: string
  count: number
  tone: 'default' | 'warning' | 'danger'
}

export function severityRank(value: ReminderRecord['severity']) {
  if (value === 'critical') return 3
  if (value === 'warning') return 2
  return 1
}

export function compareReminderSeverity(a: ReminderRecord, b: ReminderRecord) {
  const severityDiff = severityRank(b.severity) - severityRank(a.severity)
  if (severityDiff !== 0) return severityDiff
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
}

export function pickTopReminder<T extends ReminderRecord>(rows: T[]) {
  return [...rows].sort(compareReminderSeverity).at(0)
}

export function resolveReminderFamilyKey(item: Pick<ReminderRecord, 'type'>): ReminderFamilyKey {
  const type = String(item.type || '')
  if (type.includes('evidence_gap')) return 'evidence'
  if (type.includes('context_gap') || type === 'idle_partner') return 'context'
  if (type === 'overdue_invoice') return 'collections'
  return 'other'
}

export function resolveReminderSection(
  item?: (Pick<ReminderRecord, 'moduleKey' | 'severity'> & { type?: string | null }) | null,
) {
  // Reminder jumps stay opinionated so operators land on the part of the
  // record that is most likely to unblock the current first-wave issue.
  if (!item) return 'traceability'
  if (item.type === 'role_task_overdue' || item.type === 'role_task_due_soon') return 'ops-close'
  if (item.type === 'close_task_blocked' || item.type === 'close_task_stale') return 'ops-settlement'
  if (String(item.type || '').includes('evidence_gap')) return 'documents'
  if (String(item.type || '').includes('context_gap') || item.type === 'idle_partner') return 'timeline'
  if (item.moduleKey === 'resPartner') return 'timeline'
  if (item.moduleKey === 'accountInvoice' || item.moduleKey === 'accountPayment') return 'workflow'
  return item.severity === 'critical' ? 'workflow' : 'traceability'
}

export function resolveReminderFamilyLabelByKey(key: ReminderFamilyKey, isEnglish: boolean) {
  if (key === 'evidence') {
    return isEnglish ? 'Evidence Gap' : '证据缺口'
  }
  if (key === 'context') {
    return isEnglish ? 'Timeline Context' : '时间轴上下文'
  }
  if (key === 'collections') {
    return isEnglish ? 'Collections Follow-up' : '收款跟进'
  }
  return isEnglish ? 'Pilot Reminder' : '试点提醒'
}

export function resolveReminderFamilyLabel(
  item: Pick<ReminderRecord, 'type'>,
  isEnglish: boolean,
) {
  if (
    item.type === 'role_task_overdue'
    || item.type === 'role_task_due_soon'
    || item.type === 'close_task_blocked'
    || item.type === 'close_task_stale'
  ) {
    return isEnglish ? 'Governance Pressure' : '治理压力'
  }
  return resolveReminderFamilyLabelByKey(resolveReminderFamilyKey(item), isEnglish)
}

export function summarizeReminderFamilies(
  rows: Array<Pick<ReminderRecord, 'type' | 'severity'>>,
): ReminderFamilySummary {
  return rows.reduce<ReminderFamilySummary>(
    (summary, item) => {
      const familyKey = resolveReminderFamilyKey(item)
      if (familyKey === 'evidence') summary.evidenceCount += 1
      else if (familyKey === 'context') summary.contextCount += 1
      else if (familyKey === 'collections') summary.collectionsCount += 1
      else summary.otherCount += 1

      summary.totalCount += 1
      if (item.severity === 'critical') summary.criticalCount += 1
      if (item.severity === 'warning') summary.warningCount += 1
      return summary
    },
    {
      totalCount: 0,
      evidenceCount: 0,
      contextCount: 0,
      collectionsCount: 0,
      otherCount: 0,
      criticalCount: 0,
      warningCount: 0,
    },
  )
}

export function buildReminderFamilyBadges(
  rows: Array<Pick<ReminderRecord, 'type' | 'severity'>>,
  isEnglish: boolean,
): ReminderFamilyBadge[] {
  const summary = summarizeReminderFamilies(rows)
  const familyCounts: Array<{ key: ReminderFamilyKey; count: number }> = [
    { key: 'evidence', count: summary.evidenceCount },
    { key: 'context', count: summary.contextCount },
    { key: 'collections', count: summary.collectionsCount },
    { key: 'other', count: summary.otherCount },
  ]
  return familyCounts
    .filter((item) => item.count > 0)
    .map((item) => ({
      key: item.key,
      label: resolveReminderFamilyLabelByKey(item.key, isEnglish),
      count: item.count,
      tone:
        item.key === 'collections'
          ? 'danger'
          : item.key === 'other'
            ? 'default'
            : summary.criticalCount
              ? 'danger'
              : 'warning',
    }))
}

export function buildReminderFamilyBlockers(
  rows: Array<Pick<ReminderRecord, 'type' | 'severity'>>,
  isEnglish: boolean,
) {
  const summary = summarizeReminderFamilies(rows)
  const blockers: string[] = []
  if (summary.evidenceCount) {
    blockers.push(isEnglish ? 'Evidence gap still open' : '证据缺口未补齐')
  }
  if (summary.contextCount) {
    blockers.push(isEnglish ? 'Timeline context still missing' : '时间轴上下文仍不足')
  }
  if (summary.collectionsCount) {
    blockers.push(isEnglish ? 'Collections follow-up still open' : '收付款跟进仍未关闭')
  }
  return blockers
}
