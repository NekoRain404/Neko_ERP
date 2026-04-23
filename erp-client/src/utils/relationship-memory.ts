import type { ModuleKey } from '@/config/module-manifest'

export interface RelationshipMemoryFact {
  key: string
  label: string
  description: string
}

export interface RelationshipMemoryTemplate {
  key: string
  label: string
  description: string
  content: string
}

export interface RelationshipMemoryPreset {
  title: string
  description: string
  quickFacts: RelationshipMemoryFact[]
  templates: RelationshipMemoryTemplate[]
}

function buildResPartnerMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Partner Relationship Memory' : '伙伴关系记忆',
    description: isEnglish
      ? 'Capture Monica-style relationship signals early so sales and purchase pilots do not lose human context.'
      : '尽早沉淀 Monica 风格的关系信号，避免销售和采购试点丢掉人本上下文。',
    quickFacts: isEnglish
      ? [
          { key: 'decision-maker', label: 'Decision Maker', description: 'Who signs or influences the commercial decision for this partner.' },
          { key: 'communication-window', label: 'Best Contact Window', description: 'When the team should reach out to keep response quality stable.' },
          { key: 'working-style', label: 'Working Style', description: 'Preferred tone, escalation habits, and meeting expectations.' },
          { key: 'commercial-risk', label: 'Commercial Risk', description: 'Main trust, payment, or delivery risk that should stay visible to later operators.' },
        ]
      : [
          { key: 'decision-maker', label: '决策人', description: '谁对这个伙伴的商务决策拍板，或者最能影响最终结论。' },
          { key: 'communication-window', label: '最佳联系窗口', description: '团队最适合联系对方的时间段，保证沟通质量稳定。' },
          { key: 'working-style', label: '合作风格', description: '偏好的沟通方式、升级习惯和会议预期。' },
          { key: 'commercial-risk', label: '商业风险', description: '最需要让后续操作员持续看到的信任、付款或交付风险。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'contact-brief',
            label: 'Contact Brief',
            description: 'Short relationship snapshot for the next operator.',
            content: 'Contact brief:\n- Decision maker:\n- Best contact window:\n- Preferred channel:\n- Current mood / tone:',
          },
          {
            key: 'meeting-note',
            label: 'Meeting Note',
            description: 'Capture what changed after a meeting or call.',
            content: 'Meeting note:\n- Topic:\n- What changed:\n- Open risk:\n- Next follow-up date:',
          },
          {
            key: 'risk-note',
            label: 'Risk Note',
            description: 'Keep payment, trust, or commercial risk explicit.',
            content: 'Risk note:\n- Risk type:\n- Evidence:\n- Impacted chain:\n- Mitigation:',
          },
        ]
      : [
          {
            key: 'contact-brief',
            label: '联系快照',
            description: '给下一位操作员看的简短关系摘要。',
            content: '联系快照：\n- 决策人：\n- 最佳联系窗口：\n- 偏好渠道：\n- 当前状态 / 语气：',
          },
          {
            key: 'meeting-note',
            label: '会谈便签',
            description: '记录一次会谈或电话后发生了什么变化。',
            content: '会谈便签：\n- 主题：\n- 变化：\n- 未决风险：\n- 下次跟进日期：',
          },
          {
            key: 'risk-note',
            label: '风险便签',
            description: '把付款、信任或商务风险显式留下来。',
            content: '风险便签：\n- 风险类型：\n- 证据：\n- 影响链路：\n- 缓解方案：',
          },
        ],
  }
}

function buildSaleOrderMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Sales Handoff Memory' : '销售交接记忆',
    description: isEnglish
      ? 'Keep quoting, delivery, and billing decisions visible on the same order path.'
      : '把报价、交付和开票决策持续留在同一订单路径里。',
    quickFacts: isEnglish
      ? [
          { key: 'promise', label: 'Customer Promise', description: 'The commitment the team has already made to the customer.' },
          { key: 'delivery-risk', label: 'Delivery Risk', description: 'Main stock or routing blocker likely to affect fulfillment.' },
          { key: 'invoice-rule', label: 'Invoice Rule', description: 'Special billing rule or approval requirement for this order.' },
        ]
      : [
          { key: 'promise', label: '客户承诺', description: '团队已经向客户承诺过的关键事项。' },
          { key: 'delivery-risk', label: '交付风险', description: '最可能影响履约的库存或路由阻塞。' },
          { key: 'invoice-rule', label: '开票规则', description: '这张订单的特殊开票要求或审批条件。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'quote-handoff',
            label: 'Quote Handoff',
            description: 'Pass commercial context to delivery or billing operators.',
            content: 'Quote handoff:\n- Customer commitment:\n- Margin / pricing note:\n- Delivery promise:\n- Billing expectation:',
          },
        ]
      : [
          {
            key: 'quote-handoff',
            label: '报价交接',
            description: '把商务上下文交给交付或开票操作员。',
            content: '报价交接：\n- 客户承诺：\n- 毛利 / 价格说明：\n- 交付承诺：\n- 开票预期：',
          },
        ],
  }
}

function buildPurchaseOrderMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Vendor Follow-Up Memory' : '供应商跟进记忆',
    description: isEnglish
      ? 'Keep sourcing, receipt, and bill decisions visible to the next procurement operator.'
      : '把寻源、收货和账单决策持续暴露给下一位采购操作员。',
    quickFacts: isEnglish
      ? [
          { key: 'vendor-contact', label: 'Vendor Contact', description: 'The current operational owner on the supplier side.' },
          { key: 'receipt-risk', label: 'Receipt Risk', description: 'Main timing or quality risk around receipt execution.' },
          { key: 'settlement-note', label: 'Settlement Note', description: 'Bill or payment nuance the next operator should inherit.' },
        ]
      : [
          { key: 'vendor-contact', label: '供应商联系人', description: '当前在供应商侧实际推动事情的人。' },
          { key: 'receipt-risk', label: '收货风险', description: '当前收货执行最可能遇到的时效或质量风险。' },
          { key: 'settlement-note', label: '结算说明', description: '下一位操作员必须继承的账单或付款细节。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'vendor-handoff',
            label: 'Vendor Handoff',
            description: 'Pass sourcing context to receipt and bill operators.',
            content: 'Vendor handoff:\n- Current supplier contact:\n- Receipt expectation:\n- Bill risk:\n- Next procurement step:',
          },
        ]
      : [
          {
            key: 'vendor-handoff',
            label: '供应商交接',
            description: '把寻源上下文交给收货和账单操作员。',
            content: '供应商交接：\n- 当前联系人：\n- 收货预期：\n- 账单风险：\n- 下一步：',
          },
        ],
  }
}

function buildAccountInvoiceMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Invoice Settlement Memory' : '发票结算记忆',
    description: isEnglish
      ? 'Keep posting, due-date, settlement, and reversal decisions attached to the invoice before payment follow-up expands.'
      : '在付款跟进扩大前，把过账、到期、结算和冲销决策都留在发票上。',
    quickFacts: isEnglish
      ? [
          { key: 'posting-context', label: 'Posting Context', description: 'Why the invoice is ready to post and which source document supports it.' },
          { key: 'settlement-owner', label: 'Settlement Owner', description: 'Who should follow up payment, vendor settlement, or customer collection.' },
          { key: 'reversal-risk', label: 'Reversal Risk', description: 'Any reason this invoice may need credit note, cancel, or reset handling.' },
        ]
      : [
          { key: 'posting-context', label: '过账上下文', description: '为什么这张发票可以过账，以及哪个源单据支撑它。' },
          { key: 'settlement-owner', label: '结算负责人', description: '谁负责后续付款、供应商结算或客户回款跟进。' },
          { key: 'reversal-risk', label: '冲销风险', description: '这张发票是否可能需要红字、取消或重回草稿处理。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'settlement-handoff',
            label: 'Settlement Handoff',
            description: 'Pass invoice context to payment follow-up.',
            content: 'Settlement handoff:\n- Source document:\n- Posting decision:\n- Due-date risk:\n- Payment follow-up owner:',
          },
          {
            key: 'reversal-note',
            label: 'Reversal Note',
            description: 'Capture possible credit note or cancellation context.',
            content: 'Reversal note:\n- Reason:\n- Impacted source:\n- Required approval:\n- Next accounting step:',
          },
        ]
      : [
          {
            key: 'settlement-handoff',
            label: '结算交接',
            description: '把发票上下文交给付款或回款跟进。',
            content: '结算交接：\n- 来源单据：\n- 过账结论：\n- 到期风险：\n- 付款/回款负责人：',
          },
          {
            key: 'reversal-note',
            label: '冲销便签',
            description: '记录可能需要红字或取消的上下文。',
            content: '冲销便签：\n- 原因：\n- 影响来源：\n- 所需审批：\n- 下一会计步骤：',
          },
        ],
  }
}

function buildAccountPaymentMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Payment Posting Memory' : '付款过账记忆',
    description: isEnglish
      ? 'Keep bank proof, direction, journal handoff, and settlement decisions visible on the payment record.'
      : '把银行凭证、付款方向、凭证交接和结算决策留在付款记录上。',
    quickFacts: isEnglish
      ? [
          { key: 'direction', label: 'Payment Direction', description: 'Whether the payment is inbound or outbound and why.' },
          { key: 'bank-proof', label: 'Bank Proof', description: 'Which bank slip, remittance advice, or screenshot supports posting.' },
          { key: 'journal-handoff', label: 'Journal Handoff', description: 'What accounting reviewer should check after journal entry creation.' },
        ]
      : [
          { key: 'direction', label: '付款方向', description: '当前付款是 inbound 还是 outbound，以及原因。' },
          { key: 'bank-proof', label: '银行凭证', description: '哪张银行回单、汇款通知或截图支撑过账。' },
          { key: 'journal-handoff', label: '凭证交接', description: '生成凭证后，会计复核人员应该重点检查什么。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'payment-handoff',
            label: 'Payment Handoff',
            description: 'Pass payment context to accounting review.',
            content: 'Payment handoff:\n- Invoice / bill source:\n- Payment direction:\n- Bank proof:\n- Journal review note:',
          },
        ]
      : [
          {
            key: 'payment-handoff',
            label: '付款交接',
            description: '把付款上下文交给会计复核。',
            content: '付款交接：\n- 发票/账单来源：\n- 付款方向：\n- 银行凭证：\n- 凭证复核说明：',
          },
        ],
  }
}

function buildStockPickingMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Transfer Execution Memory' : '调拨执行记忆',
    description: isEnglish
      ? 'Keep routing, packing, receipt, and quality context attached to the transfer before validation changes stock.'
      : '在 Validate 改动库存前，把路由、装箱、签收和质检上下文留在调拨单上。',
    quickFacts: isEnglish
      ? [
          { key: 'routing', label: 'Routing Decision', description: 'Why the source and destination locations are correct for this execution.' },
          { key: 'packing', label: 'Packing / Receipt Proof', description: 'Which packing list, receipt proof, or signed file supports validation.' },
          { key: 'quality-risk', label: 'Quality Risk', description: 'Any inspection or quantity issue that should block or explain validation.' },
        ]
      : [
          { key: 'routing', label: '路由决策', description: '为什么当前来源和目标库位适合这次执行。' },
          { key: 'packing', label: '装箱/签收证明', description: '哪份装箱单、签收证明或签字文件支撑校验。' },
          { key: 'quality-risk', label: '质量风险', description: '任何应该阻断或解释 Validate 的质检或数量问题。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'transfer-handoff',
            label: 'Transfer Handoff',
            description: 'Pass warehouse execution context to billing or rollback review.',
            content: 'Transfer handoff:\n- Source / destination:\n- Packing proof:\n- Quantity issue:\n- Validation decision:',
          },
        ]
      : [
          {
            key: 'transfer-handoff',
            label: '调拨交接',
            description: '把仓储执行上下文交给开票或回退审查。',
            content: '调拨交接：\n- 来源 / 目标：\n- 装箱证明：\n- 数量问题：\n- Validate 结论：',
          },
        ],
  }
}

function buildResCompanyMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Company Identity Memory' : '公司主体记忆',
    description: isEnglish
      ? 'Keep legal identity, ownership proof, and fallback notes close to the company master before pilot ownership expands.'
      : '在试点归属扩大前，把法人身份、归属凭证和回退说明贴近公司主档。',
    quickFacts: isEnglish
      ? [
          { key: 'legal-owner', label: 'Legal Owner', description: 'Who owns legal-entity maintenance and fallback approval.' },
          { key: 'currency-baseline', label: 'Currency Baseline', description: 'The currency assumption downstream orders and pricelists inherit.' },
          { key: 'fallback-scope', label: 'Fallback Scope', description: 'Which ownership changes must be exported if the company pilot stops.' },
        ]
      : [
          { key: 'legal-owner', label: '法人维护负责人', description: '谁负责主体维护和回退审批。' },
          { key: 'currency-baseline', label: '币种基线', description: '下游订单和价目表继承的币种假设。' },
          { key: 'fallback-scope', label: '回退范围', description: '公司试点停止时，哪些归属变更必须导出。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'company-handoff',
            label: 'Company Handoff',
            description: 'Pass legal and ownership context to first-wave operators.',
            content: 'Company handoff:\n- Legal owner:\n- Base currency:\n- Partner link:\n- Rollback export scope:',
          },
        ]
      : [
          {
            key: 'company-handoff',
            label: '公司交接',
            description: '把法人和归属上下文交给首批操作员。',
            content: '公司交接：\n- 法人维护负责人：\n- 基础币种：\n- 伙伴关联：\n- 回退导出范围：',
          },
        ],
  }
}

function buildProductTemplateMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Product Definition Memory' : '产品定义记忆',
    description: isEnglish
      ? 'Keep specification, costing, and sale/purchase readiness visible before products become order-line defaults.'
      : '在产品成为订单行默认项前，把规格、成本和销售/采购可用性保留下来。',
    quickFacts: isEnglish
      ? [
          { key: 'spec-owner', label: 'Spec Owner', description: 'Who confirms the product specification and naming baseline.' },
          { key: 'costing-basis', label: 'Costing Basis', description: 'The standard-price assumption that explains margin checks.' },
          { key: 'order-readiness', label: 'Order Readiness', description: 'Whether the product is safe for sales and purchase pilot usage.' },
        ]
      : [
          { key: 'spec-owner', label: '规格负责人', description: '谁确认产品规格和命名基线。' },
          { key: 'costing-basis', label: '成本依据', description: '解释毛利检查的标准成本假设。' },
          { key: 'order-readiness', label: '下单可用性', description: '这个产品是否适合进入销售和采购试点。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'product-handoff',
            label: 'Product Handoff',
            description: 'Pass product setup context to sales, purchase, and stock users.',
            content: 'Product handoff:\n- Spec owner:\n- Default code / barcode:\n- Costing basis:\n- Sales / purchase readiness:',
          },
        ]
      : [
          {
            key: 'product-handoff',
            label: '产品交接',
            description: '把产品配置上下文交给销售、采购和库存用户。',
            content: '产品交接：\n- 规格负责人：\n- 默认编码 / 条码：\n- 成本依据：\n- 销售 / 采购可用性：',
          },
        ],
  }
}

function buildProductVariantMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Variant Trace Memory' : '变体追踪记忆',
    description: isEnglish
      ? 'Keep barcode, approval, and template linkage explicit so order lines do not drift from product setup.'
      : '把条码、审批和模板关联显式保留，避免订单行与产品配置漂移。',
    quickFacts: isEnglish
      ? [
          { key: 'template-link', label: 'Template Link', description: 'Which template this variant inherits and why.' },
          { key: 'barcode-proof', label: 'Barcode Proof', description: 'Which label, scan result, or warehouse file proves the variant code.' },
          { key: 'variant-approval', label: 'Variant Approval', description: 'Who approved using this specific variant in pilot orders.' },
        ]
      : [
          { key: 'template-link', label: '模板关联', description: '这个变体继承哪个模板，以及原因。' },
          { key: 'barcode-proof', label: '条码证明', description: '哪份标签、扫码结果或仓库文件证明变体编码。' },
          { key: 'variant-approval', label: '变体审批', description: '谁批准这个具体变体进入试点订单。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'variant-handoff',
            label: 'Variant Handoff',
            description: 'Pass variant proof to order and warehouse users.',
            content: 'Variant handoff:\n- Template:\n- Default code:\n- Barcode proof:\n- Approval owner:',
          },
        ]
      : [
          {
            key: 'variant-handoff',
            label: '变体交接',
            description: '把变体证明交给订单和仓库用户。',
            content: '变体交接：\n- 模板：\n- 默认编码：\n- 条码证明：\n- 审批负责人：',
          },
        ],
  }
}

function buildProductCategoryMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Category Policy Memory' : '品类规则记忆',
    description: isEnglish
      ? 'Keep classification policy visible so product cleanup and reporting semantics stay aligned later.'
      : '把分类规则保持可见，方便后续产品清理和报表语义一致。',
    quickFacts: isEnglish
      ? [
          { key: 'category-owner', label: 'Category Owner', description: 'Who decides category naming and hierarchy changes.' },
          { key: 'classification-rule', label: 'Classification Rule', description: 'The rule used to place products under this category.' },
          { key: 'cleanup-risk', label: 'Cleanup Risk', description: 'Which products or reports may be affected by category changes.' },
        ]
      : [
          { key: 'category-owner', label: '品类负责人', description: '谁决定品类命名和层级调整。' },
          { key: 'classification-rule', label: '分类规则', description: '产品归入该品类所依据的规则。' },
          { key: 'cleanup-risk', label: '清理风险', description: '哪些产品或报表可能受品类变化影响。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'category-policy',
            label: 'Category Policy',
            description: 'Capture classification rules before product maintenance expands.',
            content: 'Category policy:\n- Owner:\n- Classification rule:\n- Impacted products:\n- Cleanup / rollback note:',
          },
        ]
      : [
          {
            key: 'category-policy',
            label: '品类规则',
            description: '在产品维护扩大前记录分类规则。',
            content: '品类规则：\n- 负责人：\n- 分类规则：\n- 影响产品：\n- 清理 / 回退说明：',
          },
        ],
  }
}

function buildProductPricelistMemory(isEnglish: boolean): RelationshipMemoryPreset {
  return {
    title: isEnglish ? 'Pricing Policy Memory' : '定价策略记忆',
    description: isEnglish
      ? 'Keep approval, effective scope, and fallback notes attached before pricelists drive sales order pricing.'
      : '在价目表驱动销售订单价格前，把审批、生效范围和兜底说明贴近记录。',
    quickFacts: isEnglish
      ? [
          { key: 'approval-owner', label: 'Approval Owner', description: 'Who approved the current pricing baseline.' },
          { key: 'effective-scope', label: 'Effective Scope', description: 'Company, currency, and customer scope for the price rule.' },
          { key: 'rollback-note', label: 'Rollback Note', description: 'How to return to Odoo or previous pricing if pilot pricing drifts.' },
        ]
      : [
          { key: 'approval-owner', label: '审批负责人', description: '谁批准当前定价基线。' },
          { key: 'effective-scope', label: '生效范围', description: '当前价格规则适用的公司、币种和客户范围。' },
          { key: 'rollback-note', label: '回退说明', description: '如果试点价格漂移，如何回到 Odoo 或旧价。' },
        ],
    templates: isEnglish
      ? [
          {
            key: 'pricing-handoff',
            label: 'Pricing Handoff',
            description: 'Pass approval and scope context to sales operators.',
            content: 'Pricing handoff:\n- Approval owner:\n- Company / currency:\n- Effective customer scope:\n- Rollback price source:',
          },
        ]
      : [
          {
            key: 'pricing-handoff',
            label: '定价交接',
            description: '把审批和适用范围交给销售操作员。',
            content: '定价交接：\n- 审批负责人：\n- 公司 / 币种：\n- 生效客户范围：\n- 回退价格来源：',
          },
        ],
  }
}

export function buildRelationshipMemoryPreset(moduleKey: ModuleKey, isEnglish: boolean): RelationshipMemoryPreset | null {
  if (moduleKey === 'resPartner') return buildResPartnerMemory(isEnglish)
  if (moduleKey === 'resCompany') return buildResCompanyMemory(isEnglish)
  if (moduleKey === 'productTemplate') return buildProductTemplateMemory(isEnglish)
  if (moduleKey === 'productProduct') return buildProductVariantMemory(isEnglish)
  if (moduleKey === 'productCategory') return buildProductCategoryMemory(isEnglish)
  if (moduleKey === 'productPricelist') return buildProductPricelistMemory(isEnglish)
  if (moduleKey === 'saleOrder') return buildSaleOrderMemory(isEnglish)
  if (moduleKey === 'purchaseOrder') return buildPurchaseOrderMemory(isEnglish)
  if (moduleKey === 'accountInvoice') return buildAccountInvoiceMemory(isEnglish)
  if (moduleKey === 'accountPayment') return buildAccountPaymentMemory(isEnglish)
  if (moduleKey === 'stockPicking') return buildStockPickingMemory(isEnglish)
  return null
}
