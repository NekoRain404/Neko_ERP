<script setup lang="ts">
import { computed } from 'vue'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import FirstWavePlaybookPanel from '@/components/FirstWavePlaybookPanel.vue'
import FirstWaveEvidencePanel from '@/components/FirstWaveEvidencePanel.vue'
import PilotReviewQueuePanel from '@/components/PilotReviewQueuePanel.vue'
import ReminderSummaryPanel from '@/components/ReminderSummaryPanel.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import RelationshipMemoryPanel from '@/components/RelationshipMemoryPanel.vue'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'
import { buildFirstWavePlaybook } from '@/utils/first-wave-playbook'
import { buildFirstWaveWorkbenchShortcuts } from '@/utils/first-wave-workbench-shortcuts'

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const playbook = computed(() => buildFirstWavePlaybook('resPartner', isEnglish.value))
const cockpitShortcutItems = computed(() => buildFirstWaveWorkbenchShortcuts('resPartner', isEnglish.value))

const highlights = computed(() =>
  isEnglish.value
    ? [
        { label: 'Cutover Scope', value: 'Master Data First', description: 'Partners stay in the first-wave cutover scope, so identity, ownership, and contact data must be directly maintainable here.' },
        { label: 'Relationship Depth', value: 'Timeline / Notes / Attachments', description: 'Partner records are the first place where timeline, notes, and attachment context should become part of daily work.' },
        { label: 'Reference Role', value: 'Sales / Purchase / Company', description: 'The same partner record needs to support both sales and purchase chains without creating separate maintenance islands.' },
      ]
    : [
        { label: '切换范围', value: '主数据优先', description: '伙伴属于首批切换主数据，所以身份、归属和联系方式必须能在这里直接维护。' },
        { label: '关系深度', value: '时间轴 / 便签 / 附件', description: '伙伴档案是第一批真正承载 timeline、便签和附件上下文的地方。' },
        { label: '引用角色', value: '销售 / 采购 / 公司', description: '同一个伙伴档案要同时支撑销售链、采购链和公司引用，不能切成多个维护孤岛。' },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Identity First', description: 'Keep company flag, parent relation, owner, and active state stable before adding deep CRM semantics.' },
        { label: 'Contact Surface', description: 'Email, phone, website, tax number, and credit limit stay visible for quick data maintenance during pilot cutover.' },
        { label: 'Timeline Ready', description: 'Timeline is already mounted through the shared detail shell, so partner workbench should become the master-data entry for relationship history.' },
      ]
    : [
        { label: '身份优先', description: '在进入深 CRM 之前，先把公司标记、上级伙伴、负责人和启用状态做稳。' },
        { label: '联系面', description: '邮箱、电话、网站、税号和信用额度保持可见，方便试点切换阶段快速维护。' },
        { label: '时间轴就绪', description: '时间轴已经通过共享详情壳挂载，伙伴工作台要成为关系历史的主入口。' },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Primary Work', value: 'Create / Edit / Trace', description: 'Mainline partner work stays focused on direct creation, editing, and tracing from downstream documents.' },
        { label: 'Pilot Usage', value: 'Customer / Vendor Shared Master', description: 'Use one shared partner master for both customer and vendor flows during early cutover.' },
      ]
    : [
        { label: '主工作', value: '新建 / 编辑 / 追溯', description: '伙伴主线工作先聚焦直接新建、编辑和从下游单据追溯。' },
        { label: '试点使用', value: '客户 / 供应商共享主档', description: '在早期切换里统一使用共享伙伴主档，不拆分成两套维护入口。' },
      ],
)

const sideCards = computed(() =>
  isEnglish.value
    ? [
        { label: 'Timeline', value: 'Ready', description: 'Logs, notes, and attachments are already merged inside the partner detail panel.' },
        { label: 'Ext Data', value: 'Ready', description: 'Partner is already one of the core tables that can absorb dynamic extension fields.' },
        { label: 'Cutover Priority', value: 'P0', description: 'Partner maintenance is part of the first pilot scope and should stay ahead of support modules.' },
      ]
    : [
        { label: 'Timeline', value: '已接入', description: '日志、便签和附件已经在伙伴详情面板里聚合。' },
        { label: 'Ext Data', value: '已接入', description: '伙伴已经是首批支持动态扩展字段的核心表之一。' },
        { label: '切换优先级', value: 'P0', description: '伙伴维护属于首批试点范围，优先级要高于支撑模块。' },
      ],
)

const quickGuides = computed(() =>
  isEnglish.value
    ? [
        { title: 'Create Stable Masters', description: 'Complete identity and contact fields first, then let downstream sales or purchase flows reuse the same record.' },
        { title: 'Open From Business Flow', description: 'When a sales order or purchase order references a partner, jump back here for master corrections instead of patching downstream data.' },
        { title: 'Use Timeline For Context', description: 'Record relationship notes and keep attachments close to the business partner before expanding deep CRM features.' },
      ]
    : [
        { title: '先建稳定主档', description: '先把身份和联系字段补齐，再让销售和采购下游复用同一条伙伴记录。' },
        { title: '从业务链回到主档', description: '销售单或采购单引用伙伴后，主数据修正要回到这里做，不在下游硬补。' },
        { title: '用 Timeline 承载上下文', description: '在扩深 CRM 前，先把关系便签和附件沉淀到伙伴档案里。' },
      ],
)

const quickLinkItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Create Partner', description: 'Start a new shared partner master directly from the first-wave workbench.', routeName: 'resPartner', query: { create: '1' }, buttonType: 'primary' },
        { label: 'Open Sales Orders', description: 'Move into the sales chain when the partner is ready for customer-side work.', routeName: 'saleOrder', query: { section: 'ops-financial-trace' } },
        { label: 'Open Purchase Orders', description: 'Move into the procurement chain when the partner is used as a vendor.', routeName: 'purchaseOrder', query: { section: 'ops-financial-trace' } },
        { label: 'Open Evidence Desk', description: 'Go straight to the partner evidence lane when contracts, certificates, or onboarding files still need attention.', routeName: 'resPartner', query: { section: 'ops-evidence' } },
        { label: 'Open Cutover Settings', description: 'Check or restore the partner pilot scope without leaving the first-wave path.', routeName: 'settings', query: { tab: 'cutover', module: 'resPartner' } },
      ]
    : [
        { label: '新建伙伴', description: '直接从首批工作台发起新的共享伙伴主档。', routeName: 'resPartner', query: { create: '1' }, buttonType: 'primary' },
        { label: '打开销售订单', description: '当伙伴可以进入客户侧业务时，直接切到销售链。', routeName: 'saleOrder', query: { section: 'ops-financial-trace' } },
        { label: '打开采购订单', description: '当伙伴作为供应商使用时，直接切到采购链。', routeName: 'purchaseOrder', query: { section: 'ops-financial-trace' } },
        { label: '打开证据台', description: '当合同、证照或准入文件仍需补齐时，直接进入伙伴证据工作区。', routeName: 'resPartner', query: { section: 'ops-evidence' } },
        { label: '打开切换设置', description: '不离开主线即可检查或恢复伙伴试点范围。', routeName: 'settings', query: { tab: 'cutover', module: 'resPartner' } },
      ],
)

const readinessItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Shared Master', value: 'Ready', description: 'The partner workbench is already positioned as the single customer and vendor master entry.', tone: 'success' },
        { label: 'Timeline Context', value: 'Ready', description: 'Logs, notes, and attachments are already available from the shared detail shell.', tone: 'success' },
        { label: 'Fallback Path', value: 'Visible', description: 'The partner pilot can be disabled directly from the module banner and settings.', tone: 'warning' },
      ]
    : [
        { label: '共享主档', value: '已就绪', description: '伙伴工作台已经定位为客户和供应商统一主档入口。', tone: 'success' },
        { label: '时间轴上下文', value: '已就绪', description: '日志、便签和附件已经可以从共享详情壳直接查看。', tone: 'success' },
        { label: '回退路径', value: '可见', description: '伙伴试点可以直接从模块横幅和设置页关闭。', tone: 'warning' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Partner Workbench' : '伙伴工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'The first-wave master-data workbench for maintaining partner identity, contact, ownership, and relationship context.'
    : '首批主数据工作台，负责维护伙伴身份、联系方式、归属和关系上下文。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Keep partner maintenance stable first, then let sales and purchase chains reuse the same master record.'
    : '先把伙伴主档维护做稳，再让销售链和采购链复用同一条主记录。',
)

// The pilot guide keeps the first-wave master-data workflow explicit so trial
// users do not improvise different maintenance paths during cutover.
const pilotGuideItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Create Or Open The Shared Partner Master', description: 'Use one shared partner record for customer, vendor, and company references instead of duplicating identities downstream.' },
        { title: '2. Complete Identity And Contact Fields First', description: 'Stabilize company flag, parent relation, owner, email, phone, website, and tax information before the pilot team starts using the record.' },
        { title: '3. Record Context In Timeline', description: 'Use notes and attachments to capture relationship context so later sales and purchase users can continue from the same partner history.' },
      ]
    : [
        { title: '1. 先创建或打开共享伙伴主档', description: '客户、供应商、公司引用统一复用一条伙伴记录，不在下游重复建身份。' },
        { title: '2. 先补齐身份与联系字段', description: '在试点团队使用前，先把公司标记、上级伙伴、负责人、邮箱、电话、网站和税号补稳。' },
        { title: '3. 把上下文沉淀进 Timeline', description: '通过便签和附件记录关系背景，方便后续销售和采购从同一历史继续工作。' },
      ],
)

const rollbackItems = computed(() =>
  isEnglish.value
    ? [
        { title: '1. Disable The Partner Pilot Entry', description: 'Use the cutover switch to stop new partner maintenance from entering the pilot workbench.' },
        { title: '2. Export The Affected Partner List', description: 'Collect partner records changed during the trial so they can be reconciled back to Odoo if needed.' },
        { title: '3. Reopen Odoo As The Fallback Master Entry', description: 'Let operators return to Odoo for master-data maintenance until the partner pilot is reopened.' },
      ]
    : [
        { title: '1. 关闭伙伴试点入口', description: '通过切换开关停止新的伙伴维护继续进入试点工作台。' },
        { title: '2. 导出受影响伙伴清单', description: '收集试点期间改动过的伙伴记录，必要时回补到 Odoo。' },
        { title: '3. 恢复 Odoo 作为兜底主档入口', description: '在伙伴试点重新开放前，让操作员回到 Odoo 维护主数据。' },
      ],
)
</script>

<template>
  <ModuleWorkbench
    module-key="resPartner"
    :config="moduleConfigMap.resPartner"
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
          <EntityTableView module-key="resPartner" />
        </section>

        <aside class="workspace-side">
          <PilotReviewQueuePanel
            :title="isEnglish ? 'Partner Review Queue' : '伙伴审核队列'"
            :description="isEnglish
              ? 'Prioritize partner records that still block sales or purchase pilot progress.'
              : '优先处理那些仍然阻塞销售链或采购链推进的伙伴记录。'"
            :module-keys="['resPartner', 'saleOrder', 'purchaseOrder']"
            :limit="5"
          />

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Partner Snapshot' : '伙伴快照' }}</div>
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
          <RelationshipMemoryPanel module-key="resPartner" />
          <FirstWaveEvidencePanel module-key="resPartner" />

          <ReminderSummaryPanel
            :title="isEnglish ? 'Partner Follow-Up Reminders' : '伙伴跟进提醒'"
            :description="isEnglish
              ? 'Use idle-partner reminders to keep relationship context alive before the pilot widens.'
              : '通过沉寂伙伴提醒保持关系上下文持续可见，再扩大试点范围。'"
            :module-keys="['resPartner']"
          />

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Master Data Guide' : '主数据指引' }}</div>
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
