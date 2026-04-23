<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import PilotReviewQueuePanel from '@/components/PilotReviewQueuePanel.vue'
import RelationshipMemoryPanel from '@/components/RelationshipMemoryPanel.vue'
import ReminderSummaryPanel from '@/components/ReminderSummaryPanel.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import { moduleConfigMap } from '@/config/modules'
import type { ModuleKey } from '@/config/module-manifest'
import type { FirstWaveMasterDataPreset } from '@/config/first-wave-master-data'
import { useCutoverStore } from '@/stores/cutover'
import { usePreferencesStore } from '@/stores/preferences'
import { useI18n } from '@/i18n'
import { resolveCutoverSettingsQuery, resolveDefaultChainContacts, resolveDefaultChainGateState } from '@/utils/cutover'
import {
  buildModuleEvidenceExpectation,
  buildModuleEvidencePresets,
  sortEvidencePresetsByPriority,
} from '@/utils/first-wave-evidence'
import { compareReminderSeverity, pickTopReminder, resolveReminderSection } from '@/utils/reminders'
import { buildModuleDetailRouteTarget, buildModuleRouteTarget } from '@/utils/module-navigation'

const props = defineProps<{
  moduleKey: ModuleKey
  preset: FirstWaveMasterDataPreset
}>()

const route = useRoute()
const router = useRouter()
const cutoverStore = useCutoverStore()
const preferencesStore = usePreferencesStore()
const { moduleTitle } = useI18n()

// First-wave master data shares one desktop shell so company, product, and
// pricing surfaces evolve consistently instead of fragmenting into ad hoc pages.
const config = computed(() => moduleConfigMap[props.moduleKey])
const isEnglish = computed(() => preferencesStore.language === 'en-US')
const moduleEnabled = computed(() => cutoverStore.isModuleEnabled(props.moduleKey))
const moduleReminderItems = ref<ReminderRecord[]>([])
const moduleTopRisk = computed(() => pickTopReminder(moduleReminderItems.value))
const evidenceExpectation = computed(() =>
  buildModuleEvidenceExpectation(props.moduleKey, isEnglish.value),
)
const evidencePresets = computed(() =>
  sortEvidencePresetsByPriority(
    buildModuleEvidencePresets(props.moduleKey, isEnglish.value),
    evidenceExpectation.value.recommendedKey,
  ),
)
const chainRows = computed(() =>
  cutoverStore.chainsForModule(props.moduleKey).map((chain) => {
    const contacts = cutoverStore.chainContactFor(chain.key, resolveDefaultChainContacts(chain.key, isEnglish.value))
    const gateState = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
    const readiness = [
      gateState.smokeReady,
      gateState.workbenchReady,
      gateState.rollbackReady,
      gateState.traceabilityReady,
      gateState.manualReady,
      gateState.pilotConfirmed,
    ].filter(Boolean).length
    const blockers = [
      !gateState.smokeReady ? (isEnglish.value ? 'Smoke' : '回归') : null,
      !gateState.workbenchReady ? (isEnglish.value ? 'Workbench' : '工作台') : null,
      !gateState.rollbackReady ? (isEnglish.value ? 'Rollback' : '回退') : null,
      !gateState.traceabilityReady ? (isEnglish.value ? 'Traceability' : '追溯') : null,
      !gateState.manualReady ? (isEnglish.value ? 'Manual' : '手册') : null,
      !gateState.pilotConfirmed ? (isEnglish.value ? 'Pilot Confirm' : '试点确认') : null,
    ].filter((item): item is string => Boolean(item))
    return {
      key: chain.key,
      label: isEnglish.value ? chain.enLabel : chain.zhLabel,
      owner: contacts.owner,
      fallbackOwner: contacts.fallbackOwner,
      readiness,
      blockers,
      note: gateState.note,
    }
  }),
)
const masterSnapshotCards = computed(() => [
  {
    label: isEnglish.value ? 'Pilot Entry' : '试点入口',
    value: moduleEnabled.value ? (isEnglish.value ? 'Enabled' : '已启用') : (isEnglish.value ? 'Disabled' : '已关闭'),
    description: moduleEnabled.value
      ? (isEnglish.value ? 'This master data module still accepts pilot changes.' : '当前主数据模块仍然接受试点变更。')
      : (isEnglish.value ? 'Pilot changes are currently blocked until cutover settings reopen the module.' : '试点变更当前已被关闭，需通过切换设置重新开放。'),
  },
  {
    label: isEnglish.value ? 'Gate Readiness' : '门槛就绪度',
    value: chainRows.value.length ? `${chainRows.value.reduce((sum, row) => sum + row.readiness, 0)}/${chainRows.value.length * 6}` : '-',
    description: chainRows.value.some((row) => row.blockers.length)
      ? (isEnglish.value ? `Pending: ${chainRows.value.flatMap((row) => row.blockers).join(' / ')}` : `待完成：${chainRows.value.flatMap((row) => row.blockers).join(' / ')}`)
      : (isEnglish.value ? 'Attached pilot chains currently show no pending gate blockers.' : '关联试点链当前没有未完成门槛阻塞。'),
  },
  {
    label: isEnglish.value ? 'Evidence Pressure' : '证据压力',
    value: `${evidenceExpectation.value.requiredCount}/${evidenceExpectation.value.totalCount}`,
    description: isEnglish.value
      ? `Required: ${evidenceExpectation.value.requiredLabels.join(' / ') || '-'}`
      : `必备：${evidenceExpectation.value.requiredLabels.join(' / ') || '-'}`,
  },
  {
    label: isEnglish.value ? 'Top Risk' : '最高风险',
    value: moduleTopRisk.value?.title || (isEnglish.value ? 'No reminder' : '暂无提醒'),
    description: moduleTopRisk.value
      ? `${moduleTopRisk.value.severity} · ${moduleTopRisk.value.relatedRef || '-'}`
      : (isEnglish.value ? 'No direct pilot reminder is attached to this master data module.' : '当前主数据模块没有直接挂接的试点提醒。'),
  },
])

async function refreshModuleReminders() {
  moduleReminderItems.value = (await fetchReminders({
    limit: 40,
    moduleKey: props.moduleKey,
  })).sort(compareReminderSeverity)
}

function openCutoverSettings() {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({ moduleKey: props.moduleKey, section: 'handoff' }),
  })
}

function openWorkbenchSection(section: string) {
  void router.push(buildModuleRouteTarget({
    targetModuleKey: props.moduleKey,
    rawQuery: {
      ...(route.query as Record<string, string | undefined>),
      section,
    },
  }))
}

function openTopRiskRecord() {
  if (!moduleTopRisk.value?.recordId) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: moduleTopRisk.value.moduleKey as ModuleKey,
    recordId: moduleTopRisk.value.recordId,
    section: resolveReminderSection(moduleTopRisk.value),
    sourceModuleKey: props.moduleKey,
  }))
}

onMounted(() => {
  void refreshModuleReminders()
})

watch(
  () => props.moduleKey,
  () => {
    void refreshModuleReminders()
  },
)
</script>

<template>
  <ModuleWorkbench
    :module-key="moduleKey"
    :config="config"
    :title="preset.title"
    :description="preset.description"
    :highlights="preset.highlights"
    :focus-items="preset.focusItems"
    :action-items="preset.actionItems"
    :quick-link-items="preset.quickLinkItems"
    :readiness-items="preset.readinessItems"
    :pilot-guide-items="preset.pilotGuideItems"
    :rollback-items="preset.rollbackItems"
    :note="preset.note"
  >
    <template #workspace>
      <div class="workspace-layout">
        <section class="workspace-main">
          <EntityTableView :module-key="moduleKey" />
        </section>

        <aside class="workspace-side">
          <PilotReviewQueuePanel
            :title="preset.reviewQueueTitle"
            :description="preset.reviewQueueDescription"
            :module-keys="preset.reviewQueueModuleKeys"
            :limit="5"
          />

          <article class="erp-card side-panel">
            <div class="section-title">{{ preset.snapshotTitle }}</div>
            <div class="state-vertical">
              <div v-for="item in masterSnapshotCards" :key="item.label" class="state-card-mini">
                <div class="state-header">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
                <p>{{ item.description }}</p>
              </div>
            </div>
            <div class="side-action-row">
              <el-button size="small" @click="openCutoverSettings">
                {{ isEnglish ? 'Open Cutover' : '打开切换设置' }}
              </el-button>
              <el-button size="small" @click="openWorkbenchSection('ops-gates')">
                {{ isEnglish ? 'Open Gates' : '打开门槛台' }}
              </el-button>
              <el-button size="small" @click="openWorkbenchSection('ops-evidence')">
                {{ isEnglish ? 'Open Evidence' : '打开证据台' }}
              </el-button>
            </div>
          </article>

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Pilot Chain Snapshot' : '试点链快照' }}</div>
            <div class="side-list">
              <div v-for="row in chainRows" :key="row.key" class="side-item chain-item">
                <div class="chain-item-head">
                  <strong>{{ row.label }}</strong>
                  <span>{{ row.readiness }}/6</span>
                </div>
                <p>
                  {{ isEnglish ? 'Owner' : '负责人' }} · {{ row.owner || '-' }}
                  <br>
                  {{ isEnglish ? 'Fallback' : '兜底' }} · {{ row.fallbackOwner || '-' }}
                </p>
                <p v-if="row.blockers.length">
                  {{ isEnglish ? 'Pending' : '待完成' }} · {{ row.blockers.join(' / ') }}
                </p>
                <p v-if="row.note">{{ row.note }}</p>
              </div>
            </div>
          </article>

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Evidence Ladder' : '证据阶梯' }}</div>
            <div class="side-list">
              <div
                v-for="item in evidencePresets"
                :key="item.key"
                :class="['side-item', 'evidence-item', { recommended: evidenceExpectation.recommendedKey === item.key }]"
              >
                <div class="chain-item-head">
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.required ? (isEnglish ? 'Required' : '必备') : (isEnglish ? 'Optional' : '建议') }}</span>
                </div>
                <p>{{ item.description }}</p>
              </div>
            </div>
            <div class="side-action-row">
              <el-button size="small" @click="openWorkbenchSection('ops-evidence')">
                {{ isEnglish ? 'Open Evidence Desk' : '打开证据台' }}
              </el-button>
              <el-button size="small" @click="openWorkbenchSection('ops-rollback')">
                {{ isEnglish ? 'Open Rollback Desk' : '打开回退台' }}
              </el-button>
            </div>
          </article>

          <ReminderSummaryPanel
            :title="preset.reminderTitle"
            :description="preset.reminderDescription"
            :module-keys="preset.reminderModuleKeys"
          />

          <article v-if="moduleTopRisk" class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Top Risk Record' : '最高风险记录' }}</div>
            <div class="side-list">
              <div class="side-item risk-item">
                <div class="chain-item-head">
                  <strong>{{ moduleTopRisk.title }}</strong>
                  <span>{{ moduleTopRisk.severity }}</span>
                </div>
                <p>{{ moduleTopRisk.content }}</p>
                <p>
                  {{ isEnglish ? 'Reference' : '引用' }} · {{ moduleTopRisk.relatedRef || '-' }}
                  <br>
                  {{ isEnglish ? 'Module' : '模块' }} · {{ moduleTitle(moduleTopRisk.moduleKey as ModuleKey) }}
                </p>
              </div>
            </div>
            <div class="side-action-row">
              <el-button size="small" type="primary" @click="openTopRiskRecord">
                {{ isEnglish ? 'Open Record' : '打开记录' }}
              </el-button>
              <el-button size="small" @click="openWorkbenchSection('ops-rehearsal')">
                {{ isEnglish ? 'Open Rehearsal Desk' : '打开演练台' }}
              </el-button>
            </div>
          </article>

          <RelationshipMemoryPanel :module-key="moduleKey" />

          <article class="erp-card side-panel">
            <div class="section-title">{{ preset.guideTitle }}</div>
            <div class="side-list">
              <div v-for="item in preset.quickGuides" :key="item.title" class="side-item">
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.state-header strong {
  font-size: 14px;
}

.state-card-mini p,
.side-item p {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
  font-size: 13px;
}

.side-action-row {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chain-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chain-item-head span {
  font-size: 11px;
  font-weight: 700;
  color: var(--app-text-secondary);
  text-transform: uppercase;
}

.evidence-item.recommended {
  border-color: color-mix(in srgb, var(--app-warning) 35%, var(--app-border));
  background: color-mix(in srgb, var(--app-warning) 6%, var(--app-panel));
}

.risk-item {
  border-color: color-mix(in srgb, var(--app-danger) 35%, var(--app-border));
}

@media (max-width: 1280px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }
}
</style>
