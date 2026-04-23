import type { CloseChecklistItem, CloseRoleSnapshot } from '@/utils/cutover-close-cockpit'
import type { FinanceCockpitSummary } from '@/utils/cutover-finance-cockpit'

export interface RoleDeskSummary {
  enabled: boolean
  issueCount: number
  label: string
  lines: string[]
  missingRoles: string[]
  checklistBlockers: string[]
}

export interface RoleDeskQueueRow {
  label: string
  scopeLabel: string
  roleDeskLabel: string
  closeLabel?: string
  owner?: string
  reviewer?: string
  signoffOwner?: string
  fallbackOwner?: string
  financeOwner?: string
  companyLabel?: string
  missingRoles: string[]
  checklistBlockers: string[]
  blockerLabels?: string[]
  financeLines?: string[]
  recentActivityLines?: string[]
}

export interface FinanceCloseBatchRow {
  label: string
  scopeLabel: string
  closeLabel?: string
  settlementLabel?: string
  financialTraceLabel?: string
  financeCockpitLabel?: string
  roleDeskLabel?: string
  topRiskLabel?: string
  blockerLabels?: string[]
  financeLines?: string[]
  roleLines?: string[]
  recentActivityLines?: string[]
}

export type RoleDeskActorKey = 'owner' | 'reviewer' | 'financeOwner' | 'signoffOwner' | 'fallbackOwner'

export interface RoleDeskQueueBucket {
  key: string
  roleKey: RoleDeskActorKey
  roleLabel: string
  ownerLabel: string
  rowCount: number
  readyCount: number
  blockerCount: number
  rows: RoleDeskQueueRow[]
}

function roleMissing(value?: string | null) {
  const normalized = String(value || '').trim()
  return !normalized || normalized === '-'
}

function listOrDash(items: string[]) {
  return items.length ? items.join(' / ') : '-'
}

function readyLabel(isEnglish: boolean, issueCount: number) {
  if (issueCount <= 0) {
    return isEnglish ? 'Desk Ready' : '责任台就绪'
  }
  return isEnglish ? `${issueCount} role gaps` : `${issueCount} 项责任缺口`
}

function sectionLines(title: string, lines: string[]) {
  return [title, ...lines].join('\n')
}

function roleDeskActorLabel(roleKey: RoleDeskActorKey, english: boolean) {
  if (roleKey === 'owner') return english ? 'Owner' : '负责人'
  if (roleKey === 'reviewer') return english ? 'Reviewer' : '复核人'
  if (roleKey === 'financeOwner') return english ? 'Finance Owner' : '财务负责人'
  if (roleKey === 'signoffOwner') return english ? 'Sign-off Owner' : '签收负责人'
  return english ? 'Fallback Owner' : '回退负责人'
}

function resolveRoleDeskActorValue(row: RoleDeskQueueRow, roleKey: RoleDeskActorKey) {
  if (roleKey === 'owner') return row.owner
  if (roleKey === 'reviewer') return row.reviewer
  if (roleKey === 'financeOwner') return row.financeOwner
  if (roleKey === 'signoffOwner') return row.signoffOwner
  return row.fallbackOwner
}

function roleDeskActorWeight(roleKey: RoleDeskActorKey) {
  if (roleKey === 'owner') return 0
  if (roleKey === 'reviewer') return 1
  if (roleKey === 'financeOwner') return 2
  if (roleKey === 'signoffOwner') return 3
  return 4
}

export function buildRoleDeskSummary(input: {
  isEnglish: boolean
  roleSnapshot?: Partial<CloseRoleSnapshot> | null
  closeChecklist: Array<Pick<CloseChecklistItem, 'label' | 'ready'>>
  closeLabel?: string
  financeCockpitSummary?: Pick<FinanceCockpitSummary, 'enabled' | 'label'> | null
}) : RoleDeskSummary {
  const roleSnapshot = input.roleSnapshot || {}
  const missingRoles = [
    roleMissing(roleSnapshot.owner) ? (input.isEnglish ? 'Owner' : '负责人') : null,
    roleMissing(roleSnapshot.reviewer) ? (input.isEnglish ? 'Reviewer' : '复核人') : null,
    roleMissing(roleSnapshot.signoffOwner) ? (input.isEnglish ? 'Sign-off Owner' : '签收负责人') : null,
    roleMissing(roleSnapshot.fallbackOwner) ? (input.isEnglish ? 'Fallback Owner' : '回退负责人') : null,
    input.financeCockpitSummary?.enabled && roleMissing(roleSnapshot.financeOwner)
      ? (input.isEnglish ? 'Finance Owner' : '财务负责人')
      : null,
  ].filter(Boolean) as string[]
  const checklistBlockers = input.closeChecklist.filter((item) => !item.ready).map((item) => item.label)
  const issueCount = missingRoles.length + checklistBlockers.length

  return {
    enabled: true,
    issueCount,
    missingRoles,
    checklistBlockers,
    label: readyLabel(input.isEnglish, issueCount),
    lines: [
      `- ${input.isEnglish ? 'Desk Status' : '责任台状态'}: ${readyLabel(input.isEnglish, issueCount)}`,
      `- ${input.isEnglish ? 'Owner Lane' : '责任链路'}: ${(roleSnapshot.owner || '-')} -> ${(roleSnapshot.reviewer || '-')} -> ${(roleSnapshot.signoffOwner || '-')}`,
      `- ${input.isEnglish ? 'Fallback Lane' : '回退链路'}: ${(roleSnapshot.fallbackOwner || '-')} · ${(roleSnapshot.companyLabel || (input.isEnglish ? 'Default Company Scope' : '默认公司范围'))}`,
      ...(input.financeCockpitSummary?.enabled
        ? [`- ${input.isEnglish ? 'Finance Lane' : '财务链路'}: ${(roleSnapshot.financeOwner || '-')} · ${input.financeCockpitSummary.label || '-'}`]
        : []),
      `- ${input.isEnglish ? 'Checklist Blockers' : '清单阻塞项'}: ${listOrDash(checklistBlockers)}`,
      `- ${input.isEnglish ? 'Missing Roles' : '缺失角色'}: ${listOrDash(missingRoles)}`,
      `- ${input.isEnglish ? 'Close Snapshot' : '关账快照'}: ${input.closeLabel || '-'}`,
    ],
  }
}

export function buildRoleDeskQueueBuckets(input: {
  english: boolean
  rows: RoleDeskQueueRow[]
  roles?: RoleDeskActorKey[]
}) : RoleDeskQueueBucket[] {
  const roles = input.roles || ['owner', 'reviewer', 'financeOwner', 'signoffOwner', 'fallbackOwner']
  const buckets = new Map<string, RoleDeskQueueBucket>()

  for (const row of input.rows) {
    for (const roleKey of roles) {
      const ownerLabel = String(resolveRoleDeskActorValue(row, roleKey) || '').trim() || '-'
      const bucketKey = `${roleKey}:${ownerLabel}`
      const existing = buckets.get(bucketKey)
      if (existing) {
        existing.rows.push(row)
        existing.rowCount += 1
        existing.blockerCount += row.missingRoles.length + row.checklistBlockers.length
        if (row.missingRoles.length === 0 && row.checklistBlockers.length === 0) {
          existing.readyCount += 1
        }
        continue
      }
      buckets.set(bucketKey, {
        key: bucketKey,
        roleKey,
        roleLabel: roleDeskActorLabel(roleKey, input.english),
        ownerLabel,
        rowCount: 1,
        readyCount: row.missingRoles.length === 0 && row.checklistBlockers.length === 0 ? 1 : 0,
        blockerCount: row.missingRoles.length + row.checklistBlockers.length,
        rows: [row],
      })
    }
  }

  return Array.from(buckets.values())
    .sort((left, right) => {
      if (left.ownerLabel === '-' && right.ownerLabel !== '-') return 1
      if (left.ownerLabel !== '-' && right.ownerLabel === '-') return -1
      if (right.blockerCount !== left.blockerCount) return right.blockerCount - left.blockerCount
      if (roleDeskActorWeight(left.roleKey) !== roleDeskActorWeight(right.roleKey)) {
        return roleDeskActorWeight(left.roleKey) - roleDeskActorWeight(right.roleKey)
      }
      if (right.rowCount !== left.rowCount) return right.rowCount - left.rowCount
      return left.ownerLabel.localeCompare(right.ownerLabel)
    })
}

export function buildRoleDeskQueueRowPacket(input: {
  english: boolean
  generatedAt: string
  row: RoleDeskQueueRow
  title?: string
}) {
  return buildRoleDeskQueuePacket({
    english: input.english,
    generatedAt: input.generatedAt,
    title: input.title || input.row.label,
    rows: [input.row],
  })
}

export function buildFinanceCloseBatchRowPacket(input: {
  english: boolean
  generatedAt: string
  row: FinanceCloseBatchRow
  title?: string
}) {
  return buildFinanceCloseBatchPacket({
    english: input.english,
    generatedAt: input.generatedAt,
    title: input.title || input.row.label,
    rows: [input.row],
  })
}

export function buildRoleDeskQueuePacket(input: {
  english: boolean
  generatedAt: string
  title?: string
  rows: RoleDeskQueueRow[]
}) {
  const english = input.english
  const readyCount = input.rows.filter((row) => row.missingRoles.length === 0 && row.checklistBlockers.length === 0).length
  return [
    `# ${input.title || (english ? 'NEKO_ERP Role Desk Queue Packet' : 'NEKO_ERP 责任台待办包')}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Ready Rows' : '就绪条目'}: ${readyCount}/${input.rows.length}`,
    `${english ? 'Open Role Gaps' : '开放责任缺口'}: ${input.rows.reduce((sum, row) => sum + row.missingRoles.length, 0)}`,
    `${english ? 'Checklist Blockers' : '清单阻塞项'}: ${input.rows.reduce((sum, row) => sum + row.checklistBlockers.length, 0)}`,
    '',
    ...input.rows.map((row) => [
      `## ${row.label}`,
      `${english ? 'Scope' : '范围'}: ${row.scopeLabel}`,
      `${english ? 'Role Desk' : '责任台'}: ${row.roleDeskLabel}`,
      `${english ? 'Close Snapshot' : '关账快照'}: ${row.closeLabel || '-'}`,
      `${english ? 'Owner Lane' : '责任链路'}: ${row.owner || '-'} -> ${row.reviewer || '-'} -> ${row.signoffOwner || '-'}`,
      `${english ? 'Fallback Lane' : '回退链路'}: ${row.fallbackOwner || '-'} · ${row.companyLabel || '-'}`,
      `${english ? 'Finance Owner' : '财务负责人'}: ${row.financeOwner || '-'}`,
      `${english ? 'Missing Roles' : '缺失角色'}: ${listOrDash(row.missingRoles)}`,
      `${english ? 'Checklist Blockers' : '清单阻塞项'}: ${listOrDash(row.checklistBlockers)}`,
      `${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(row.blockerLabels || [])}`,
      ...(row.financeLines?.length
        ? ['', sectionLines(`### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, row.financeLines)]
        : []),
      ...(row.recentActivityLines?.length
        ? ['', sectionLines(`### ${english ? 'Recent Close Activity' : '最近关账活动'}`, row.recentActivityLines)]
        : []),
    ].join('\n')),
  ].join('\n\n')
}

export function buildFinanceCloseBatchPacket(input: {
  english: boolean
  generatedAt: string
  title?: string
  rows: FinanceCloseBatchRow[]
}) {
  const english = input.english
  const readyCount = input.rows.filter((row) => !row.blockerLabels?.length).length
  return [
    `# ${input.title || (english ? 'NEKO_ERP Finance Close Batch Packet' : 'NEKO_ERP 财务关账批处理包')}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Rows' : '条目'}: ${input.rows.length}`,
    `${english ? 'Rows Without Suggested Blockers' : '无建议阻塞条目'}: ${readyCount}/${input.rows.length}`,
    '',
    ...input.rows.map((row) => [
      `## ${row.label}`,
      `${english ? 'Scope' : '范围'}: ${row.scopeLabel}`,
      `${english ? 'Close Snapshot' : '关账快照'}: ${row.closeLabel || '-'}`,
      `${english ? 'Settlement Closure' : '结算闭环'}: ${row.settlementLabel || '-'}`,
      `${english ? 'Financial Trace' : '财务追溯'}: ${row.financialTraceLabel || '-'}`,
      `${english ? 'Finance Cockpit' : '财务驾驶舱'}: ${row.financeCockpitLabel || '-'}`,
      `${english ? 'Role Desk' : '责任台'}: ${row.roleDeskLabel || '-'}`,
      `${english ? 'Top Risk' : '最高风险'}: ${row.topRiskLabel || '-'}`,
      `${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(row.blockerLabels || [])}`,
      ...(row.financeLines?.length
        ? ['', sectionLines(`### ${english ? 'Finance Close Focus' : '财务关账重点'}`, row.financeLines)]
        : []),
      ...(row.roleLines?.length
        ? ['', sectionLines(`### ${english ? 'Role Desk' : '责任台'}`, row.roleLines)]
        : []),
      ...(row.recentActivityLines?.length
        ? ['', sectionLines(`### ${english ? 'Recent Close Activity' : '最近关账活动'}`, row.recentActivityLines)]
        : []),
    ].join('\n')),
  ].join('\n\n')
}
