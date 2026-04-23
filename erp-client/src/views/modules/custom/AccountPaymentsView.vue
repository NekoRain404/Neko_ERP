<script setup lang="ts">
import { computed } from 'vue'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import PilotReviewQueuePanel from '@/components/PilotReviewQueuePanel.vue'
import FirstWavePlaybookPanel from '@/components/FirstWavePlaybookPanel.vue'
import FirstWaveEvidencePanel from '@/components/FirstWaveEvidencePanel.vue'
import ReminderSummaryPanel from '@/components/ReminderSummaryPanel.vue'
import FinancialTracePanel from '@/components/FinancialTracePanel.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import RelationshipMemoryPanel from '@/components/RelationshipMemoryPanel.vue'
import SettlementCockpitPanel from '@/components/SettlementCockpitPanel.vue'
import PaymentLinkagePanel from '@/components/PaymentLinkagePanel.vue'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'
import { buildFirstWavePlaybook } from '@/utils/first-wave-playbook'
import { buildFirstWaveWorkbenchShortcuts } from '@/utils/first-wave-workbench-shortcuts'

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const playbook = computed(() => buildFirstWavePlaybook('accountPayment', isEnglish.value))
const cockpitShortcutItems = computed(() => buildFirstWaveWorkbenchShortcuts('accountPayment', isEnglish.value))

const highlights = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Mainline Chain',
          value: 'Invoice / Payment / Journal Entry',
          description: 'Payments now act as the downstream closure point for the first-wave purchase chain and should keep invoice and journal traceability on one surface.',
        },
        {
          label: 'Payment Direction',
          value: 'Inbound / Outbound',
          description: 'The workbench keeps customer and vendor payment directions visible so cutover users do not lose business semantics while posting.',
        },
        {
          label: 'Traceability',
          value: 'Origin / Invoice / Move',
          description: 'Origin references, invoice references, and generated journal entries should stay one click away inside the same payment shell.',
        },
      ]
    : [
        {
          label: '主链路',
          value: '发票 / 付款 / 凭证',
          description: '付款现在承担首批采购链的下游闭环，需要把发票和凭证追溯收进同一界面。',
        },
        {
          label: '付款方向',
          value: 'Inbound / Outbound',
          description: '工作台持续暴露客户付款和供应商付款方向，避免过账时丢失业务语义。',
        },
        {
          label: '追溯性',
          value: '来源 / 发票 / 凭证',
          description: '来源引用、发票引用和生成凭证都要在同一付款壳层里保持一跳可达。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Invoice First',
          description: 'Payments should usually continue from invoice context instead of being treated as isolated accounting objects.',
        },
        {
          label: 'Direction Safety',
          description: 'Payment type, amount, partner, and date should stay aligned before posting so purchase cutover does not drift financially.',
        },
        {
          label: 'Posting Trace',
          description: 'Posting should surface the resulting journal entry quickly so operators can audit payment outcomes without leaving the pilot path.',
        },
      ]
    : [
        {
          label: '发票优先',
          description: '付款通常应从发票上下文继续处理，而不是被当成孤立的会计对象。',
        },
        {
          label: '方向安全',
          description: '付款类型、金额、伙伴和日期在过账前要保持一致，避免采购试点的财务语义漂移。',
        },
        {
          label: '过账追溯',
          description: '过账后要能快速看到生成凭证，让操作员不离开试点路径也能审计付款结果。',
        },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Primary Action',
          value: 'Post Payment',
          description: 'Posting remains the key step that closes the payment artifact and creates journal entry traceability.',
        },
        {
          label: 'Rollback Flow',
          value: 'Cancel / Reset Draft',
          description: 'Rollback stays visible so payment objects can be stopped safely before purchase cutover broadens.',
        },
        {
          label: 'Downstream Review',
          value: 'Invoice / Journal Entry',
          description: 'The payment surface should make invoice and journal follow-up easier than manual accounting search.',
        },
      ]
    : [
        {
          label: '主动作',
          value: 'Post Payment',
          description: '过账是关闭付款结果对象并生成凭证追溯的关键一步。',
        },
        {
          label: '回退链',
          value: 'Cancel / Reset Draft',
          description: '回退入口要保持可见，方便在采购试点扩大前安全停止付款对象。',
        },
        {
          label: '下游审查',
          value: '发票 / 凭证',
          description: '付款界面要让发票和凭证跟进比手工搜索会计对象更容易。',
        },
      ],
)

const paymentCards = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Vendor Payment',
          value: 'outbound',
          description: 'Purchase bills should continue here as outbound payments with origin and invoice references attached.',
        },
        {
          label: 'Customer Payment',
          value: 'inbound',
          description: 'Customer invoice settlements remain visible here without splitting payment direction semantics.',
        },
        {
          label: 'Journal Trace',
          value: 'journalEntryRef',
          description: 'Posting should always produce a journal entry reference that can be reopened from the same shell.',
        },
      ]
    : [
        {
          label: '供应商付款',
          value: 'outbound',
          description: '采购账单应以 outbound 付款在这里继续，并带着来源和发票引用。',
        },
        {
          label: '客户付款',
          value: 'inbound',
          description: '客户发票回款也留在这里，不再拆散付款方向语义。',
        },
        {
          label: '凭证追溯',
          value: 'journalEntryRef',
          description: '过账后应始终生成可从同一壳层重开的凭证引用。',
        },
      ],
)

const quickGuides = computed(() =>
  isEnglish.value
    ? [
        { title: 'Start From Invoice Links', description: 'Open payments from invoice or purchase references first so amount and direction are easier to verify.' },
        { title: 'Post Only After Scope Matches', description: 'Check partner, amount, payment type, and company before posting to reduce finance-side cleanup.' },
        { title: 'Reopen The Journal Entry Immediately', description: 'Once posted, open the generated journal entry from the same shell to keep payment review traceable.' },
      ]
    : [
        { title: '优先从发票链接进入', description: '先从发票或采购引用打开付款，这样金额和方向更容易核对。' },
        { title: '范围一致后再过账', description: '在 Post 前先核伙伴、金额、付款方向和公司，减少财务清理成本。' },
        { title: '过账后立刻重开凭证', description: '一旦过账，直接从同一壳层打开生成凭证，保持付款审查可追溯。' },
      ],
)

const quickLinkItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Create Payment', description: 'Start a new payment draft directly from the first-wave payment surface.', routeName: 'accountPayment', query: { create: '1' }, buttonType: 'primary' },
        { label: 'Open Invoices', description: 'Return to invoice posting and payment linkage without rebuilding context.', routeName: 'accountInvoice', query: { section: 'ops-payment-linkage' } },
        { label: 'Open Purchase Orders', description: 'Jump back to the procurement source when vendor payment origins need review.', routeName: 'purchaseOrder', query: { section: 'ops-financial-trace' } },
        { label: 'Open Journal Entries', description: 'Move into journal entries once payment posting creates downstream accounting artifacts.', routeName: 'accountMove', query: { section: 'ops-settlement' } },
        { label: 'Open Partner Master', description: 'Reopen vendor or customer master context when payment direction and contact ownership need correction.', routeName: 'resPartner', query: { section: 'ops-evidence' } },
      ]
    : [
        { label: '新建付款', description: '直接从首批付款界面开始新的付款草稿。', routeName: 'accountPayment', query: { create: '1' }, buttonType: 'primary' },
        { label: '打开发票', description: '继续回到发票过账和付款关联，不必重建上下文。', routeName: 'accountInvoice', query: { section: 'ops-payment-linkage' } },
        { label: '打开采购订单', description: '当要核供应商付款来源时，直接跳回采购源头。', routeName: 'purchaseOrder', query: { section: 'ops-financial-trace' } },
        { label: '打开凭证', description: '付款过账生成下游会计结果对象后，继续进入凭证。', routeName: 'accountMove', query: { section: 'ops-settlement' } },
        { label: '打开伙伴主档', description: '当付款方向、联系人归属或主体身份需要修正时，直接回到伙伴主档。', routeName: 'resPartner', query: { section: 'ops-evidence' } },
      ],
)

const readinessItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Invoice Linkage', value: 'Ready', description: 'Payments can already reopen the source invoice directly from payment references.', tone: 'success' },
        { label: 'Journal Traceability', value: 'Ready', description: 'Posted payments expose journal entry references for finance-side review, and the backend cockpit now highlights missing invoice/source/journal anchors.', tone: 'success' },
        { label: 'Purchase Cutover', value: 'Visible', description: 'Payment work now sits inside the purchase pilot path instead of being hidden behind generic accounting pages.', tone: 'warning' },
      ]
    : [
        { label: '发票链接', value: '已就绪', description: '付款已经可以直接通过引用重开发票源对象。', tone: 'success' },
        { label: '凭证追溯', value: '已就绪', description: '已过账付款会直接暴露凭证引用供财务侧审查，后端驾驶舱也会标出缺失的发票、来源和凭证锚点。', tone: 'success' },
        { label: '采购切换', value: '可见', description: '付款现在已进入采购试点路径，不再藏在泛化会计页面后面。', tone: 'warning' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Payment Workbench' : '付款工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'The first-wave payment workbench that keeps invoice linkage, payment direction, posting, and journal traceability in one desktop surface.'
    : '首批付款工作台，把发票链接、付款方向、过账和凭证追溯收进同一桌面界面。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Treat payments as the downstream closure step of invoice and purchase pilots, not as isolated finance data entry.'
    : '把付款视为发票和采购试点的下游闭环步骤，而不是孤立的财务录入对象。',
)

const pilotGuideItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Open Payments From Invoice Or Purchase Context', description: 'Continue from bill or invoice references first so direction, amount, and origin stay grounded in the business chain.' },
        { title: '2. Verify Direction, Amount, And Partner Before Posting', description: 'Make payment type, amount, partner, date, and company match the source document before posting.' },
        { title: '3. Follow The Journal Entry From The Same Workbench', description: 'After posting, open the generated journal entry immediately to keep payment review and rollback traceable.' },
      ]
    : [
        { title: '1. 从发票或采购上下文进入付款', description: '先沿账单或发票引用继续处理，这样方向、金额和来源都保持在业务链里。' },
        { title: '2. 过账前核方向、金额和伙伴', description: '在 Post 前，让付款类型、金额、伙伴、日期和公司与源单据保持一致。' },
        { title: '3. 在同一工作台继续跟凭证', description: '过账后立刻打开生成凭证，让付款审查和回退保持可追溯。' },
      ],
)

const rollbackItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Stop New Payments From Entering The Pilot', description: 'Disable the purchase pilot or payment module entry before more posted payments accumulate inside the trial.' },
        { title: '2. Export Payment, Invoice, And Journal References', description: 'Keep payment, invoice, origin, and journal references together for fallback review and reconciliation.' },
        { title: '3. Reopen Odoo Payment Entry If Needed', description: 'Let operators return to Odoo payment handling while trial payments are checked, cancelled, or replayed.' },
      ]
    : [
        { title: '1. 停止新的付款继续进入试点', description: '在更多已过账付款继续积累前，先关闭采购试点或付款模块入口。' },
        { title: '2. 导出付款、发票和凭证引用', description: '把付款、发票、来源和凭证引用一起保留，便于回退审查和核对。' },
        { title: '3. 必要时恢复 Odoo 付款入口', description: '当试点付款需要核查、取消或回放时，让操作员回到 Odoo 付款流程。' },
      ],
)
</script>

<template>
  <ModuleWorkbench
    module-key="accountPayment"
    :config="moduleConfigMap.accountPayment"
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
          <EntityTableView module-key="accountPayment" />
        </section>

        <aside class="workspace-side">
          <PilotReviewQueuePanel
            :title="isEnglish ? 'Payment Review Queue' : '付款审核队列'"
            :description="isEnglish
              ? 'Prioritize draft payments, vendor payout pressure, and invoice-linked finance risks from one side rail.'
              : '在同一侧栏里优先处理草稿付款、供应商付款压力和发票关联财务风险。'"
            :module-keys="['accountPayment', 'accountInvoice', 'purchaseOrder', 'resPartner']"
            :limit="5"
          />

          <ReminderSummaryPanel
            :title="isEnglish ? 'Payment Reminders' : '付款提醒'"
            :description="isEnglish
              ? 'Keep unpaid invoice pressure and payment posting risks visible while the purchase pilot stays narrow.'
              : '在采购试点仍较窄时，让未付发票压力和付款过账风险持续可见。'"
            :module-keys="['accountInvoice', 'accountPayment']"
            :limit="5"
          />

          <FinancialTracePanel
            module-key="accountPayment"
            :title="isEnglish ? 'Payment Trace Cockpit' : '付款追溯驾驶舱'"
            :description="isEnglish
              ? 'Keep source anchor, journal trace, and payment proof visible from one payment closure cockpit.'
              : '把来源锚点、凭证追溯和付款证据收进同一块付款闭环驾驶舱。'"
            compact
          />

          <SettlementCockpitPanel module-key="accountPayment" compact />
          <PaymentLinkagePanel module-key="accountPayment" compact />

          <article class="erp-card payment-panel">
            <div class="section-title">{{ isEnglish ? 'Payment Status Summary' : '付款状态摘要' }}</div>
            <div class="payment-grid">
              <div v-for="item in paymentCards" :key="item.label" class="payment-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </article>

          <FirstWavePlaybookPanel v-if="playbook" :playbook="playbook" />
          <RelationshipMemoryPanel module-key="accountPayment" />
          <FirstWaveEvidencePanel module-key="accountPayment" />

          <article class="erp-card guide-panel">
            <div class="section-title">{{ isEnglish ? 'Payment Guide' : '付款指引' }}</div>
            <div class="guide-list">
              <div v-for="item in quickGuides" :key="item.title" class="guide-item">
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
.guide-panel {
  padding: 22px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.payment-grid,
.guide-list {
  margin-top: 16px;
  display: grid;
  gap: 14px;
}

.payment-card,
.guide-item {
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
.guide-item p {
  margin: 10px 0 0;
  color: var(--erp-muted);
  line-height: 1.6;
  font-size: 13px;
}

.guide-item strong {
  font-size: 14px;
}

@media (max-width: 1280px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}
</style>
