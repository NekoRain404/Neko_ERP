<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { moduleManifestMap, type ModuleKey } from '@/config/module-manifest'
import type { ReminderRecord } from '@/api/reminders'
import { useActivityStore } from '@/stores/activity'
import { useCutoverStore } from '@/stores/cutover'
import { useReminderStore } from '@/stores/reminders'
import { useI18n } from '@/i18n'
import { formatDateTime } from '@/utils/format'
import { resolveCutoverSettingsQuery, resolveDefaultChainContacts, resolveDefaultChainGateState } from '@/utils/cutover'
import { resolveReminderSection } from '@/utils/reminders'
import { buildModuleDetailRouteTarget, buildModuleRouteTarget } from '@/utils/module-navigation'

const router = useRouter()
const activityStore = useActivityStore()
const cutoverStore = useCutoverStore()
const reminderStore = useReminderStore()
const { locale, t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const activeTab = ref<'activity' | 'reminder'>('activity')
const isEnglish = computed(() => locale.value === 'en-US')
const items = computed(() => activityStore.items)
const reminders = computed(() => reminderStore.items)
const unreadCount = computed(() => activityStore.unreadCount)
const unreadReminderCount = computed(() => reminderStore.unreadCount)
const totalUnreadCount = computed(() => unreadCount.value + unreadReminderCount.value)
const emptyText = computed(() => (isEnglish.value ? 'No recent activity yet.' : '当前还没有最近活动。'))
const emptyReminderText = computed(() => (isEnglish.value ? 'No reminders right now.' : '当前还没有提醒。'))

function togglePanel() {
  if (!activityStore.panelOpen && unreadReminderCount.value > 0) {
    activeTab.value = 'reminder'
  }
  activityStore.setPanelOpen(!activityStore.panelOpen)
}

function closePanel() {
  activityStore.setPanelOpen(false)
}

function handleDocumentClick(event: MouseEvent) {
  if (!activityStore.panelOpen) return
  if (rootRef.value?.contains(event.target as Node)) return
  closePanel()
}

function moduleTitle(item: { resModel?: string | null }) {
  const key = resolveModuleKey(item.resModel)
  if (!key) {
    return item.resModel || (isEnglish.value ? 'Activity' : '活动')
  }
  return moduleManifestMap[key]?.title || key
}

function reminderModuleTitle(item: ReminderRecord) {
  const key = item.moduleKey as ModuleKey
  return moduleManifestMap[key]?.title || item.moduleKey || (isEnglish.value ? 'Reminder' : '提醒')
}

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

function openItem(item: { id: number; resModel?: string | null; resId?: number | null }) {
  activityStore.markRead(item.id)
  const target = buildActivityTarget(item)
  if (!target) {
    closePanel()
    return
  }
  closePanel()
  void router.push(target)
}

function openReminder(item: ReminderRecord) {
  reminderStore.markRead(item.id)
  closePanel()
  const target = buildReminderTarget(item)
  if (!target) {
    return
  }
  void router.push(target)
}

function buildActivityTarget(
  item: { resModel?: string | null; resId?: number | null },
  section?: string,
) {
  const moduleKey = resolveModuleKey(item.resModel)
  if (!moduleKey || !item.resId) return null
  return buildModuleDetailRouteTarget({
    targetModuleKey: moduleKey,
    recordId: item.resId,
    section,
  })
}

function buildReminderTarget(item: ReminderRecord, section?: string) {
  if (!item.moduleKey) return null
  const targetModuleKey = item.moduleKey as ModuleKey
  const chainKey = reminderChainMeta(item)?.chainKey
  if (!item.recordId) {
    if (item.type === 'role_task_overdue' || item.type === 'role_task_due_soon') {
      return {
        name: 'settings',
        query: resolveCutoverSettingsQuery({
          moduleKey: item.moduleKey,
          section: 'roleDesk',
        }),
      }
    }
    return buildModuleRouteTarget({
      targetModuleKey,
      rawQuery: {
        section: section || resolveReminderSection(item),
      },
      chainKey,
    })
  }
  return buildModuleDetailRouteTarget({
    targetModuleKey,
    recordId: item.recordId,
    section: section || resolveReminderSection(item),
    chainKey,
  })
}

function openActivitySection(item: { id: number; resModel?: string | null; resId?: number | null }, section: string) {
  activityStore.markRead(item.id)
  const target = buildActivityTarget(item, section)
  if (!target) return
  closePanel()
  void router.push(target)
}

function openReminderSection(item: ReminderRecord, section: string) {
  reminderStore.markRead(item.id)
  const target = buildReminderTarget(item, section)
  if (!target) return
  closePanel()
  void router.push(target)
}

function openReminderHandoff(item: ReminderRecord) {
  const meta = reminderChainMeta(item)
  if (!meta?.chainKey) return
  reminderStore.markRead(item.id)
  closePanel()
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({
      chainKey: meta.chainKey,
      section: 'handoff',
    }),
  })
}

function openReminderClosedLoop(item: ReminderRecord) {
  const meta = reminderChainMeta(item)
  if (!meta?.chainKey) return
  reminderStore.markRead(item.id)
  closePanel()
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({
      chainKey: meta.chainKey,
      section: 'ops',
    }),
  })
}

function badgeText(item: { type: string }) {
  const type = String(item.type || '').toUpperCase()
  if (isEnglish.value) {
    if (type === 'ACTION') return 'Action'
    if (type === 'UPDATE') return 'Update'
    if (type === 'CREATE') return 'Create'
    return type || 'Event'
  }
  if (type === 'ACTION') return '动作'
  if (type === 'UPDATE') return '更新'
  if (type === 'CREATE') return '创建'
  return type || '事件'
}

function reminderBadgeText(item: ReminderRecord) {
  if (isEnglish.value) {
    if (item.severity === 'critical') return 'Critical'
    if (item.severity === 'warning') return 'Warning'
    return 'Reminder'
  }
  if (item.severity === 'critical') return '严重'
  if (item.severity === 'warning') return '提醒'
  return '提示'
}

function markCurrentTabRead() {
  if (activeTab.value === 'reminder') {
    reminderStore.markAllRead()
    return
  }
  activityStore.markAllRead()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

function resolveModuleKey(modelName?: string | null) {
  if (!modelName) return undefined
  const key = `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}` as ModuleKey
  return moduleManifestMap[key] ? key : undefined
}
</script>

<template>
  <div ref="rootRef" class="activity-center">
    <button
      class="activity-trigger"
      type="button"
      :title="t('app.activityCenter')"
      @click="togglePanel"
    >
      <el-icon><Bell /></el-icon>
      <span class="activity-label">{{ t('app.activityCenter') }}</span>
      <span v-if="totalUnreadCount" class="activity-badge">{{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }}</span>
    </button>

    <section v-if="activityStore.panelOpen" class="activity-panel">
      <header class="activity-header">
        <div>
          <strong>{{ t('app.activityCenter') }}</strong>
          <p>
            {{ activeTab === 'activity'
              ? t('app.activitySubtitle')
              : (isEnglish ? 'Pilot reminders keep first-wave cutover risks visible.' : '试点提醒会持续暴露首批切换链的风险。') }}
          </p>
        </div>
        <button class="activity-mark" type="button" @click="markCurrentTabRead">
          {{ t('app.markAllRead') }}
        </button>
      </header>

      <div class="activity-tabs">
        <button
          class="activity-tab"
          :class="{ active: activeTab === 'activity' }"
          type="button"
          @click="activeTab = 'activity'"
        >
          <span>{{ isEnglish ? 'Activity' : '活动' }}</span>
          <strong v-if="unreadCount">{{ unreadCount }}</strong>
        </button>
        <button
          class="activity-tab"
          :class="{ active: activeTab === 'reminder' }"
          type="button"
          @click="activeTab = 'reminder'"
        >
          <span>{{ isEnglish ? 'Reminders' : '提醒' }}</span>
          <strong v-if="unreadReminderCount">{{ unreadReminderCount }}</strong>
        </button>
      </div>

      <div v-if="activeTab === 'activity' && items.length" class="activity-list">
        <div
          v-for="item in items"
          :key="item.id"
          class="activity-item"
          :class="{ unread: item.id > activityStore.lastSeenId }"
        >
          <button
            class="activity-item-main"
            type="button"
            @click="openItem(item)"
          >
            <div class="activity-topline">
              <span class="activity-module">{{ moduleTitle(item) }}</span>
              <span class="activity-type">{{ badgeText(item) }}</span>
            </div>
            <p class="activity-message">{{ item.message }}</p>
            <div class="activity-meta">
              <span>{{ formatDateTime(item.createDate) }}</span>
              <span v-if="item.resId">#{{ item.resId }}</span>
            </div>
          </button>
          <div v-if="item.resId && resolveModuleKey(item.resModel)" class="activity-actions">
            <button type="button" class="activity-link" @click="openActivitySection(item, 'documents')">
              {{ isEnglish ? 'Documents' : '文档' }}
            </button>
            <button type="button" class="activity-link" @click="openActivitySection(item, 'timeline')">
              {{ isEnglish ? 'Timeline' : '时间轴' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'activity'" class="activity-empty">{{ emptyText }}</div>

      <div v-else-if="reminders.length" class="activity-list">
        <div
          v-for="item in reminders"
          :key="item.id"
          class="activity-item"
          :class="[
            `severity-${item.severity || 'info'}`,
            { unread: reminderStore.isUnread(item.id) },
          ]"
        >
          <button
            class="activity-item-main"
            type="button"
            @click="openReminder(item)"
          >
            <div class="activity-topline">
              <span class="activity-module">{{ reminderModuleTitle(item) }}</span>
              <span class="activity-type">{{ reminderBadgeText(item) }}</span>
            </div>
            <p class="activity-message"><strong>{{ item.title }}</strong></p>
            <p class="activity-message secondary">{{ item.content }}</p>
            <div class="activity-meta">
              <span>{{ item.createdAt ? formatDateTime(item.createdAt) : '-' }}</span>
              <span v-if="item.relatedRef">{{ item.relatedRef }}</span>
            </div>
            <div v-if="reminderChainMeta(item)" class="activity-chain-meta">
              <span>{{ reminderChainMeta(item)?.chainLabel }}</span>
              <span>{{ isEnglish ? 'Owner' : '负责人' }} · {{ reminderChainMeta(item)?.owner || '-' }}</span>
              <span v-if="reminderChainMeta(item)?.pendingCount">
                {{ isEnglish ? 'Pending Gates' : '未完成门槛' }} · {{ reminderChainMeta(item)?.pendingCount }}
              </span>
            </div>
          </button>
          <div v-if="item.recordId" class="activity-actions">
            <button type="button" class="activity-link" @click="openReminderSection(item, 'documents')">
              {{ isEnglish ? 'Documents' : '文档' }}
            </button>
            <button type="button" class="activity-link" @click="openReminderSection(item, 'timeline')">
              {{ isEnglish ? 'Timeline' : '时间轴' }}
            </button>
            <button v-if="reminderChainMeta(item)?.chainKey" type="button" class="activity-link" @click="openReminderHandoff(item)">
              {{ isEnglish ? 'Handoff' : '交接台' }}
            </button>
            <button v-if="reminderChainMeta(item)?.chainKey" type="button" class="activity-link" @click="openReminderClosedLoop(item)">
              {{ isEnglish ? 'Closed Loop' : '闭环台' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="activity-empty">{{ emptyReminderText }}</div>
    </section>
  </div>
</template>

<style scoped>
.activity-center {
  position: relative;
  -webkit-app-region: no-drag;
}

.activity-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-text);
  cursor: pointer;
}

.activity-label {
  font-size: 12px;
  font-weight: 600;
}

.activity-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--app-danger);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
}

.activity-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 30;
  width: 360px;
  max-height: 520px;
  overflow: auto;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: var(--app-panel-elevated);
  box-shadow: var(--app-card-shadow);
}

.activity-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.activity-header strong {
  display: block;
  font-size: 15px;
}

.activity-header p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.activity-mark {
  border: 0;
  background: transparent;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.activity-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.activity-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.activity-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-panel);
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.activity-tab.active {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 8%, var(--app-panel));
  color: var(--app-primary);
}

.activity-item {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  overflow: hidden;
}

.activity-item.unread {
  border-color: var(--app-primary);
  background: var(--app-hover);
}

.activity-item.severity-warning {
  border-color: color-mix(in srgb, var(--app-warning) 45%, var(--app-border));
}

.activity-item.severity-critical {
  border-color: color-mix(in srgb, var(--app-danger) 55%, var(--app-border));
  background: color-mix(in srgb, var(--app-danger) 4%, var(--app-panel));
}

.activity-topline,
.activity-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.activity-item-main {
  width: 100%;
  padding: 14px 14px 10px;
  border: 0;
  background: transparent;
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.activity-module {
  font-size: 13px;
  font-weight: 700;
}

.activity-type,
.activity-meta {
  color: var(--app-text-secondary);
  font-size: 12px;
}

.activity-message {
  margin: 8px 0;
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.5;
}

.activity-message.secondary {
  color: var(--app-text-secondary);
}

.activity-chain-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.activity-actions {
  display: flex;
  gap: 8px;
  padding: 0 14px 14px;
  flex-wrap: wrap;
}

.activity-link {
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel-elevated);
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.activity-link:hover {
  color: var(--app-primary);
  border-color: color-mix(in srgb, var(--app-primary) 45%, var(--app-border));
}

.activity-empty {
  padding: 28px 12px 12px;
  color: var(--app-text-secondary);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 900px) {
  .activity-label {
    display: none;
  }

  .activity-panel {
    width: min(360px, calc(100vw - 32px));
  }
}
</style>
