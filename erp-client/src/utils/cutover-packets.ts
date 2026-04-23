export interface CutoverPacketChain {
  label: string
  enabled?: boolean
  modulesLabel: string
  readyLabel: string
  summaryLabel?: string
  closedLoopLabel?: string
  closedLoopMissingLabels?: string[]
  closedLoopStaleLabels?: string[]
  settlementLabel?: string
  settlementMissingLabels?: string[]
  settlementWarningLabels?: string[]
  settlementLines?: string[]
  financialTraceLabel?: string
  financialTraceMissingLabels?: string[]
  financialTraceWarningLabels?: string[]
  financialTraceLines?: string[]
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
  financeCockpitLabel?: string
  financeCockpitLines?: string[]
  pendingLabels: string[]
  requiredEvidenceCount?: number
  critical?: number
  warning?: number
  reminderCount?: number
  reminderFamilies?: string[]
  blockerLabels: string[]
  topRiskLabel?: string
  owner?: string
  fallbackOwner?: string
  rehearsalOwner?: string
  pilotConfirmOwner?: string
  reviewerOwner?: string
  financeOwner?: string
  gateNote?: string
  evidenceLines?: string[]
  reminderDetails?: string[]
  closeChecklistLines?: string[]
  closeActivityLines?: string[]
}

export interface CutoverPacketModule {
  title: string
  requiredLabels: string[]
  recommendedLabel: string
  timelineHint: string
  openRisks?: number
  settlementLabel?: string
  settlementMissingLabels?: string[]
  settlementWarningLabels?: string[]
  settlementLines?: string[]
  financialTraceLabel?: string
  financialTraceMissingLabels?: string[]
  financialTraceWarningLabels?: string[]
  financialTraceLines?: string[]
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
  financeCockpitLabel?: string
  financeCockpitLines?: string[]
  paymentLinkageLines?: string[]
  quantImpactLines?: string[]
}

export interface CutoverPressureSummary {
  readyChains: number
  totalChains: number
  criticalChains?: number
  warningChains?: number
  pendingGates: number
  openReminders: number
}

export interface ModulePacketContact {
  label: string
  owner: string
  fallbackOwner: string
  rehearsalOwner: string
  pilotConfirmOwner?: string
  reviewerOwner?: string
  financeOwner?: string
}

export interface ModulePacketGuideRow {
  title: string
  description: string
}

export interface ModulePacketReadinessRow {
  label: string
  value: string
  description: string
}

export interface ModulePacketRiskDetail {
  severity: string
  moduleTitle: string
  recordId?: string | number | null
  title: string
  relatedRef?: string | null
  createdAt?: string | null
  content: string
}

export interface ModulePacketGateRow {
  label: string
  readyLabel: string
  summaryLabel?: string
  closedLoopLabel?: string
  closedLoopMissingLabels?: string[]
  closedLoopStaleLabels?: string[]
  settlementLabel?: string
  settlementMissingLabels?: string[]
  settlementWarningLabels?: string[]
  settlementLines?: string[]
  financialTraceLabel?: string
  financialTraceMissingLabels?: string[]
  financialTraceWarningLabels?: string[]
  financialTraceLines?: string[]
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
  financeCockpitLabel?: string
  financeCockpitLines?: string[]
  pendingLabels: string[]
  note?: string
  blockerLabels?: string[]
  owner?: string
  fallbackOwner?: string
  rehearsalOwner?: string
  pilotConfirmOwner?: string
  reminderCount?: number
  critical?: number
  warning?: number
  topRiskLabel?: string
  paymentLinkageLines?: string[]
  quantImpactLines?: string[]
}

export interface CutoverContactMatrixRow {
  label: string
  modulesLabel?: string
  owner?: string
  fallbackOwner?: string
  rehearsalOwner?: string
  pilotConfirmOwner?: string
  reviewerOwner?: string
  financeOwner?: string
  statusLabel?: string
}

export interface CutoverPendingGateRow {
  label: string
  readyLabel: string
  pendingLabels: string[]
  blockerLabels?: string[]
  owner?: string
  gateNote?: string
}

export interface CutoverControlModuleRow {
  title: string
  enabled?: boolean
  reminders?: number
  critical?: number
  warning?: number
  topRiskLabel?: string
  reminderFamilies?: string[]
  blockerLabels?: string[]
  requiredLabels?: string[]
  recommendedLabel?: string
  timelineHint?: string
  settlementLabel?: string
  settlementMissingLabels?: string[]
  settlementWarningLabels?: string[]
  settlementLines?: string[]
  financialTraceLabel?: string
  financialTraceMissingLabels?: string[]
  financialTraceWarningLabels?: string[]
  financialTraceLines?: string[]
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
  financeCockpitLabel?: string
  financeCockpitLines?: string[]
  paymentLinkageLines?: string[]
  quantImpactLines?: string[]
}

function settlementLine(english: boolean, label?: string) {
  return `${english ? 'Settlement Closure' : '结算闭环'}: ${label || '-'}`
}

function settlementDetailLines(english: boolean, input: {
  settlementMissingLabels?: string[]
  settlementWarningLabels?: string[]
}) {
  const lines: string[] = []
  if (input.settlementMissingLabels?.length) {
    lines.push(`${english ? 'Missing' : '缺失'}: ${input.settlementMissingLabels.join(', ')}`)
  }
  if (input.settlementWarningLabels?.length) {
    lines.push(`${english ? 'Pending' : '待推进'}: ${input.settlementWarningLabels.join(', ')}`)
  }
  return lines
}

function financialTraceLine(english: boolean, label?: string) {
  return `${english ? 'Financial Trace' : '财务追溯'}: ${label || '-'}`
}

function financeCockpitLine(english: boolean, label?: string) {
  return `${english ? 'Finance Cockpit' : '财务驾驶舱'}: ${label || '-'}`
}

function financialTraceDetailLines(english: boolean, input: {
  financialTraceMissingLabels?: string[]
  financialTraceWarningLabels?: string[]
}) {
  const lines: string[] = []
  if (input.financialTraceMissingLabels?.length) {
    lines.push(`${english ? 'Missing' : '缺失'}: ${input.financialTraceMissingLabels.join(', ')}`)
  }
  if (input.financialTraceWarningLabels?.length) {
    lines.push(`${english ? 'Pending' : '待推进'}: ${input.financialTraceWarningLabels.join(', ')}`)
  }
  return lines
}

function financialTraceReferenceLines(english: boolean, input: {
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
}) {
  const lines: string[] = []
  if (input.financialTraceRecordRefs?.length) {
    lines.push(`${english ? 'Trace Records' : '追溯记录'}: ${input.financialTraceRecordRefs.join(' / ')}`)
  }
  if (input.financialTracePacketRefs?.length) {
    lines.push(`${english ? 'Trace Packets' : '追溯包'}: ${input.financialTracePacketRefs.join(' / ')}`)
  }
  return lines
}

function yn(english: boolean, value?: boolean) {
  return value ? (english ? 'Yes' : '是') : (english ? 'No' : '否')
}

function listOrDash(items?: string[]) {
  return items?.filter(Boolean).join(', ') || '-'
}

function sectionLines(title: string, lines: string[]) {
  return [title, ...lines].join('\n')
}

function closeOwnerLines(english: boolean, input: {
  owner?: string
  fallbackOwner?: string
  rehearsalOwner?: string
  pilotConfirmOwner?: string
  reviewerOwner?: string
  financeOwner?: string
}) {
  return [
    `${english ? 'Owner' : '负责人'}: ${input.owner || '-'}`,
    `${english ? 'Fallback Owner' : '回退负责人'}: ${input.fallbackOwner || '-'}`,
    `${english ? 'Rehearsal Owner' : '演练负责人'}: ${input.rehearsalOwner || '-'}`,
    `${english ? 'Pilot Confirmation Owner' : '试点确认负责人'}: ${input.pilotConfirmOwner || '-'}`,
    `${english ? 'Reviewer' : '复核人'}: ${input.reviewerOwner || '-'}`,
    `${english ? 'Finance Owner' : '财务责任人'}: ${input.financeOwner || '-'}`,
  ]
}

function closedLoopLine(english: boolean, label?: string) {
  return `${english ? 'Closed Loop' : '闭环状态'}: ${label || '-'}`
}

function closedLoopDetailLines(english: boolean, input: {
  missingLabels?: string[]
  staleLabels?: string[]
  closedLoopMissingLabels?: string[]
  closedLoopStaleLabels?: string[]
}) {
  const lines: string[] = []
  const missingLabels = input.closedLoopMissingLabels ?? input.missingLabels ?? []
  const staleLabels = input.closedLoopStaleLabels ?? input.staleLabels ?? []
  if (missingLabels.length) {
    lines.push(`${english ? 'Missing' : '缺少'}: ${missingLabels.join(', ')}`)
  }
  if (staleLabels.length) {
    lines.push(`${english ? 'Stale' : '过期'}: ${staleLabels.join(', ')}`)
  }
  return lines
}

export function buildSharedCutoverBlockerPacket(input: {
  english: boolean
  title?: string
  generatedAt: string
  summary: CutoverPressureSummary
  chains: CutoverPacketChain[]
}) {
  const english = input.english
  return [
    `# ${input.title || (english ? 'NEKO_ERP First-Wave Blocker Packet' : 'NEKO_ERP 首批切换阻塞包')}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Ready Chains' : '就绪链路'}: ${input.summary.readyChains}/${input.summary.totalChains}`,
    `${english ? 'Critical Chains' : '严重链路'}: ${input.summary.criticalChains ?? 0}`,
    `${english ? 'Warning Chains' : '警告链路'}: ${input.summary.warningChains ?? 0}`,
    `${english ? 'Pending Gates' : '未完成门槛'}: ${input.summary.pendingGates}`,
    `${english ? 'Open Reminders' : '未处理提醒'}: ${input.summary.openReminders}`,
    '',
    ...input.chains.map((chain) => [
      `## ${chain.label}`,
      `${english ? 'Enabled' : '启用'}: ${chain.enabled === undefined ? '-' : yn(english, chain.enabled)}`,
      `${english ? 'Modules' : '模块'}: ${chain.modulesLabel}`,
      `${english ? 'Gate Status' : '门槛状态'}: ${chain.readyLabel}${chain.summaryLabel ? ` · ${chain.summaryLabel}` : ''}`,
      closedLoopLine(english, chain.closedLoopLabel),
      settlementLine(english, chain.settlementLabel),
      financialTraceLine(english, chain.financialTraceLabel),
      financeCockpitLine(english, chain.financeCockpitLabel),
      `${english ? 'Pending Gates' : '未完成门槛'}: ${listOrDash(chain.pendingLabels)}`,
      `${english ? 'Critical / Warning' : '严重 / 警告'}: ${chain.critical ?? 0}/${chain.warning ?? 0}`,
      `${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
      `${english ? 'Top Risk' : '最高风险'}: ${chain.topRiskLabel || '-'}`,
      `${english ? 'Owner' : '负责人'}: ${chain.owner || '-'}`,
      ...closeOwnerLines(english, chain).slice(1),
      ...closedLoopDetailLines(english, chain),
      ...settlementDetailLines(english, chain),
      ...financialTraceDetailLines(english, chain),
      ...financialTraceReferenceLines(english, chain),
      ...(chain.financialTraceLines || []),
      ...(chain.financeCockpitLines?.length
        ? ['', sectionLines(`### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, chain.financeCockpitLines)]
        : []),
      ...(chain.closeChecklistLines?.length
        ? ['', sectionLines(`### ${english ? 'Close Checklist' : '关账清单'}`, chain.closeChecklistLines)]
        : []),
      ...(chain.closeActivityLines?.length
        ? ['', sectionLines(`### ${english ? 'Recent Close Activity' : '最近关账活动'}`, chain.closeActivityLines)]
        : []),
      ...(chain.reminderDetails?.length
        ? chain.reminderDetails
        : [`- ${english ? 'No direct reminder detail' : '没有直接提醒明细'}`]),
    ].join('\n')),
  ].join('\n\n')
}

export function buildSharedAcceptancePacket(input: {
  english: boolean
  title?: string
  generatedAt: string
  chains: CutoverPacketChain[]
}) {
  const english = input.english
  return [
    `# ${input.title || (english ? 'NEKO_ERP First-Wave Acceptance Packet' : 'NEKO_ERP 首批切换放行包')}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    '',
    ...input.chains.map((chain) => [
      `## ${chain.label}`,
      `${english ? 'Enabled' : '启用'}: ${chain.enabled === undefined ? '-' : yn(english, chain.enabled)}`,
      `${english ? 'Modules' : '模块'}: ${chain.modulesLabel}`,
      `${english ? 'Gate Checks' : '门槛通过项'}: ${chain.readyLabel}`,
      closedLoopLine(english, chain.closedLoopLabel),
      settlementLine(english, chain.settlementLabel),
      financialTraceLine(english, chain.financialTraceLabel),
      financeCockpitLine(english, chain.financeCockpitLabel),
      ...closeOwnerLines(english, chain),
      `${english ? 'Gate Note' : '门槛备注'}: ${chain.gateNote || '-'}`,
      `${english ? 'Reminder Families' : '提醒家族'}: ${listOrDash(chain.reminderFamilies)}`,
      `${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
      ...closedLoopDetailLines(english, chain),
      ...settlementDetailLines(english, chain),
      ...financialTraceDetailLines(english, chain),
      ...financialTraceReferenceLines(english, chain),
      ...(chain.financialTraceLines || []),
      ...(chain.financeCockpitLines?.length
        ? ['', sectionLines(`### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, chain.financeCockpitLines)]
        : []),
      `${english ? 'Required Evidence Slots' : '必备证据槽位'}: ${chain.requiredEvidenceCount ?? 0}`,
      ...(chain.evidenceLines?.length ? chain.evidenceLines : []),
      ...(chain.closeChecklistLines?.length
        ? ['', sectionLines(`### ${english ? 'Close Checklist' : '关账清单'}`, chain.closeChecklistLines)]
        : []),
      ...(chain.closeActivityLines?.length
        ? ['', sectionLines(`### ${english ? 'Recent Close Activity' : '最近关账活动'}`, chain.closeActivityLines)]
        : []),
    ].join('\n')),
  ].join('\n\n')
}

export function buildSharedChainGatePacket(input: {
  english: boolean
  generatedAt: string
  chain: CutoverPacketChain
  checks: Array<{ label: string; ready: boolean }>
}) {
  const english = input.english
  const chain = input.chain
  return [
    `# ${chain.label} ${english ? 'Acceptance Gate' : '放行门槛'}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Modules' : '模块'}: ${chain.modulesLabel}`,
    `${english ? 'Ready Checks' : '通过项'}: ${chain.readyLabel}`,
    `${english ? 'Required Evidence Slots' : '必备证据槽位'}: ${chain.requiredEvidenceCount ?? 0}`,
    `${english ? 'Direct Reminders' : '直接提醒'}: ${chain.reminderCount ?? 0}`,
    `${english ? 'Critical' : '严重'}: ${chain.critical ?? 0}`,
    `${english ? 'Warning' : '警告'}: ${chain.warning ?? 0}`,
    `${english ? 'Reminder Families' : '提醒家族'}: ${listOrDash(chain.reminderFamilies)}`,
    `${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
    closedLoopLine(english, chain.closedLoopLabel),
    settlementLine(english, chain.settlementLabel),
    financialTraceLine(english, chain.financialTraceLabel),
    financeCockpitLine(english, chain.financeCockpitLabel),
    `${english ? 'Top Risk' : '最高风险'}: ${chain.topRiskLabel || '-'}`,
    '',
    ...input.checks.map((item) => `- ${item.label}: ${item.ready}`),
    '',
    sectionLines(`## ${english ? 'Evidence Snapshot' : '证据快照'}`, chain.evidenceLines?.length ? chain.evidenceLines : ['-']),
    '',
    sectionLines(`## ${english ? 'Closed Loop' : '闭环状态'}`, closedLoopDetailLines(english, chain).length
      ? [`- ${closedLoopLine(english, chain.closedLoopLabel)}`, ...closedLoopDetailLines(english, chain).map((item) => `- ${item}`)]
      : [`- ${closedLoopLine(english, chain.closedLoopLabel)}`]),
    '',
    sectionLines(`## ${english ? 'Settlement Closure' : '结算闭环'}`, settlementDetailLines(english, chain).length || chain.settlementLines?.length
      ? [
          `- ${settlementLine(english, chain.settlementLabel)}`,
          ...settlementDetailLines(english, chain).map((item) => `- ${item}`),
          ...(chain.settlementLines || []).map((item) => `- ${item}`),
        ]
      : [`- ${settlementLine(english, chain.settlementLabel)}`]),
    '',
    sectionLines(`## ${english ? 'Financial Trace' : '财务追溯'}`, financialTraceDetailLines(english, chain).length || financialTraceReferenceLines(english, chain).length || chain.financialTraceLines?.length
      ? [
          `- ${financialTraceLine(english, chain.financialTraceLabel)}`,
          ...financialTraceDetailLines(english, chain).map((item) => `- ${item}`),
          ...financialTraceReferenceLines(english, chain).map((item) => `- ${item}`),
          ...(chain.financialTraceLines || []).map((item) => `- ${item}`),
        ]
      : [`- ${financialTraceLine(english, chain.financialTraceLabel)}`]),
    ...(chain.financeCockpitLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, chain.financeCockpitLines),
        ]
      : []),
    '',
    sectionLines(`## ${english ? 'Reminder Detail' : '提醒明细'}`, chain.reminderDetails?.length ? chain.reminderDetails : [`- ${english ? 'None' : '无'}`]),
    '',
    `## ${english ? 'Owners' : '负责人'}`,
    ...closeOwnerLines(english, chain).map((item) => `- ${item}`),
    ...(chain.closeChecklistLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Close Checklist' : '关账清单'}`, chain.closeChecklistLines),
        ]
      : []),
    ...(chain.closeActivityLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Recent Close Activity' : '最近关账活动'}`, chain.closeActivityLines),
        ]
      : []),
    '',
    `## ${english ? 'Gate Note' : '门槛备注'}`,
    chain.gateNote || '-',
  ].join('\n')
}

export function buildSharedChainRunbookContent(input: {
  english: boolean
  generatedAt: string
  chain: CutoverPacketChain
  mode: 'handbook' | 'rollback'
}) {
  const english = input.english
  const chain = input.chain
  const isRollback = input.mode === 'rollback'
  return [
    `# ${chain.label} ${isRollback ? (english ? 'Rollback Drill' : '回退演练') : (english ? 'Operator Handbook' : '操作手册')}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Status' : '状态'}: ${chain.summaryLabel || chain.readyLabel}`,
    `${english ? 'Enabled' : '启用'}: ${chain.enabled === undefined ? '-' : yn(english, chain.enabled)}`,
    ...closeOwnerLines(english, chain),
    `${english ? 'Modules' : '模块'}: ${chain.modulesLabel}`,
    '',
    `## ${english ? 'Risk Snapshot' : '风险快照'}`,
    `- ${english ? 'Reminders' : '提醒'}: ${chain.reminderCount ?? 0}`,
    `- ${english ? 'Critical' : '严重'}: ${chain.critical ?? 0}`,
    `- ${english ? 'Warning' : '警告'}: ${chain.warning ?? 0}`,
    `- ${english ? 'Top Risk' : '最高风险'}: ${chain.topRiskLabel || '-'}`,
    `- ${english ? 'Reminder Families' : '提醒家族'}: ${listOrDash(chain.reminderFamilies)}`,
    `- ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
    `- ${closedLoopLine(english, chain.closedLoopLabel)}`,
    ...closedLoopDetailLines(english, chain).map((item) => `- ${item}`),
    `- ${settlementLine(english, chain.settlementLabel)}`,
    ...settlementDetailLines(english, chain).map((item) => `- ${item}`),
    ...(chain.settlementLines || []).map((item) => `- ${item}`),
    `- ${financialTraceLine(english, chain.financialTraceLabel)}`,
    ...financialTraceDetailLines(english, chain).map((item) => `- ${item}`),
    ...financialTraceReferenceLines(english, chain).map((item) => `- ${item}`),
    ...(chain.financialTraceLines || []).map((item) => `- ${item}`),
    ...(chain.financeCockpitLines || []).map((item) => item.startsWith('-') ? item : `- ${item}`),
    `- ${english ? 'Required Evidence Slots' : '必备证据槽位'}: ${chain.requiredEvidenceCount ?? 0}`,
    ...(chain.closeChecklistLines?.length
      ? ['', ...chain.closeChecklistLines.map((item) => item.startsWith('-') ? item : `- ${item}`)]
      : []),
    ...(chain.closeActivityLines?.length
      ? ['', ...chain.closeActivityLines.map((item) => item.startsWith('-') ? item : `- ${item}`)]
      : []),
    '',
    sectionLines(`## ${english ? 'Evidence Discipline' : '证据纪律'}`, chain.evidenceLines?.length ? chain.evidenceLines : ['-']),
    '',
    `## ${english ? 'Operator Steps' : '操作步骤'}`,
    ...(isRollback
      ? [
          `- ${english ? 'Disable this chain from Settings > Cutover before accepting new pilot records.' : '先从 设置 > 切换 关闭当前链路，停止接收新的试点记录。'}`,
          `- ${english ? 'Export exception lists and preserve generated downstream references.' : '导出异常清单，并保留已生成的下游对象引用。'}`,
          `- ${english ? 'Return operators to the Odoo fallback owner and reconcile trial records.' : '让操作员回到 Odoo 回退负责人处继续录入，并核对试点记录。'}`,
          `- ${english ? 'Collect pilot confirmation sign-off before widening the scope again.' : '再次扩大范围前先补齐试点确认签字。'}`,
        ]
      : [
          `- ${english ? 'Open the chain workbench and confirm the active module switch is enabled.' : '打开链路工作台，确认相关模块开关处于启用状态。'}`,
          `- ${english ? 'Review top-risk records before expanding the pilot team.' : '扩大试点团队前先核对最高风险记录。'}`,
          `- ${english ? 'Use module handbook and rehearsal desks for record-level handoff.' : '使用模块手册台和演练台完成单据级交接。'}`,
          `- ${english ? 'Ask the pilot confirmation owner to record go/no-go notes.' : '让试点确认负责人补充放行或暂缓备注。'}`,
        ]),
    '',
    `## ${english ? 'Acceptance Gate' : '放行门槛'}`,
    `- ${english ? 'Pending Gates' : '未完成门槛'}: ${listOrDash(chain.pendingLabels)}`,
    `- ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
    `- ${english ? 'Gate Note' : '门槛备注'}: ${chain.gateNote || '-'}`,
  ].join('\n')
}

export function buildSharedPilotUserManualPack(input: {
  english: boolean
  generatedAt: string
  chains: CutoverPacketChain[]
  modules: CutoverPacketModule[]
}) {
  const english = input.english
  return [
    `# ${english ? 'NEKO_ERP First-Wave Pilot User Manual' : 'NEKO_ERP 首批试点用户手册'}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    '',
    `## ${english ? 'Operating Rules' : '操作规则'}`,
    `- ${english ? 'Use NEKO_ERP only for enabled first-wave modules and chains.' : '只在已启用的首批模块和链路中使用 NEKO_ERP。'}`,
    `- ${english ? 'Do not enter new pilot records after a chain is rolled back.' : '链路回退后不要继续录入新的试点单据。'}`,
    `- ${english ? 'Attach contracts, invoices, receipts, and proof files before handoff.' : '交接前补齐合同、发票、签收证明等支撑文件。'}`,
    `- ${english ? 'Use record detail pages, timeline, and rollback packets instead of manual search.' : '优先使用记录详情页、时间轴和回退包，不依赖人工搜索。'}`,
    '',
    `## ${english ? 'Chain Desk' : '链路操作台'}`,
    ...input.chains.map((chain) => [
      `### ${chain.label}`,
      `- ${english ? 'Modules' : '模块'}: ${chain.modulesLabel}`,
      `- ${english ? 'Owner' : '负责人'}: ${chain.owner || '-'}`,
      ...closeOwnerLines(english, chain).slice(1).map((item) => `- ${item}`),
      `- ${english ? 'Gate Status' : '门槛状态'}: ${chain.readyLabel}${chain.summaryLabel ? ` · ${chain.summaryLabel}` : ''}`,
      `- ${closedLoopLine(english, chain.closedLoopLabel)}`,
      `- ${settlementLine(english, chain.settlementLabel)}`,
      `- ${financialTraceLine(english, chain.financialTraceLabel)}`,
      `- ${financeCockpitLine(english, chain.financeCockpitLabel)}`,
      `- ${english ? 'Before Cutover' : '切换前'}: ${listOrDash(chain.pendingLabels)}`,
      `- ${english ? 'If Blocked' : '出现阻塞时'}: ${listOrDash(chain.blockerLabels)}`,
      ...closedLoopDetailLines(english, chain).map((item) => `- ${item}`),
      ...settlementDetailLines(english, chain).map((item) => `- ${item}`),
      ...financialTraceDetailLines(english, chain).map((item) => `- ${item}`),
      ...financialTraceReferenceLines(english, chain).map((item) => `- ${item}`),
      ...(chain.financialTraceLines || []).map((item) => `- ${item}`),
      ...(chain.financeCockpitLines?.length
        ? ['', sectionLines(`#### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, chain.financeCockpitLines)]
        : []),
      ...(chain.closeChecklistLines?.length
        ? ['', sectionLines(`#### ${english ? 'Close Checklist' : '关账清单'}`, chain.closeChecklistLines)]
        : []),
      ...(chain.closeActivityLines?.length
        ? ['', sectionLines(`#### ${english ? 'Recent Close Activity' : '最近关账活动'}`, chain.closeActivityLines)]
        : []),
    ].join('\n')),
    '',
    `## ${english ? 'Module Evidence' : '模块证据要求'}`,
    ...input.modules.map((module) => [
      `### ${module.title}`,
      `- ${english ? 'Required Evidence' : '必备证据'}: ${listOrDash(module.requiredLabels)}`,
      `- ${english ? 'Recommended Upload' : '推荐上传'}: ${module.recommendedLabel}`,
      `- ${english ? 'Timeline Rule' : '时间轴规则'}: ${module.timelineHint}`,
      `- ${english ? 'Open Risks' : '未处理风险'}: ${module.openRisks ?? 0}`,
      `- ${settlementLine(english, module.settlementLabel)}`,
      ...settlementDetailLines(english, module).map((item) => `- ${item}`),
      ...(module.settlementLines || []).map((item) => `- ${item}`),
      `- ${financialTraceLine(english, module.financialTraceLabel)}`,
      ...financialTraceDetailLines(english, module).map((item) => `- ${item}`),
      ...financialTraceReferenceLines(english, module).map((item) => `- ${item}`),
      ...(module.financialTraceLines || []).map((item) => `- ${item}`),
      ...(module.financeCockpitLines?.length
        ? ['', sectionLines(`#### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, module.financeCockpitLines)]
        : []),
      ...(module.paymentLinkageLines?.length
        ? ['', sectionLines(`#### ${english ? 'Payment Linkage' : '付款联动'}`, module.paymentLinkageLines)]
        : []),
      ...(module.quantImpactLines?.length
        ? ['', sectionLines(`#### ${english ? 'Quant Impact' : '库存影响'}`, module.quantImpactLines)]
        : []),
    ].join('\n')),
    '',
    `## ${english ? 'Rollback Steps' : '回退步骤'}`,
    `1. ${english ? 'Close the module or chain switch from Settings > Cutover.' : '从 设置 > 切换 关闭模块或链路开关。'}`,
    `2. ${english ? 'Stop creating new NEKO_ERP records for the affected scope.' : '停止在受影响范围内创建新的 NEKO_ERP 单据。'}`,
    `3. ${english ? 'Export exception lists, blocker packets, and record rollback packets.' : '导出异常清单、阻塞包和记录级回退包。'}`,
    `4. ${english ? 'Return users to the Odoo fallback owner and reconcile trial records.' : '让用户回到 Odoo 回退负责人路径，并核对试点记录。'}`,
  ].join('\n')
}

export function buildPilotConfirmationTemplate(input: {
  english: boolean
  generatedAt: string
  summary: CutoverPressureSummary
  chains: CutoverPacketChain[]
}) {
  const english = input.english
  return [
    `# ${english ? 'NEKO_ERP Pilot Team Confirmation Template' : 'NEKO_ERP 试点团队确认模板'}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Ready Chains' : '就绪链路'}: ${input.summary.readyChains}/${input.summary.totalChains}`,
    `${english ? 'Pending Gates' : '未完成门槛'}: ${input.summary.pendingGates}`,
    `${english ? 'Open Reminders' : '未处理提醒'}: ${input.summary.openReminders}`,
    '',
    `## ${english ? 'Confirmation Matrix' : '确认矩阵'}`,
    ...input.chains.map((chain) => [
      `### ${chain.label}`,
      ...closeOwnerLines(english, chain).map((item) => `- ${item}`),
      `- ${english ? 'Gate Status' : '门槛状态'}: ${chain.readyLabel}${chain.summaryLabel ? ` · ${chain.summaryLabel}` : ''}`,
      `- ${closedLoopLine(english, chain.closedLoopLabel)}`,
      `- ${settlementLine(english, chain.settlementLabel)}`,
      `- ${financialTraceLine(english, chain.financialTraceLabel)}`,
      `- ${financeCockpitLine(english, chain.financeCockpitLabel)}`,
      `- ${english ? 'Pending Gates' : '未完成门槛'}: ${listOrDash(chain.pendingLabels)}`,
      `- ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
      ...closedLoopDetailLines(english, chain).map((item) => `- ${item}`),
      ...settlementDetailLines(english, chain).map((item) => `- ${item}`),
      ...financialTraceDetailLines(english, chain).map((item) => `- ${item}`),
      ...financialTraceReferenceLines(english, chain).map((item) => `- ${item}`),
      ...(chain.financialTraceLines || []).map((item) => `- ${item}`),
      ...(chain.financeCockpitLines?.length
        ? ['', sectionLines(`#### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, chain.financeCockpitLines)]
        : []),
      ...(chain.closeChecklistLines?.length
        ? ['', sectionLines(`#### ${english ? 'Close Checklist' : '关账清单'}`, chain.closeChecklistLines)]
        : []),
      ...(chain.closeActivityLines?.length
        ? ['', sectionLines(`#### ${english ? 'Recent Close Activity' : '最近关账活动'}`, chain.closeActivityLines)]
        : []),
      `- ${english ? 'Pilot Team Confirmed' : '试点团队确认'}: ____________________`,
      `- ${english ? 'Confirmed By' : '确认人'}: ____________________`,
      `- ${english ? 'Confirmed At' : '确认时间'}: ____________________`,
      `- ${english ? 'Go / No-Go Decision' : '放行 / 暂缓决定'}: ____________________`,
      `- ${english ? 'Notes' : '备注'}: ____________________`,
    ].join('\n')),
    '',
    `## ${english ? 'Required Attachments' : '需要附带材料'}`,
    `- ${english ? 'Latest acceptance gate packet' : '最新放行门槛包'}`,
    `- ${english ? 'Latest blocker packet' : '最新阻塞包'}`,
    `- ${english ? 'Exception list export' : '异常清单导出'}`,
    `- ${english ? 'Rollback drill evidence' : '回退演练证据'}`,
  ].join('\n')
}

export function buildSharedModuleHandbookContent(input: {
  english: boolean
  generatedAt: string
  pageTitle: string
  moduleTitle: string
  pilotChainsLabel: string
  moduleEnabled: boolean
  contacts: ModulePacketContact[]
  pageDescription: string
  note?: string
  pilotGuides: ModulePacketGuideRow[]
  rollbackItems: ModulePacketGuideRow[]
  quickLinks: ModulePacketGuideRow[]
  executionItems?: ModulePacketGuideRow[]
  stageItems: Array<{ label: string; value: string; description: string }>
  readinessItems: ModulePacketReadinessRow[]
  settlementLines?: string[]
  financialTraceLines?: string[]
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
  financeCockpitLines?: string[]
  closeChecklistLines?: string[]
  closeActivityLines?: string[]
  paymentLinkageLines?: string[]
  quantImpactLines?: string[]
}) {
  const english = input.english
  return [
    `# ${input.pageTitle}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Module' : '模块'}: ${input.moduleTitle}`,
    `${english ? 'Pilot Chains' : '试点链路'}: ${input.pilotChainsLabel || '-'}`,
    `${english ? 'Module Enabled' : '模块启用状态'}: ${input.moduleEnabled ? 'true' : 'false'}`,
    '',
    `## ${english ? 'Chain Contacts' : '链路联系人'}`,
    ...(input.contacts.length
      ? input.contacts.map((row) => [
          `- ${row.label}`,
          `  ${english ? 'Owner' : '负责人'}: ${row.owner}`,
          `  ${english ? 'Fallback Owner' : '回退负责人'}: ${row.fallbackOwner}`,
          `  ${english ? 'Rehearsal Owner' : '演练负责人'}: ${row.rehearsalOwner}`,
          `  ${english ? 'Pilot Confirmation Owner' : '试点确认负责人'}: ${row.pilotConfirmOwner || '-'}`,
          `  ${english ? 'Reviewer' : '复核人'}: ${row.reviewerOwner || '-'}`,
          `  ${english ? 'Finance Owner' : '财务责任人'}: ${row.financeOwner || '-'}`,
        ].join('\n'))
      : [`- ${english ? 'No chain contacts configured.' : '当前没有链路联系人。'}`]),
    '',
    `## ${english ? 'Workbench Goal' : '工作台目标'}`,
    `- ${input.pageDescription}`,
    ...(input.note ? [`- ${input.note}`] : []),
    '',
    `## ${english ? 'Pilot Operating Guide' : '试点操作手册'}`,
    ...(input.pilotGuides.length
      ? input.pilotGuides.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${english ? 'No guide items configured.' : '当前没有配置操作指引。'}`]),
    '',
    `## ${english ? 'Rollback Checklist' : '回退步骤清单'}`,
    ...(input.rollbackItems.length
      ? input.rollbackItems.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${english ? 'No rollback checklist configured.' : '当前没有配置回退清单。'}`]),
    '',
    `## ${english ? 'Launch Targets' : '快捷入口'}`,
    ...(input.quickLinks.length
      ? input.quickLinks.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${english ? 'No quick links configured.' : '当前没有配置快捷入口。'}`]),
    '',
    `## ${english ? 'Execution Runbook' : '执行台'}`,
    ...(input.executionItems?.length
      ? input.executionItems.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${english ? 'No execution actions prepared.' : '当前没有预置执行动作。'}`]),
    '',
    `## ${english ? 'First-Wave Stage Map' : '首批主线阶段图'}`,
    ...(input.stageItems.length
      ? input.stageItems.map((item) => `- ${item.label}: ${item.value} / ${item.description}`)
      : [`- ${english ? 'No first-wave stage map is configured for this module.' : '当前模块没有配置首批主线阶段图。'}`]),
    '',
    `## ${english ? 'Readiness Snapshot' : '准备度快照'}`,
    ...(input.readinessItems.length
      ? input.readinessItems.map((item) => `- ${item.label}: ${item.value} / ${item.description}`)
      : [`- ${english ? 'No readiness items configured.' : '当前没有配置准备度项。'}`]),
    '',
    sectionLines(
      `## ${english ? 'Settlement Closure' : '结算闭环'}`,
      input.settlementLines?.length
        ? input.settlementLines
        : [`- ${english ? 'No settlement closure summary is attached to this module.' : '当前模块没有挂接结算闭环摘要。'}`],
    ),
    '',
    sectionLines(
      `## ${english ? 'Financial Trace' : '财务追溯'}`,
      input.financialTraceLines?.length || financialTraceReferenceLines(english, input).length
        ? [
            ...(input.financialTraceLines || []),
            ...financialTraceReferenceLines(english, input),
          ]
        : [`- ${english ? 'No financial trace summary is attached to this module.' : '当前模块没有挂接财务追溯摘要。'}`],
    ),
    ...(input.financeCockpitLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, input.financeCockpitLines),
        ]
      : []),
    ...(input.closeChecklistLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Close Checklist' : '关账清单'}`, input.closeChecklistLines),
        ]
      : []),
    ...(input.closeActivityLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Recent Close Activity' : '最近关账活动'}`, input.closeActivityLines),
        ]
      : []),
    ...(input.paymentLinkageLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Payment Linkage' : '付款联动'}`, input.paymentLinkageLines),
        ]
      : []),
    ...(input.quantImpactLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Quant Impact' : '库存影响'}`, input.quantImpactLines),
        ]
      : []),
  ].join('\n')
}

export function buildSharedModuleRehearsalContent(input: {
  english: boolean
  generatedAt: string
  pageTitle: string
  moduleTitle: string
  pilotChainsLabel: string
  criticalCount: number
  warningCount: number
  totalCount: number
  gatePressureLines: string[]
  closedLoopLines?: string[]
  settlementLines?: string[]
  financialTraceLines?: string[]
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
  financeCockpitLines?: string[]
  closeChecklistLines?: string[]
  closeActivityLines?: string[]
  paymentLinkageLines?: string[]
  quantImpactLines?: string[]
  topRiskLines: string[]
  executionItems?: ModulePacketGuideRow[]
  rollbackItems: ModulePacketGuideRow[]
  reminderDetails: ModulePacketRiskDetail[]
}) {
  const english = input.english
  return [
    `# ${input.pageTitle}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Module' : '模块'}: ${input.moduleTitle}`,
    `${english ? 'Pilot Chains' : '试点链路'}: ${input.pilotChainsLabel || '-'}`,
    `${english ? 'Critical Reminders' : '严重提醒'}: ${input.criticalCount}`,
    `${english ? 'Warning Reminders' : '警告提醒'}: ${input.warningCount}`,
    `${english ? 'Reminder Rows' : '提醒总数'}: ${input.totalCount}`,
    '',
    sectionLines(`## ${english ? 'Gate Pressure' : '门禁压力'}`, input.gatePressureLines.length ? input.gatePressureLines : [`- ${english ? 'No chain gates are attached to this module.' : '当前模块没有关联链路门禁。'}`]),
    '',
    sectionLines(`## ${english ? 'Closed Loop' : '闭环状态'}`, input.closedLoopLines?.length ? input.closedLoopLines : [`- ${english ? 'No closed-loop summary attached to this module.' : '当前模块没有闭环摘要。'}`]),
    '',
    sectionLines(`## ${english ? 'Settlement Closure' : '结算闭环'}`, input.settlementLines?.length ? input.settlementLines : [`- ${english ? 'No settlement closure summary attached to this module.' : '当前模块没有结算闭环摘要。'}`]),
    '',
    sectionLines(
      `## ${english ? 'Financial Trace' : '财务追溯'}`,
      input.financialTraceLines?.length || financialTraceReferenceLines(english, input).length
        ? [
            ...(input.financialTraceLines || []),
            ...financialTraceReferenceLines(english, input),
          ]
        : [`- ${english ? 'No financial trace summary attached to this module.' : '当前模块没有财务追溯摘要。'}`],
    ),
    ...(input.financeCockpitLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, input.financeCockpitLines),
        ]
      : []),
    ...(input.closeChecklistLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Close Checklist' : '关账清单'}`, input.closeChecklistLines),
        ]
      : []),
    ...(input.closeActivityLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Recent Close Activity' : '最近关账活动'}`, input.closeActivityLines),
        ]
      : []),
    ...(input.paymentLinkageLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Payment Linkage' : '付款联动'}`, input.paymentLinkageLines),
        ]
      : []),
    ...(input.quantImpactLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Quant Impact' : '库存影响'}`, input.quantImpactLines),
        ]
      : []),
    '',
    sectionLines(`## ${english ? 'Top Risk Record' : '最高风险记录'}`, input.topRiskLines.length ? input.topRiskLines : [`- ${english ? 'No top risk record in this module.' : '当前模块没有最高风险记录。'}`]),
    '',
    `## ${english ? 'Execution Actions' : '执行动作'}`,
    ...(input.executionItems?.length
      ? input.executionItems.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${english ? 'No execution actions prepared.' : '当前没有预置执行动作。'}`]),
    '',
    `## ${english ? 'Rollback Drill' : '回退演练步骤'}`,
    ...(input.rollbackItems.length
      ? input.rollbackItems.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${english ? 'No rollback checklist configured.' : '当前没有配置回退清单。'}`]),
    '',
    `## ${english ? 'Reminder Rows' : '提醒明细'}`,
    ...(input.reminderDetails.length
      ? input.reminderDetails.map((item) => [
          `- [${item.severity}] ${item.moduleTitle} #${item.recordId ?? '-'}`,
          `  ${english ? 'Title' : '标题'}: ${item.title}`,
          `  ${english ? 'Reference' : '引用'}: ${item.relatedRef || '-'}`,
          `  ${english ? 'Created At' : '创建时间'}: ${item.createdAt || '-'}`,
          `  ${english ? 'Content' : '内容'}: ${item.content}`,
        ].join('\n'))
      : [`- ${english ? 'No reminders in this module.' : '当前模块没有提醒。'}`]),
  ].join('\n')
}

export function buildSharedModuleGatePacket(input: {
  english: boolean
  generatedAt: string
  pageTitle: string
  moduleTitle: string
  pilotChainsLabel: string
  moduleEnabled: boolean
  readinessItems: ModulePacketReadinessRow[]
  stageItems: Array<{ label: string; value: string; description: string }>
  gateRows: ModulePacketGateRow[]
}) {
  const english = input.english
  return [
    `# ${input.pageTitle}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Module' : '模块'}: ${input.moduleTitle}`,
    `${english ? 'Pilot Chains' : '试点链路'}: ${input.pilotChainsLabel || '-'}`,
    `${english ? 'Module Enabled' : '模块启用状态'}: ${input.moduleEnabled ? 'true' : 'false'}`,
    '',
    `## ${english ? 'Readiness Snapshot' : '准备度快照'}`,
    ...(input.readinessItems.length
      ? input.readinessItems.map((item) => `- ${item.label}: ${item.value} / ${item.description}`)
      : [`- ${english ? 'No readiness rows configured.' : '当前没有准备度快照。'}`]),
    '',
    `## ${english ? 'Stage Snapshot' : '阶段快照'}`,
    ...(input.stageItems.length
      ? input.stageItems.map((item) => `- ${item.label}: ${item.value} / ${item.description}`)
      : [`- ${english ? 'No stage rows configured.' : '当前没有阶段快照。'}`]),
    '',
    `## ${english ? 'Gate Desk' : '门槛操作台'}`,
    ...(input.gateRows.length
      ? input.gateRows.map((row) => [
        `### ${row.label}`,
        `- ${english ? 'Acceptance Gates' : '放行门槛'}: ${row.readyLabel}${row.summaryLabel ? ` · ${row.summaryLabel}` : ''}`,
        `- ${closedLoopLine(english, row.closedLoopLabel)}`,
        `- ${settlementLine(english, row.settlementLabel)}`,
        `- ${financialTraceLine(english, row.financialTraceLabel)}`,
        `- ${financeCockpitLine(english, row.financeCockpitLabel)}`,
        `- ${english ? 'Pending Gates' : '未完成门槛'}: ${listOrDash(row.pendingLabels)}`,
        `- ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(row.blockerLabels)}`,
        ...closedLoopDetailLines(english, row).map((item) => `- ${item}`),
        ...settlementDetailLines(english, row).map((item) => `- ${item}`),
        ...(row.settlementLines || []).map((item) => `- ${item}`),
        ...financialTraceDetailLines(english, row).map((item) => `- ${item}`),
        ...financialTraceReferenceLines(english, row).map((item) => `- ${item}`),
        ...(row.financialTraceLines || []).map((item) => `- ${item}`),
        ...(row.financeCockpitLines?.length
          ? ['', sectionLines(`#### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, row.financeCockpitLines)]
          : []),
        ...(row.paymentLinkageLines?.length
          ? ['', sectionLines(`#### ${english ? 'Payment Linkage' : '付款联动'}`, row.paymentLinkageLines)]
          : []),
        ...(row.quantImpactLines?.length
          ? ['', sectionLines(`#### ${english ? 'Quant Impact' : '库存影响'}`, row.quantImpactLines)]
          : []),
        `- ${english ? 'Reminder Count' : '提醒数量'}: ${row.reminderCount ?? 0}`,
          `- ${english ? 'Critical / Warning' : '严重 / 警告'}: ${row.critical ?? 0}/${row.warning ?? 0}`,
          `- ${english ? 'Top Risk' : '最高风险'}: ${row.topRiskLabel || '-'}`,
          `- ${english ? 'Owner' : '负责人'}: ${row.owner || '-'}`,
          `- ${english ? 'Fallback Owner' : '回退负责人'}: ${row.fallbackOwner || '-'}`,
          `- ${english ? 'Rehearsal Owner' : '演练负责人'}: ${row.rehearsalOwner || '-'}`,
          `- ${english ? 'Pilot Confirmation Owner' : '试点确认负责人'}: ${row.pilotConfirmOwner || '-'}`,
          `- ${english ? 'Gate Note' : '门槛备注'}: ${row.note || '-'}`,
        ].join('\n'))
      : [`- ${english ? 'No chain gates are attached to this module.' : '当前模块没有关联链路门槛。'}`]),
  ].join('\n')
}

export function buildSharedModuleExceptionPacket(input: {
  english: boolean
  generatedAt: string
  pageTitle: string
  moduleTitle: string
  pilotChainsLabel: string
  summaryItems: ModulePacketReadinessRow[]
  blockerLines: string[]
  closedLoopLines?: string[]
  settlementLines?: string[]
  financialTraceLines?: string[]
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
  financeCockpitLines?: string[]
  closeChecklistLines?: string[]
  closeActivityLines?: string[]
  paymentLinkageLines?: string[]
  quantImpactLines?: string[]
  topRiskLines: string[]
  executionItems?: ModulePacketGuideRow[]
  rollbackItems: ModulePacketGuideRow[]
  reminderDetails: ModulePacketRiskDetail[]
}) {
  const english = input.english
  return [
    `# ${input.pageTitle}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Module' : '模块'}: ${input.moduleTitle}`,
    `${english ? 'Pilot Chains' : '试点链路'}: ${input.pilotChainsLabel || '-'}`,
    '',
    `## ${english ? 'Exception Snapshot' : '异常快照'}`,
    ...(input.summaryItems.length
      ? input.summaryItems.map((item) => `- ${item.label}: ${item.value} / ${item.description}`)
      : [`- ${english ? 'No module exception summary exists.' : '当前没有模块异常摘要。'}`]),
    '',
    sectionLines(`## ${english ? 'Suggested Blockers' : '建议阻塞项'}`, input.blockerLines.length ? input.blockerLines : [`- ${english ? 'No blocker suggestion exists.' : '当前没有阻塞建议。'}`]),
    '',
    sectionLines(`## ${english ? 'Closed Loop' : '闭环状态'}`, input.closedLoopLines?.length ? input.closedLoopLines : [`- ${english ? 'No closed-loop summary exists.' : '当前没有闭环摘要。'}`]),
    '',
    sectionLines(`## ${english ? 'Settlement Closure' : '结算闭环'}`, input.settlementLines?.length ? input.settlementLines : [`- ${english ? 'No settlement closure summary exists.' : '当前没有结算闭环摘要。'}`]),
    '',
    sectionLines(
      `## ${english ? 'Financial Trace' : '财务追溯'}`,
      input.financialTraceLines?.length || financialTraceReferenceLines(english, input).length
        ? [
            ...(input.financialTraceLines || []),
            ...financialTraceReferenceLines(english, input),
          ]
        : [`- ${english ? 'No financial trace summary exists.' : '当前没有财务追溯摘要。'}`],
    ),
    ...(input.financeCockpitLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, input.financeCockpitLines),
        ]
      : []),
    ...(input.closeChecklistLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Close Checklist' : '关账清单'}`, input.closeChecklistLines),
        ]
      : []),
    ...(input.closeActivityLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Recent Close Activity' : '最近关账活动'}`, input.closeActivityLines),
        ]
      : []),
    ...(input.paymentLinkageLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Payment Linkage' : '付款联动'}`, input.paymentLinkageLines),
        ]
      : []),
    ...(input.quantImpactLines?.length
      ? [
          '',
          sectionLines(`## ${english ? 'Quant Impact' : '库存影响'}`, input.quantImpactLines),
        ]
      : []),
    '',
    sectionLines(`## ${english ? 'Top Risk Record' : '最高风险记录'}`, input.topRiskLines.length ? input.topRiskLines : [`- ${english ? 'No top-risk record exists.' : '当前没有最高风险记录。'}`]),
    '',
    `## ${english ? 'Execution Actions' : '执行动作'}`,
    ...(input.executionItems?.length
      ? input.executionItems.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${english ? 'No execution actions prepared.' : '当前没有预置执行动作。'}`]),
    '',
    `## ${english ? 'Rollback Drill' : '回退演练步骤'}`,
    ...(input.rollbackItems.length
      ? input.rollbackItems.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${english ? 'No rollback checklist configured.' : '当前没有配置回退清单。'}`]),
    '',
    `## ${english ? 'Reminder Detail' : '提醒明细'}`,
    ...(input.reminderDetails.length
      ? input.reminderDetails.map((item) => [
          `- [${item.severity}] ${item.moduleTitle} #${item.recordId ?? '-'}`,
          `  ${english ? 'Title' : '标题'}: ${item.title}`,
          `  ${english ? 'Reference' : '引用'}: ${item.relatedRef || '-'}`,
          `  ${english ? 'Created At' : '创建时间'}: ${item.createdAt || '-'}`,
          `  ${english ? 'Content' : '内容'}: ${item.content}`,
        ].join('\n'))
      : [`- ${english ? 'No reminders in this module.' : '当前模块没有提醒。'}`]),
  ].join('\n')
}

export function buildSharedChainContactMatrix(input: {
  english: boolean
  generatedAt?: string
  title?: string
  rows: CutoverContactMatrixRow[]
}) {
  const english = input.english
  return [
    `# ${input.title || (english ? 'NEKO_ERP First-Wave Chain Contact Matrix' : 'NEKO_ERP 首批链路联系人矩阵')}`,
    ...(input.generatedAt ? ['', `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`] : []),
    '',
    ...(input.rows.length
      ? input.rows.map((row) => [
          `## ${row.label}`,
          `${english ? 'Modules' : '模块'}: ${row.modulesLabel || '-'}`,
          `${english ? 'Owner' : '负责人'}: ${row.owner || '-'}`,
          `${english ? 'Fallback Owner' : '回退负责人'}: ${row.fallbackOwner || '-'}`,
          `${english ? 'Rehearsal Owner' : '演练负责人'}: ${row.rehearsalOwner || '-'}`,
          `${english ? 'Pilot Confirmation Owner' : '试点确认负责人'}: ${row.pilotConfirmOwner || '-'}`,
          `${english ? 'Reviewer' : '复核人'}: ${row.reviewerOwner || '-'}`,
          `${english ? 'Finance Owner' : '财务责任人'}: ${row.financeOwner || '-'}`,
          `${english ? 'Status' : '状态'}: ${row.statusLabel || '-'}`,
        ].join('\n'))
      : [`- ${english ? 'No contact rows exist.' : '当前没有联系人矩阵。'}`]),
  ].join('\n\n')
}

export function buildSharedPendingGateMatrix(input: {
  english: boolean
  generatedAt?: string
  title?: string
  rows: CutoverPendingGateRow[]
}) {
  const english = input.english
  return [
    `# ${input.title || (english ? 'NEKO_ERP First-Wave Pending Gate Matrix' : 'NEKO_ERP 首批未完成门槛矩阵')}`,
    ...(input.generatedAt ? ['', `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`] : []),
    '',
    ...(input.rows.length
      ? input.rows.map((row) => [
          `## ${row.label}`,
          `${english ? 'Ready Checks' : '通过项'}: ${row.readyLabel}`,
          `${english ? 'Pending Gates' : '未完成门槛'}: ${listOrDash(row.pendingLabels)}`,
          `${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(row.blockerLabels)}`,
          `${english ? 'Owner' : '负责人'}: ${row.owner || '-'}`,
          `${english ? 'Gate Note' : '门槛备注'}: ${row.gateNote || '-'}`,
        ].join('\n'))
      : [`- ${english ? 'No pending gate rows exist.' : '当前没有门槛矩阵。'}`]),
  ].join('\n\n')
}

export function buildSharedCutoverControlPacket(input: {
  english: boolean
  generatedAt: string
  title?: string
  reviewedCount?: number
  snoozedCount?: number
  chains: CutoverPacketChain[]
  modules: CutoverControlModuleRow[]
}) {
  const english = input.english
  return [
    `# ${input.title || (english ? 'NEKO_ERP First-Wave Control Packet' : 'NEKO_ERP 首批切换控制包')}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Reviewed Reminders' : '已核对提醒'}: ${input.reviewedCount ?? 0}`,
    `${english ? 'Snoozed Reminders' : '稍后处理提醒'}: ${input.snoozedCount ?? 0}`,
    '',
    `## ${english ? 'Pilot Chains' : '试点链路'}`,
    ...(input.chains.length
      ? input.chains.map((chain) => [
          `### ${chain.label}`,
          `- ${english ? 'Enabled' : '启用'}: ${chain.enabled === undefined ? '-' : yn(english, chain.enabled)}`,
          `- ${english ? 'Modules' : '模块'}: ${chain.modulesLabel}`,
      `- ${english ? 'Acceptance Gates' : '放行门槛'}: ${chain.readyLabel}${chain.summaryLabel ? ` · ${chain.summaryLabel}` : ''}`,
      `- ${closedLoopLine(english, chain.closedLoopLabel)}`,
      `- ${settlementLine(english, chain.settlementLabel)}`,
      `- ${financialTraceLine(english, chain.financialTraceLabel)}`,
      `- ${financeCockpitLine(english, chain.financeCockpitLabel)}`,
      `- ${english ? 'Pending Gates' : '未完成门槛'}: ${listOrDash(chain.pendingLabels)}`,
      `- ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
      ...closedLoopDetailLines(english, chain).map((item) => `- ${item}`),
      ...settlementDetailLines(english, chain).map((item) => `- ${item}`),
      ...financialTraceDetailLines(english, chain).map((item) => `- ${item}`),
      ...financialTraceReferenceLines(english, chain).map((item) => `- ${item}`),
      ...(chain.financialTraceLines || []).map((item) => `- ${item}`),
      ...(chain.financeCockpitLines?.length
        ? ['', sectionLines(`#### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, chain.financeCockpitLines)]
        : []),
      `- ${english ? 'Reminder Families' : '提醒家族'}: ${listOrDash(chain.reminderFamilies)}`,
          `- ${english ? 'Top Risk' : '最高风险'}: ${chain.topRiskLabel || '-'}`,
          `- ${english ? 'Owner' : '负责人'}: ${chain.owner || '-'}`,
          ...closeOwnerLines(english, chain).slice(1).map((item) => `- ${item}`),
          `- ${english ? 'Gate Note' : '门槛备注'}: ${chain.gateNote || '-'}`,
          ...(chain.closeChecklistLines?.length
            ? ['', sectionLines(`#### ${english ? 'Close Checklist' : '关账清单'}`, chain.closeChecklistLines)]
            : []),
          ...(chain.closeActivityLines?.length
            ? ['', sectionLines(`#### ${english ? 'Recent Close Activity' : '最近关账活动'}`, chain.closeActivityLines)]
            : []),
        ].join('\n'))
      : [`- ${english ? 'No pilot chains exist.' : '当前没有试点链路。'}`]),
    '',
    `## ${english ? 'Module Pressure' : '模块压力'}`,
    ...(input.modules.length
      ? input.modules.map((row) => [
          `### ${row.title}`,
          `- ${english ? 'Enabled' : '启用'}: ${row.enabled === undefined ? '-' : yn(english, row.enabled)}`,
          `- ${english ? 'Reminders' : '提醒'}: ${row.reminders ?? 0}`,
          `- ${english ? 'Critical / Warning' : '严重 / 警告'}: ${row.critical ?? 0}/${row.warning ?? 0}`,
          `- ${english ? 'Top Risk' : '最高风险'}: ${row.topRiskLabel || '-'}`,
          `- ${english ? 'Reminder Families' : '提醒家族'}: ${listOrDash(row.reminderFamilies)}`,
          `- ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(row.blockerLabels)}`,
          `- ${english ? 'Required Evidence' : '必备证据'}: ${listOrDash(row.requiredLabels)}`,
          `- ${english ? 'Recommended Upload' : '推荐上传'}: ${row.recommendedLabel || '-'}`,
          `- ${english ? 'Timeline Discipline' : '时间轴要求'}: ${row.timelineHint || '-'}`,
          `- ${settlementLine(english, row.settlementLabel)}`,
          ...settlementDetailLines(english, row).map((item) => `- ${item}`),
          ...(row.settlementLines || []).map((item) => `- ${item}`),
          `- ${financialTraceLine(english, row.financialTraceLabel)}`,
          ...financialTraceDetailLines(english, row).map((item) => `- ${item}`),
          ...financialTraceReferenceLines(english, row).map((item) => `- ${item}`),
          ...(row.financialTraceLines || []).map((item) => `- ${item}`),
          `- ${financeCockpitLine(english, row.financeCockpitLabel)}`,
          ...(row.financeCockpitLines?.length
            ? ['', sectionLines(`#### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, row.financeCockpitLines)]
            : []),
          ...(row.paymentLinkageLines?.length
            ? ['', sectionLines(`#### ${english ? 'Payment Linkage' : '付款联动'}`, row.paymentLinkageLines)]
            : []),
          ...(row.quantImpactLines?.length
            ? ['', sectionLines(`#### ${english ? 'Quant Impact' : '库存影响'}`, row.quantImpactLines)]
            : []),
        ].join('\n'))
      : [`- ${english ? 'No module pressure rows exist.' : '当前没有模块压力记录。'}`]),
  ].join('\n\n')
}

export function buildSharedFirstWaveRehearsalPack(input: {
  english: boolean
  generatedAt: string
  enabledModulesLabel: string
  reviewedCount?: number
  snoozedCount?: number
  chains: CutoverPacketChain[]
  modules: CutoverControlModuleRow[]
}) {
  const english = input.english
  return [
    `# ${english ? 'NEKO_ERP First-Wave Cutover Rehearsal Pack' : 'NEKO_ERP 首批切换演练包'}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Enabled Modules' : '已启用模块'}: ${input.enabledModulesLabel}`,
    `${english ? 'Reviewed Reminders' : '已核对提醒'}: ${input.reviewedCount ?? 0}`,
    `${english ? 'Snoozed Reminders' : '稍后处理提醒'}: ${input.snoozedCount ?? 0}`,
    '',
    `## ${english ? 'Pilot Chains' : '试点链路'}`,
    ...(input.chains.length
      ? input.chains.map((chain) => [
          `- ${chain.label}`,
          `  ${english ? 'Enabled' : '启用'}: ${chain.enabled === undefined ? '-' : yn(english, chain.enabled)}`,
          `  ${english ? 'Modules' : '模块'}: ${chain.modulesLabel}`,
          `  ${english ? 'Owner' : '负责人'}: ${chain.owner || '-'}`,
          ...closeOwnerLines(english, chain).slice(1).map((item) => `  ${item}`),
          `  ${english ? 'Gate Checks' : '门槛通过项'}: ${chain.readyLabel}`,
          `  ${closedLoopLine(english, chain.closedLoopLabel)}`,
          `  ${settlementLine(english, chain.settlementLabel)}`,
          `  ${financialTraceLine(english, chain.financialTraceLabel)}`,
          `  ${financeCockpitLine(english, chain.financeCockpitLabel)}`,
          ...closedLoopDetailLines(english, chain).map((item) => `  ${item}`),
          ...settlementDetailLines(english, chain).map((item) => `  ${item}`),
          ...financialTraceDetailLines(english, chain).map((item) => `  ${item}`),
          ...financialTraceReferenceLines(english, chain).map((item) => `  ${item}`),
          ...(chain.financialTraceLines || []).map((item) => `  ${item}`),
          ...(chain.financeCockpitLines || []).map((item) => `  ${item.replace(/^- /, '')}`),
          ...(chain.closeChecklistLines || []).map((item) => `  ${item.replace(/^- /, '')}`),
          ...(chain.closeActivityLines || []).map((item) => `  ${item.replace(/^- /, '')}`),
          `  ${english ? 'Reminder Families' : '提醒家族'}: ${listOrDash(chain.reminderFamilies)}`,
          `  ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
        ].join('\n'))
      : [`- ${english ? 'No pilot chains exist.' : '当前没有试点链路。'}`]),
    '',
    `## ${english ? 'Module Pressure' : '模块压力'}`,
    ...(input.modules.length
      ? input.modules.map((row) => [
          `- ${row.title}`,
          `  ${english ? 'Enabled' : '启用'}: ${row.enabled === undefined ? '-' : yn(english, row.enabled)}`,
          `  ${english ? 'Reminders' : '提醒'}: ${row.reminders ?? 0}`,
          `  ${english ? 'Critical' : '严重'}: ${row.critical ?? 0}`,
          `  ${english ? 'Warning' : '警告'}: ${row.warning ?? 0}`,
          `  ${english ? 'Top Risk' : '最高风险'}: ${row.topRiskLabel || '-'}`,
          `  ${english ? 'Reminder Families' : '提醒家族'}: ${listOrDash(row.reminderFamilies)}`,
          `  ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(row.blockerLabels)}`,
          `  ${english ? 'Required Evidence' : '必备证据'}: ${listOrDash(row.requiredLabels)}`,
          `  ${english ? 'Recommended Upload' : '推荐上传'}: ${row.recommendedLabel || '-'}`,
          `  ${english ? 'Timeline Discipline' : '时间轴要求'}: ${row.timelineHint || '-'}`,
          `  ${settlementLine(english, row.settlementLabel)}`,
          ...settlementDetailLines(english, row).map((item) => `  ${item}`),
          ...(row.settlementLines || []).map((item) => `  ${item}`),
          `  ${financialTraceLine(english, row.financialTraceLabel)}`,
          ...financialTraceDetailLines(english, row).map((item) => `  ${item}`),
          ...financialTraceReferenceLines(english, row).map((item) => `  ${item}`),
          ...(row.financialTraceLines || []).map((item) => `  ${item}`),
          `  ${financeCockpitLine(english, row.financeCockpitLabel)}`,
          ...(row.financeCockpitLines || []).map((item) => `  ${item.replace(/^- /, '')}`),
          ...(row.paymentLinkageLines || []).map((item) => `  ${item.replace(/^- /, '')}`),
          ...(row.quantImpactLines || []).map((item) => `  ${item.replace(/^- /, '')}`),
        ].join('\n'))
      : [`- ${english ? 'No module pressure rows exist.' : '当前没有模块压力记录。'}`]),
    '',
    `## ${english ? 'Rollback Drill' : '回退演练'}`,
    `- ${english ? 'Disable module or chain from Settings > Cutover before sending more pilot records into NEKO_ERP.' : '先从 设置 > 切换 关闭模块或链路，阻止更多试点单据进入 NEKO_ERP。'}`,
    `- ${english ? 'Export exceptions and preserve generated downstream references before returning users to Odoo.' : '导出异常清单并保留已生成的下游引用，再让用户回到 Odoo。'}`,
    `- ${english ? 'Open each module rehearsal desk to verify handbook, top-risk record, and rollback notes.' : '逐个打开模块演练台，核对手册、最高风险记录和回退备注。'}`,
  ].join('\n')
}
