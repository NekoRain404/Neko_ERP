<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import { usePilotReviewStore } from '@/stores/pilot-review'
import { useReminderStore } from '@/stores/reminders'
import { useCutoverStore } from '@/stores/cutover'
import { useI18n } from '@/i18n'
import { formatDateTime } from '@/utils/format'
import { resolveReminderFamilyLabel, resolveReminderSection } from '@/utils/reminders'
import { resolveCutoverSettingsQuery, resolveDefaultChainContacts, resolveDefaultChainGateState } from '@/utils/cutover'
import type { ModuleKey } from '@/config/module-manifest'
import { buildModuleDetailRouteTarget, buildModuleRouteTarget, isModuleRouteName } from '@/utils/module-navigation'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    moduleKey?: string
    moduleKeys?: string[]
    recordId?: number | null
    limit?: number
    emptyText?: string
  }>(),
  {
    title: undefined,
    description: undefined,
    moduleKey: undefined,
    moduleKeys: () => [],
    recordId: null,
    limit: 4,
    emptyText: undefined,
  },
)

const router = useRouter()
const pilotReviewStore = usePilotReviewStore()
const reminderStore = useReminderStore()
const cutoverStore = useCutoverStore()
const { locale } = useI18n()

const isEnglish = computed(() => locale.value === 'en-US')
const loading = ref(false)
const scopedItems = ref<ReminderRecord[]>([])
const panelTitle = computed(() => props.title || (isEnglish.value ? 'Pilot Reminders' : '试点提醒'))
const panelDescription = computed(() =>
  props.description || (isEnglish.value ? 'Keep first-wave cutover risks visible from the current workbench.' : '把首批切换链的风险持续暴露在当前工作台里。'),
)
const resolvedModuleKeys = computed(() => {
  if (props.moduleKey) return [props.moduleKey]
  return props.moduleKeys
})
const useScopedFetch = computed(() => Boolean(props.recordId || props.moduleKey))
const filteredItems = computed(() => {
  const source = useScopedFetch.value
    ? scopedItems.value
      : resolvedModuleKeys.value.length
        ? reminderStore.items.filter((item) => resolvedModuleKeys.value.includes(item.moduleKey))
        : reminderStore.items
  // Local review state suppresses already-triaged reminders so record pages
  // stay focused on unresolved pilot work instead of repeating old signals.
  return source.filter((item) => !pilotReviewStore.isHidden(item)).slice(0, props.limit)
})
const emptyStateText = computed(() =>
  props.emptyText || (isEnglish.value ? 'No pilot reminders in this scope.' : '当前范围内还没有试点提醒。'),
)
const panelSourceModuleKey = computed(() => (
  props.moduleKey && isModuleRouteName(props.moduleKey)
    ? props.moduleKey
    : undefined
))
const severityCounts = computed(() => ({
  critical: filteredItems.value.filter((item) => item.severity === 'critical').length,
  warning: filteredItems.value.filter((item) => item.severity === 'warning').length,
  info: filteredItems.value.filter((item) => item.severity === 'info').length,
}))

function reminderChainMeta(item: ReminderRecord) {
  const moduleKey = item.moduleKey as ModuleKey
  const chain = moduleKey ? cutoverStore.chainsForModule(moduleKey)[0] : undefined
  if (!chain) return null
  const contacts = cutoverStore.chainContactFor(chain.key, resolveDefaultChainContacts(chain.key, isEnglish.value))
  const gateState = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
  const pendingCount = [
    gateState.smokeReady,
    gateState.workbenchReady,
    gateState.rollbackReady,
    gateState.traceabilityReady,
    gateState.manualReady,
    gateState.pilotConfirmed,
  ].filter((value) => !value).length
  return {
    chainKey: chain.key,
    chainLabel: isEnglish.value ? chain.enLabel : chain.zhLabel,
    owner: contacts.owner,
    pendingCount,
  }
}

function openReminder(item: ReminderRecord) {
  reminderStore.markRead(item.id)
  if (!item.moduleKey) return
  const targetModuleKey = item.moduleKey as ModuleKey
  const chainKey = reminderChainMeta(item)?.chainKey
  if (!item.recordId) {
    if (item.type === 'role_task_overdue' || item.type === 'role_task_due_soon') {
      void router.push({
        name: 'settings',
        query: resolveCutoverSettingsQuery({
          moduleKey: item.moduleKey,
          section: 'roleDesk',
        }),
      })
      return
    }
    void router.push(buildModuleRouteTarget({
      targetModuleKey,
      rawQuery: {
        section: resolveReminderSection(item),
      },
      sourceModuleKey: panelSourceModuleKey.value,
      chainKey,
    }))
    return
  }
  const section = resolveReminderSection(item)
  // Reminder cards always jump into the record page so pilot operators can
  // move from risk discovery to correction without another search step.
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey,
    recordId: item.recordId,
    section,
    sourceModuleKey: panelSourceModuleKey.value,
    chainKey,
  }))
}

function markReviewed(item: ReminderRecord) {
  pilotReviewStore.markReviewed(item.id)
}

function snoozeReminder(item: ReminderRecord) {
  pilotReviewStore.snooze(item.id)
}

async function loadScopedItems() {
  if (!useScopedFetch.value) return
  loading.value = true
  try {
    // Record-scoped panels fetch directly so detail pages can show exact
    // reminders even when the global desktop tray only keeps a small window.
    scopedItems.value = await fetchReminders({
      limit: props.limit,
      moduleKey: props.moduleKey,
      recordId: props.recordId,
    })
  } finally {
    loading.value = false
  }
}

function severityLabel(item: ReminderRecord) {
  if (isEnglish.value) {
    if (item.severity === 'critical') return 'Critical'
    if (item.severity === 'warning') return 'Warning'
    return 'Info'
  }
  if (item.severity === 'critical') return '严重'
  if (item.severity === 'warning') return '提醒'
  return '提示'
}

function familyLabel(item: ReminderRecord) {
  return resolveReminderFamilyLabel(item, isEnglish.value)
}

onMounted(() => {
  void loadScopedItems()
})

watch(
  () => [props.moduleKey, props.recordId, props.limit],
  () => {
    if (!useScopedFetch.value) {
      scopedItems.value = []
      return
    }
    void loadScopedItems()
  },
)
</script>

<template>
  <article class="erp-card reminder-panel">
    <div class="reminder-header">
      <div>
        <div class="reminder-title">{{ panelTitle }}</div>
        <p class="reminder-desc">{{ panelDescription }}</p>
      </div>
      <div class="reminder-metrics">
        <span v-if="severityCounts.critical" class="metric critical">{{ severityCounts.critical }}</span>
        <span v-if="severityCounts.warning" class="metric warning">{{ severityCounts.warning }}</span>
        <span v-if="severityCounts.info" class="metric info">{{ severityCounts.info }}</span>
      </div>
    </div>

    <div v-if="loading" class="reminder-empty">
      {{ isEnglish ? 'Loading reminders...' : '正在加载提醒...' }}
    </div>

    <div v-else-if="filteredItems.length" class="reminder-list">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="reminder-item"
        :class="`severity-${item.severity || 'info'}`"
        @click="openReminder(item)"
      >
        <div class="reminder-topline">
          <strong>{{ item.title }}</strong>
          <div class="reminder-badges">
            <span class="family-badge">{{ familyLabel(item) }}</span>
            <span>{{ severityLabel(item) }}</span>
          </div>
        </div>
        <p>{{ item.content }}</p>
        <div class="reminder-meta">
          <span>{{ item.relatedRef || item.moduleKey }}</span>
          <span>{{ item.createdAt ? formatDateTime(item.createdAt) : '-' }}</span>
        </div>
        <div v-if="reminderChainMeta(item)" class="reminder-chain-meta">
          <span>{{ reminderChainMeta(item)?.chainLabel }}</span>
          <span>{{ isEnglish ? 'Owner' : '负责人' }} · {{ reminderChainMeta(item)?.owner || '-' }}</span>
          <span v-if="reminderChainMeta(item)?.pendingCount">
            {{ isEnglish ? 'Pending Gates' : '未完成门槛' }} · {{ reminderChainMeta(item)?.pendingCount }}
          </span>
        </div>
        <div class="reminder-actions">
          <el-button size="small" text @click.stop="snoozeReminder(item)">
            {{ isEnglish ? 'Later' : '稍后处理' }}
          </el-button>
          <el-button size="small" type="primary" text @click.stop="markReviewed(item)">
            {{ isEnglish ? 'Reviewed' : '已核对' }}
          </el-button>
        </div>
      </div>
    </div>

    <div v-else class="reminder-empty">{{ emptyStateText }}</div>
  </article>
</template>

<style scoped>
.reminder-panel {
  padding: 22px;
}

.reminder-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.reminder-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}

.reminder-desc {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.reminder-metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.metric {
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.reminder-badges {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.family-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}

.metric.critical {
  background: color-mix(in srgb, var(--app-danger) 18%, transparent);
  color: var(--app-danger);
}

.metric.warning {
  background: color-mix(in srgb, var(--app-warning) 18%, transparent);
  color: var(--app-warning);
}

.metric.info {
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
  color: var(--app-primary);
}

.reminder-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-item {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.reminder-item.severity-warning {
  border-color: color-mix(in srgb, var(--app-warning) 35%, var(--app-border));
}

.reminder-item.severity-critical {
  border-color: color-mix(in srgb, var(--app-danger) 45%, var(--app-border));
  background: color-mix(in srgb, var(--app-danger) 4%, var(--app-panel));
}

.reminder-topline,
.reminder-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reminder-topline strong {
  font-size: 13px;
}

.reminder-topline span,
.reminder-meta {
  color: var(--app-text-secondary);
  font-size: 12px;
}

.reminder-chain-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.reminder-item p {
  margin: 8px 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.reminder-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.reminder-empty {
  margin-top: 16px;
  padding: 18px 16px;
  border-radius: 16px;
  background: var(--app-muted-bg);
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
</style>
