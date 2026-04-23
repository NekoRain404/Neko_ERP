import type { ModuleKey } from '@/config/module-manifest'

export interface FirstWaveEvidencePreset {
  key: string
  label: string
  description: string
  namePrefix: string
  required?: boolean
}

export interface FirstWaveEvidenceSummary {
  expectedCount: number
  readyCount: number
  missingLabels: string[]
  readyLabels: string[]
}

export interface FirstWaveEvidenceExpectation {
  totalCount: number
  requiredCount: number
  requiredLabels: string[]
  recommendedKey: string
  recommendedLabel: string
  timelineHint: string
}

function attachmentPreset(isEnglish: boolean): FirstWaveEvidencePreset {
  return {
    key: 'attachment',
    label: isEnglish ? 'Attachment' : '附件',
    description: isEnglish ? 'General supporting files, screenshots, or internal evidence.' : '通用支撑文件、截图或内部证据。',
    namePrefix: 'ATTACHMENT',
  }
}

function contractPreset(isEnglish: boolean): FirstWaveEvidencePreset {
  return {
    key: 'contract',
    label: isEnglish ? 'Contract' : '合同',
    description: isEnglish ? 'Signed terms, framework agreements, and formal contracts.' : '签署条款、框架协议和正式合同。',
    namePrefix: 'CONTRACT',
    required: true,
  }
}

export function buildModuleEvidencePresets(moduleKey: ModuleKey, isEnglish: boolean): FirstWaveEvidencePreset[] {
  const shared = [attachmentPreset(isEnglish), contractPreset(isEnglish)]
  if (moduleKey === 'saleOrder') {
    return [
      ...shared,
      {
        key: 'quotation',
        label: isEnglish ? 'Quotation' : '报价单',
        description: isEnglish ? 'Customer quotations, offer sheets, and commercial proposals.' : '客户报价单、报价表和商务方案。',
        namePrefix: 'QUOTATION',
        required: true,
      },
      {
        key: 'invoice',
        label: isEnglish ? 'Invoice' : '发票',
        description: isEnglish ? 'Customer billing copies and invoice-side business evidence.' : '客户开票副本和开票侧业务证据。',
        namePrefix: 'INVOICE',
      },
      {
        key: 'delivery',
        label: isEnglish ? 'Delivery Slip' : '送货单',
        description: isEnglish ? 'Outbound transfer slips and signed delivery proof.' : '出库单、送货单和签收证明。',
        namePrefix: 'DELIVERY',
        required: true,
      },
    ]
  }
  if (moduleKey === 'purchaseOrder') {
    return [
      ...shared,
      {
        key: 'vendorQuote',
        label: isEnglish ? 'Vendor Quote' : '供应商报价',
        description: isEnglish ? 'Supplier quotations and sourcing comparison sheets.' : '供应商报价和采购比价资料。',
        namePrefix: 'VENDOR_QUOTE',
        required: true,
      },
      {
        key: 'bill',
        label: isEnglish ? 'Vendor Bill' : '供应商账单',
        description: isEnglish ? 'Supplier bills, invoices, and payable evidence.' : '供应商账单、发票和应付凭证。',
        namePrefix: 'BILL',
        required: true,
      },
      {
        key: 'receipt',
        label: isEnglish ? 'Receipt' : '收货单',
        description: isEnglish ? 'Inbound receiving proof, GRN, and signed receipt sheets.' : '收货证明、入库单和签收单据。',
        namePrefix: 'RECEIPT',
      },
    ]
  }
  if (moduleKey === 'accountInvoice') {
    return [
      ...shared,
      {
        key: 'invoicePdf',
        label: isEnglish ? 'Invoice PDF' : '发票 PDF',
        description: isEnglish ? 'Formal invoice exports, PDF copies, and stamped invoice files.' : '正式发票导出件、PDF 副本和盖章文件。',
        namePrefix: 'INVOICE_PDF',
        required: true,
      },
      {
        key: 'paymentProof',
        label: isEnglish ? 'Payment Proof' : '付款凭证',
        description: isEnglish ? 'Bank slips, remittance advice, and payment screenshots.' : '银行回单、汇款通知和付款截图。',
        namePrefix: 'PAYMENT_PROOF',
      },
      {
        key: 'creditNote',
        label: isEnglish ? 'Credit Note' : '红字通知',
        description: isEnglish ? 'Credit notes, reversals, and refund evidence.' : '红字通知、冲销和退款证据。',
        namePrefix: 'CREDIT_NOTE',
      },
    ]
  }
  if (moduleKey === 'stockPicking') {
    return [
      ...shared,
      {
        key: 'packingList',
        label: isEnglish ? 'Packing List' : '装箱单',
        description: isEnglish ? 'Packing lists, picking details, and carton manifests.' : '装箱单、拣货明细和箱单。',
        namePrefix: 'PACKING_LIST',
        required: true,
      },
      {
        key: 'receiptProof',
        label: isEnglish ? 'Receipt Proof' : '签收证明',
        description: isEnglish ? 'Signed receiving proof and transfer confirmation files.' : '签收证明和调拨确认文件。',
        namePrefix: 'RECEIPT_PROOF',
      },
      {
        key: 'quality',
        label: isEnglish ? 'Quality File' : '质检文件',
        description: isEnglish ? 'Inspection sheets, quality notes, and photo evidence.' : '检验单、质检说明和照片证据。',
        namePrefix: 'QUALITY',
      },
    ]
  }
  if (moduleKey === 'resPartner') {
    return [
      ...shared,
      {
        key: 'certificate',
        label: isEnglish ? 'Certificate' : '资质文件',
        description: isEnglish ? 'Business licenses, tax certificates, and company credentials.' : '营业执照、税务资质和企业证照。',
        namePrefix: 'CERTIFICATE',
        required: true,
      },
      {
        key: 'invoiceProfile',
        label: isEnglish ? 'Invoice Profile' : '开票资料',
        description: isEnglish ? 'Billing profile sheets and invoicing requirements.' : '开票资料表和开票要求。',
        namePrefix: 'INVOICE_PROFILE',
      },
      {
        key: 'identity',
        label: isEnglish ? 'Identity File' : '授权身份文件',
        description: isEnglish ? 'Contacts, authorization letters, and identity proof.' : '联系人资料、授权书和身份文件。',
        namePrefix: 'IDENTITY',
      },
    ]
  }
  if (moduleKey === 'resCompany') {
    return [
      attachmentPreset(isEnglish),
      {
        key: 'legalDoc',
        label: isEnglish ? 'Legal Document' : '法人文件',
        description: isEnglish ? 'Business registration, legal entity proof, and ownership documents.' : '工商登记、法人主体证明和归属文件。',
        namePrefix: 'LEGAL_DOC',
        required: true,
      },
      {
        key: 'taxDoc',
        label: isEnglish ? 'Tax Document' : '税务文件',
        description: isEnglish ? 'Tax registration, invoice qualification, and finance-side legal proof.' : '税务登记、开票资质和财务侧主体证明。',
        namePrefix: 'TAX_DOC',
        required: true,
      },
    ]
  }
  if (moduleKey === 'productTemplate') {
    return [
      attachmentPreset(isEnglish),
      {
        key: 'spec',
        label: isEnglish ? 'Specification' : '规格书',
        description: isEnglish ? 'Product specification, default-code meaning, and sale/purchase usage notes.' : '产品规格、默认编码含义和销售/采购使用说明。',
        namePrefix: 'SPEC',
        required: true,
      },
      {
        key: 'costing',
        label: isEnglish ? 'Costing Basis' : '成本依据',
        description: isEnglish ? 'Standard cost, margin baseline, or sourcing cost file.' : '标准成本、毛利基线或采购成本文件。',
        namePrefix: 'COSTING',
        required: true,
      },
    ]
  }
  if (moduleKey === 'productProduct') {
    return [
      attachmentPreset(isEnglish),
      {
        key: 'barcodeLabel',
        label: isEnglish ? 'Barcode Label' : '条码标签',
        description: isEnglish ? 'Barcode label, scan result, or warehouse identification proof.' : '条码标签、扫码结果或仓库识别证明。',
        namePrefix: 'BARCODE_LABEL',
        required: true,
      },
      {
        key: 'variantApproval',
        label: isEnglish ? 'Variant Approval' : '变体审批',
        description: isEnglish ? 'Approval for using this variant in pilot order and stock flows.' : '允许该变体进入试点订单和库存链路的审批。',
        namePrefix: 'VARIANT_APPROVAL',
        required: true,
      },
    ]
  }
  if (moduleKey === 'productCategory') {
    return [
      attachmentPreset(isEnglish),
      {
        key: 'categoryPolicy',
        label: isEnglish ? 'Category Policy' : '品类规则',
        description: isEnglish ? 'Classification rule and cleanup note for product hierarchy governance.' : '产品层级治理所需的分类规则和清理说明。',
        namePrefix: 'CATEGORY_POLICY',
        required: true,
      },
    ]
  }
  if (moduleKey === 'productPricelist') {
    return [
      attachmentPreset(isEnglish),
      {
        key: 'priceApproval',
        label: isEnglish ? 'Price Approval' : '价格审批',
        description: isEnglish ? 'Approval proof for the current pricing baseline.' : '当前价格基线的审批证明。',
        namePrefix: 'PRICE_APPROVAL',
        required: true,
      },
      {
        key: 'effectivePolicy',
        label: isEnglish ? 'Effective Policy' : '生效规则',
        description: isEnglish ? 'Effective company, currency, customer, or date scope for pricing.' : '价格生效的公司、币种、客户或日期范围。',
        namePrefix: 'EFFECTIVE_POLICY',
        required: true,
      },
    ]
  }
  if (moduleKey === 'accountPayment') {
    return [
      ...shared,
      {
        key: 'paymentProof',
        label: isEnglish ? 'Payment Proof' : '付款凭证',
        description: isEnglish ? 'Bank slips, remittance advice, and payment screenshots.' : '银行回单、汇款通知和付款截图。',
        namePrefix: 'PAYMENT_PROOF',
        required: true,
      },
      {
        key: 'bankSlip',
        label: isEnglish ? 'Bank Slip' : '银行回单',
        description: isEnglish ? 'Bank-side processing proof and settlement documents.' : '银行处理凭证和结算单据。',
        namePrefix: 'BANK_SLIP',
      },
      {
        key: 'vendorStatement',
        label: isEnglish ? 'Statement' : '对账单',
        description: isEnglish ? 'Vendor or customer statement used during settlement review.' : '结算审查时使用的供应商或客户对账单。',
        namePrefix: 'STATEMENT',
      },
    ]
  }
  return [
    ...shared,
    {
      key: 'invoice',
      label: isEnglish ? 'Invoice' : '发票',
      description: isEnglish ? 'Invoice copies and billing-related files.' : '发票副本和开票相关文件。',
      namePrefix: 'INVOICE',
    },
  ]
}

export function resolveRecommendedEvidencePreset(moduleKey: ModuleKey) {
  if (moduleKey === 'saleOrder') return 'quotation'
  if (moduleKey === 'purchaseOrder') return 'vendorQuote'
  if (moduleKey === 'accountInvoice') return 'invoicePdf'
  if (moduleKey === 'stockPicking') return 'packingList'
  if (moduleKey === 'resPartner') return 'certificate'
  if (moduleKey === 'resCompany') return 'legalDoc'
  if (moduleKey === 'productTemplate') return 'spec'
  if (moduleKey === 'productProduct') return 'barcodeLabel'
  if (moduleKey === 'productCategory') return 'categoryPolicy'
  if (moduleKey === 'productPricelist') return 'priceApproval'
  if (moduleKey === 'accountPayment') return 'paymentProof'
  return 'attachment'
}

export function resolveTimelineExpectation(moduleKey: ModuleKey, isEnglish: boolean) {
  if (moduleKey === 'resPartner') {
    return isEnglish
      ? 'Keep relationship notes, partner certificates, and follow-up context in the same timeline.'
      : '把关系便签、伙伴资质和后续跟进上下文都沉淀在同一条时间轴里。'
  }
  if (moduleKey === 'saleOrder') {
    return isEnglish
      ? 'Capture quotation, delivery, and approval events so operators can explain every handoff.'
      : '沉淀报价、交付和审批事件，让操作员能解释每一次交接。'
  }
  if (moduleKey === 'purchaseOrder') {
    return isEnglish
      ? 'Keep sourcing notes, receipt proof, and vendor follow-up decisions visible on the order timeline.'
      : '把寻源说明、收货证明和供应商跟进决策都挂在采购单时间轴上。'
  }
  if (moduleKey === 'accountInvoice') {
    return isEnglish
      ? 'Keep invoice exports, payment proof, and reversal evidence together for settlement review.'
      : '把发票导出件、付款凭证和冲销证据集中在一起，便于结算核对。'
  }
  if (moduleKey === 'stockPicking') {
    return isEnglish
      ? 'Use the timeline to preserve packing, receipt, and quality evidence around every stock transfer.'
      : '用时间轴保留每一次调拨的装箱、签收和质检证据。'
  }
  if (moduleKey === 'accountPayment') {
    return isEnglish
      ? 'Leave bank proof and settlement notes on the payment record before expanding pilot settlement scope.'
      : '在扩大试点结算范围前，把银行凭证和结算说明沉淀在付款记录上。'
  }
  if (moduleKey === 'resCompany') {
    return isEnglish
      ? 'Keep legal identity, tax proof, and ownership decisions close to the company master.'
      : '把法人身份、税务证明和归属决策留在公司主档附近。'
  }
  if (moduleKey === 'productTemplate' || moduleKey === 'productProduct') {
    return isEnglish
      ? 'Keep product setup notes, specification evidence, and variant approval visible before order usage expands.'
      : '在订单使用扩大前，把产品配置说明、规格证据和变体审批保持可见。'
  }
  if (moduleKey === 'productCategory') {
    return isEnglish
      ? 'Keep classification policy and cleanup context visible for later product governance.'
      : '把分类规则和清理上下文保留下来，方便后续产品治理。'
  }
  if (moduleKey === 'productPricelist') {
    return isEnglish
      ? 'Keep approval, currency scope, and effective-date policy visible before pricing drives sales orders.'
      : '在价格驱动销售订单前，把审批、币种范围和生效日期规则保留下来。'
  }
  return isEnglish
    ? 'Keep supporting notes and files on the record timeline.'
    : '把支撑说明和文件留在记录时间轴里。'
}

export function buildModuleEvidenceExpectation(moduleKey: ModuleKey, isEnglish: boolean): FirstWaveEvidenceExpectation {
  const presets = buildModuleEvidencePresets(moduleKey, isEnglish)
  const required = presets.filter((item) => item.required)
  const recommendedKey = resolveRecommendedEvidencePreset(moduleKey)
  const recommended = presets.find((item) => item.key === recommendedKey) ?? presets[0]
  return {
    totalCount: presets.length,
    requiredCount: required.length,
    requiredLabels: required.map((item) => item.label),
    recommendedKey,
    recommendedLabel: recommended?.label ?? (isEnglish ? 'Attachment' : '附件'),
    timelineHint: resolveTimelineExpectation(moduleKey, isEnglish),
  }
}

export function summarizeEvidenceCoverage(
  presets: FirstWaveEvidencePreset[],
  rows: Array<{ categoryKey: string }>,
): FirstWaveEvidenceSummary {
  const rowSet = new Set(rows.map((item) => item.categoryKey))
  const ready = presets.filter((item) => rowSet.has(item.key))
  const missing = presets.filter((item) => item.required && !rowSet.has(item.key))
  return {
    expectedCount: presets.length,
    readyCount: ready.length,
    missingLabels: missing.map((item) => item.label),
    readyLabels: ready.map((item) => item.label),
  }
}

export function sortEvidencePresetsByPriority(
  presets: FirstWaveEvidencePreset[],
  recommendedKey?: string,
) {
  return [...presets].sort((left, right) => {
    const leftScore = [
      left.required ? 0 : 1,
      left.key === recommendedKey ? 0 : 1,
      left.label,
    ]
    const rightScore = [
      right.required ? 0 : 1,
      right.key === recommendedKey ? 0 : 1,
      right.label,
    ]
    return leftScore.join('::').localeCompare(rightScore.join('::'))
  })
}
