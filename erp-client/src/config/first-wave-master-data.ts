import type { ModuleKey } from '@/config/module-manifest'

interface HighlightItem {
  label: string
  value: string
  description: string
}

interface FocusItem {
  label: string
  description: string
}

interface ActionItem {
  label: string
  value: string
  description: string
}

interface QuickLinkItem {
  label: string
  description: string
  routeName: string
  query?: Record<string, string | undefined>
  buttonType?: string
}

interface ReadinessItem {
  label: string
  value: string
  description: string
  tone?: string
}

interface ChecklistItem {
  title: string
  description: string
}

interface SideCard {
  label: string
  value: string
  description: string
}

export interface FirstWaveMasterDataPreset {
  title: string
  description: string
  note: string
  highlights: HighlightItem[]
  focusItems: FocusItem[]
  actionItems: ActionItem[]
  quickLinkItems: QuickLinkItem[]
  readinessItems: ReadinessItem[]
  pilotGuideItems: ChecklistItem[]
  rollbackItems: ChecklistItem[]
  reviewQueueTitle: string
  reviewQueueDescription: string
  reviewQueueModuleKeys: ModuleKey[]
  snapshotTitle: string
  sideCards: SideCard[]
  reminderTitle: string
  reminderDescription: string
  reminderModuleKeys: ModuleKey[]
  guideTitle: string
  quickGuides: ChecklistItem[]
}

type FirstWaveMasterModuleKey =
  | 'resCompany'
  | 'productTemplate'
  | 'productProduct'
  | 'productCategory'
  | 'productPricelist'

function text(isEnglish: boolean, en: string, zh: string) {
  return isEnglish ? en : zh
}

function cutoverSettingsLink(moduleKey: FirstWaveMasterModuleKey, isEnglish: boolean): QuickLinkItem {
  return {
    label: text(isEnglish, 'Open Cutover Settings', '打开切换设置'),
    description: text(
      isEnglish,
      'Review pilot scope, fallback entry, and rollback controls without leaving the first-wave path.',
      '不离开首批主线，也能直接审查试点范围、兜底入口和回退控制。',
    ),
    routeName: 'settings',
    query: {
      tab: 'cutover',
      module: moduleKey,
    },
  }
}

// These presets keep first-wave master data explicit so product and company
// maintenance is not buried under the generic shell while cutover is still narrow.
export function buildFirstWaveMasterDataPreset(
  moduleKey: FirstWaveMasterModuleKey,
  isEnglish: boolean,
): FirstWaveMasterDataPreset {
  if (moduleKey === 'resCompany') {
    return {
      title: text(isEnglish, 'Company Workbench', '公司工作台'),
      description: text(
        isEnglish,
        'The first-wave company workbench for keeping legal entity, currency, partner, and downstream ownership references stable.',
        '首批公司工作台，负责把法人主体、币种、伙伴和下游归属引用维护稳定。',
      ),
      note: text(
        isEnglish,
        'Keep company identity stable first so partner, sales, purchase, and pricing records inherit one trusted ownership baseline.',
        '先把公司主体做稳，再让伙伴、销售、采购和价目表共享同一条可信归属基线。',
      ),
      highlights: [
        {
          label: text(isEnglish, 'Cutover Scope', '切换范围'),
          value: text(isEnglish, 'Legal Entity First', '法人主体优先'),
          description: text(
            isEnglish,
            'Companies are first-wave reference masters, so identity and ownership must be correct before broadening transactional rollout.',
            '公司是首批引用主数据，身份和归属必须先正确，才能继续放量事务链路。',
          ),
        },
        {
          label: text(isEnglish, 'Reference Role', '引用角色'),
          value: text(isEnglish, 'Partner / Currency / Pricelist', '伙伴 / 币种 / 价目表'),
          description: text(
            isEnglish,
            'Company records anchor downstream partner, currency, and pricing semantics instead of letting each module drift independently.',
            '公司记录要锚定下游伙伴、币种和价格语义，不能让各模块自己漂移。',
          ),
        },
        {
          label: text(isEnglish, 'Pilot Goal', '试点目标'),
          value: text(isEnglish, 'Stable Ownership Baseline', '稳定归属基线'),
          description: text(
            isEnglish,
            'The workbench should make ownership review obvious before sales or purchase users begin posting more records.',
            '工作台要让归属审查足够直观，再让销售或采购用户继续录更多单据。',
          ),
        },
      ],
      focusItems: [
        {
          label: text(isEnglish, 'Legal Identity', '主体身份'),
          description: text(
            isEnglish,
            'Company name, partner link, active state, and base currency should stay consistent before deeper multi-company features arrive.',
            '在更深多公司能力落地前，先把公司名称、伙伴关联、启用状态和基础币种保持一致。',
          ),
        },
        {
          label: text(isEnglish, 'Shared Ownership', '共享归属'),
          description: text(
            isEnglish,
            'Sales, purchase, and pricing surfaces should inherit the same company reference instead of creating local ownership exceptions.',
            '销售、采购和价格界面都要继承同一条公司引用，不要制造本地化归属例外。',
          ),
        },
        {
          label: text(isEnglish, 'Fallback Ready', '可回退'),
          description: text(
            isEnglish,
            'The company surface stays cutover-aware so operators can stop or reopen pilot ownership changes quickly.',
            '公司界面要始终感知切换状态，便于操作员快速停止或恢复试点归属变更。',
          ),
        },
      ],
      actionItems: [
        {
          label: text(isEnglish, 'Primary Work', '主工作'),
          value: text(isEnglish, 'Create / Edit / Verify Ownership', '新建 / 编辑 / 核归属'),
          description: text(
            isEnglish,
            'Company maintenance stays focused on direct editing and ownership verification rather than deep organization features.',
            '公司维护先聚焦直接编辑和归属核对，而不是提前展开深层组织功能。',
          ),
        },
        {
          label: text(isEnglish, 'Mainline Usage', '主线使用'),
          value: text(isEnglish, 'Partner / Sales / Purchase Reuse', '伙伴 / 销售 / 采购复用'),
          description: text(
            isEnglish,
            'One company baseline should be reused across first-wave masters and transaction chains.',
            '同一条公司基线要横向复用到首批主数据和事务链路。',
          ),
        },
      ],
      quickLinkItems: [
        {
          label: text(isEnglish, 'Create Company', '新建公司'),
          description: text(isEnglish, 'Start a new legal-entity record directly from the first-wave workbench.', '直接从首批工作台发起新的法人主体记录。'),
          routeName: 'resCompany',
          query: { create: '1' },
          buttonType: 'primary',
        },
        {
          label: text(isEnglish, 'Open Partners', '打开伙伴'),
          description: text(isEnglish, 'Return to the shared partner master when legal identity needs partner-side correction.', '当主体身份需要从伙伴侧修正时，直接回到共享伙伴主档。'),
          routeName: 'resPartner',
        },
        {
          label: text(isEnglish, 'Open Pricelists', '打开价目表'),
          description: text(isEnglish, 'Continue into pricing records that inherit company and currency scope.', '继续进入继承公司和币种范围的价目表记录。'),
          routeName: 'productPricelist',
        },
        cutoverSettingsLink(moduleKey, isEnglish),
      ],
      readinessItems: [
        {
          label: text(isEnglish, 'Ownership Baseline', '归属基线'),
          value: text(isEnglish, 'Ready', '已就绪'),
          description: text(isEnglish, 'Company references are already available to downstream master and transactional modules.', '公司引用已经可以提供给下游主数据和事务模块使用。'),
          tone: 'success',
        },
        {
          label: text(isEnglish, 'Shared Reference', '共享引用'),
          value: text(isEnglish, 'Visible', '可见'),
          description: text(isEnglish, 'Partner and currency context stay visible so ownership mismatches are easier to catch.', '伙伴和币种上下文都保持可见，方便尽早发现归属不一致。'),
          tone: 'success',
        },
        {
          label: text(isEnglish, 'Fallback Path', '回退路径'),
          value: text(isEnglish, 'Visible', '可见'),
          description: text(isEnglish, 'The company pilot can still be stopped and reopened from the cutover banner or settings.', '公司试点仍可从切换横幅和设置页停止或恢复。'),
          tone: 'warning',
        },
      ],
      pilotGuideItems: [
        {
          title: text(isEnglish, '1. Open The Legal Entity Master First', '1. 先打开法人主体主档'),
          description: text(isEnglish, 'Use one company record as the trusted ownership source before editing partner, pricing, or order records.', '在编辑伙伴、价格或订单记录之前，先把一条公司记录作为可信归属来源。'),
        },
        {
          title: text(isEnglish, '2. Verify Currency And Partner Link Together', '2. 一起核对币种和伙伴关联'),
          description: text(isEnglish, 'Check base currency and partner link together so downstream references inherit a consistent business identity.', '把基础币种和伙伴关联一起核对，保证下游引用继承一致的业务身份。'),
        },
        {
          title: text(isEnglish, '3. Reuse The Same Company In Pricing And Orders', '3. 在价格和订单里复用同一公司'),
          description: text(isEnglish, 'Once the company header is stable, let pricing, sales, and procurement reuse it instead of creating local workarounds.', '公司头做稳后，让价格、销售和采购统一复用，不要在局部再打补丁。'),
        },
      ],
      rollbackItems: [
        {
          title: text(isEnglish, '1. Disable The Company Pilot Entry', '1. 关闭公司试点入口'),
          description: text(isEnglish, 'Stop new company ownership changes from entering the pilot until existing records are reconciled.', '在现有记录核对完成前，先停止新的公司归属变更继续进入试点。'),
        },
        {
          title: text(isEnglish, '2. Export Touched Company Records', '2. 导出涉及变更的公司记录'),
          description: text(isEnglish, 'Keep the changed company list ready for reconciliation and fallback review.', '把改动过的公司清单保留下来，便于核对和回退审查。'),
        },
        {
          title: text(isEnglish, '3. Reopen Odoo As Ownership Fallback', '3. 恢复 Odoo 作为归属兜底入口'),
          description: text(isEnglish, 'If pilot ownership semantics drift, return to Odoo company maintenance while the trial is cleaned up.', '如果试点归属语义开始漂移，就回到 Odoo 维护公司，先清理当前试点数据。'),
        },
      ],
      reviewQueueTitle: text(isEnglish, 'Company Review Queue', '公司审核队列'),
      reviewQueueDescription: text(isEnglish, 'Prioritize company records that still block partner, pricing, or order ownership consistency.', '优先处理那些仍在阻塞伙伴、价格或订单归属一致性的公司记录。'),
      reviewQueueModuleKeys: ['resCompany', 'resPartner', 'saleOrder', 'purchaseOrder'],
      snapshotTitle: text(isEnglish, 'Company Snapshot', '公司快照'),
      sideCards: [
        {
          label: text(isEnglish, 'Reference Layer', '引用层'),
          value: text(isEnglish, 'Partner / Currency / Pricelist', '伙伴 / 币种 / 价目表'),
          description: text(isEnglish, 'Company records feed the first-wave master-data ownership layer.', '公司记录承接首批主数据的归属层。'),
        },
        {
          label: text(isEnglish, 'Pilot Priority', '试点优先级'),
          value: 'P0',
          description: text(isEnglish, 'Company maintenance stays inside the first-wave cutover scope.', '公司维护属于首批切换范围。'),
        },
        {
          label: text(isEnglish, 'Fallback Control', '回退控制'),
          value: text(isEnglish, 'Ready', '已接入'),
          description: text(isEnglish, 'Cutover controls stay visible from the module banner and settings page.', '切换控制已经在模块横幅和设置页可见。'),
        },
      ],
      reminderTitle: text(isEnglish, 'Ownership Reminder Feed', '归属提醒流'),
      reminderDescription: text(isEnglish, 'Keep partner and order-side ownership pressure visible while company baselines are still being stabilized.', '在公司基线仍在稳定时，让伙伴和订单侧的归属压力持续可见。'),
      reminderModuleKeys: ['resPartner', 'saleOrder', 'purchaseOrder'],
      guideTitle: text(isEnglish, 'Company Guide', '公司指引'),
      quickGuides: [
        {
          title: text(isEnglish, 'Stabilize The Header First', '先把主体头稳定'),
          description: text(isEnglish, 'Finish legal identity and currency checks before touching downstream masters.', '先核公司主体和币种，再改下游主数据。'),
        },
        {
          title: text(isEnglish, 'Use One Ownership Baseline', '只保留一条归属基线'),
          description: text(isEnglish, 'Avoid recreating company semantics in each downstream module.', '不要在每个下游模块里重复造一套公司语义。'),
        },
        {
          title: text(isEnglish, 'Follow Reminder Pressure', '盯住提醒压力'),
          description: text(isEnglish, 'Use partner and order reminders to find where company ownership gaps still leak downstream.', '通过伙伴和订单提醒，发现公司归属缺口是否仍在下游泄漏。'),
        },
      ],
    }
  }

  if (moduleKey === 'productTemplate') {
    return {
      title: text(isEnglish, 'Product Template Workbench', '产品模板工作台'),
      description: text(isEnglish, 'The first-wave product-template workbench for maintaining reusable catalog definitions before line-level sales and procurement scaling.', '首批产品模板工作台，负责在销售和采购放量前维护可复用的产品目录定义。'),
      note: text(isEnglish, 'Keep template attributes, category, and pricing context stable first; deeper inventory and manufacturing semantics stay downstream.', '先把模板属性、分类和价格上下文做稳，库存和制造深语义先留在下游。'),
      highlights: [
        {
          label: text(isEnglish, 'Catalog Role', '目录角色'),
          value: text(isEnglish, 'Reusable Product Definition', '可复用产品定义'),
          description: text(isEnglish, 'Templates are the upstream catalog layer for variants, pricing, sales, and procurement.', '模板是变体、价格、销售和采购的上游目录层。'),
        },
        {
          label: text(isEnglish, 'First-Wave Fit', '首批适配'),
          value: text(isEnglish, 'Master Data Candidate', '首批主数据候选'),
          description: text(isEnglish, 'Product templates are in the first-wave cutover scope because order lines depend on them directly.', '产品模板属于首批切换范围，因为订单行直接依赖它。'),
        },
        {
          label: text(isEnglish, 'Traceability', '追溯'),
          value: text(isEnglish, 'Category / Variant / Pricelist', '分类 / 变体 / 价目表'),
          description: text(isEnglish, 'The template workbench should keep category, variant, and pricing navigation close together.', '模板工作台要把分类、变体和价格导航维持在同一上下文。'),
        },
      ],
      focusItems: [
        {
          label: text(isEnglish, 'Catalog First', '目录优先'),
          description: text(isEnglish, 'Name, category, company, active flag, and sales availability should stay accurate before scaling item volume.', '在放大量之前，先把名称、分类、公司、启用标记和销售可用性做准确。'),
        },
        {
          label: text(isEnglish, 'Variant Boundary', '变体边界'),
          description: text(isEnglish, 'Templates should remain the reusable definition layer while variants handle SKU-level execution fields downstream.', '模板负责承接可复用定义层，SKU 级执行字段留给下游变体。'),
        },
        {
          label: text(isEnglish, 'Pricing Continuity', '价格连续性'),
          description: text(isEnglish, 'Category and template changes should remain visible to later pricelist maintenance.', '分类和模板变更要让后续价目表维护仍然看得见。'),
        },
      ],
      actionItems: [
        {
          label: text(isEnglish, 'Primary Work', '主工作'),
          value: text(isEnglish, 'Create / Edit / Categorize', '新建 / 编辑 / 分类'),
          description: text(isEnglish, 'Template maintenance stays focused on catalog upkeep and downstream readiness.', '模板维护先聚焦目录维护和下游就绪度。'),
        },
        {
          label: text(isEnglish, 'Mainline Usage', '主线使用'),
          value: text(isEnglish, 'Sales / Purchase / Pricing Reuse', '销售 / 采购 / 价格复用'),
          description: text(isEnglish, 'One product template should support both demand and supply sides in the first-wave pilot.', '一条产品模板要同时支撑首批试点中的销售和采购两侧。'),
        },
      ],
      quickLinkItems: [
        {
          label: text(isEnglish, 'Create Template', '新建模板'),
          description: text(isEnglish, 'Start a new catalog definition directly from the product-template workbench.', '直接从产品模板工作台发起新的目录定义。'),
          routeName: 'productTemplate',
          query: { create: '1' },
          buttonType: 'primary',
        },
        {
          label: text(isEnglish, 'Open Variants', '打开变体'),
          description: text(isEnglish, 'Move into SKU-level records once the template definition is stable.', '模板定义稳定后，继续进入 SKU 级产品变体。'),
          routeName: 'productProduct',
        },
        {
          label: text(isEnglish, 'Open Categories', '打开分类'),
          description: text(isEnglish, 'Return to category grouping when product hierarchy needs correction.', '当产品层级需要修正时，直接回到分类分组。'),
          routeName: 'productCategory',
        },
        {
          label: text(isEnglish, 'Open Pricelists', '打开价目表'),
          description: text(isEnglish, 'Continue into pricing setup after the product definition is ready.', '产品定义就绪后，继续进入价格设置。'),
          routeName: 'productPricelist',
        },
      ],
      readinessItems: [
        {
          label: text(isEnglish, 'Catalog Baseline', '目录基线'),
          value: text(isEnglish, 'Ready', '已就绪'),
          description: text(isEnglish, 'Template maintenance is ready to act as the upstream product baseline for first-wave orders.', '模板维护已经可以充当首批订单的上游产品基线。'),
          tone: 'success',
        },
        {
          label: text(isEnglish, 'Variant Linkage', '变体链接'),
          value: text(isEnglish, 'Visible', '可见'),
          description: text(isEnglish, 'Template-to-variant navigation stays on the same workbench path.', '模板到变体的导航已经留在同一工作台路径中。'),
          tone: 'success',
        },
        {
          label: text(isEnglish, 'Fallback Path', '回退路径'),
          value: text(isEnglish, 'Visible', '可见'),
          description: text(isEnglish, 'The product-template pilot can still be paused quickly if catalog semantics drift.', '如果目录语义开始漂移，产品模板试点仍可快速暂停。'),
          tone: 'warning',
        },
      ],
      pilotGuideItems: [
        {
          title: text(isEnglish, '1. Create The Catalog Definition First', '1. 先创建目录定义'),
          description: text(isEnglish, 'Use templates as the reusable product source before creating or editing downstream variants.', '先把模板作为可复用产品源，再去创建或编辑下游变体。'),
        },
        {
          title: text(isEnglish, '2. Verify Category, Company, And Availability', '2. 核分类、公司和可用性'),
          description: text(isEnglish, 'Check category, company ownership, and sales availability before the pilot team adds the template to orders.', '在试点团队把模板带进订单前，先核分类、公司归属和销售可用性。'),
        },
        {
          title: text(isEnglish, '3. Continue Into Variants Or Pricing From The Same Surface', '3. 继续从同一界面进入变体或价格'),
          description: text(isEnglish, 'Use direct links to keep product setup traceable instead of splitting the flow across search-heavy pages.', '直接沿链接继续，保持产品设置可追溯，不要再把流程拆散到重搜索页面里。'),
        },
      ],
      rollbackItems: [
        {
          title: text(isEnglish, '1. Stop New Template Changes From Entering The Pilot', '1. 停止新的模板变更进入试点'),
          description: text(isEnglish, 'Disable template edits inside the pilot before more orders inherit unstable catalog semantics.', '在更多订单继承不稳定目录语义前，先停掉模板试点编辑入口。'),
        },
        {
          title: text(isEnglish, '2. Export The Changed Template List', '2. 导出变更过的模板清单'),
          description: text(isEnglish, 'Keep changed template records ready for review, replay, or Odoo-side fallback.', '把改动过的模板清单保留下来，便于审查、回放或回退到 Odoo。'),
        },
        {
          title: text(isEnglish, '3. Reopen Odoo Product Catalog Maintenance', '3. 恢复 Odoo 产品目录维护'),
          description: text(isEnglish, 'If the pilot product baseline becomes unreliable, move template maintenance back to Odoo until cleanup is complete.', '如果试点产品基线不再可靠，就先把模板维护迁回 Odoo，等清理完成再继续。'),
        },
      ],
      reviewQueueTitle: text(isEnglish, 'Template Review Queue', '模板审核队列'),
      reviewQueueDescription: text(isEnglish, 'Prioritize templates that still block variant readiness, pricing alignment, or order entry consistency.', '优先处理仍在阻塞变体就绪、价格对齐或录单一致性的模板。'),
      reviewQueueModuleKeys: ['productTemplate', 'productProduct', 'saleOrder', 'purchaseOrder'],
      snapshotTitle: text(isEnglish, 'Template Snapshot', '模板快照'),
      sideCards: [
        {
          label: text(isEnglish, 'Upstream Role', '上游角色'),
          value: text(isEnglish, 'Catalog Source', '目录源'),
          description: text(isEnglish, 'Templates stay upstream from variants and pricing.', '模板位于变体和价格的上游。'),
        },
        {
          label: text(isEnglish, 'Cutover Priority', '切换优先级'),
          value: 'P0',
          description: text(isEnglish, 'Product setup stays in the first-wave cutover path.', '产品设置属于首批切换主线。'),
        },
        {
          label: text(isEnglish, 'Navigation', '导航'),
          value: text(isEnglish, 'Category / Variant / Pricelist', '分类 / 变体 / 价目表'),
          description: text(isEnglish, 'The workbench keeps related catalog surfaces one click away.', '工作台把相关目录界面维持在一跳可达。'),
        },
      ],
      reminderTitle: text(isEnglish, 'Demand And Supply Reminder Feed', '供需提醒流'),
      reminderDescription: text(isEnglish, 'Use sales, purchase, and transfer pressure to spot product templates that still cause downstream friction.', '通过销售、采购和调拨压力，发现仍在制造下游摩擦的产品模板。'),
      reminderModuleKeys: ['saleOrder', 'purchaseOrder', 'stockPicking'],
      guideTitle: text(isEnglish, 'Catalog Guide', '目录指引'),
      quickGuides: [
        {
          title: text(isEnglish, 'Define Once, Reuse Downstream', '一次定义，下游复用'),
          description: text(isEnglish, 'Keep the reusable product definition on the template layer.', '把可复用产品定义稳定留在模板层。'),
        },
        {
          title: text(isEnglish, 'Link Category Before Scale', '放量前先挂分类'),
          description: text(isEnglish, 'Category discipline keeps pricing and reporting more stable later.', '先把分类挂准，后续价格和统计才更稳。'),
        },
        {
          title: text(isEnglish, 'Follow Order Pressure', '跟着订单压力走'),
          description: text(isEnglish, 'Sales and purchase reminders reveal which templates need attention first.', '销售和采购提醒会告诉你哪些模板该优先处理。'),
        },
      ],
    }
  }

  if (moduleKey === 'productProduct') {
    return {
      title: text(isEnglish, 'Product Variant Workbench', '产品变体工作台'),
      description: text(isEnglish, 'The first-wave SKU workbench for keeping sellable and purchasable variants aligned with templates, stock execution, and order lines.', '首批 SKU 工作台，负责让可销售和可采购变体与模板、库存执行和订单行保持一致。'),
      note: text(isEnglish, 'Variants should stay as the SKU execution layer while templates, categories, and pricing continue to provide upstream context.', '变体要稳定承担 SKU 执行层，模板、分类和价格继续提供上游上下文。'),
      highlights: [
        {
          label: text(isEnglish, 'Execution Layer', '执行层'),
          value: text(isEnglish, 'SKU / Orders / Transfers', 'SKU / 订单 / 调拨'),
          description: text(isEnglish, 'Variants are the product records most likely to appear directly on first-wave order and transfer lines.', '变体是最容易直接出现在首批订单和调拨行上的产品记录。'),
        },
        {
          label: text(isEnglish, 'Traceability', '追溯'),
          value: text(isEnglish, 'Template / Picking / Orders', '模板 / 调拨 / 订单'),
          description: text(isEnglish, 'The SKU workbench should keep upstream template and downstream execution links visible.', 'SKU 工作台要把上游模板和下游执行链接持续暴露。'),
        },
        {
          label: text(isEnglish, 'Pilot Role', '试点角色'),
          value: text(isEnglish, 'Order-Line Ready', '订单行就绪'),
          description: text(isEnglish, 'Variant correctness matters because first-wave sales and purchase lines consume SKU records directly.', '变体正确性很关键，因为首批销售和采购行会直接消费 SKU 记录。'),
        },
      ],
      focusItems: [
        {
          label: text(isEnglish, 'SKU Identity', 'SKU 身份'),
          description: text(isEnglish, 'Name, default code, template link, category, and active state should stay accurate before order volume grows.', '在订单量扩大前，先把名称、编码、模板关联、分类和启用状态做准确。'),
        },
        {
          label: text(isEnglish, 'Execution Context', '执行上下文'),
          description: text(isEnglish, 'Variants should remain easy to trace into sales, procurement, and picking workflows.', '变体要能轻松追进销售、采购和调拨执行流程。'),
        },
        {
          label: text(isEnglish, 'Fallback Safety', '回退安全'),
          description: text(isEnglish, 'If SKU data drifts, operators should still be able to pause the pilot before more lines inherit the issue.', '如果 SKU 数据开始漂移，操作员要能在更多单据行继承问题前及时暂停试点。'),
        },
      ],
      actionItems: [
        {
          label: text(isEnglish, 'Primary Work', '主工作'),
          value: text(isEnglish, 'Create / Edit / Verify SKU', '新建 / 编辑 / 核 SKU'),
          description: text(isEnglish, 'Variant maintenance stays centered on SKU correctness and downstream execution readiness.', '变体维护先聚焦 SKU 正确性和下游执行就绪度。'),
        },
        {
          label: text(isEnglish, 'Mainline Usage', '主线使用'),
          value: text(isEnglish, 'Sales / Purchase / Transfer Reuse', '销售 / 采购 / 调拨复用'),
          description: text(isEnglish, 'One SKU record should support demand, supply, and logistics without needing duplicate maintenance paths.', '同一条 SKU 要同时支持需求、供给和物流，不再复制维护入口。'),
        },
      ],
      quickLinkItems: [
        {
          label: text(isEnglish, 'Create Variant', '新建变体'),
          description: text(isEnglish, 'Start a new SKU record directly from the variant workbench.', '直接从变体工作台发起新的 SKU 记录。'),
          routeName: 'productProduct',
          query: { create: '1' },
          buttonType: 'primary',
        },
        {
          label: text(isEnglish, 'Open Templates', '打开模板'),
          description: text(isEnglish, 'Return to the reusable product definition when SKU scope needs upstream correction.', '当 SKU 范围要做上游修正时，直接回到可复用产品模板。'),
          routeName: 'productTemplate',
        },
        {
          label: text(isEnglish, 'Open Sales Orders', '打开销售订单'),
          description: text(isEnglish, 'Check where a variant is used inside the sales pilot chain.', '查看某个变体在销售试点链里如何被使用。'),
          routeName: 'saleOrder',
        },
        {
          label: text(isEnglish, 'Open Transfers', '打开调拨'),
          description: text(isEnglish, 'Jump into stock execution when SKU routing or move readiness needs review.', '当 SKU 路由或 move 就绪度需要核查时，继续进入调拨执行。'),
          routeName: 'stockPicking',
        },
      ],
      readinessItems: [
        {
          label: text(isEnglish, 'SKU Readiness', 'SKU 就绪度'),
          value: text(isEnglish, 'Ready', '已就绪'),
          description: text(isEnglish, 'Variant records are ready to serve as order-line level product masters for the pilot.', '变体记录已经可以作为试点里的订单行级产品主档。'),
          tone: 'success',
        },
        {
          label: text(isEnglish, 'Execution Links', '执行链接'),
          value: text(isEnglish, 'Visible', '可见'),
          description: text(isEnglish, 'Transfers and order chains remain one jump away from the SKU surface.', '调拨和订单链都保持在 SKU 界面的一跳范围内。'),
          tone: 'success',
        },
        {
          label: text(isEnglish, 'Fallback Path', '回退路径'),
          value: text(isEnglish, 'Visible', '可见'),
          description: text(isEnglish, 'The SKU pilot can be paused before more sales or purchase rows inherit bad data.', '在更多销售或采购行继承错误数据前，SKU 试点仍可暂停。'),
          tone: 'warning',
        },
      ],
      pilotGuideItems: [
        {
          title: text(isEnglish, '1. Start From The Template, Then Stabilize The SKU', '1. 先从模板出发，再稳定 SKU'),
          description: text(isEnglish, 'Use the template as the source definition, then verify the variant as the real execution record.', '先把模板当作来源定义，再把变体核成真实执行记录。'),
        },
        {
          title: text(isEnglish, '2. Verify Code, Category, And Availability', '2. 核编码、分类和可用性'),
          description: text(isEnglish, 'Make sure each SKU can be found, categorized, and used correctly before it reaches order lines.', '先保证每个 SKU 能被准确检索、分类和使用，再让它进入订单行。'),
        },
        {
          title: text(isEnglish, '3. Follow Order And Picking Links From The Same Shell', '3. 在同一壳层里继续看订单和调拨链接'),
          description: text(isEnglish, 'Use direct module links to keep SKU debugging and business execution tightly connected.', '通过直接模块链接，把 SKU 排查和业务执行保持在紧密相连的路径中。'),
        },
      ],
      rollbackItems: [
        {
          title: text(isEnglish, '1. Stop New SKU Changes From The Pilot', '1. 停止新的 SKU 变更进入试点'),
          description: text(isEnglish, 'Pause variant maintenance before more order rows inherit unstable SKU data.', '在更多订单行继承不稳定 SKU 数据前，先暂停变体试点维护。'),
        },
        {
          title: text(isEnglish, '2. Export The Affected SKU List', '2. 导出受影响 SKU 清单'),
          description: text(isEnglish, 'Keep touched SKU records ready for reconciliation, replay, or Odoo-side repair.', '把受影响 SKU 清单保留下来，便于核对、回放或回到 Odoo 修复。'),
        },
        {
          title: text(isEnglish, '3. Reopen Odoo Product Maintenance If Needed', '3. 必要时恢复 Odoo 产品维护'),
          description: text(isEnglish, 'If variant data quality slips, reopen the Odoo product path until the pilot records are cleaned.', '如果变体数据质量开始滑坡，就先恢复 Odoo 产品入口，等试点记录清理完再继续。'),
        },
      ],
      reviewQueueTitle: text(isEnglish, 'Variant Review Queue', '变体审核队列'),
      reviewQueueDescription: text(isEnglish, 'Prioritize SKU records that still create sales, procurement, or transfer-side execution pressure.', '优先处理仍在制造销售、采购或调拨执行压力的 SKU。'),
      reviewQueueModuleKeys: ['productProduct', 'saleOrder', 'purchaseOrder', 'stockPicking'],
      snapshotTitle: text(isEnglish, 'Variant Snapshot', '变体快照'),
      sideCards: [
        {
          label: text(isEnglish, 'Execution Layer', '执行层'),
          value: text(isEnglish, 'SKU Master', 'SKU 主档'),
          description: text(isEnglish, 'Variants carry the SKU-level business identity.', '变体承接 SKU 级业务身份。'),
        },
        {
          label: text(isEnglish, 'Trace Links', '追溯链接'),
          value: text(isEnglish, 'Template / Orders / Transfers', '模板 / 订单 / 调拨'),
          description: text(isEnglish, 'The workbench keeps upstream and downstream links visible.', '工作台把上游和下游链接都维持可见。'),
        },
        {
          label: text(isEnglish, 'Cutover Priority', '切换优先级'),
          value: 'P0',
          description: text(isEnglish, 'SKU correctness stays in the first-wave product scope.', 'SKU 正确性属于首批产品切换范围。'),
        },
      ],
      reminderTitle: text(isEnglish, 'SKU Pressure Feed', 'SKU 压力提醒流'),
      reminderDescription: text(isEnglish, 'Use sales, purchase, and transfer reminders to find which SKUs need cleanup first.', '通过销售、采购和调拨提醒，找到最该先清理的 SKU。'),
      reminderModuleKeys: ['saleOrder', 'purchaseOrder', 'stockPicking'],
      guideTitle: text(isEnglish, 'SKU Guide', 'SKU 指引'),
      quickGuides: [
        {
          title: text(isEnglish, 'Treat Variants As Execution Records', '把变体当执行记录'),
          description: text(isEnglish, 'Keep SKU-level corrections close to the variant layer, not scattered into orders.', 'SKU 级修正尽量收敛在变体层，不要散到订单里。'),
        },
        {
          title: text(isEnglish, 'Trace Back To Template When Needed', '必要时回到模板'),
          description: text(isEnglish, 'If many SKUs share the same issue, fix the upstream template context too.', '如果很多 SKU 共享同类问题，也要回头修模板上下文。'),
        },
        {
          title: text(isEnglish, 'Watch Transfer Pressure', '盯住调拨压力'),
          description: text(isEnglish, 'Stock execution reminders often reveal SKU issues earlier than reports do.', '库存执行提醒往往比报表更早暴露 SKU 问题。'),
        },
      ],
    }
  }

  if (moduleKey === 'productCategory') {
    return {
      title: text(isEnglish, 'Product Category Workbench', '产品分类工作台'),
      description: text(isEnglish, 'The first-wave category workbench for stabilizing product grouping before scaling templates, variants, and pricing semantics.', '首批产品分类工作台，负责在模板、变体和价格语义扩大前稳定产品分组。'),
      note: text(isEnglish, 'Categories remain lightweight, but they should still anchor product hierarchy and later pricing discipline.', '分类虽然轻量，但仍要稳定承接产品层级和后续价格纪律。'),
      highlights: [
        {
          label: text(isEnglish, 'Grouping Role', '分组角色'),
          value: text(isEnglish, 'Catalog Hierarchy', '目录层级'),
          description: text(isEnglish, 'Categories keep the product tree understandable before deeper reporting arrives.', '在更深报表能力落地前，分类先让产品树保持可理解。'),
        },
        {
          label: text(isEnglish, 'Upstream Scope', '上游范围'),
          value: text(isEnglish, 'Templates / Variants / Pricelists', '模板 / 变体 / 价目表'),
          description: text(isEnglish, 'Category discipline helps templates, variants, and pricing stay aligned.', '分类纪律可以帮助模板、变体和价格持续对齐。'),
        },
        {
          label: text(isEnglish, 'Pilot Value', '试点价值'),
          value: text(isEnglish, 'Search And Consistency', '检索与一致性'),
          description: text(isEnglish, 'A stable category layer reduces lookup noise across first-wave master data.', '稳定的分类层能减少首批主数据里的检索噪音。'),
        },
      ],
      focusItems: [
        {
          label: text(isEnglish, 'Hierarchy First', '层级优先'),
          description: text(isEnglish, 'Keep parent-child structure and active state consistent before extending deep analytics.', '在扩深分析前，先把父子层级和启用状态保持一致。'),
        },
        {
          label: text(isEnglish, 'Catalog Discipline', '目录纪律'),
          description: text(isEnglish, 'Templates and variants should converge on the same category semantics instead of improvising labels.', '模板和变体要收敛到同一分类语义，不再临时造标签。'),
        },
        {
          label: text(isEnglish, 'Fallback Safe', '回退安全'),
          description: text(isEnglish, 'If category semantics start drifting, the pilot should still be easy to pause and review.', '如果分类语义开始漂移，试点仍要容易暂停和审查。'),
        },
      ],
      actionItems: [
        {
          label: text(isEnglish, 'Primary Work', '主工作'),
          value: text(isEnglish, 'Create / Edit / Reorganize', '新建 / 编辑 / 重组'),
          description: text(isEnglish, 'Category maintenance stays focused on hierarchy and grouping quality.', '分类维护先聚焦层级和分组质量。'),
        },
        {
          label: text(isEnglish, 'Mainline Usage', '主线使用'),
          value: text(isEnglish, 'Template / Variant / Pricing Alignment', '模板 / 变体 / 价格对齐'),
          description: text(isEnglish, 'One category tree should support all first-wave product masters.', '一套分类树要支撑全部首批产品主数据。'),
        },
      ],
      quickLinkItems: [
        {
          label: text(isEnglish, 'Create Category', '新建分类'),
          description: text(isEnglish, 'Start a new catalog group directly from the category workbench.', '直接从分类工作台发起新的目录分组。'),
          routeName: 'productCategory',
          query: { create: '1' },
          buttonType: 'primary',
        },
        {
          label: text(isEnglish, 'Open Templates', '打开模板'),
          description: text(isEnglish, 'Check templates that inherit or depend on the category tree.', '查看继承该分类树的产品模板。'),
          routeName: 'productTemplate',
        },
        {
          label: text(isEnglish, 'Open Variants', '打开变体'),
          description: text(isEnglish, 'Continue into SKU records when product grouping needs downstream verification.', '当产品分组需要下游核查时，继续进入 SKU 记录。'),
          routeName: 'productProduct',
        },
        {
          label: text(isEnglish, 'Open Pricelists', '打开价目表'),
          description: text(isEnglish, 'Review pricing discipline after category hierarchy changes.', '分类层级变更后，继续核价格纪律。'),
          routeName: 'productPricelist',
        },
      ],
      readinessItems: [
        {
          label: text(isEnglish, 'Hierarchy Baseline', '层级基线'),
          value: text(isEnglish, 'Ready', '已就绪'),
          description: text(isEnglish, 'Category maintenance is ready to support first-wave catalog organization.', '分类维护已经可以支撑首批目录组织。'),
          tone: 'success',
        },
        {
          label: text(isEnglish, 'Cross-Module Consistency', '跨模块一致性'),
          value: text(isEnglish, 'Visible', '可见'),
          description: text(isEnglish, 'Category-driven consistency stays visible across templates, variants, and pricing.', '分类驱动的一致性已经在模板、变体和价格之间可见。'),
          tone: 'success',
        },
        {
          label: text(isEnglish, 'Fallback Path', '回退路径'),
          value: text(isEnglish, 'Visible', '可见'),
          description: text(isEnglish, 'The category pilot can still be paused before taxonomy drift spreads wider.', '在分类漂移扩散更广前，分类试点仍可暂停。'),
          tone: 'warning',
        },
      ],
      pilotGuideItems: [
        {
          title: text(isEnglish, '1. Start With The Category Tree', '1. 先从分类树入手'),
          description: text(isEnglish, 'Treat product grouping as an upstream discipline before editing many templates or SKUs.', '在大量编辑模板或 SKU 前，先把产品分组当作上游纪律建立起来。'),
        },
        {
          title: text(isEnglish, '2. Verify Parent Structure And Active Scope', '2. 核父级结构和启用范围'),
          description: text(isEnglish, 'Keep the parent tree clean so later catalog, pricing, and search behavior remain predictable.', '把父级树理顺，后续目录、价格和搜索行为才更可预测。'),
        },
        {
          title: text(isEnglish, '3. Continue Into Templates And Pricing From The Same Path', '3. 继续沿同一路径进入模板和价格'),
          description: text(isEnglish, 'Use direct links instead of spreading category cleanup across many detached pages.', '通过直达链接继续，不要把分类清理工作散落到多个割裂页面。'),
        },
      ],
      rollbackItems: [
        {
          title: text(isEnglish, '1. Pause New Category Changes', '1. 暂停新的分类变更'),
          description: text(isEnglish, 'Stop new taxonomy edits before more product masters inherit unstable grouping.', '在更多产品主档继承不稳定分组前，先停掉新的分类编辑。'),
        },
        {
          title: text(isEnglish, '2. Export The Changed Category Tree', '2. 导出变更过的分类树'),
          description: text(isEnglish, 'Keep the touched category list ready for reconciliation and Odoo-side replay if needed.', '把变更过的分类树保留下来，便于核对，必要时回放到 Odoo。'),
        },
        {
          title: text(isEnglish, '3. Restore Odoo Taxonomy Maintenance', '3. 恢复 Odoo 分类维护'),
          description: text(isEnglish, 'If category structure quality degrades, move taxonomy maintenance back to Odoo until cleanup completes.', '如果分类结构质量开始下降，就先把分类维护迁回 Odoo，等清理完再继续。'),
        },
      ],
      reviewQueueTitle: text(isEnglish, 'Category Review Queue', '分类审核队列'),
      reviewQueueDescription: text(isEnglish, 'Prioritize category records that still create confusion across templates, variants, or pricing rules.', '优先处理那些仍在给模板、变体或价格规则制造混乱的分类记录。'),
      reviewQueueModuleKeys: ['productCategory', 'productTemplate', 'productProduct', 'productPricelist'],
      snapshotTitle: text(isEnglish, 'Category Snapshot', '分类快照'),
      sideCards: [
        {
          label: text(isEnglish, 'Hierarchy', '层级'),
          value: text(isEnglish, 'Parent / Child', '父 / 子'),
          description: text(isEnglish, 'The category tree stays lightweight but foundational.', '分类树保持轻量，但属于基础能力。'),
        },
        {
          label: text(isEnglish, 'Cutover Priority', '切换优先级'),
          value: 'P0',
          description: text(isEnglish, 'Category structure supports the first-wave product baseline.', '分类结构支撑首批产品基线。'),
        },
        {
          label: text(isEnglish, 'Downstream Links', '下游链接'),
          value: text(isEnglish, 'Templates / Variants / Pricelists', '模板 / 变体 / 价目表'),
          description: text(isEnglish, 'The workbench keeps grouped product surfaces close.', '工作台把关联产品界面维持在近处。'),
        },
      ],
      reminderTitle: text(isEnglish, 'Catalog Drift Feed', '目录漂移提醒流'),
      reminderDescription: text(isEnglish, 'Use sales and purchase pressure to detect category drift before it becomes broad data debt.', '通过销售和采购压力，尽早发现分类漂移，别让它变成更大的数据债。'),
      reminderModuleKeys: ['saleOrder', 'purchaseOrder'],
      guideTitle: text(isEnglish, 'Category Guide', '分类指引'),
      quickGuides: [
        {
          title: text(isEnglish, 'Fix The Tree Before Volume Grows', '放量前先理树'),
          description: text(isEnglish, 'A clean category hierarchy reduces downstream confusion later.', '先把分类树理顺，后面会少很多混乱。'),
        },
        {
          title: text(isEnglish, 'Keep Labels Consistent', '标签保持一致'),
          description: text(isEnglish, 'Do not let templates or SKUs invent alternative category semantics.', '不要让模板或 SKU 自己发明另一套分类语义。'),
        },
        {
          title: text(isEnglish, 'Watch Order Pressure', '看订单压力'),
          description: text(isEnglish, 'Order-side reminders reveal where category cleanup should start.', '订单侧提醒会暴露该从哪里先开始清分类。'),
        },
      ],
    }
  }

  return {
    title: text(isEnglish, 'Pricelist Workbench', '价目表工作台'),
    description: text(isEnglish, 'The first-wave pricing workbench for keeping customer-facing price rules aligned with company, currency, partner, and product masters.', '首批价目表工作台，负责让面向客户的价格规则与公司、币种、伙伴和产品主档保持一致。'),
    note: text(isEnglish, 'Keep pricing simple and traceable first; deeper promotion and discount engines stay out of the current pilot scope.', '先把价格做简单且可追溯，复杂促销和折扣引擎先不进入当前试点。'),
    highlights: [
      {
        label: text(isEnglish, 'Pricing Role', '价格角色'),
        value: text(isEnglish, 'Quote Baseline', '报价基线'),
        description: text(isEnglish, 'Pricelists stay close to the first-wave sales chain because quotes and orders rely on them directly.', '价目表紧贴首批销售链，因为报价和订单会直接依赖它。'),
      },
      {
        label: text(isEnglish, 'Reference Scope', '引用范围'),
        value: text(isEnglish, 'Company / Currency / Product', '公司 / 币种 / 产品'),
        description: text(isEnglish, 'Pricing rules should remain visibly tied to company, currency, and product definitions.', '价格规则要持续和公司、币种、产品定义保持可见关联。'),
      },
      {
        label: text(isEnglish, 'Pilot Goal', '试点目标'),
        value: text(isEnglish, 'Traceable Quote Rules', '可追溯报价规则'),
        description: text(isEnglish, 'The pricing workbench should make it obvious which rule set supports first-wave quoting.', '价格工作台要让首批报价依赖的是哪套规则足够直观。'),
      },
    ],
    focusItems: [
      {
        label: text(isEnglish, 'Currency And Company', '币种与公司'),
        description: text(isEnglish, 'Keep company and currency references explicit before layering on deeper pricing logic.', '在叠加更深价格逻辑前，先把公司和币种引用保持显式且准确。'),
      },
      {
        label: text(isEnglish, 'Customer-Facing Simplicity', '面向客户的简洁性'),
        description: text(isEnglish, 'Use simple, explainable pricing records while the first-wave sales pilot is still stabilizing.', '在首批销售试点还在稳定时，先用简单可解释的价格记录。'),
      },
      {
        label: text(isEnglish, 'Fallback Ready', '可回退'),
        description: text(isEnglish, 'If quote behavior becomes unclear, the pricing pilot should still be easy to pause and review.', '如果报价行为开始变得不清晰，价格试点仍要容易暂停和审查。'),
      },
    ],
    actionItems: [
      {
        label: text(isEnglish, 'Primary Work', '主工作'),
        value: text(isEnglish, 'Create / Edit / Verify Scope', '新建 / 编辑 / 核范围'),
        description: text(isEnglish, 'Pricelist maintenance stays centered on visible scope and rule correctness.', '价目表维护先聚焦可见范围和规则正确性。'),
      },
      {
        label: text(isEnglish, 'Mainline Usage', '主线使用'),
        value: text(isEnglish, 'Partner / Sales / Product Reuse', '伙伴 / 销售 / 产品复用'),
        description: text(isEnglish, 'One pricing baseline should support partners, quotes, and product reviews without manual search detours.', '同一套价格基线要同时服务伙伴、报价和产品审查，不再靠手动搜索绕路。'),
      },
    ],
    quickLinkItems: [
      {
        label: text(isEnglish, 'Create Pricelist', '新建价目表'),
        description: text(isEnglish, 'Start a new pricing record directly from the first-wave pricing surface.', '直接从首批价格界面发起新的价目表记录。'),
        routeName: 'productPricelist',
        query: { create: '1' },
        buttonType: 'primary',
      },
      {
        label: text(isEnglish, 'Open Partners', '打开伙伴'),
        description: text(isEnglish, 'Return to partner master data when pricing scope depends on customer identity or ownership.', '当价格范围依赖客户身份或归属时，直接回到伙伴主档。'),
        routeName: 'resPartner',
      },
      {
        label: text(isEnglish, 'Open Sales Orders', '打开销售订单'),
        description: text(isEnglish, 'Continue into quoting and order entry after price rules are ready.', '价格规则就绪后，继续进入报价和销售录单。'),
        routeName: 'saleOrder',
      },
      {
        label: text(isEnglish, 'Open Product Templates', '打开产品模板'),
        description: text(isEnglish, 'Recheck product definitions when pricing context becomes ambiguous.', '当价格上下文变得模糊时，回头核产品模板定义。'),
        routeName: 'productTemplate',
      },
    ],
    readinessItems: [
      {
        label: text(isEnglish, 'Quote Baseline', '报价基线'),
        value: text(isEnglish, 'Ready', '已就绪'),
        description: text(isEnglish, 'Pricelist records are ready to support first-wave sales quoting with visible scope.', '价目表记录已经可以在可见范围内支撑首批销售报价。'),
        tone: 'success',
      },
      {
        label: text(isEnglish, 'Cross-Reference Scope', '交叉引用范围'),
        value: text(isEnglish, 'Visible', '可见'),
        description: text(isEnglish, 'Company, currency, partner, and product navigation stays within the same pricing path.', '公司、币种、伙伴和产品导航都留在同一价格路径内。'),
        tone: 'success',
      },
      {
        label: text(isEnglish, 'Fallback Path', '回退路径'),
        value: text(isEnglish, 'Visible', '可见'),
        description: text(isEnglish, 'The pricing pilot can still be paused if quote logic becomes risky or confusing.', '如果报价逻辑变得有风险或不清晰，价格试点仍可暂停。'),
        tone: 'warning',
      },
    ],
    pilotGuideItems: [
      {
        title: text(isEnglish, '1. Start From Company, Currency, And Product Context', '1. 先从公司、币种和产品上下文开始'),
        description: text(isEnglish, 'Treat pricing as a scoped master-data layer, not as detached spreadsheet-like exceptions.', '把价格当成有边界的主数据层，而不是脱离上下文的表格例外。'),
      },
      {
        title: text(isEnglish, '2. Keep Rules Explainable Before Quoting', '2. 在报价前保证规则可解释'),
        description: text(isEnglish, 'Use clear pricing records so the sales pilot can explain why an order used a certain price.', '让价格记录足够清晰，销售试点才能解释某张单为什么用了这个价格。'),
      },
      {
        title: text(isEnglish, '3. Follow The Same Path Into Sales And Partner Review', '3. 沿同一路径继续进入销售和伙伴审查'),
        description: text(isEnglish, 'Use direct links to keep pricing, quoting, and partner context in one visible chain.', '通过直达链接，把价格、报价和伙伴上下文收进同一条可见链路。'),
      },
    ],
    rollbackItems: [
      {
        title: text(isEnglish, '1. Pause New Pricing Changes', '1. 暂停新的价格变更'),
        description: text(isEnglish, 'Stop new pricelist edits before more quotes inherit uncertain rules.', '在更多报价继承不确定规则前，先停掉新的价目表编辑。'),
      },
      {
        title: text(isEnglish, '2. Export The Changed Pricelist Set', '2. 导出变更过的价目表集合'),
        description: text(isEnglish, 'Keep changed pricing records ready for reconciliation and fallback handling.', '把改动过的价格记录保留下来，便于核对和回退处理。'),
      },
      {
        title: text(isEnglish, '3. Reopen Odoo Pricing Entry', '3. 恢复 Odoo 价格入口'),
        description: text(isEnglish, 'If quote semantics drift, return pricing maintenance to Odoo until the pilot data is reviewed.', '如果报价语义开始漂移，就先把价格维护回退到 Odoo，等试点数据审完再继续。'),
      },
    ],
    reviewQueueTitle: text(isEnglish, 'Pricelist Review Queue', '价目表审核队列'),
    reviewQueueDescription: text(isEnglish, 'Prioritize pricing records that still create quote friction, partner confusion, or product mismatch.', '优先处理仍在制造报价摩擦、伙伴困惑或产品不匹配的价格记录。'),
    reviewQueueModuleKeys: ['productPricelist', 'saleOrder', 'resPartner', 'productTemplate'],
    snapshotTitle: text(isEnglish, 'Pricing Snapshot', '价格快照'),
    sideCards: [
      {
        label: text(isEnglish, 'Quote Role', '报价角色'),
        value: text(isEnglish, 'Pricing Baseline', '价格基线'),
        description: text(isEnglish, 'Pricelists support first-wave quoting and order entry.', '价目表支撑首批报价和录单。'),
      },
      {
        label: text(isEnglish, 'Reference Scope', '引用范围'),
        value: text(isEnglish, 'Company / Currency / Product', '公司 / 币种 / 产品'),
        description: text(isEnglish, 'Scope visibility keeps pricing explainable.', '范围可见性能让价格更可解释。'),
      },
      {
        label: text(isEnglish, 'Cutover Priority', '切换优先级'),
        value: 'P0',
        description: text(isEnglish, 'Pricing remains in the first-wave master-data candidate list.', '价格仍属于首批主数据候选清单。'),
      },
    ],
    reminderTitle: text(isEnglish, 'Quote Pressure Feed', '报价压力提醒流'),
    reminderDescription: text(isEnglish, 'Use partner and sales reminders to discover which price records should be reviewed first.', '通过伙伴和销售提醒，发现哪些价格记录应该优先复核。'),
    reminderModuleKeys: ['resPartner', 'saleOrder'],
    guideTitle: text(isEnglish, 'Pricing Guide', '价格指引'),
    quickGuides: [
      {
        title: text(isEnglish, 'Keep Pricing Explainable', '价格要能解释'),
        description: text(isEnglish, 'Simple visible rules are better than hidden exceptions during the pilot.', '试点阶段，简单可见的规则比隐形例外更重要。'),
      },
      {
        title: text(isEnglish, 'Tie Rules Back To Product Context', '规则要回到产品上下文'),
        description: text(isEnglish, 'When pricing looks wrong, inspect product and company scope from the same path.', '当价格看起来不对时，要沿同一路径核产品和公司范围。'),
      },
      {
        title: text(isEnglish, 'Follow Quote Pressure', '跟着报价压力走'),
        description: text(isEnglish, 'Sales and partner reminders help locate the most urgent pricing gaps.', '销售和伙伴提醒能更快定位最紧急的价格缺口。'),
      },
    ],
  }
}
