import type { ModuleKey } from '@/config/module-manifest'

export interface SysScriptPreset {
  key: string
  titleZh: string
  titleEn: string
  descriptionZh: string
  descriptionEn: string
  model: string
  eventName: 'before_save' | 'before_action'
  scriptLang: 'groovy'
  scriptCode: string
  remark: string
  lane: 'masterData' | 'sales' | 'purchase' | 'platform'
}

export const SYS_SCRIPT_PRESETS: SysScriptPreset[] = [
  {
    key: 'partner_contact_required',
    titleZh: '伙伴保存前校验联系方式',
    titleEn: 'Require Partner Contact Before Save',
    descriptionZh: '在首批主数据切换里，伙伴至少要保留邮箱，避免下游销售和采购链失去基本联络能力。',
    descriptionEn: 'Require a contact email on partner masters so first-wave sales and purchase pilots keep a stable contact path.',
    model: 'ResPartner',
    eventName: 'before_save',
    scriptLang: 'groovy',
    scriptCode: "if (doc.email == null) { throw new RuntimeException('Partner email is required before save') }",
    remark: 'first-wave master data guardrail',
    lane: 'masterData',
  },
  {
    key: 'company_currency_required',
    titleZh: '公司保存前校验币种',
    titleEn: 'Require Company Currency Before Save',
    descriptionZh: '公司是首批主数据归属基线，保存前必须有基础币种，避免销售、采购和价目表继承空币种。',
    descriptionEn: 'Require a base currency on companies so sales, purchase, and pricelist records inherit a stable ownership baseline.',
    model: 'ResCompany',
    eventName: 'before_save',
    scriptLang: 'groovy',
    scriptCode: "if (doc.currencyId == null) { throw new RuntimeException('Company currency is required before save') }",
    remark: 'first-wave company guardrail',
    lane: 'masterData',
  },
  {
    key: 'product_template_code_required',
    titleZh: '产品模板保存前校验编码',
    titleEn: 'Require Product Code Before Save',
    descriptionZh: '产品进入首批销售/采购链前必须有默认编码，避免订单行、库存移动和回退包失去稳定引用。',
    descriptionEn: 'Require a default code before product templates enter first-wave order, stock, and rollback flows.',
    model: 'ProductTemplate',
    eventName: 'before_save',
    scriptLang: 'groovy',
    scriptCode: "if (doc.defaultCode == null) { throw new RuntimeException('Product default code is required before save') }",
    remark: 'first-wave product guardrail',
    lane: 'masterData',
  },
  {
    key: 'pricelist_currency_required',
    titleZh: '价目表保存前校验币种',
    titleEn: 'Require Pricelist Currency Before Save',
    descriptionZh: '价目表一旦被销售链引用，必须带币种上下文，避免试点价格和发票金额语义漂移。',
    descriptionEn: 'Require currency context on pricelists before they drive first-wave sales and billing amounts.',
    model: 'ProductPricelist',
    eventName: 'before_save',
    scriptLang: 'groovy',
    scriptCode: "if (doc.currencyId == null) { throw new RuntimeException('Pricelist currency is required before save') }",
    remark: 'first-wave pricing guardrail',
    lane: 'masterData',
  },
  {
    key: 'sale_large_amount_review',
    titleZh: '销售大额单据保存前提示',
    titleEn: 'Review Large Sales Orders Before Save',
    descriptionZh: '对大额销售单做最小 guardrail，防止首批试点链在草稿阶段就带着高风险金额继续流转。',
    descriptionEn: 'Add a minimal first-wave guardrail for large sales orders before they continue through the pilot chain.',
    model: 'SaleOrder',
    eventName: 'before_save',
    scriptLang: 'groovy',
    scriptCode: "if (doc.amountUntaxed >= 500000) { throw new RuntimeException('Large sales orders need extra review before save') }",
    remark: 'first-wave sales guardrail',
    lane: 'sales',
  },
  {
    key: 'purchase_vendor_required',
    titleZh: '采购保存前校验供应商',
    titleEn: 'Require Vendor Before Purchase Save',
    descriptionZh: '采购单在进入首批切换链前必须先绑定供应商，避免后续收货和账单链路失去来源。',
    descriptionEn: 'Require a vendor on purchase orders before they enter the first-wave receipt and bill chain.',
    model: 'PurchaseOrder',
    eventName: 'before_save',
    scriptLang: 'groovy',
    scriptCode: "if (doc.partnerId == null) { throw new RuntimeException('Vendor is required before save') }",
    remark: 'first-wave purchase guardrail',
    lane: 'purchase',
  },
  {
    key: 'invoice_post_origin_required',
    titleZh: '发票过账前校验来源',
    titleEn: 'Require Origin Before Invoice Post',
    descriptionZh: '发票过账前至少要保留来源引用，避免切换后账单脱离销售或采购主链。',
    descriptionEn: 'Require an origin reference before posting invoices so billing stays attached to the sales or purchase chain.',
    model: 'AccountInvoice',
    eventName: 'before_action',
    scriptLang: 'groovy',
    scriptCode: "if (action == 'post' && doc.originRef == null) { throw new RuntimeException('Origin reference is required before posting invoice') }",
    remark: 'first-wave invoice post guardrail',
    lane: 'sales',
  },
  {
    key: 'picking_validate_origin_required',
    titleZh: '调拨验证前校验来源',
    titleEn: 'Require Origin Before Transfer Validate',
    descriptionZh: '调拨执行前必须留住来源单据，减少库存执行与业务单据脱钩。',
    descriptionEn: 'Require an origin before validating stock transfers so inventory execution stays traceable.',
    model: 'StockPicking',
    eventName: 'before_action',
    scriptLang: 'groovy',
    scriptCode: "if (action == 'action_validate' && doc.origin == null) { throw new RuntimeException('Origin is required before transfer validation') }",
    remark: 'first-wave stock guardrail',
    lane: 'sales',
  },
  {
    key: 'payment_post_origin_required',
    titleZh: '付款过账前校验来源',
    titleEn: 'Require Origin Before Payment Post',
    descriptionZh: '付款过账前要求来源引用存在，让采购账单和付款对象保持同一路径。',
    descriptionEn: 'Require an origin reference before posting payments so bill and payment traceability stay on one path.',
    model: 'AccountPayment',
    eventName: 'before_action',
    scriptLang: 'groovy',
    scriptCode: "if (action == 'action_post' && doc.originRef == null) { throw new RuntimeException('Origin reference is required before posting payment') }",
    remark: 'first-wave payment guardrail',
    lane: 'purchase',
  },
]

const MODULE_GUARDRAIL_MODELS: Partial<Record<ModuleKey, string[]>> = {
  resPartner: ['ResPartner'],
  resCompany: ['ResCompany'],
  productTemplate: ['ProductTemplate'],
  productProduct: ['ProductTemplate'],
  productCategory: ['ProductTemplate'],
  productPricelist: ['ProductPricelist'],
  saleOrder: ['SaleOrder', 'StockPicking', 'AccountInvoice'],
  stockPicking: ['StockPicking', 'SaleOrder'],
  accountInvoice: ['AccountInvoice', 'SaleOrder', 'PurchaseOrder', 'AccountPayment'],
  purchaseOrder: ['PurchaseOrder', 'AccountInvoice', 'AccountPayment'],
  accountPayment: ['AccountPayment', 'PurchaseOrder', 'AccountInvoice'],
}

const MODULE_GUARDRAIL_LANES: Partial<Record<ModuleKey, SysScriptPreset['lane'][]>> = {
  resPartner: ['masterData'],
  resCompany: ['masterData'],
  productTemplate: ['masterData'],
  productProduct: ['masterData'],
  productCategory: ['masterData'],
  productPricelist: ['masterData'],
  saleOrder: ['sales'],
  stockPicking: ['sales'],
  accountInvoice: ['sales', 'purchase'],
  purchaseOrder: ['purchase'],
  accountPayment: ['purchase'],
}

export function listSysScriptPresets() {
  return SYS_SCRIPT_PRESETS
}

export function findSysScriptPreset(key?: string | null) {
  return SYS_SCRIPT_PRESETS.find((item) => item.key === key) ?? null
}

export function buildSysScriptDraftFromPreset(key?: string | null) {
  const preset = findSysScriptPreset(key)
  if (!preset) return null
  return {
    model: preset.model,
    eventName: preset.eventName,
    scriptLang: preset.scriptLang,
    scriptCode: preset.scriptCode,
    status: 1,
    remark: preset.remark,
  }
}

export function listSysScriptPresetsForModule(moduleKey: ModuleKey) {
  const models = new Set(MODULE_GUARDRAIL_MODELS[moduleKey] ?? [])
  const lanes = new Set(MODULE_GUARDRAIL_LANES[moduleKey] ?? [])
  if (!models.size && !lanes.size) return []
  return SYS_SCRIPT_PRESETS.filter((preset) => models.has(preset.model) || lanes.has(preset.lane))
}

export function resolvePrimarySysScriptModelForModule(moduleKey: ModuleKey) {
  return MODULE_GUARDRAIL_MODELS[moduleKey]?.[0] ?? ''
}

export function resolveSysScriptLanesForModule(moduleKey: ModuleKey) {
  return MODULE_GUARDRAIL_LANES[moduleKey] ?? []
}
