import type { ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import { resolveReminderFamilyKey, type ReminderFamilyKey } from '@/utils/reminders'

export interface FinancialTraceItem {
  key: string
  label: string
  description: string
  familyKey: ReminderFamilyKey
  status: 'ready' | 'warning' | 'missing'
}

export interface FinancialTraceSummary {
  label: string
  statusLabel: string
  expectedCount: number
  readyCount: number
  warningCount: number
  missingCount: number
  expectedLabels: string[]
  warningLabels: string[]
  missingLabels: string[]
  items: FinancialTraceItem[]
  lines: string[]
}

interface FinancialTraceExpectation {
  key: string
  familyKey: ReminderFamilyKey
  label: string
  description: string
}

interface FamilyPressure {
  total: number
  critical: number
  warning: number
}

function createEmptyPressure(): Record<ReminderFamilyKey, FamilyPressure> {
  return {
    evidence: { total: 0, critical: 0, warning: 0 },
    context: { total: 0, critical: 0, warning: 0 },
    collections: { total: 0, critical: 0, warning: 0 },
    other: { total: 0, critical: 0, warning: 0 },
  }
}

function buildFamilyPressure(rows: Array<Pick<ReminderRecord, 'type' | 'severity'>>) {
  return rows.reduce((summary, item) => {
    const familyKey = resolveReminderFamilyKey(item)
    summary[familyKey].total += 1
    if (item.severity === 'critical') {
      summary[familyKey].critical += 1
    }
    if (item.severity === 'warning') {
      summary[familyKey].warning += 1
    }
    return summary
  }, createEmptyPressure())
}

function resolveExpectations(moduleKey: ModuleKey, isEnglish: boolean): FinancialTraceExpectation[] {
  if (moduleKey === 'saleOrder') {
    return [
      {
        key: 'customer-scope',
        familyKey: 'context',
        label: isEnglish ? 'Customer Scope' : '客户范围',
        description: isEnglish
          ? 'Partner, company, and sales context should stay visible before invoicing and payment handoff expand.'
          : '在开票和付款交接继续扩散前，伙伴、公司和销售上下文必须持续可见。',
      },
      {
        key: 'invoice-artifact',
        familyKey: 'other',
        label: isEnglish ? 'Invoice Artifact' : '发票结果对象',
        description: isEnglish
          ? 'Invoice generation should remain anchored to the same sales shell instead of drifting into manual finance search.'
          : '发票生成应继续留在同一销售壳层里，不应漂移到手工会计搜索。',
      },
      {
        key: 'payment-artifact',
        familyKey: 'collections',
        label: isEnglish ? 'Payment Artifact' : '付款结果对象',
        description: isEnglish
          ? 'Sales settlement should keep payment follow-up reachable from the order chain.'
          : '销售结算应让付款跟进始终可从订单链路继续到达。',
      },
    ]
  }
  if (moduleKey === 'purchaseOrder') {
    return [
      {
        key: 'vendor-scope',
        familyKey: 'context',
        label: isEnglish ? 'Vendor Scope' : '供应商范围',
        description: isEnglish
          ? 'Vendor, company, and procurement context should remain visible before billing and payout continue.'
          : '在账单和付款继续扩散前，供应商、公司和采购上下文必须持续可见。',
      },
      {
        key: 'bill-artifact',
        familyKey: 'other',
        label: isEnglish ? 'Bill Artifact' : '账单结果对象',
        description: isEnglish
          ? 'Vendor bill generation should stay connected to the procurement source.'
          : '供应商账单生成应持续挂在采购源头之下。',
      },
      {
        key: 'payment-artifact',
        familyKey: 'collections',
        label: isEnglish ? 'Payment Artifact' : '付款结果对象',
        description: isEnglish
          ? 'Vendor settlement should stay reachable from the bill and purchase chain.'
          : '供应商结算应始终能从账单和采购链路继续追到。',
      },
    ]
  }
  if (moduleKey === 'accountInvoice') {
    return [
      {
        key: 'upstream-origin',
        familyKey: 'context',
        label: isEnglish ? 'Upstream Origin' : '上游来源',
        description: isEnglish
          ? 'The billing desk should always explain which sale or purchase source created this invoice.'
          : '账单工作台必须始终解释清楚这张发票来自哪条销售或采购来源。',
      },
      {
        key: 'payment-linkage',
        familyKey: 'collections',
        label: isEnglish ? 'Payment Linkage' : '付款链接',
        description: isEnglish
          ? 'Payment registration and follow-up should continue from the posted invoice instead of detached accounting navigation.'
          : '付款登记和跟进应从已过账发票继续，而不是依赖分散的会计导航。',
      },
      {
        key: 'billing-evidence',
        familyKey: 'evidence',
        label: isEnglish ? 'Billing Evidence' : '开票证据',
        description: isEnglish
          ? 'Invoice PDF, posting explanation, and settlement notes should stay reviewable from the same surface.'
          : '发票 PDF、过账说明和结算备注应始终可在同一界面核对。',
      },
    ]
  }
  if (moduleKey === 'accountPayment') {
    return [
      {
        key: 'source-anchor',
        familyKey: 'context',
        label: isEnglish ? 'Source Anchor' : '来源锚点',
        description: isEnglish
          ? 'Payment posting should remain anchored to the source invoice or business origin.'
          : '付款过账必须持续锚定到来源发票或上游业务对象。',
      },
      {
        key: 'journal-trace',
        familyKey: 'other',
        label: isEnglish ? 'Journal Trace' : '凭证追溯',
        description: isEnglish
          ? 'The generated journal entry should reopen directly from the payment shell for finance review.'
          : '生成凭证应能直接从付款壳层重开，供财务复核。',
      },
      {
        key: 'payment-proof',
        familyKey: 'evidence',
        label: isEnglish ? 'Payment Proof' : '付款证据',
        description: isEnglish
          ? 'Bank proof, remittance evidence, and settlement notes should stay attached before the pilot widens.'
          : '在试点扩大前，银行回单、汇款凭证和结算备注都应挂接完成。',
      },
    ]
  }
  if (moduleKey === 'accountMove') {
    return [
      {
        key: 'source-explanation',
        familyKey: 'context',
        label: isEnglish ? 'Source Explanation' : '来源解释',
        description: isEnglish
          ? 'The journal entry should explain which upstream invoice, payment, or business event produced it.'
          : '会计凭证必须解释清楚它由哪张发票、哪笔付款或哪条业务事件生成。',
      },
      {
        key: 'reconcile-context',
        familyKey: 'collections',
        label: isEnglish ? 'Reconcile Context' : '对账上下文',
        description: isEnglish
          ? 'Operators should see whether matching, settlement, and open-item handling are still pending.'
          : '操作员应持续看到匹配、结算和未清项处理是否仍待推进。',
      },
      {
        key: 'journal-item-review',
        familyKey: 'other',
        label: isEnglish ? 'Journal Item Review' : '分录审查',
        description: isEnglish
          ? 'Journal items and downstream reversal impact should stay visible from the same entry desk.'
          : '分录行和下游冲销影响都应在同一凭证工作台里保持可见。',
      },
    ]
  }
  if (moduleKey === 'stockPicking') {
    return [
      {
        key: 'business-origin',
        familyKey: 'context',
        label: isEnglish ? 'Business Origin' : '业务来源',
        description: isEnglish
          ? 'Warehouse execution should always reopen the originating sales or procurement document.'
          : '仓储执行必须始终能重开来源销售单或采购单。',
      },
      {
        key: 'move-pack',
        familyKey: 'other',
        label: isEnglish ? 'Move Pack' : '移动行包',
        description: isEnglish
          ? 'Move rows and transfer side effects should remain visible in one execution shell.'
          : '移动行和调拨副作用应继续留在同一执行壳层中。',
      },
      {
        key: 'billing-handoff',
        familyKey: 'collections',
        label: isEnglish ? 'Billing Handoff' : '账单交接',
        description: isEnglish
          ? 'Transfer completion should remain traceable into downstream billing and settlement review.'
          : '调拨完成后应继续可追到下游账单与结算审查。',
      },
    ]
  }
  if (moduleKey === 'resPartner') {
    return [
      {
        key: 'relationship-context',
        familyKey: 'context',
        label: isEnglish ? 'Relationship Context' : '关系上下文',
        description: isEnglish
          ? 'Partner history, decision notes, and recent interactions should stay visible to the next operator.'
          : '伙伴历史、决策备注和最近互动应持续可见给下一位操作员。',
      },
      {
        key: 'contract-evidence',
        familyKey: 'evidence',
        label: isEnglish ? 'Contract Evidence' : '合同证据',
        description: isEnglish
          ? 'Contracts, invoices, and support files should remain attached before business handoff widens.'
          : '在业务交接扩大前，合同、发票和支撑文件都应挂接完成。',
      },
      {
        key: 'collection-signal',
        familyKey: 'collections',
        label: isEnglish ? 'Collection Signal' : '结算信号',
        description: isEnglish
          ? 'Open billing and payment follow-up should remain visible from the partner cockpit.'
          : '未完成账单和付款跟进应持续从伙伴驾驶舱中可见。',
      },
    ]
  }
  return []
}

function resolveItemStatus(pressure: FamilyPressure): FinancialTraceItem['status'] {
  if (pressure.critical > 0) return 'missing'
  if (pressure.total > 0) return 'warning'
  return 'ready'
}

export function buildModuleFinancialTraceSummary(input: {
  moduleKey: ModuleKey
  isEnglish: boolean
  reminders?: Array<Pick<ReminderRecord, 'type' | 'severity'>>
}): FinancialTraceSummary {
  const expectations = resolveExpectations(input.moduleKey, input.isEnglish)
  if (!expectations.length) {
    return {
      label: input.isEnglish ? 'Financial Trace' : '财务追溯',
      statusLabel: input.isEnglish ? 'Not Applicable' : '不适用',
      expectedCount: 0,
      readyCount: 0,
      warningCount: 0,
      missingCount: 0,
      expectedLabels: [],
      warningLabels: [],
      missingLabels: [],
      items: [],
      lines: [input.isEnglish ? 'No financial trace checklist applies to this module.' : '当前模块没有适用的财务追溯检查。'],
    }
  }

  const familyPressure = buildFamilyPressure(input.reminders || [])
  const items = expectations.map<FinancialTraceItem>((item) => {
    const pressure = familyPressure[item.familyKey]
    return {
      ...item,
      status: resolveItemStatus(pressure),
    }
  })
  const missingLabels = items.filter((item) => item.status === 'missing').map((item) => item.label)
  const warningLabels = items.filter((item) => item.status === 'warning').map((item) => item.label)
  const readyCount = items.filter((item) => item.status === 'ready').length
  const statusLabel = missingLabels.length
    ? (input.isEnglish ? 'Trace Blocked' : '追溯阻塞')
    : warningLabels.length
      ? (input.isEnglish ? 'Trace In Progress' : '追溯推进中')
      : (input.isEnglish ? 'Trace Ready' : '追溯就绪')

  return {
    label: input.isEnglish ? 'Financial Trace' : '财务追溯',
    statusLabel,
    expectedCount: items.length,
    readyCount,
    warningCount: warningLabels.length,
    missingCount: missingLabels.length,
    expectedLabels: items.map((item) => item.label),
    warningLabels,
    missingLabels,
    items,
    lines: [
      `${input.isEnglish ? 'Status' : '状态'}: ${statusLabel}`,
      ...items.map((item) => `${item.label}: ${item.status === 'ready'
        ? (input.isEnglish ? 'Ready' : '已就绪')
        : item.status === 'warning'
          ? (input.isEnglish ? 'Pending' : '待推进')
          : (input.isEnglish ? 'Blocked' : '阻塞')} · ${item.description}`),
    ],
  }
}

export function buildChainFinancialTraceSummary(input: {
  moduleKeys: ModuleKey[]
  isEnglish: boolean
  reminders?: Array<Pick<ReminderRecord, 'moduleKey' | 'type' | 'severity'>>
}): FinancialTraceSummary {
  const moduleSummaries = [...new Set(input.moduleKeys)]
    .map((moduleKey) =>
      buildModuleFinancialTraceSummary({
        moduleKey,
        isEnglish: input.isEnglish,
        reminders: (input.reminders || [])
          .filter((item) => item.moduleKey === moduleKey)
          .map((item) => ({
            type: item.type,
            severity: item.severity,
          })),
      }),
    )
    .filter((item) => item.expectedCount > 0)

  if (!moduleSummaries.length) {
    return {
      label: input.isEnglish ? 'Financial Trace' : '财务追溯',
      statusLabel: input.isEnglish ? 'Not Applicable' : '不适用',
      expectedCount: 0,
      readyCount: 0,
      warningCount: 0,
      missingCount: 0,
      expectedLabels: [],
      warningLabels: [],
      missingLabels: [],
      items: [],
      lines: [input.isEnglish ? 'No financial trace checklist applies to this chain.' : '当前链路没有适用的财务追溯检查。'],
    }
  }

  const items = moduleSummaries.flatMap((item) => item.items)
  const missingLabels = items.filter((item) => item.status === 'missing').map((item) => item.label)
  const warningLabels = items.filter((item) => item.status === 'warning').map((item) => item.label)
  const readyCount = items.filter((item) => item.status === 'ready').length
  const statusLabel = missingLabels.length
    ? (input.isEnglish ? 'Trace Blocked' : '追溯阻塞')
    : warningLabels.length
      ? (input.isEnglish ? 'Trace In Progress' : '追溯推进中')
      : (input.isEnglish ? 'Trace Ready' : '追溯就绪')

  return {
    label: input.isEnglish ? 'Financial Trace' : '财务追溯',
    statusLabel,
    expectedCount: items.length,
    readyCount,
    warningCount: warningLabels.length,
    missingCount: missingLabels.length,
    expectedLabels: items.map((item) => item.label),
    warningLabels,
    missingLabels,
    items,
    lines: [
      `${input.isEnglish ? 'Status' : '状态'}: ${statusLabel}`,
      ...moduleSummaries.map((item) => `${item.label}: ${item.statusLabel}`),
    ],
  }
}
