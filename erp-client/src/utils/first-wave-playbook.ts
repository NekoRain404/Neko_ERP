import type { ModuleKey } from '@/config/module-manifest'
import type { ChainAcceptanceState, PilotChainKey } from '@/stores/cutover'

export interface FirstWavePlaybookStage {
  key: string
  label: string
  value: string
  description: string
  tone: 'default' | 'success' | 'warning' | 'danger'
}

export interface FirstWavePlaybookGate {
  key: string
  title: string
  description: string
}

export interface FirstWavePlaybook {
  title: string
  description: string
  stages: FirstWavePlaybookStage[]
  gates: FirstWavePlaybookGate[]
}

export interface FirstWaveModuleStageCard {
  key: string
  label: string
  value: string
  description: string
  tone: 'default' | 'success' | 'warning' | 'danger'
}

export interface FirstWaveGateChecklistItem {
  key: keyof ChainAcceptanceState
  label: string
  ready: boolean
}

export interface FirstWaveGateSummary {
  readyCount: number
  totalCount: number
  label: string
  tone: 'default' | 'success' | 'warning' | 'danger'
  pendingLabels: string[]
  readyLabels: string[]
}

const FIRST_WAVE_MODULE_CHAINS: Partial<Record<ModuleKey, PilotChainKey[]>> = {
  resPartner: ['masterData'],
  resCompany: ['masterData'],
  productTemplate: ['masterData'],
  productProduct: ['masterData'],
  productCategory: ['masterData'],
  productPricelist: ['masterData'],
  saleOrder: ['sales'],
  stockPicking: ['sales'],
  purchaseOrder: ['purchase'],
  accountPayment: ['purchase'],
  accountInvoice: ['sales', 'purchase'],
}

const GATE_FIELD_ORDER: Array<keyof ChainAcceptanceState> = [
  'smokeReady',
  'workbenchReady',
  'rollbackReady',
  'traceabilityReady',
  'manualReady',
  'pilotConfirmed',
]

function resolveGateLabel(key: keyof ChainAcceptanceState, isEnglish: boolean) {
  if (key === 'smokeReady') return isEnglish ? 'Smoke Green' : 'Smoke 通过'
  if (key === 'workbenchReady') return isEnglish ? 'Workbench Ready' : '工作台就绪'
  if (key === 'rollbackReady') return isEnglish ? 'Rollback Ready' : '回退就绪'
  if (key === 'traceabilityReady') return isEnglish ? 'Traceability Ready' : '追溯就绪'
  if (key === 'manualReady') return isEnglish ? 'Manual Ready' : '手册就绪'
  if (key === 'pilotConfirmed') return isEnglish ? 'Pilot Confirmed' : '试点确认'
  return String(key)
}

export function resolveFirstWaveChains(moduleKey: ModuleKey) {
  return FIRST_WAVE_MODULE_CHAINS[moduleKey] ?? []
}

export function resolveFirstWaveChainLabel(chainKey: PilotChainKey, isEnglish: boolean) {
  if (chainKey === 'sales') return isEnglish ? 'Sales Chain Pilot' : '销售链试点'
  if (chainKey === 'purchase') return isEnglish ? 'Purchase Chain Pilot' : '采购链试点'
  return isEnglish ? 'Master Data Pilot' : '主数据试点'
}

export function buildFirstWaveModuleStageCards(moduleKey: ModuleKey, isEnglish: boolean): FirstWaveModuleStageCard[] {
  const playbook = buildFirstWavePlaybook(moduleKey, isEnglish)
  if (!playbook) return []
  const chainLabels = resolveFirstWaveChains(moduleKey).map((chainKey) => resolveFirstWaveChainLabel(chainKey, isEnglish))
  const handoffStage = playbook.stages.at(-1)
  return [
    {
      key: 'chains',
      label: isEnglish ? 'Pilot Chains' : '试点链路',
      value: chainLabels.join(' / ') || (isEnglish ? 'Support Module' : '支撑模块'),
      description: isEnglish ? 'This module inherits cutover pressure from these first-wave pilot chains.' : '当前模块从这些首批试点链路继承切换压力。',
      tone: chainLabels.length > 1 ? 'warning' : 'success',
    },
    {
      key: 'stages',
      label: isEnglish ? 'Rigid Stages' : '刚性阶段',
      value: String(playbook.stages.length),
      description: isEnglish ? 'The same stage map now drives workbench guidance and detail-page execution hints.' : '同一套阶段图现在同时驱动工作台指引和详情执行提示。',
      tone: playbook.stages.length >= 4 ? 'success' : 'warning',
    },
    {
      key: 'handoff',
      label: isEnglish ? 'Handoff Focus' : '交接重点',
      value: handoffStage?.label || '-',
      description: isEnglish ? 'This is the downstream stage operators should keep visible before widening the pilot.' : '这是扩大试点前必须持续保持可见的下游阶段。',
      tone: handoffStage ? 'warning' : 'default',
    },
    {
      key: 'gate-notes',
      label: isEnglish ? 'Gate Notes' : '门禁说明',
      value: String(playbook.gates.length),
      description: isEnglish ? 'Every gate note should remain exportable through handbook and rollback packets.' : '所有门禁说明都应可通过手册和回退包导出。',
      tone: playbook.gates.length >= 3 ? 'success' : 'default',
    },
  ]
}

export function buildFirstWaveGateChecklist(state: ChainAcceptanceState, isEnglish: boolean): FirstWaveGateChecklistItem[] {
  return GATE_FIELD_ORDER.map((key) => ({
    key,
    label: resolveGateLabel(key, isEnglish),
    ready: Boolean(state[key]),
  }))
}

export function summarizeFirstWaveGateState(state: ChainAcceptanceState, isEnglish: boolean): FirstWaveGateSummary {
  const checklist = buildFirstWaveGateChecklist(state, isEnglish)
  const readyItems = checklist.filter((item) => item.ready)
  const pendingItems = checklist.filter((item) => !item.ready)
  return {
    readyCount: readyItems.length,
    totalCount: checklist.length,
    label: pendingItems.length === 0
      ? (isEnglish ? 'Accepted' : '已放行')
      : readyItems.length === 0
        ? (isEnglish ? 'Blocked' : '阻塞')
        : (isEnglish ? 'Needs Review' : '待核对'),
    tone: pendingItems.length === 0 ? 'success' : readyItems.length === 0 ? 'danger' : 'warning',
    pendingLabels: pendingItems.map((item) => item.label),
    readyLabels: readyItems.map((item) => item.label),
  }
}

export function buildFirstWavePlaybook(moduleKey: ModuleKey, isEnglish: boolean): FirstWavePlaybook | null {
  if (moduleKey === 'resPartner') {
    return {
      title: isEnglish ? 'Master Data Flow' : '主数据流',
      description: isEnglish
        ? 'Keep partner maintenance on one stable path before the sales and purchase pilots widen.'
        : '在销售链和采购链放量前，先把伙伴维护收敛到一条稳定路径。',
      stages: isEnglish
        ? [
            { key: 'identity', label: 'Shared Identity', value: 'Customer / Vendor / Company', description: 'Use one shared partner identity instead of splitting master data by downstream chain.', tone: 'success' },
            { key: 'contact', label: 'Contact Ready', value: 'Email / Phone / Website', description: 'At least one reliable contact path should be visible before downstream documents reference the partner.', tone: 'warning' },
            { key: 'timeline', label: 'Relationship Context', value: 'Notes / Attachments / Timeline', description: 'Background context should live with the partner instead of being hidden in separate side tools.', tone: 'success' },
            { key: 'handoff', label: 'Downstream Reuse', value: 'Sales / Purchase', description: 'Only stable partner masters should be reused by order and billing pilots.', tone: 'warning' },
          ]
        : [
            { key: 'identity', label: '共享身份', value: '客户 / 供应商 / 公司', description: '同一条伙伴主档同时承担客户、供应商和公司身份，不再按下游链路拆开。', tone: 'success' },
            { key: 'contact', label: '联系就绪', value: '邮箱 / 电话 / 网站', description: '在下游单据引用前，至少保留一条可靠联系方式。', tone: 'warning' },
            { key: 'timeline', label: '关系上下文', value: '便签 / 附件 / 时间轴', description: '背景知识要沉淀在伙伴档案里，而不是散落到侧面工具。', tone: 'success' },
            { key: 'handoff', label: '下游复用', value: '销售 / 采购', description: '只有稳定的伙伴主档才进入订单和账单试点复用。', tone: 'warning' },
          ],
      gates: isEnglish
        ? [
            { key: 'owner', title: 'Assign ownership before trial users widen usage', description: 'Keep owner and active-state review explicit so the same record is not edited through conflicting paths.' },
            { key: 'evidence', title: 'Attach notes and evidence at the master-data entry', description: 'Relationship notes, contracts, and supporting files should stay with the partner as Monica-style context memory.' },
            { key: 'fallback', title: 'Keep the cutover rollback visible', description: 'If master-data drift appears, disable the pilot and export affected partner records first.' },
          ]
        : [
            { key: 'owner', title: '先明确归属，再扩大试点使用', description: '让负责人和启用状态保持显式，避免同一条记录被不同路径冲突修改。' },
            { key: 'evidence', title: '在主数据入口沉淀便签和证据', description: '关系便签、合同和支撑文件要像 Monica 一样跟着伙伴一起记忆。' },
            { key: 'fallback', title: '持续保留切换回退入口', description: '一旦主数据出现漂移，先关闭试点，再导出受影响伙伴清单。' },
          ],
    }
  }

  if (moduleKey === 'saleOrder') {
    return {
      title: isEnglish ? 'Sales Chain Flow' : '销售链流程',
      description: isEnglish
        ? 'Keep the first-wave sales pilot on a rigid path from draft demand to delivery and billing.'
        : '把首批销售试点固定在从草稿需求到出库和开票的刚性路径上。',
      stages: isEnglish
        ? [
            { key: 'draft', label: 'Draft Quote', value: 'Customer / Owner / Lines', description: 'Prepare header and lines before confirmation so downstream artifacts remain stable.', tone: 'success' },
            { key: 'confirm', label: 'Sale Confirmed', value: 'action_confirm', description: 'Confirmation is the mainline gate that turns demand into execution artifacts.', tone: 'warning' },
            { key: 'delivery', label: 'Delivery Ready', value: 'Picking / Moves', description: 'Review the generated transfer before drifting into billing work.', tone: 'warning' },
            { key: 'invoice', label: 'Invoice Ready', value: 'Create Invoice', description: 'Stay in the same sales shell while creating and reopening invoice artifacts.', tone: 'success' },
            { key: 'settlement', label: 'Payment Reachable', value: 'Invoice -> Payment', description: 'Invoice linkage should become the handoff point into the payment path.', tone: 'default' },
          ]
        : [
            { key: 'draft', label: '草稿报价', value: '客户 / 负责人 / 订单行', description: '确认前先把头部和订单行补稳，减少下游结果对象抖动。', tone: 'success' },
            { key: 'confirm', label: '销售已确认', value: 'action_confirm', description: '确认是把需求转成执行对象的主门禁。', tone: 'warning' },
            { key: 'delivery', label: '出库就绪', value: '调拨 / 移动', description: '进入开票前先审查生成的调拨和 move。', tone: 'warning' },
            { key: 'invoice', label: '开票就绪', value: 'Create Invoice', description: '在同一销售壳层里继续创建和重开发票对象。', tone: 'success' },
            { key: 'settlement', label: '付款可达', value: '发票 -> 付款', description: '发票链接应成为进入付款链的交接点。', tone: 'default' },
          ],
      gates: isEnglish
        ? [
            { key: 'artifact', title: 'Review transfer artifacts before billing', description: 'Stock movement side effects should be checked before billing proceeds further.' },
            { key: 'idempotent', title: 'Keep confirm and invoice actions idempotent', description: 'The pilot chain should never leave stale transfers, invoices, or totals after repeated actions.' },
            { key: 'rollback', title: 'Export order, picking, and invoice refs for rollback', description: 'Rollback always starts by capturing the full downstream reference pack.' },
          ]
        : [
            { key: 'artifact', title: '开票前先审调拨结果对象', description: '在账单继续推进前，先检查库存移动副作用。' },
            { key: 'idempotent', title: '确认和开票必须保持幂等', description: '试点链不能因为重复动作残留陈旧调拨、发票或金额。' },
            { key: 'rollback', title: '回退前先导出订单、调拨、发票引用', description: '任何回退都从完整的下游引用包开始。' },
          ],
    }
  }

  if (moduleKey === 'purchaseOrder') {
    return {
      title: isEnglish ? 'Procurement Chain Flow' : '采购链流程',
      description: isEnglish
        ? 'Treat purchase orders as the rigid upstream gate for receipt, billing, and vendor payment.'
        : '把采购订单作为收货、账单和供应商付款的刚性上游门禁。',
      stages: isEnglish
        ? [
            { key: 'rfq', label: 'RFQ Draft', value: 'Vendor / Buyer / Lines', description: 'Stabilize supplier and purchase lines before confirmation.', tone: 'success' },
            { key: 'confirm', label: 'Purchase Confirmed', value: 'action_confirm', description: 'Confirmation activates the receipt chain.', tone: 'warning' },
            { key: 'receipt', label: 'Receipt Ready', value: 'Picking / Moves', description: 'Inspect receipt objects and quantities before billing begins.', tone: 'warning' },
            { key: 'bill', label: 'Bill Ready', value: 'Create Bill', description: 'Create and reopen the bill from the same procurement shell.', tone: 'success' },
            { key: 'payment', label: 'Payment Reachable', value: 'Bill -> Payment', description: 'Vendor settlement continues from bill linkage instead of from detached finance entry.', tone: 'default' },
          ]
        : [
            { key: 'rfq', label: '询价草稿', value: '供应商 / 采购员 / 采购行', description: '确认前先稳定供应商和采购行。', tone: 'success' },
            { key: 'confirm', label: '采购已确认', value: 'action_confirm', description: '确认后才正式启动收货链。', tone: 'warning' },
            { key: 'receipt', label: '收货就绪', value: '调拨 / move', description: '进入账单前先检查收货对象和数量。', tone: 'warning' },
            { key: 'bill', label: '账单就绪', value: 'Create Bill', description: '在同一采购壳层里继续创建和重开账单。', tone: 'success' },
            { key: 'payment', label: '付款可达', value: '账单 -> 付款', description: '供应商付款应从账单引用继续，而不是孤立财务录入。', tone: 'default' },
          ],
      gates: isEnglish
        ? [
            { key: 'receipt-review', title: 'Inspect receipt results before bill creation', description: 'Physical receipt checks should complete before bill totals are treated as trustworthy.' },
            { key: 'payment-trace', title: 'Keep bill and payment links on the same path', description: 'The procurement pilot should never force users to rebuild context in accounting search.' },
            { key: 'fallback', title: 'Rollback with order, receipt, and bill references together', description: 'Fallback review is faster when every downstream reference is exported as one packet.' },
          ]
        : [
            { key: 'receipt-review', title: '建账单前先检查收货结果', description: '只有实物收货核对完成后，账单金额才值得信任。' },
            { key: 'payment-trace', title: '让账单和付款链接留在同一路径', description: '采购试点不应逼迫用户去会计搜索里重建上下文。' },
            { key: 'fallback', title: '回退时把订单、收货、账单引用一起导出', description: '把所有下游引用打成一个包，回退审查会快很多。' },
          ],
    }
  }

  if (moduleKey === 'accountInvoice') {
    return {
      title: isEnglish ? 'Billing Flow' : '账单流程',
      description: isEnglish
        ? 'Keep invoices on a rigid billing path that stays close to Odoo semantics and first-wave settlement traceability.'
        : '让发票保持接近 Odoo 语义的刚性账单路径，并收紧首批结算追溯。',
      stages: isEnglish
        ? [
            { key: 'draft', label: 'Draft Invoice', value: 'Amount / Due Date / Partner', description: 'Invoice basics should be settled before posting.', tone: 'success' },
            { key: 'posted', label: 'Posted', value: 'Post', description: 'Posting is the accounting gate that turns a draft into a settlement candidate.', tone: 'warning' },
            { key: 'payment-artifact', label: 'Payment Artifact', value: 'Register Payment', description: 'Payment registration should start from the posted invoice itself.', tone: 'warning' },
            { key: 'settlement', label: 'Settlement', value: 'paymentState', description: 'Settlement semantics should remain visible through payment linkage and status.', tone: 'success' },
          ]
        : [
            { key: 'draft', label: '发票草稿', value: '金额 / 到期日 / 伙伴', description: '过账前先把发票基础信息补稳。', tone: 'success' },
            { key: 'posted', label: '已过账', value: 'Post', description: '过账是把草稿转成可结算对象的会计门禁。', tone: 'warning' },
            { key: 'payment-artifact', label: '付款结果对象', value: 'Register Payment', description: '付款登记应从已过账发票本身继续。', tone: 'warning' },
            { key: 'settlement', label: '结算', value: 'paymentState', description: '结算语义要通过付款链接和支付状态持续可见。', tone: 'success' },
          ],
      gates: isEnglish
        ? [
            { key: 'origin', title: 'Recheck upstream origin before posting', description: 'Sales and purchase references should stay visible so invoice amounts are explainable.' },
            { key: 'payment', title: 'Use payment linkage instead of manual finance search', description: 'Settlement should continue from invoice references, not from detached accounting navigation.' },
            { key: 'rollback', title: 'Keep billing fallback tied to pilot switches', description: 'Billing rollback must stay coordinated with the sales and purchase cutover controls.' },
          ]
        : [
            { key: 'origin', title: '过账前回看上游来源', description: '让销售和采购来源始终可见，发票金额才更容易解释。' },
            { key: 'payment', title: '优先走付款链接，不走手工会计搜索', description: '结算应沿发票引用继续，而不是依赖分散的会计导航。' },
            { key: 'rollback', title: '账单回退要绑定试点开关', description: '账单兜底必须和销售、采购切换控制一起工作。' },
          ],
    }
  }

  if (moduleKey === 'stockPicking') {
    return {
      title: isEnglish ? 'Execution Flow' : '执行流程',
      description: isEnglish
        ? 'Make transfer execution explicit from routing review to validation and rollback.'
        : '把调拨执行从路由审查到校验和回退做成显式流程。',
      stages: isEnglish
        ? [
            { key: 'draft', label: 'Draft Transfer', value: 'Routing / Schedule', description: 'Review source, destination, and schedule before execution starts.', tone: 'success' },
            { key: 'confirmed', label: 'Waiting / Confirmed', value: 'Confirm', description: 'Confirmation makes the transfer executable without committing inventory side effects yet.', tone: 'warning' },
            { key: 'assigned', label: 'Ready / Assigned', value: 'Assigned', description: 'Assigned lines are the last execution gate before validation.', tone: 'warning' },
            { key: 'done', label: 'Done', value: 'Validate', description: 'Validation closes the transfer and commits stock consequences.', tone: 'success' },
            { key: 'rollback', label: 'Rollback Path', value: 'Cancel / Reset Draft', description: 'Rollback must stay visible because it directly affects move and quant review.', tone: 'default' },
          ]
        : [
            { key: 'draft', label: '草稿调拨', value: '路由 / 调度', description: '执行前先核对来源、目标和调度。', tone: 'success' },
            { key: 'confirmed', label: '待处理 / 已确认', value: 'Confirm', description: '确认后调拨可执行，但还没有提交真实库存副作用。', tone: 'warning' },
            { key: 'assigned', label: '就绪 / 已分配', value: 'Assigned', description: '已分配行是 Validate 前最后一道执行门禁。', tone: 'warning' },
            { key: 'done', label: '已完成', value: 'Validate', description: '校验会关闭调拨并提交库存结果。', tone: 'success' },
            { key: 'rollback', label: '回退路径', value: 'Cancel / Reset Draft', description: '回退必须显式可见，因为它会直接影响 move 和 quant 审查。', tone: 'default' },
          ],
      gates: isEnglish
        ? [
            { key: 'routing', title: 'Validate routing before quantities', description: 'Location source and destination should be checked before quantity execution begins.' },
            { key: 'operations', title: 'Keep operations inside the transfer shell', description: 'Operators should inspect move rows from the picking notebook, not from detached inventory pages.' },
            { key: 'quant', title: 'Treat validation as the final inventory gate', description: 'Do not validate until routing, readiness, and rollback visibility are all confirmed.' },
          ]
        : [
            { key: 'routing', title: '先审路由，再看数量执行', description: '在操作数量前，先把来源库位和目标库位核准。' },
            { key: 'operations', title: '让操作行留在调拨壳层里', description: '操作员应从调拨 notebook 审查 move 行，而不是跳去分散库存页面。' },
            { key: 'quant', title: '把校验当作最终库存门禁', description: '只有路由、就绪度和回退路径都确认后，才执行 Validate。' },
          ],
    }
  }

  if (moduleKey === 'accountPayment') {
    return {
      title: isEnglish ? 'Payment Closure Flow' : '付款闭环流程',
      description: isEnglish
        ? 'Keep payment posting, journal traceability, and rollback on one rigid closure path.'
        : '把付款过账、凭证追溯和回退收在同一条刚性闭环路径上。',
      stages: isEnglish
        ? [
            { key: 'draft', label: 'Draft Payment', value: 'Direction / Amount / Partner', description: 'Match the source document before posting.', tone: 'success' },
            { key: 'posted', label: 'Posted', value: 'Post', description: 'Posting closes the payment artifact and should remain source-aware.', tone: 'warning' },
            { key: 'journal', label: 'Journal Ready', value: 'journalEntryRef', description: 'Journal entries should reopen directly from the payment shell.', tone: 'success' },
            { key: 'rollback', label: 'Rollback Path', value: 'Cancel / Reset Draft', description: 'Rollback should stay visible while the purchase pilot is still narrow.', tone: 'default' },
          ]
        : [
            { key: 'draft', label: '付款草稿', value: '方向 / 金额 / 伙伴', description: '过账前先和源单据严格对齐。', tone: 'success' },
            { key: 'posted', label: '已过账', value: 'Post', description: '过账会关闭付款对象，并且必须保留来源语义。', tone: 'warning' },
            { key: 'journal', label: '凭证就绪', value: 'journalEntryRef', description: '生成凭证应直接从付款壳层重开。', tone: 'success' },
            { key: 'rollback', label: '回退路径', value: 'Cancel / Reset Draft', description: '在采购试点范围仍然较窄时，回退必须保持可见。', tone: 'default' },
          ],
      gates: isEnglish
        ? [
            { key: 'direction', title: 'Check direction before posting', description: 'Customer and vendor payments must remain semantically distinct through the whole closure flow.' },
            { key: 'trace', title: 'Keep invoice and journal links visible together', description: 'Operators should be able to audit both source invoice and generated journal from one payment surface.' },
            { key: 'fallback', title: 'Use rollback before finance-side cleanup expands', description: 'If the trial drifts, stop payment posting first and export invoice/journal references together.' },
          ]
        : [
            { key: 'direction', title: '过账前先核付款方向', description: '客户付款和供应商付款必须在整个闭环里保持语义分明。' },
            { key: 'trace', title: '让发票和凭证链接一起可见', description: '操作员应在同一付款界面上同时审查源发票和生成凭证。' },
            { key: 'fallback', title: '在财务清理扩大前先使用回退', description: '一旦试点漂移，先停止付款过账，再把发票和凭证引用一起导出。' },
          ],
    }
  }

  return null
}
