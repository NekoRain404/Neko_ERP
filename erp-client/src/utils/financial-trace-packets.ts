import type { FinancialTraceDetail, FinancialTraceLink } from '@/api/financial-trace'
import type { ModuleKey } from '@/config/module-manifest'

const BACKEND_TRACE_MODULES: ModuleKey[] = ['accountInvoice', 'accountPayment', 'accountMove']

export interface FinancialTraceBundleEntry {
  moduleKey: ModuleKey
  detail: FinancialTraceDetail
  packetTitle?: string
}

export function supportsFinancialTraceDetailModule(moduleKey: string): moduleKey is ModuleKey {
  return BACKEND_TRACE_MODULES.includes(moduleKey as ModuleKey)
}

function translateRecordStatus(status?: string | null, english = false) {
  if (status === 'ready') return english ? 'Ready' : '已就绪'
  if (status === 'warning') return english ? 'Pending' : '待推进'
  if (status === 'missing') return english ? 'Blocked' : '阻塞'
  return status || '-'
}

function translateTraceRiskKey(key: string, english: boolean) {
  const dictionary = english
    ? {
        'origin-ref': 'Origin Anchor',
        'payment-linkage': 'Payment Linkage',
        'payment-state-open': 'Settlement Open',
        'billing-evidence': 'Billing Evidence',
        'invoice-ref': 'Invoice Anchor',
        'source-anchor': 'Source Anchor',
        'journal-entry': 'Journal Entry',
        'payment-proof': 'Payment Proof',
        'posting-pending': 'Posting Pending',
        'source-explanation': 'Source Explanation',
        'journal-lines': 'Journal Lines',
        'reconcile-open-items': 'Open Items',
        'reconcile-context': 'Reconcile Context',
        'journal-evidence': 'Journal Evidence',
        'journal-trace': 'Journal Trace',
        'journal-item-review': 'Journal Item Review',
        'invoice-origin': 'Invoice Origin',
        'invoice-payment': 'Invoice Payment',
        'invoice-evidence': 'Invoice Evidence',
        'journal-reversal': 'Reversal Trace',
      }
    : {
        'origin-ref': '来源锚点',
        'payment-linkage': '付款链接',
        'payment-state-open': '结算未闭环',
        'billing-evidence': '开票证据',
        'invoice-ref': '发票锚点',
        'source-anchor': '来源锚点',
        'journal-entry': '凭证引用',
        'payment-proof': '付款证据',
        'posting-pending': '过账待完成',
        'source-explanation': '来源解释',
        'journal-lines': '凭证分录',
        'reconcile-open-items': '未清项',
        'reconcile-context': '对账上下文',
        'journal-evidence': '凭证证据',
        'journal-trace': '凭证追溯',
        'journal-item-review': '分录审查',
        'invoice-origin': '发票来源',
        'invoice-payment': '发票付款',
        'invoice-evidence': '发票证据',
        'journal-reversal': '冲销追溯',
      }
  return dictionary[key as keyof typeof dictionary] || key
}

function resolveLinkModuleTitle(
  link: FinancialTraceLink,
  moduleTitle: (moduleKey: ModuleKey) => string,
) {
  return supportsFinancialTraceDetailModule(String(link.moduleKey))
    ? moduleTitle(link.moduleKey as ModuleKey)
    : link.label
}

export function buildFinancialTraceDetailPacket(input: {
  english: boolean
  generatedAt: string
  detail: FinancialTraceDetail
  moduleTitle: (moduleKey: ModuleKey) => string
  title?: string
}) {
  const { english, detail, generatedAt, moduleTitle } = input
  const record = detail.record
  const moduleLabel = supportsFinancialTraceDetailModule(String(detail.moduleKey))
    ? moduleTitle(detail.moduleKey as ModuleKey)
    : String(detail.moduleKey)
  const statusLabel = record.status === 'ready'
    ? (english ? 'Ready' : '已就绪')
    : record.status === 'warning'
      ? (english ? 'Pending' : '待推进')
      : (english ? 'Blocked' : '阻塞')
  const riskLines = [
    ...(record.missingKeys || []).map((key) => `${english ? 'Blocked' : '阻塞'}: ${translateTraceRiskKey(key, english)}`),
    ...(record.warningKeys || []).map((key) => `${english ? 'Pending' : '待推进'}: ${translateTraceRiskKey(key, english)}`),
  ]

  return [
    `# ${input.title || `${moduleLabel} ${english ? 'Financial Trace Packet' : '财务追溯包'}`}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${generatedAt}`,
    `${english ? 'Module' : '模块'}: ${moduleLabel}`,
    `${english ? 'Record' : '记录'}: ${record.ref || `#${record.id}`}`,
    `${english ? 'Record ID' : '记录ID'}: ${record.id}`,
    `${english ? 'Status' : '状态'}: ${statusLabel}`,
    `${english ? 'Business State' : '业务状态'}: ${record.state || '-'}`,
    `${english ? 'Amount' : '金额'}: ${record.amount ?? '-'}`,
    `${english ? 'Evidence Snapshot' : '证据快照'}: ${record.attachmentCount || 0}${english ? ' files' : ' 个附件'} / ${record.noteCount || 0}${english ? ' notes' : ' 条备注'} / ${record.logCount || 0}${english ? ' logs' : ' 条日志'}`,
    '',
    `## ${english ? 'Chain Explanation' : '链路解释'}`,
    ...(detail.explanationLines.length
      ? detail.explanationLines.map((line) => `- ${line}`)
      : [`- ${english ? 'No explanation is attached yet.' : '当前还没有附带链路解释。'}`]),
    '',
    `## ${english ? 'Settlement Path' : '结算路径'}`,
    ...(detail.settlementLines.length
      ? detail.settlementLines.map((line) => `- ${line}`)
      : [`- ${english ? 'No settlement path is attached yet.' : '当前还没有附带结算路径。'}`]),
    '',
    `## ${english ? 'Related Objects' : '关联对象'}`,
    ...(detail.relatedLinks.length
      ? detail.relatedLinks.map((link) =>
          `- ${resolveLinkModuleTitle(link, moduleTitle)} · ${link.label} · ${link.ref || `#${link.recordId}`}`,
        )
      : [`- ${english ? 'No linked objects are attached yet.' : '当前还没有附带关联对象。'}`]),
    '',
    `## ${english ? 'Risk Keys' : '风险键'}`,
    ...(riskLines.length ? riskLines.map((line) => `- ${line}`) : [`- ${english ? 'No open trace risk key.' : '当前没有开放中的追溯风险键。'}`]),
    '',
    `## ${english ? 'Rollback Checklist' : '回退核对清单'}`,
    `1. ${english ? 'Freeze new pilot entries for this record scope before rollback or handoff.' : '在回退或交接前，先冻结这条记录所在范围的新试点录入。'}`,
    `2. ${english ? 'Preserve current explanation, settlement path, and related object references.' : '保留当前的链路解释、结算路径和关联对象引用。'}`,
    `3. ${english ? 'Export the packet together with exception rows and operator sign-off notes.' : '把此追溯包与异常清单、操作员签收备注一起导出。'}`,
    `4. ${english ? 'Return execution to the fallback owner only after evidence and linked objects are rechecked.' : '只有在证据和关联对象重新核对后，才把执行切回回退负责人。'}`,
  ].join('\n')
}

export function buildFinancialTraceRecordRefLabel(input: {
  english: boolean
  moduleLabel: string
  recordId: number
  recordRef?: string | null
  status?: string | null
}) {
  const statusLabel = translateRecordStatus(input.status, input.english)
  return `${input.moduleLabel} · ${input.recordRef || `#${input.recordId}`} · ${statusLabel}`
}

export function buildFinancialTracePacketFilename(input: {
  moduleKey: string
  recordId: number
  date: string
}) {
  return `neko_erp_${input.moduleKey}_trace_record_${input.recordId}_${input.date}.md`
}

export function buildFinancialTracePacketRefLabel(input: {
  english: boolean
  moduleKey: ModuleKey
  moduleLabel: string
  recordId: number
  recordRef?: string | null
  date: string
}) {
  return `${input.moduleLabel} · ${input.recordRef || `#${input.recordId}`} -> ${buildFinancialTracePacketFilename({
    moduleKey: input.moduleKey,
    recordId: input.recordId,
    date: input.date,
  })}`
}

export function buildFinancialTraceBundleFilename(input: {
  scope: string
  date: string
}) {
  return `neko_erp_${input.scope}_trace_bundle_${input.date}.md`
}

export function buildFinancialTraceBundlePacket(input: {
  english: boolean
  generatedAt: string
  title: string
  moduleTitle: (moduleKey: ModuleKey) => string
  entries: FinancialTraceBundleEntry[]
  failedRefs?: string[]
}) {
  const summaryLines = input.entries.map((entry) =>
    `- ${buildFinancialTraceRecordRefLabel({
      english: input.english,
      moduleLabel: input.moduleTitle(entry.moduleKey),
      recordId: entry.detail.record.id,
      recordRef: entry.detail.record.ref,
      status: entry.detail.record.status,
    })}`,
  )
  const failureLines = input.failedRefs?.length
    ? input.failedRefs.map((line) => `- ${line}`)
    : []

  return [
    `# ${input.title}`,
    '',
    `${input.english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${input.english ? 'Trace Packets' : '追溯包数量'}: ${input.entries.length}`,
    '',
    `## ${input.english ? 'Included Records' : '包含记录'}`,
    ...(summaryLines.length
      ? summaryLines
      : [`- ${input.english ? 'No backend trace detail is available.' : '当前没有可用的后端追溯详情。'}`]),
    ...(failureLines.length
      ? [
          '',
          `## ${input.english ? 'Unavailable Records' : '暂不可用记录'}`,
          ...failureLines,
        ]
      : []),
    '',
    ...input.entries.flatMap((entry, index) => [
      buildFinancialTraceDetailPacket({
        english: input.english,
        generatedAt: input.generatedAt,
        detail: entry.detail,
        moduleTitle: input.moduleTitle,
        title: entry.packetTitle || (input.english ? `Trace Packet ${index + 1}` : `追溯包 ${index + 1}`),
      }),
      '',
      '---',
      '',
    ]),
  ].join('\n').replace(/\n---\n\s*$/, '\n')
}
