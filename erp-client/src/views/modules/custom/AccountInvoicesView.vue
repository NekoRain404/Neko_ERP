<script setup lang="ts">
import { computed } from 'vue'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import FirstWavePlaybookPanel from '@/components/FirstWavePlaybookPanel.vue'
import FirstWaveEvidencePanel from '@/components/FirstWaveEvidencePanel.vue'
import ReminderSummaryPanel from '@/components/ReminderSummaryPanel.vue'
import PilotReviewQueuePanel from '@/components/PilotReviewQueuePanel.vue'
import FinancialTracePanel from '@/components/FinancialTracePanel.vue'
import SettlementCockpitPanel from '@/components/SettlementCockpitPanel.vue'
import PaymentLinkagePanel from '@/components/PaymentLinkagePanel.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import RelationshipMemoryPanel from '@/components/RelationshipMemoryPanel.vue'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'
import { buildFirstWavePlaybook } from '@/utils/first-wave-playbook'
import { buildFirstWaveWorkbenchShortcuts } from '@/utils/first-wave-workbench-shortcuts'

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const playbook = computed(() => buildFirstWavePlaybook('accountInvoice', isEnglish.value))
const cockpitShortcutItems = computed(() => buildFirstWaveWorkbenchShortcuts('accountInvoice', isEnglish.value))

const highlights = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Odoo Entry',
          value: 'Invoices',
          description: 'Aligned with Odoo `account.invoice.list`, reusing the invoice list columns, filters, and header actions first.',
        },
        {
          label: 'Primary List Fields',
          value: 'Invoice Date / Due Date / Total / Status',
          description: 'The list stays close to Odoo invoice fields such as invoice date, due date, total, and payment status.',
        },
        {
          label: 'Form Actions',
          value: 'Send / Print / Pay / Credit Note',
          description: 'Buttons stay aligned with Odoo Send, Print, Pay, Credit Note, Cancel, and Reset to Draft semantics.',
        },
      ]
    : [
        {
          label: 'Odoo 入口',
          value: 'Invoices',
          description: '对齐 Odoo `account.invoice.list`，优先复用 Invoices 的列表列、筛选和 header 动作。',
        },
        {
          label: '主列表字段',
          value: 'Invoice Date / Due Date / Total / Status',
          description: '列表优先对齐 Odoo 发票视图里的 invoice_date、invoice_date_due、total、status_in_payment。',
        },
        {
          label: '表单动作',
          value: 'Send / Print / Pay / Credit Note',
          description: '按钮优先沿用 Odoo 的 Send、Print、Pay、Credit Note、Cancel、Reset to Draft。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Search Invoice',
          description: 'Search should align with Odoo Search Invoice fields such as invoice, ref, payment reference, total, partner, user, and date.',
        },
        {
          label: 'To Pay / In Payment / Overdue',
          description: 'Status summaries should reuse Odoo terms instead of inventing renamed payment states.',
        },
        {
          label: 'Group By',
          description: 'Later iterations should continue to reuse the Odoo search view groupings for Salesperson, Partner, Status, Journal, and Company.',
        },
      ]
    : [
        {
          label: 'Search Invoice',
          description: '搜索优先对齐 Odoo Search Invoice：invoice、ref、payment_reference、amount_total、partner、invoice_user、date。',
        },
        {
          label: 'To pay / In payment / Overdue',
          description: '状态摘要优先沿用 Odoo 的 To pay、In payment、Overdue，而不是重命名支付状态。',
        },
        {
          label: 'Group By',
          description: '后续优先复用 Odoo search view 的 Salesperson、Partner、Status、Journal、Company 分组。',
        },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Primary Action',
          value: 'Send / Pay',
          description: 'The invoice surface should continue to prioritize Odoo Send and Pay actions.',
        },
        {
          label: 'Output Flow',
          value: 'Print / Preview',
          description: 'Output should reuse Odoo Print and Preview instead of introducing a new print flow.',
        },
        {
          label: 'Reversal Flow',
          value: 'Credit Note / Cancel',
          description: 'Reversal and cancellation should stay aligned with Credit Note, Cancel, and Reset to Draft.',
        },
      ]
    : [
        {
          label: 'Primary Action',
          value: 'Send / Pay',
          description: '发票主动作优先沿用 Odoo list/form 里的 Send 和 Pay。',
        },
        {
          label: 'Output Flow',
          value: 'Print / Preview',
          description: '输出链路优先复用 Odoo 的 Print 和 Preview，不单独发明打印流程。',
        },
        {
          label: 'Reversal Flow',
          value: 'Credit Note / Cancel',
          description: '冲销和取消动作优先沿用 Odoo Credit Note、Cancel、Reset to Draft。',
        },
      ],
)

const paymentCards = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'To Pay',
          value: 'not_paid / partial',
          description: 'Directly aligned with the Odoo Search Invoice "To pay" filter.',
        },
        {
          label: 'In Payment',
          value: 'in_payment',
          description: 'Directly aligned with the Odoo Search Invoice "In payment" filter.',
        },
        {
          label: 'Overdue',
          value: 'late',
          description: 'Directly aligned with the Odoo Search Invoice "Overdue" filter.',
        },
      ]
    : [
        {
          label: 'To pay',
          value: 'not_paid / partial',
          description: '直接对应 Odoo Search Invoice 里的 To pay 过滤器。',
        },
        {
          label: 'In payment',
          value: 'in_payment',
          description: '直接对应 Odoo Search Invoice 里的 In payment 过滤器。',
        },
        {
          label: 'Overdue',
          value: 'late',
          description: '直接对应 Odoo Search Invoice 里的 Overdue 过滤器。',
        },
      ],
)

const customerPanels = computed(() =>
  isEnglish.value
    ? [
        {
          title: 'Partner Context',
          description: 'Later work should expose raw Odoo context fields such as partner, invoice user, journal, and company.',
        },
        {
          title: 'Attachments / PDF',
          description: 'The attachment area should align with Odoo Print, invoice PDF artifacts, and send status.',
        },
        {
          title: 'Invoice Actions',
          description: 'The action zone should continue wiring Send, Print, Pay, Credit Note, Cancel, and Reset to Draft.',
        },
      ]
    : [
        {
          title: 'Partner Context',
          description: '后续优先挂 partner_id、invoice_user_id、journal_id、company_id 等 Odoo 原始上下文字段。',
        },
        {
          title: 'Attachments / PDF',
          description: '附件区优先对齐 Odoo 的 Print、invoice_pdf_report_id 和发送状态。',
        },
        {
          title: 'Invoice Actions',
          description: '动作区后续直接接 Send、Print、Pay、Credit Note、Cancel、Reset to Draft。',
        },
      ],
)

const quickLinkItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Create Invoice', description: 'Start a new invoice draft directly from the first-wave billing surface.', routeName: 'accountInvoice', query: { create: '1' }, buttonType: 'primary' },
        { label: 'Open Payments', description: 'Continue into payment artifacts and follow-up without rebuilding accounting context.', routeName: 'accountPayment', query: { section: 'ops-payment-linkage' } },
        { label: 'Open Sales Orders', description: 'Return to upstream sales records when invoice origin and customer demand need validation.', routeName: 'saleOrder', query: { section: 'ops-financial-trace' } },
        { label: 'Open Purchase Orders', description: 'Return to upstream purchase records when bill origins need validation.', routeName: 'purchaseOrder', query: { section: 'ops-financial-trace' } },
        { label: 'Open Journal Entries', description: 'Continue into close and reconciliation review once billing evidence needs finance-side confirmation.', routeName: 'accountMove', query: { section: 'ops-settlement' } },
      ]
    : [
        { label: '新建发票', description: '直接从首批账单界面开始新的发票草稿。', routeName: 'accountInvoice', query: { create: '1' }, buttonType: 'primary' },
        { label: '打开付款', description: '继续进入付款结果对象和后续处理，不再重建会计上下文。', routeName: 'accountPayment', query: { section: 'ops-payment-linkage' } },
        { label: '打开销售订单', description: '当要核对发票来源和客户需求时，回到上游销售记录。', routeName: 'saleOrder', query: { section: 'ops-financial-trace' } },
        { label: '打开采购订单', description: '当要核对账单来源时，回到上游采购记录。', routeName: 'purchaseOrder', query: { section: 'ops-financial-trace' } },
        { label: '打开凭证', description: '当账单证据需要财务侧确认时，继续进入关账和对账工作区。', routeName: 'accountMove', query: { section: 'ops-settlement' } },
      ],
)

const readinessItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Posting Context', value: 'Ready', description: 'Invoice amount, due date, partner, and origin references are already part of the same billing surface.', tone: 'success' },
        { label: 'Payment Linkage', value: 'Ready', description: 'Payment artifacts can already be registered and reopened from invoice references, and the backend cockpit now summarizes missing source and settlement links.', tone: 'success' },
        { label: 'Rollback Path', value: 'Visible', description: 'Billing fallback remains tied to sales and purchase pilot switches and can be reviewed quickly.', tone: 'warning' },
      ]
    : [
        { label: '过账上下文', value: '已就绪', description: '发票金额、到期日、伙伴和来源引用已经落在同一账单界面。', tone: 'success' },
        { label: '付款链接', value: '已就绪', description: '付款结果对象已经可以从发票引用直接登记和重开，后端驾驶舱也会汇总缺失来源和结算链路。', tone: 'success' },
        { label: '回退路径', value: '可见', description: '账单兜底仍绑定在销售和采购试点开关上，可快速审查。', tone: 'warning' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Invoice Workbench' : '发票工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'Stay close to Odoo `account.invoice.list` and `view_account_invoice_filter`, reusing the original search and action structure first.'
    : '尽量按 Odoo `account.invoice.list` 和 `view_account_invoice_filter` 收敛，优先复用原始搜索和动作结构。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Next, align directly with Odoo `view_invoice_tree`, `view_account_invoice_filter`, and the form header buttons.'
    : '下一步直接对齐 Odoo `view_invoice_tree`、`view_account_invoice_filter` 和 form header buttons。',
)
const paymentSummaryTitle = computed(() => (isEnglish.value ? 'Payment Status Summary' : '付款状态摘要'))
const customerWorkspaceTitle = computed(() => (isEnglish.value ? 'Customer And Attachment Workspace' : '客户与附件工作区'))
const pilotGuideItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Open Invoices From Sales Or Purchase References', description: 'Treat invoice work as the downstream continuation of sales or purchase pilots instead of as an isolated accounting search task.' },
        { title: '2. Verify Amount, Due Date, And Partner Before Posting', description: 'Check business totals and partner context before posting so the payment chain starts from trusted invoice data.' },
        { title: '3. Register Payments Through Generated Links', description: 'Use the payment action and generated payment reference directly to keep invoice traceability intact.' },
      ]
    : [
        { title: '1. 从销售或采购引用进入发票', description: '把发票处理视为销售或采购试点的下游延续，而不是孤立的会计搜索任务。' },
        { title: '2. 过账前先核金额、到期日和伙伴', description: '在 Post 前先核对业务金额和伙伴上下文，保证付款链从可信发票数据启动。' },
        { title: '3. 通过生成链接登记付款', description: '直接使用付款动作和生成的 payment 引用，保持发票链路追溯完整。' },
      ],
)

const rollbackItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Stop New Invoices From Entering The Pilot', description: 'Disable the relevant sales or purchase pilot chain before more invoices are posted inside the trial.' },
        { title: '2. Export Invoice And Payment References', description: 'Keep invoice, payment, and origin references together for reconciliation and fallback review.' },
        { title: '3. Reopen Odoo Billing Or Accounting Entry', description: 'Let operators return to Odoo billing while pilot invoices and payments are checked for cleanup.' },
      ]
    : [
        { title: '1. 停止新的发票继续进入试点', description: '在更多发票进入试点前，先关闭对应的销售链或采购链试点入口。' },
        { title: '2. 导出发票与付款引用', description: '保留发票、付款和来源引用，便于核对与回退审查。' },
        { title: '3. 恢复 Odoo 账单或会计入口', description: '让操作员回到 Odoo 账单流程，同时核查和清理试点发票与付款对象。' },
      ],
)
</script>

<template>
  <ModuleWorkbench
    module-key="accountInvoice"
    :config="moduleConfigMap.accountInvoice"
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
      <section class="workspace-grid">
        <section class="workspace-main">
          <EntityTableView module-key="accountInvoice" />
        </section>

        <aside class="workspace-side">
          <PilotReviewQueuePanel
            :title="isEnglish ? 'Invoice Review Queue' : '发票审核队列'"
            :description="isEnglish
              ? 'Prioritize overdue invoices, payment-linked records, downstream payment pressure, and upstream sales or purchase issues from one side rail.'
              : '在同一侧栏里优先处理逾期发票、付款关联记录、下游付款压力以及上游销售/采购问题。'"
            :module-keys="['accountInvoice', 'accountPayment', 'saleOrder', 'purchaseOrder', 'resPartner']"
            :limit="5"
          />

          <ReminderSummaryPanel
            :title="isEnglish ? 'Billing Reminders' : '账单提醒'"
            :description="isEnglish
              ? 'Overdue invoice and downstream payment reminders stay visible here so billing follow-up does not leave the first-wave surface.'
              : '逾期发票和下游付款提醒直接留在这里，避免账单跟进离开首批试点界面。'"
            :module-keys="['accountInvoice', 'accountPayment']"
            :limit="5"
          />

          <FinancialTracePanel
            module-key="accountInvoice"
            :title="isEnglish ? 'Billing Trace Cockpit' : '账单追溯驾驶舱'"
            :description="isEnglish
              ? 'Keep upstream origin, payment linkage, and invoice-side evidence continuous before settlement traffic widens.'
              : '在结算流量继续扩大前，保持上游来源、付款链接和开票侧证据连续。'"
            compact
          />

          <SettlementCockpitPanel module-key="accountInvoice" compact />
          <PaymentLinkagePanel module-key="accountInvoice" compact />

          <article class="erp-card payment-panel">
            <div class="section-title">{{ paymentSummaryTitle }}</div>
            <div class="payment-grid">
              <div v-for="item in paymentCards" :key="item.label" class="payment-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </article>

          <FirstWavePlaybookPanel v-if="playbook" :playbook="playbook" />
          <RelationshipMemoryPanel module-key="accountInvoice" />
          <FirstWaveEvidencePanel module-key="accountInvoice" />

          <article class="erp-card customer-panel">
            <div class="section-title">{{ customerWorkspaceTitle }}</div>
            <div class="customer-list">
              <div v-for="item in customerPanels" :key="item.title" class="customer-item">
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </template>
  </ModuleWorkbench>
</template>

<style scoped>
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
}

.workspace-main {
  min-width: 0;
}

.workspace-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.payment-panel,
.customer-panel {
  padding: 22px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.payment-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.payment-card {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(21, 94, 99, 0.06);
}

.payment-card span {
  display: block;
  color: var(--erp-muted);
  font-size: 12px;
}

.payment-card strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
}

.payment-card p,
.customer-item p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--erp-muted);
}

.customer-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--erp-primary-soft);
}

.customer-item strong {
  display: block;
  font-size: 14px;
}

@media (max-width: 1080px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}
</style>
