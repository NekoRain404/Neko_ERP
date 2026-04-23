<script setup lang="ts">
import { computed } from 'vue'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import FirstWavePlaybookPanel from '@/components/FirstWavePlaybookPanel.vue'
import FirstWaveEvidencePanel from '@/components/FirstWaveEvidencePanel.vue'
import PilotReviewQueuePanel from '@/components/PilotReviewQueuePanel.vue'
import ReminderSummaryPanel from '@/components/ReminderSummaryPanel.vue'
import FinancialTracePanel from '@/components/FinancialTracePanel.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import RelationshipMemoryPanel from '@/components/RelationshipMemoryPanel.vue'
import StockExecutionFeedbackPanel from '@/components/StockExecutionFeedbackPanel.vue'
import QuantImpactPanel from '@/components/QuantImpactPanel.vue'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'
import { buildFirstWavePlaybook } from '@/utils/first-wave-playbook'
import { buildFirstWaveWorkbenchShortcuts } from '@/utils/first-wave-workbench-shortcuts'

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const playbook = computed(() => buildFirstWavePlaybook('stockPicking', isEnglish.value))
const cockpitShortcutItems = computed(() => buildFirstWaveWorkbenchShortcuts('stockPicking', isEnglish.value))

const highlights = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Mainline Focus',
          value: 'Transfer / Operations / Validation',
          description: 'Transfers now stay centered on the picking header while operations remain in the notebook for execution review.',
        },
        {
          label: 'Routing',
          value: 'Source / Destination / Schedule',
          description: 'The page keeps routing fields visible so warehouse execution can be verified without leaving the transfer workbench.',
        },
        {
          label: 'Execution State',
          value: 'Draft / Waiting / Ready / Done',
          description: 'The transfer flow now emphasizes the actual execution stages used by stock picking actions.',
        },
      ]
    : [
        {
          label: '主线重点',
          value: '调拨 / 操作行 / 校验',
          description: '调拨单围绕 picking 头处理，操作行收进 notebook 做执行审查。',
        },
        {
          label: '路由',
          value: '来源 / 目标 / 调度',
          description: '页面持续暴露路由字段，仓储执行不需要离开调拨工作台。',
        },
        {
          label: '执行阶段',
          value: 'Draft / Waiting / Ready / Done',
          description: '调拨流程现在直接强调 stock picking 动作所使用的真实执行阶段。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Header Scope', description: 'Start from the transfer header to inspect partner, origin, schedule, and routing before diving into operations.' },
        { label: 'Operations Notebook', description: 'Use the stock move notebook to review ready or done operations without exposing stock moves as a first-class menu entry.' },
        { label: 'Rollback Safety', description: 'Confirm, validate, cancel, and reset draft stay grouped so inventory side effects can be traced quickly.' },
      ]
    : [
        { label: '头部范围', description: '先看 partner、来源、调度和路由，再进入操作行。' },
        { label: '操作 notebook', description: '通过 stock move notebook 审 ready 或 done 的操作行，不再把 stock move 暴露成一级菜单。' },
        { label: '回退安全', description: 'Confirm、Validate、Cancel、Reset Draft 放在一起审查，便于快速确认库存副作用。' },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Execution Flow', value: 'Confirm -> Validate', description: 'The transfer workbench follows the Odoo execution sequence from draft to ready to done.' },
        { label: 'Rollback Flow', value: 'Cancel / Reset Draft', description: 'Rollback remains visible so stock quant rollback can be checked from the same page.' },
        { label: 'Operations Drilldown', value: 'Transfer -> Stock Moves', description: 'The operations notebook acts as the drilldown surface for execution rows.' },
      ]
    : [
        { label: '执行链', value: 'Confirm -> Validate', description: '调拨工作台保持 Odoo 从草稿到就绪再到完成的执行链。' },
        { label: '回退链', value: 'Cancel / Reset Draft', description: '回退入口保持可见，便于在同页核对 quant 回滚。' },
        { label: '下钻链', value: 'Transfer -> Stock Moves', description: '操作 notebook 作为执行行的下钻入口。' },
      ],
)

const sideCards = computed(() =>
  isEnglish.value
    ? [
        { label: 'Routing', value: 'locationId -> locationDestId', description: 'Source and destination locations stay visible during transfer execution.' },
        { label: 'Operations', value: 'stock.move notebook', description: 'Operations are reviewed inside the transfer instead of as a detached stock move list.' },
        { label: 'State Gate', value: 'confirmed / assigned / done', description: 'The execution stage defines which actions remain available.' },
      ]
    : [
        { label: '路由', value: 'locationId -> locationDestId', description: '来源和目标库位在执行过程中持续可见。' },
        { label: '操作行', value: 'stock.move notebook', description: '操作行固定在调拨内部审查，不再游离成独立 stock move 列表。' },
        { label: '状态门禁', value: 'confirmed / assigned / done', description: '执行阶段决定当前还能做哪些动作。' },
      ],
)

const quickGuides = computed(() =>
  isEnglish.value
    ? [
        { title: 'Transfer Review', description: 'Search by origin, partner, schedule date, and state before entering operations.' },
        { title: 'Execution Review', description: 'Open operations to inspect move role, quantity, and completion state.' },
        { title: 'Trace And Rollback', description: 'Use the same workbench to validate completion or follow rollback paths back to draft.' },
      ]
    : [
        { title: '调拨审查', description: '先按来源、伙伴、调度日期和状态检索，再进入操作行。' },
        { title: '执行审查', description: '打开操作行，检查数量、状态和执行结果。' },
        { title: '追溯与回退', description: '在同一工作台里完成校验，或沿回退链回到草稿。' },
      ],
)

const quickLinkItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Create Transfer', description: 'Open a new transfer draft directly when the pilot needs a manual execution record.', routeName: 'stockPicking', query: { create: '1' }, buttonType: 'primary' },
        { label: 'Open Sales Orders', description: 'Return upstream to sales orders when transfer origins or customer context must be checked.', routeName: 'saleOrder', query: { section: 'ops-financial-trace' } },
        { label: 'Open Invoices', description: 'Move forward into invoice review once execution is confirmed.', routeName: 'accountInvoice', query: { section: 'ops-settlement' } },
        { label: 'Open Payments', description: 'Continue into payment closure when shipment completion and billing have already converged.', routeName: 'accountPayment', query: { section: 'ops-payment-linkage' } },
        { label: 'Open Cutover Settings', description: 'Review transfer pilot scope and rollback controls without leaving inventory execution.', routeName: 'settings', query: { tab: 'cutover', module: 'stockPicking' } },
      ]
    : [
        { label: '新建调拨', description: '当试点需要手工执行记录时，直接打开新的调拨草稿。', routeName: 'stockPicking', query: { create: '1' }, buttonType: 'primary' },
        { label: '打开销售订单', description: '当要核对调拨来源或客户上下文时，直接回到上游销售单。', routeName: 'saleOrder', query: { section: 'ops-financial-trace' } },
        { label: '打开发票', description: '执行确认后，继续进入发票审查。', routeName: 'accountInvoice', query: { section: 'ops-settlement' } },
        { label: '打开付款', description: '当发货完成并进入结算阶段后，继续进入付款闭环。', routeName: 'accountPayment', query: { section: 'ops-payment-linkage' } },
        { label: '打开切换设置', description: '不离开库存执行界面即可检查调拨试点范围和回退控制。', routeName: 'settings', query: { tab: 'cutover', module: 'stockPicking' } },
      ],
)

const readinessItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Routing Fields', value: 'Ready', description: 'Source and destination locations are visible for execution review before validation.', tone: 'success' },
        { label: 'Operation Drilldown', value: 'Ready', description: 'Move operations remain available inside the transfer notebook instead of a detached menu.', tone: 'success' },
        { label: 'Quant Safety', value: 'Guarded', description: 'Validation and reset-to-draft paths stay visible so inventory side effects can be checked quickly.', tone: 'warning' },
      ]
    : [
        { label: '路由字段', value: '已就绪', description: '来源和目标库位在校验前可直接用于执行审查。', tone: 'success' },
        { label: '操作行下钻', value: '已就绪', description: 'move 操作行仍保留在调拨 notebook 内，而不是游离菜单。', tone: 'success' },
        { label: 'Quant 安全', value: '受控', description: 'Validate 和回到草稿路径保持可见，便于快速检查库存副作用。', tone: 'warning' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Transfer Workbench' : '调拨工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'A transfer-first workbench that keeps routing, operations, execution states, and rollback review on one page.'
    : '以调拨单为中心的工作台，把路由、操作行、执行状态和回退审查放在同一页。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Operations remain available, but they now stay inside the transfer execution context.'
    : '操作行仍然可用，但现在固定在调拨执行上下文里处理。',
)

const pilotGuideItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Open Transfers From Sales Chain Results', description: 'Treat picking as a downstream execution object under the sales pilot instead of as an isolated inventory entry.' },
        { title: '2. Review Routing And Operations Before Validation', description: 'Check source, destination, quantities, and move roles before validating to protect quant consistency.' },
        { title: '3. Use Validation As The Final Execution Gate', description: 'Only validate after routing and line checks are complete so the pilot chain remains traceable.' },
      ]
    : [
        { title: '1. 从销售链结果对象进入调拨', description: '把调拨视为销售试点下的执行对象，而不是孤立的库存入口。' },
        { title: '2. 校验前先审路由和操作行', description: '在 Validate 前先核对来源、目标、数量和 move 角色，保护 quant 一致性。' },
        { title: '3. 把 Validate 当作最终执行门禁', description: '只有在路由和行都核对完成后再验证，保证试点链可追溯。' },
      ],
)

const rollbackItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Stop New Transfers From The Pilot Entry', description: 'Disable the sales pilot chain or the transfer module entry before allowing more downstream execution.' },
        { title: '2. Export Picking And Move References', description: 'Keep the picking list together with move references so validation side effects can be reviewed.' },
        { title: '3. Roll Back To Draft Or Return To Odoo', description: 'Use reset or fallback to Odoo warehouse flow when transfer execution can no longer stay inside the pilot scope.' },
      ]
    : [
        { title: '1. 停止新的调拨继续进入试点入口', description: '在继续放量前，先关闭销售试点链或调拨模块入口。' },
        { title: '2. 导出调拨与移动引用', description: '保留调拨清单和 move 引用，方便核对 Validate 带来的库存副作用。' },
        { title: '3. 回到草稿或恢复 Odoo 仓储流程', description: '当调拨执行不能继续留在试点范围时，使用重置草稿或回退到 Odoo 仓储流程。' },
      ],
)
</script>

<template>
  <ModuleWorkbench
    module-key="stockPicking"
    :config="moduleConfigMap.stockPicking"
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
          <EntityTableView module-key="stockPicking" :config="moduleConfigMap.stockPicking" />
        </section>

        <aside class="workspace-side">
          <PilotReviewQueuePanel
            :title="isEnglish ? 'Transfer Review Queue' : '调拨审核队列'"
            :description="isEnglish
              ? 'Prioritize transfers with execution pressure, invoice follow-up, or upstream sales risks.'
              : '优先处理带执行压力、发票跟进或上游销售风险的调拨记录。'"
            :module-keys="['stockPicking', 'saleOrder', 'accountInvoice', 'resPartner']"
            :limit="5"
          />

          <ReminderSummaryPanel
            :title="isEnglish ? 'Execution Risks' : '执行风险提醒'"
            :description="isEnglish
              ? 'Transfer execution should stay aware of upstream partner silence and downstream invoice pressure while the pilot is still narrow.'
              : '在试点范围仍然较窄时，调拨执行也要感知上游伙伴沉寂和下游发票压力。'"
            :module-keys="['stockPicking', 'resPartner', 'accountInvoice']"
          />

          <StockExecutionFeedbackPanel compact />
          <QuantImpactPanel compact />

          <FinancialTracePanel
            module-key="stockPicking"
            :title="isEnglish ? 'Transfer Handoff Trace' : '调拨交接追溯'"
            :description="isEnglish
              ? 'Keep business origin, move-pack continuity, and billing handoff visible while transfers move from ready to done.'
              : '在调拨从 ready 进入 done 的过程中，持续暴露业务来源、移动行包连续性和账单交接语义。'"
            compact
          />

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Transfer Snapshot' : '调拨快照' }}</div>
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
          <RelationshipMemoryPanel module-key="stockPicking" />
          <FirstWaveEvidencePanel module-key="stockPicking" />

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Execution Guide' : '执行指引' }}</div>
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
  font-size: 14px;
}

.state-card-mini p,
.side-item p {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }
}
</style>
