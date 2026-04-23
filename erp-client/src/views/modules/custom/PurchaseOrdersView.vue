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
const playbook = computed(() => buildFirstWavePlaybook('purchaseOrder', isEnglish.value))
const cockpitShortcutItems = computed(() => buildFirstWaveWorkbenchShortcuts('purchaseOrder', isEnglish.value))

const highlights = computed(() =>
  isEnglish.value
    ? [
        { label: 'Mainline Chain', value: 'RFQ / Receipt / Bill', description: 'Purchase orders stay in the first-wave procurement chain and should expose receipt and bill links directly.' },
        { label: 'Primary Actions', value: 'Confirm / Create Bill', description: 'Confirmation and bill creation are the pilot actions that matter most during first cutover.' },
        { label: 'Traceability', value: 'Receipt / Bill / Payment', description: 'The procurement workbench should keep downstream receiving and billing links one click away.' },
      ]
    : [
        { label: '主链路', value: '询价 / 收货 / 账单', description: '采购订单属于首批采购链，要直接暴露收货和账单链接。' },
        { label: '主动作', value: '确认 / 创建账单', description: '确认和建账单是首批切换里最关键的采购动作。' },
        { label: '追溯性', value: '收货 / 账单 / 付款', description: '采购工作台要把下游收货和账单对象维持在一跳可达。' },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Vendor First', description: 'Vendor, buyer, order date, and amount fields should stay correct before deeper accounting semantics are added.' },
        { label: 'Receipt Safety', description: 'Repeated confirmation must stay idempotent and should clean stale receipt moves when lines are removed.' },
        { label: 'Bill Readiness', description: 'Bill creation should stay close to the purchase order so operators can validate amounts before switching to accounting.' },
      ]
    : [
        { label: '供应商优先', description: '在进入更深会计语义前，先把供应商、采购员、订单日期和金额字段做正确。' },
        { label: '收货安全', description: '重复确认必须保持幂等，在删行后还能清理陈旧收货 move。' },
        { label: '账单就绪', description: '建账单动作要紧贴采购单，方便操作员在切到会计前先校验金额。' },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Primary Action', value: 'Confirm Order', description: 'Confirm turns purchase demand into receipt artifacts and starts the physical receiving chain.' },
        { label: 'Secondary Action', value: 'Create Bill', description: 'Bill creation should stay available after confirmation without leaving the procurement workspace.' },
      ]
    : [
        { label: '主动作', value: 'Confirm Order', description: '确认会把采购需求转成收货结果对象，并启动实物收货链。' },
        { label: '次动作', value: 'Create Bill', description: '确认后应能在同一采购工作台继续创建账单。' },
      ],
)

const sideCards = computed(() =>
  isEnglish.value
    ? [
        { label: 'Chain State', value: 'First-Wave', description: 'Purchase chain stays in the first pilot scope together with sales and master data.' },
        { label: 'Artifact Links', value: 'Ready', description: 'Receipt and bill reference fields already feed the shared detail shell.' },
        { label: 'Timeline', value: 'Ready', description: 'Purchase order detail already exposes timeline context for follow-up notes and traceability.' },
      ]
    : [
        { label: '链路状态', value: '首批切换', description: '采购链和销售链、主数据一起处于首批试点范围。' },
        { label: '结果对象链接', value: '已接入', description: '收货和账单引用字段已经接进共享详情壳。' },
        { label: 'Timeline', value: '已接入', description: '采购订单详情已经能显示后续便签和追溯时间轴。' },
      ],
)

const quickGuides = computed(() =>
  isEnglish.value
    ? [
        { title: 'Complete Vendor Data First', description: 'Make sure vendor, buyer, and order lines are correct before confirming to reduce artifact churn.' },
        { title: 'Review Receipt Object', description: 'After confirmation, open the generated receipt object first and validate stock movement before billing.' },
        { title: 'Keep Bill Link Close', description: 'Use the bill reference inside the purchase workbench instead of manually searching the accounting side.' },
      ]
    : [
        { title: '先补齐供应商数据', description: '确认前先把供应商、采购员和采购行补齐，减少后续结果对象波动。' },
        { title: '先审查收货对象', description: '确认后先打开生成的收货对象，先核对实物流再继续账单链。' },
        { title: '让账单链接留在同页', description: '通过采购工作台里的账单引用继续下钻，不再手动切去会计侧搜索。' },
      ],
)

const quickLinkItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Create Purchase Order', description: 'Start a new procurement draft directly from the first-wave purchase surface.', routeName: 'purchaseOrder', query: { create: '1' }, buttonType: 'primary' },
        { label: 'Open Receipts', description: 'Continue into receipt execution without breaking the procurement chain.', routeName: 'stockPicking', query: { section: 'ops-execution-feedback' } },
        { label: 'Open Bills', description: 'Continue into downstream invoice review without breaking the procurement chain.', routeName: 'accountInvoice', query: { section: 'ops-settlement' } },
        { label: 'Open Payments', description: 'Inspect payment artifacts after bill creation from the same pilot route.', routeName: 'accountPayment', query: { relatedTo: 'purchaseOrder', section: 'ops-payment-linkage' } },
        { label: 'Open Partner Master', description: 'Return to vendor master data when supplier identity or contact fields need correction.', routeName: 'resPartner', query: { section: 'ops-evidence' } },
      ]
    : [
        { label: '新建采购订单', description: '直接从首批采购界面发起新的采购草稿。', routeName: 'purchaseOrder', query: { create: '1' }, buttonType: 'primary' },
        { label: '打开收货', description: '继续进入下游收货执行，不打断采购链。', routeName: 'stockPicking', query: { section: 'ops-execution-feedback' } },
        { label: '打开账单', description: '继续进入下游发票审查，不打断采购链。', routeName: 'accountInvoice', query: { section: 'ops-settlement' } },
        { label: '打开付款', description: '建账单后从同一路径继续检查付款结果对象。', routeName: 'accountPayment', query: { relatedTo: 'purchaseOrder', section: 'ops-payment-linkage' } },
        { label: '打开伙伴主档', description: '当供应商身份或联系字段要修正时，直接回到伙伴主数据。', routeName: 'resPartner', query: { section: 'ops-evidence' } },
      ],
)

const readinessItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Receipt Traceability', value: 'Ready', description: 'Receipt and stock move references are already linked from the purchase workbench.', tone: 'success' },
        { label: 'Bill And Payment', value: 'Ready', description: 'Bill creation and payment artifacts are now part of the same procurement path.', tone: 'success' },
        { label: 'Fallback Control', value: 'Visible', description: 'Purchase pilot stop and restore paths are available from the workbench and settings.', tone: 'warning' },
      ]
    : [
        { label: '收货追溯', value: '已就绪', description: '收货和 stock move 引用已经从采购工作台串起。', tone: 'success' },
        { label: '账单与付款', value: '已就绪', description: '建账单和付款结果对象已经纳入同一采购路径。', tone: 'success' },
        { label: '回退控制', value: '可见', description: '采购试点的停止和恢复路径已经在工作台与设置页可见。', tone: 'warning' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Purchase Order Workbench' : '采购订单工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'The first-wave procurement workbench that keeps purchase header, lines, receiving artifacts, and bill links in one context.'
    : '首批采购工作台，把采购头、采购行、收货结果对象和账单链接收进同一上下文。',
)
const note = computed(() =>
  isEnglish.value
    ? 'This page should keep procurement cutover stable first, then deepen accounting semantics later.'
    : '这个页面要先把采购切换做稳，深会计语义留到后续阶段。'
)

const pilotGuideItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Complete Vendor Header And Purchase Lines', description: 'Confirm the vendor, buyer, date, and line quantities first so the receipt and bill chain starts from stable procurement data.' },
        { title: '2. Confirm And Review Receipt Objects', description: 'After confirmation, inspect the generated receipt object and stock rows before moving to the bill step.' },
        { title: '3. Create The Bill From The Same Workbench', description: 'Use the bill action and generated references directly so pilot operators do not break procurement traceability.' },
      ]
    : [
        { title: '1. 先补齐供应商头和采购行', description: '先确认供应商、采购员、日期和行数量，再让收货和账单链从稳定的采购数据启动。' },
        { title: '2. 确认后先审查收货对象', description: '确认后先检查生成的收货对象和库存行，再继续到账单步骤。' },
        { title: '3. 在同一工作台创建账单', description: '直接用账单动作和生成引用继续处理，避免打断采购链追溯。' },
      ],
)

const rollbackItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Disable The Purchase Pilot Entry', description: 'Stop new procurement work from entering the pilot route through the cutover switch.' },
        { title: '2. Export Orders, Receipts, And Bills', description: 'Collect purchase orders together with receipt and bill references for reconciliation or manual replay.' },
        { title: '3. Reopen Odoo Purchase Entry', description: 'Switch pilot users back to Odoo procurement while trial records are reviewed for cleanup and fallback.' },
      ]
    : [
        { title: '1. 关闭采购试点入口', description: '通过切换开关停止新的采购工作继续进入试点链路。' },
        { title: '2. 导出采购单、收货和账单引用', description: '收集采购订单及其收货、账单引用，便于核对和必要时手工回放。' },
        { title: '3. 恢复 Odoo 采购录单', description: '让试点用户回到 Odoo 采购入口，同时对试点记录做清理和回退。' },
      ],
)
</script>

<template>
  <ModuleWorkbench
    module-key="purchaseOrder"
    :config="moduleConfigMap.purchaseOrder"
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
          <EntityTableView module-key="purchaseOrder" />
        </section>

        <aside class="workspace-side">
          <PilotReviewQueuePanel
            :title="isEnglish ? 'Purchase Review Queue' : '采购审核队列'"
            :description="isEnglish
              ? 'Prioritize purchase records, vendor follow-up, and bill-linked risks from one side rail.'
              : '在同一侧栏里优先处理采购记录、供应商跟进和账单相关风险。'"
            :module-keys="['purchaseOrder', 'resPartner', 'accountInvoice', 'accountPayment']"
            :limit="5"
          />

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Purchase Snapshot' : '采购快照' }}</div>
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
          <RelationshipMemoryPanel module-key="purchaseOrder" />
          <FirstWaveEvidencePanel module-key="purchaseOrder" />

          <ReminderSummaryPanel
            :title="isEnglish ? 'Procurement Reminders' : '采购提醒'"
            :description="isEnglish
              ? 'Keep vendor follow-up, unpaid bill pressure, and downstream payment risks visible while purchase orders are in the pilot path.'
              : '当采购订单处于试点路径中时，要持续看见供应商跟进、未付账单压力和下游付款风险。'"
            :module-keys="['purchaseOrder', 'resPartner', 'accountInvoice', 'accountPayment']"
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
