<script setup lang="ts">
import { computed } from 'vue'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import FirstWavePlaybookPanel from '@/components/FirstWavePlaybookPanel.vue'
import FirstWaveEvidencePanel from '@/components/FirstWaveEvidencePanel.vue'
import ReminderSummaryPanel from '@/components/ReminderSummaryPanel.vue'
import PilotReviewQueuePanel from '@/components/PilotReviewQueuePanel.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import RelationshipMemoryPanel from '@/components/RelationshipMemoryPanel.vue'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'
import { buildFirstWavePlaybook } from '@/utils/first-wave-playbook'
import { buildFirstWaveWorkbenchShortcuts } from '@/utils/first-wave-workbench-shortcuts'

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const playbook = computed(() => buildFirstWavePlaybook('saleOrder', isEnglish.value))
const cockpitShortcutItems = computed(() => buildFirstWaveWorkbenchShortcuts('saleOrder', isEnglish.value))

const highlights = computed(() =>
  isEnglish.value
    ? [
        { label: 'Mainline Chain', value: 'Quote / Delivery / Invoice', description: 'Sales orders stay at the center of the first-wave chain and should expose picking and invoice traceability without extra navigation.' },
        { label: 'Pilot Actions', value: 'Confirm / Create Invoice', description: 'The primary actions remain confirm and invoice creation, matching the current cutover guardrail scope.' },
        { label: 'Traceability', value: 'Picking / Move / Payment', description: 'Downstream stock and invoice objects should always stay reachable from the same workbench context.' },
      ]
    : [
        { label: '主链路', value: '报价 / 出库 / 开票', description: '销售订单是首批主链中心，必须在同一工作台里暴露出库和发票追溯。' },
        { label: '试点动作', value: '确认 / 创建发票', description: '当前主动作保持为确认和开票，和现阶段切换 guardrail 范围一致。' },
        { label: '追溯性', value: '出库 / 移动 / 付款', description: '下游库存和发票对象要始终能从同一工作台上下文继续打开。' },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Customer First', description: 'Order header, owner, amount, and state should stay stable before adding deeper sales analytics.' },
        { label: 'Line To Artifact', description: 'Order lines drive picking and invoice artifacts, so line maintenance and artifact review must stay on one page.' },
        { label: 'Rollback Safe', description: 'Repeated confirm or invoice actions must remain idempotent and should not leave stale stock moves or invoice totals.' },
      ]
    : [
        { label: '客户优先', description: '在做更深销售分析前，先把订单头、负责人、金额和状态做稳。' },
        { label: '从订单行到结果对象', description: '订单行驱动出库和发票结果对象，所以明细维护和结果审查要放在同一页。' },
        { label: '回退安全', description: '重复确认和重复开票必须保持幂等，不能留下陈旧 stock move 或错误金额。' },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Primary Action', value: 'Confirm', description: 'Confirm turns draft demand into delivery artifacts and is the first critical pilot action.' },
        { label: 'Secondary Action', value: 'Create Invoice', description: 'Invoice creation should remain available after confirmation without leaving the sales workspace.' },
      ]
    : [
        { label: '主动作', value: 'Confirm', description: '确认会把草稿需求转成出库结果对象，是首批试点中的关键动作。' },
        { label: '次动作', value: 'Create Invoice', description: '确认后应能在同一销售工作台继续创建发票。' },
      ],
)

const sideCards = computed(() =>
  isEnglish.value
    ? [
        { label: 'Chain State', value: 'First-Wave', description: 'Sales chain is one of the first pilot cutover paths and should stay ahead of secondary modules.' },
        { label: 'Artifact Links', value: 'Ready', description: 'Picking and invoice reference fields are already wired into the shared detail shell.' },
        { label: 'Timeline', value: 'Ready', description: 'Sales order detail already exposes timeline context for logs, notes, and attachments.' },
      ]
    : [
        { label: '链路状态', value: '首批切换', description: '销售链是首批试点切换路径之一，优先级高于二线模块。' },
        { label: '结果对象链接', value: '已接入', description: '出库和发票引用字段已经接进共享详情壳。' },
        { label: 'Timeline', value: '已接入', description: '销售订单详情已经能看到日志、便签和附件时间轴。' },
      ],
)

const quickGuides = computed(() =>
  isEnglish.value
    ? [
        { title: 'Draft Before Confirm', description: 'Complete customer, owner, date, and order lines before confirming to avoid unnecessary artifact churn.' },
        { title: 'Review Picking First', description: 'After confirmation, jump into the generated transfer object before moving on to invoice checks.' },
        { title: 'Keep Invoice Trace Close', description: 'Use invoice references in the same workbench instead of searching manually for downstream billing objects.' },
      ]
    : [
        { title: '确认前先补草稿', description: '先把客户、负责人、日期和订单行补齐，再确认，减少后续结果对象抖动。' },
        { title: '先审查出库对象', description: '确认后先打开生成的调拨对象，再继续检查开票链。' },
        { title: '让发票追溯留在同页', description: '通过同一工作台里的发票引用继续下钻，不再手动搜索下游账单。' },
      ],
)

const quickLinkItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Create Sales Order', description: 'Start a new first-wave sales record without leaving the sales workbench.', routeName: 'saleOrder', query: { create: '1' }, buttonType: 'primary' },
        { label: 'Open Transfers', description: 'Jump straight into downstream picking execution from the same pilot surface.', routeName: 'stockPicking', query: { section: 'ops-execution-feedback' } },
        { label: 'Open Invoices', description: 'Continue into invoice posting and payment follow-up without manual search hops.', routeName: 'accountInvoice', query: { section: 'ops-settlement' } },
        { label: 'Open Payments', description: 'Move straight into settlement closure after billing starts to avoid fragmenting the sales chain.', routeName: 'accountPayment', query: { section: 'ops-payment-linkage' } },
        { label: 'Open Partner Master', description: 'Return to partner master data when upstream identity fields need correction.', routeName: 'resPartner', query: { section: 'ops-evidence' } },
      ]
    : [
        { label: '新建销售订单', description: '不离开销售工作台，直接发起新的首批销售单据。', routeName: 'saleOrder', query: { create: '1' }, buttonType: 'primary' },
        { label: '打开调拨', description: '从同一试点界面直接跳到下游调拨执行。', routeName: 'stockPicking', query: { section: 'ops-execution-feedback' } },
        { label: '打开发票', description: '继续进入发票过账和付款跟进，不再手动搜索。', routeName: 'accountInvoice', query: { section: 'ops-settlement' } },
        { label: '打开付款', description: '在开票开始后继续进入结算闭环，避免销售链在不同页面里断裂。', routeName: 'accountPayment', query: { section: 'ops-payment-linkage' } },
        { label: '打开伙伴主档', description: '当上游身份字段需要修正时，直接回到伙伴主数据。', routeName: 'resPartner', query: { section: 'ops-evidence' } },
      ],
)

const readinessItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Delivery Traceability', value: 'Ready', description: 'Picking and stock move references are already exposed in the sales detail shell.', tone: 'success' },
        { label: 'Billing Traceability', value: 'Ready', description: 'Invoice creation and downstream references can already be followed from the workbench.', tone: 'success' },
        { label: 'Rollback Control', value: 'Visible', description: 'Sales pilot operators can stop the module directly from the cutover banner.', tone: 'warning' },
      ]
    : [
        { label: '出库追溯', value: '已就绪', description: '调拨和 stock move 引用已经在销售详情壳中暴露。', tone: 'success' },
        { label: '开票追溯', value: '已就绪', description: '创建发票和下游引用已经能从工作台继续跟进。', tone: 'success' },
        { label: '回退控制', value: '可见', description: '销售试点操作员可以直接从切换横幅停止当前模块。', tone: 'warning' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Sales Order Workbench' : '销售订单工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'The first-wave sales chain workbench that keeps order header, lines, delivery artifacts, and invoice links in one context.'
    : '首批销售链工作台，把订单头、订单行、出库结果对象和发票链接收进同一上下文。',
)
const note = computed(() =>
  isEnglish.value
    ? 'This page should stay focused on first-wave sales cutover, not on expanding secondary sales features.'
    : '这个页面要始终聚焦首批销售切换，不要被二线销售功能分散。'
)

const pilotGuideItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Prepare Draft Header And Order Lines', description: 'Complete customer, owner, date, and lines before confirmation so the pilot chain produces stable delivery and invoice artifacts.' },
        { title: '2. Confirm And Review Delivery Objects', description: 'After confirmation, inspect the generated picking and operation rows from the same workbench before moving to billing.' },
        { title: '3. Create Invoice From The Same Chain', description: 'Use the invoice action and follow the generated reference instead of switching to accounting search manually.' },
      ]
    : [
        { title: '1. 先补齐草稿头和订单行', description: '确认前先把客户、负责人、日期和订单行补齐，保证试点链产出稳定的出库和发票结果对象。' },
        { title: '2. 确认后先审查出库对象', description: '确认后直接在同一工作台检查生成的调拨和操作行，再继续开票。' },
        { title: '3. 在同一链路里创建发票', description: '通过发票动作和生成引用继续下钻，不再手动切去会计搜索。' },
      ],
)

const rollbackItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Disable The Sales Pilot Entry', description: 'Stop new sales orders from entering the pilot route through the cutover switch.' },
        { title: '2. Export Orders And Generated References', description: 'Keep the sales order, picking reference, and invoice reference list for reconciliation and fallback handling.' },
        { title: '3. Reopen Odoo Sales Entry', description: 'Let the pilot team return to Odoo sales entry while existing trial objects are checked and cleaned.' },
      ]
    : [
        { title: '1. 关闭销售试点入口', description: '通过切换开关停止新的销售订单继续进入试点链路。' },
        { title: '2. 导出订单与结果对象引用', description: '保留销售订单、出库引用和发票引用清单，便于核对和回退处理。' },
        { title: '3. 恢复 Odoo 销售录单', description: '让试点团队回到 Odoo 销售入口，同时核查和清理已产生的试点对象。' },
      ],
)
</script>

<template>
  <ModuleWorkbench
    module-key="saleOrder"
    :config="moduleConfigMap.saleOrder"
    :title="pageTitle"
    :description="pageDescription"
    :highlights="highlights"
    :focus-items="focusItems"
    :action-items="actionItems"
    :quick-link-items="quickLinkItems"
    :readiness-items="readinessItems"
    :cockpit-shortcut-items="cockpitShortcutItems"
    :pilot-guide-items="pilotGuideItems"
    :rollback-items="rollbackItems"
    :note="note"
  >
    <template #workspace>
      <div class="workspace-layout">
        <section class="workspace-main">
          <EntityTableView module-key="saleOrder" />
        </section>

        <aside class="workspace-side">
          <PilotReviewQueuePanel
            :title="isEnglish ? 'Sales Review Queue' : '销售审核队列'"
            :description="isEnglish
              ? 'Prioritize sales records, partner follow-up, and invoice-linked risks from one side rail.'
              : '在同一侧栏里优先处理销售记录、伙伴跟进和发票相关风险。'"
            :module-keys="['saleOrder', 'resPartner', 'accountInvoice', 'stockPicking']"
            :limit="5"
          />

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Sales Snapshot' : '销售快照' }}</div>
            <div class="state-vertical">
              <div v-for="item in sideCards" :key="item.label" class="state-card-mini">
                <div class="state-header">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </article>

          <FirstWavePlaybookPanel v-if="playbook" :playbook="playbook" />
          <RelationshipMemoryPanel module-key="saleOrder" />
          <FirstWaveEvidencePanel module-key="saleOrder" />

          <ReminderSummaryPanel
            :title="isEnglish ? 'Chain Reminders' : '链路提醒'"
            :description="isEnglish
              ? 'Partner follow-up and invoice exceptions should stay visible while sales orders move through the pilot chain.'
              : '当销售订单在试点链中流转时，伙伴跟进和发票异常要持续可见。'"
            :module-keys="['saleOrder', 'resPartner', 'accountInvoice']"
          />

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Pilot Guide' : '试点指引' }}</div>
            <div class="side-list">
              <div v-for="item in quickGuides" :key="item.title" class="side-item">
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </template>
  </ModuleWorkbench>
</template>

<style scoped>
.workspace-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
}

.workspace-main {
  min-width: 0;
}

.workspace-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.side-panel {
  padding: 22px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.state-vertical,
.side-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.state-card-mini,
.side-item {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.state-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.state-header strong,
.side-item strong {
  color: var(--app-text);
}

.state-card-mini p,
.side-item p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }
}
</style>
