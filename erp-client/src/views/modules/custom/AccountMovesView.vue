<script setup lang="ts">
import { computed } from 'vue'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import CloseTaskPanel from '@/components/CloseTaskPanel.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import FinancialTracePanel from '@/components/FinancialTracePanel.vue'
import SettlementCockpitPanel from '@/components/SettlementCockpitPanel.vue'
import PaymentLinkagePanel from '@/components/PaymentLinkagePanel.vue'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'
import { buildFirstWaveWorkbenchShortcuts } from '@/utils/first-wave-workbench-shortcuts'

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const cockpitShortcutItems = computed(() => buildFirstWaveWorkbenchShortcuts('accountMove', isEnglish.value))

const highlights = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Odoo Entry',
          value: 'Journal Entries',
          description: 'Aligned with the Odoo `account.move` journal entry list and form actions without inventing new finance status names.',
        },
        {
          label: 'Primary List Fields',
          value: 'Date / Number / Partner / Journal / Total / State',
          description: 'The list stays close to the Odoo journal entry fields: date, name, partner, journal, total, and state.',
        },
        {
          label: 'Form Actions',
          value: 'Post / Reverse / Cancel / Reviewed',
          description: 'The button area continues to follow Odoo semantics such as Post, Reverse Entry, Cancel, and Reset to Draft.',
        },
      ]
    : [
        {
          label: 'Odoo 入口',
          value: 'Journal Entries',
          description: '对齐 Odoo `account.move` 的 Journal Entries 列表和表单动作，不额外发明财务状态名。',
        },
        {
          label: '主列表字段',
          value: 'Date / Number / Partner / Journal / Total / State',
          description: '列表列优先贴近 Odoo Journal Entries：date、name、partner、journal、total、state。',
        },
        {
          label: '表单动作',
          value: 'Post / Reverse / Cancel / Reviewed',
          description: '按钮区优先沿用 Odoo 的 Post、Reverse Entry、Cancel、Reset to Draft、Reviewed 语义。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Search Move',
          description: 'Search should align with Odoo Search Move fields like journal entry, ref, invoice date, date, total, partner, and journal.',
        },
        {
          label: 'Unposted / Posted / Reversed',
          description: 'Filters and summaries should continue to reuse Odoo groupings such as Unposted, Posted, Reversed, Manual, Sales, and Purchases.',
        },
        {
          label: 'Button Box',
          description: 'The detail page should later expose Odoo button box entries for Payments, Reconciled Items, and Cash Basis Entries.',
        },
      ]
    : [
        {
          label: 'Search Move',
          description: '搜索优先对齐 Odoo Search Move：Journal Entry、ref、invoice_date、date、amount_total、partner、journal。',
        },
        {
          label: 'Unposted / Posted / Reversed',
          description: '筛选和摘要优先沿用 Odoo 的 Unposted、Posted、Reversed、Manual、Sales、Purchases 等分组。',
        },
        {
          label: 'Button Box',
          description: '详情页后续优先挂 Odoo button box 里的 Payments、Reconciled Items、Cash Basis Entries。',
        },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Primary Action',
          value: 'Post / Confirm',
          description: 'Primary actions should remain aligned with Odoo header actions such as Post and Confirm.',
        },
        {
          label: 'Reversal Flow',
          value: 'Reverse Entry / Credit Note',
          description: 'Reversal actions should reuse the Odoo wording for Reverse Entry and Credit Note.',
        },
        {
          label: 'Review Flow',
          value: 'Cancel / Reset / Reviewed',
          description: 'Cancel, reset to draft, and reviewed-style transitions should continue to mirror Odoo actions.',
        },
      ]
    : [
        {
          label: 'Primary Action',
          value: 'Post / Confirm',
          description: '主动作沿用 Odoo header 的 Post 和 Confirm，而不是新增自定义过账按钮。',
        },
        {
          label: 'Reversal Flow',
          value: 'Reverse Entry / Credit Note',
          description: '冲销相关动作沿用 Odoo 的 Reverse Entry 和 Credit Note 文案。',
        },
        {
          label: 'Review Flow',
          value: 'Cancel / Reset / Reviewed',
          description: '取消、重置草稿、Reviewed 这些状态流转后续直接接 Odoo 对应按钮。',
        },
      ],
)

const statusCards = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Unposted',
          value: 'Draft',
          description: 'Aligned with the Odoo Search Move Unposted filter and the draft state.',
        },
        {
          label: 'Posted',
          value: 'Posted',
          description: 'Aligned with the Odoo Posted filter and the posted state in the status bar.',
        },
        {
          label: 'Reversed',
          value: 'Reversed',
          description: 'Keeps the Odoo Reversed semantics and can later map to `payment_state = reversed`.',
        },
      ]
    : [
        {
          label: 'Unposted',
          value: 'Draft',
          description: '对齐 Odoo Search Move 里的 Unposted 过滤器和 draft 状态。',
        },
        {
          label: 'Posted',
          value: 'Posted',
          description: '对齐 Odoo Posted 过滤器和 statusbar_visible 的 posted 状态。',
        },
        {
          label: 'Reversed',
          value: 'Reversed',
          description: '保留 Odoo Search Move 里的 Reversed 语义，后续接 payment_state = reversed。',
        },
      ],
)

const quickViews = computed(() =>
  isEnglish.value
    ? [
        {
          title: 'Search Move',
          description: 'Prefer Odoo Search Move combinations using date, invoice date, total amount, partner, and journal.',
        },
        {
          title: 'Journal Items',
          description: 'The `account.move.line` detail lines are already attached and support CRUD from the notebook tab.',
        },
        {
          title: 'Payments / Reconcile',
          description: 'The backend trace cockpit now aggregates source explanation and open-item pressure; the next step is to keep reusing Odoo button box entries for Payments, Reconciled Items, and Cash Basis Entries.',
        },
      ]
    : [
        {
          title: 'Search Move',
          description: '优先用 Odoo Search Move 里的 date、invoice_date、amount_total、partner_id、journal_id 组合检索。',
        },
        {
          title: 'Journal Items',
          description: '已接入 account.move.line 明细行，支持凭证分录的增删改查。',
        },
        {
          title: 'Payments / Reconcile',
          description: '后端追溯驾驶舱已经开始聚合来源解释和未清项压力，下一步继续复用 Odoo button box 里的 Payments、Reconciled Items、Cash Basis Entries。',
        },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Journal Entry Workbench' : '会计凭证工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'Aligned with the Odoo `account.move` Journal Entries structure and supports journal item notebook operations.'
    : '对齐 Odoo `account.move` 的 Journal Entries 结构，支持凭证分录明细级联操作。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Journal Items are already available. You can work directly in the notebook tab inside the journal entry detail panel.'
    : '凭证分录 (Journal Items) 现已支持。您可以直接在凭证详情页的笔记本标签页中进行操作。',
)
const summaryTitle = computed(() => (isEnglish.value ? 'Status Summary' : '状态摘要'))
const guideTitle = computed(() => (isEnglish.value ? 'Journal Guide' : '分录指引'))
const quickLinkItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Create Journal Entry', description: 'Start a new draft journal entry directly from the finance closure surface.', routeName: 'accountMove', query: { create: '1' }, buttonType: 'primary' },
        { label: 'Open Payments', description: 'Continue into payment postings when bank or invoice settlement needs a downstream check.', routeName: 'accountPayment', query: { section: 'ops-payment-linkage' } },
        { label: 'Open Invoices', description: 'Return to invoice-side evidence and due-date context when reconcile anchors are still weak.', routeName: 'accountInvoice', query: { section: 'ops-settlement' } },
        { label: 'Open Cutover Settings', description: 'Review accounting pilot scope and rollback controls without leaving the journal workbench.', routeName: 'settings', query: { tab: 'cutover', module: 'accountMove' } },
      ]
    : [
        { label: '新建凭证', description: '直接从财务闭环界面开始新的凭证草稿。', routeName: 'accountMove', query: { create: '1' }, buttonType: 'primary' },
        { label: '打开付款', description: '当要核银行收付或发票结算时，继续进入付款过账对象。', routeName: 'accountPayment', query: { section: 'ops-payment-linkage' } },
        { label: '打开发票', description: '当对账锚点仍不够强时，回到发票侧证据和到期日上下文。', routeName: 'accountInvoice', query: { section: 'ops-settlement' } },
        { label: '打开切换设置', description: '不离开凭证工作台即可复核会计试点范围和回退控制。', routeName: 'settings', query: { tab: 'cutover', module: 'accountMove' } },
      ],
)
const readinessItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Open Item Context', value: 'Ready', description: 'The shared settlement cockpit already exposes open items and matched lines for close review.', tone: 'success' },
        { label: 'Invoice / Payment Anchors', value: 'Visible', description: 'Invoice and payment references can now be reopened from the same finance closure surface.', tone: 'success' },
        { label: 'Rollback Discipline', value: 'Guarded', description: 'Reverse, cancel, and reset-to-draft paths remain visible before broader accounting cutover.', tone: 'warning' },
      ]
    : [
        { label: '未清项上下文', value: '已就绪', description: '共享结算驾驶舱已经开始暴露未清项和已匹配分录，便于关账复核。', tone: 'success' },
        { label: '发票 / 付款锚点', value: '可见', description: '发票和付款引用现在可以从同一财务闭环界面继续重开。', tone: 'success' },
        { label: '回退纪律', value: '受控', description: '在更大范围切换前，Reverse、Cancel 和 Reset Draft 路径保持清晰可见。', tone: 'warning' },
      ],
)
const pilotGuideItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Review Open Items Before Closing', description: 'Treat journal entries as the finance closure layer and confirm open items or matched lines before wider cutover.' },
        { title: '2. Reopen Invoice Or Payment Anchors Early', description: 'When reconcile context looks weak, jump back to invoice or payment artifacts before forcing accounting cleanup.' },
        { title: '3. Keep Reversal Paths Visible', description: 'Use reverse, cancel, and reset-draft semantics as explicit rollback controls instead of ad-hoc fixes.' },
      ]
    : [
        { title: '1. 关账前先看未清项', description: '把凭证当成财务闭环层，在继续放量前先确认未清项和已匹配分录状态。' },
        { title: '2. 尽早重开发票或付款锚点', description: '当对账上下文变弱时，先回到发票或付款结果对象，不要硬做会计清理。' },
        { title: '3. 保持冲销路径可见', description: '把 Reverse、Cancel、Reset Draft 当成显式回退控制，而不是临时修数手段。' },
      ],
)
const rollbackItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Stop New Journal Cleanup From Entering The Pilot', description: 'Disable the accounting pilot entry before more finance repair work accumulates in the trial scope.' },
        { title: '2. Export Journal, Invoice, And Payment References', description: 'Keep journal refs, source invoices, and payment anchors together for rollback review.' },
        { title: '3. Return To Odoo Accounting If Needed', description: 'Let operators return to Odoo accounting flows while pilot journal entries are checked or reversed.' },
      ]
    : [
        { title: '1. 停止新的会计清理继续进入试点', description: '在更多财务修补工作进入试点前，先关闭会计试点入口。' },
        { title: '2. 导出凭证、发票和付款引用', description: '把凭证引用、源发票和付款锚点一起保留，便于回退审查。' },
        { title: '3. 必要时恢复 Odoo 会计入口', description: '当试点内的凭证需要继续核查或冲销时，让操作员回到 Odoo 会计流程。' },
      ],
)
</script>

<template>
  <ModuleWorkbench
    module-key="accountMove"
    :config="moduleConfigMap.accountMove"
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
          <EntityTableView module-key="accountMove" :config="moduleConfigMap.accountMove" />
        </section>

        <aside class="workspace-side">
          <article class="erp-card side-panel">
            <div class="section-title">{{ summaryTitle }}</div>
            <div class="state-vertical">
              <div v-for="item in statusCards" :key="item.label" class="state-card-mini">
                <div class="state-header">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </article>

          <article class="erp-card side-panel">
            <div class="section-title">{{ guideTitle }}</div>
            <div class="side-list">
              <div v-for="item in quickViews" :key="item.title" class="side-item">
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </article>

          <FinancialTracePanel
            module-key="accountMove"
            :title="isEnglish ? 'Journal Trace Cockpit' : '凭证追溯驾驶舱'"
            :description="isEnglish
              ? 'Keep source explanation, reconcile context, and journal-item review continuous before downstream cleanup expands.'
              : '在下游清理继续扩大前，保持来源解释、对账上下文和分录审查连续。'"
            compact
          />

          <CloseTaskPanel
            module-key="accountMove"
            :title="isEnglish ? 'Journal Close Task Desk' : '凭证关账任务台'"
            :description="isEnglish
              ? 'Turn reconcile, reverse-safe, and journal-item review into explicit close tasks before accounting scope broadens.'
              : '在会计范围继续扩大前，把对账、冲销安全和分录审查下沉成明确的关账任务。'"
            :english="isEnglish"
          />

          <SettlementCockpitPanel module-key="accountMove" compact />
          <PaymentLinkagePanel module-key="accountMove" compact />
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
  padding: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--erp-text);
}

.state-vertical {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.state-card-mini {
  padding: 14px;
  border-radius: 12px;
  background: rgba(21, 94, 99, 0.05);
}

.state-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.state-header span {
  font-size: 12px;
  color: var(--erp-muted);
}

.state-header strong {
  font-size: 16px;
  color: var(--erp-accent);
}

.state-card-mini p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--erp-muted);
  line-height: 1.4;
}

.side-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side-item {
  padding: 14px;
  border-radius: 12px;
  background: var(--erp-primary-soft);
}

.side-item strong {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
}

.side-item p {
  margin: 0;
  font-size: 12px;
  color: var(--erp-muted);
  line-height: 1.5;
}

@media (max-width: 1200px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }
}
</style>
