<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sidebarSections } from '@/config/sidebar-schema'
import { useAppStore } from '@/stores/app'
import { useCutoverStore } from '@/stores/cutover'
import { usePreferencesStore } from '@/stores/preferences'
import { useI18n } from '@/i18n'

const OPEN_GROUPS_KEY = 'neko_erp_sidebar_open_groups'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const cutoverStore = useCutoverStore()
const preferencesStore = usePreferencesStore()
const { t } = useI18n()

const sections = computed(() =>
  sidebarSections.map((section) => ({
    ...section,
    label: preferencesStore.language === 'zh-CN' ? section.zhLabel : section.enLabel,
    enabledCount: section.items.filter((item) => !item.moduleKey || cutoverStore.isModuleEnabled(item.moduleKey)).length,
    items: section.items.map((item) => ({
      ...item,
      label: preferencesStore.language === 'zh-CN' ? item.zhLabel : item.enLabel,
      enabled: !item.moduleKey || cutoverStore.isModuleEnabled(item.moduleKey),
      isFirstWave: Boolean(item.moduleKey && cutoverStore.isFirstWaveModule(item.moduleKey)),
    })),
  })),
)

const activeGroup = computed(() => sections.value.find((section) => section.items.some((item) => item.route === route.path))?.key || '')
const groupedEntries = computed(() => {
  if (!appStore.pinActiveGroup || !activeGroup.value) return sections.value
  return [...sections.value].sort((left, right) => {
    if (left.key === activeGroup.value) return -1
    if (right.key === activeGroup.value) return 1
    return 0
  })
})

const openedGroups = ref<string[]>(loadOpenedGroups())
const groupElements = ref<Record<string, HTMLElement | null>>({})

function isGroupOpen(group: string) {
  return !appStore.collapsed && openedGroups.value.includes(group)
}

function isGroupActive(group: string) {
  return activeGroup.value === group
}

function toggleGroup(group: string) {
  if (appStore.collapsed) return
  openedGroups.value = openedGroups.value.includes(group)
    ? openedGroups.value.filter((item) => item !== group)
    : [...openedGroups.value, group]
}

function moduleStatusLabel(enabled: boolean) {
  if (enabled) {
    return preferencesStore.language === 'zh-CN' ? '试点' : 'Pilot'
  }
  return preferencesStore.language === 'zh-CN' ? '已关闭' : 'Off'
}

function openCutoverSettings(moduleKey?: string) {
  void router.push({
    name: 'settings',
    query: {
      tab: 'cutover',
      ...(moduleKey ? { module: moduleKey } : {}),
    },
  })
}

function handleItemClick(item: { moduleKey?: string; enabled?: boolean }, event: MouseEvent) {
  if (!item.moduleKey || item.enabled !== false) return
  event.preventDefault()
  openCutoverSettings(item.moduleKey)
}

function setGroupElement(group: string, el: Element | ComponentPublicInstance | null) {
  const candidate = el && '$el' in el ? el.$el : el
  groupElements.value[group] = candidate instanceof HTMLElement ? candidate : null
}

function scrollGroupIntoView(group: string) {
  nextTick(() => {
    groupElements.value[group]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

watch(
  activeGroup,
  (group) => {
    if (!group || appStore.collapsed) return
    if (!openedGroups.value.includes(group)) {
      openedGroups.value = [...openedGroups.value, group]
    }
    scrollGroupIntoView(group)
  },
  { immediate: true },
)

watch(
  () => appStore.collapsed,
  (collapsed) => {
    if (collapsed) return
    if (!openedGroups.value.length) {
      openedGroups.value = activeGroup.value ? [activeGroup.value] : sections.value[0] ? [sections.value[0].key] : []
    }
  },
  { immediate: true },
)

watch(
  openedGroups,
  (groups) => {
    persistOpenedGroups(groups)
  },
  { deep: true },
)

const bottomLinks = computed(() => [
  { label: t('app.settings'), icon: 'Setting', route: '/settings' },
  { label: t('app.about'), icon: 'InfoFilled', route: '/about' },
])

function loadOpenedGroups() {
  if (typeof window === 'undefined') return []
  try {
    const value = window.localStorage.getItem(OPEN_GROUPS_KEY)
    if (!value) return []
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function persistOpenedGroups(groups: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(groups))
}
</script>

<template>
  <div class="mb-sidebar" :class="{ collapsed: appStore.collapsed }">
    <header class="sidebar-brand">
      <div class="brand-avatar">NE</div>
      <div v-if="!appStore.collapsed" class="brand-info">
        <div class="brand-name">NEKO_ERP</div>
        <div class="brand-desc">{{ t('app.enterpriseWorkspace') }}</div>
      </div>
    </header>

    <nav class="sidebar-nav">
      <div
        v-for="section in groupedEntries"
        :key="section.key"
        :ref="(el) => setGroupElement(section.key, el)"
        class="nav-section grouped-section"
        :class="{ 'group-is-active': isGroupActive(section.key) }"
      >
        <button
          v-if="!appStore.collapsed"
          type="button"
          class="section-title section-toggle"
          :class="{ open: isGroupOpen(section.key), active: isGroupActive(section.key) }"
          @click="toggleGroup(section.key)"
        >
          <div class="section-label">
            <el-icon class="group-icon"><component :is="section.icon" /></el-icon>
            <span>{{ section.label }}</span>
          </div>
          <div class="section-meta">
            <span class="module-count">{{ section.enabledCount }}/{{ section.items.length }}</span>
            <el-icon class="section-arrow"><ArrowDown /></el-icon>
          </div>
        </button>
        <transition name="collapse">
          <div v-show="appStore.collapsed || isGroupOpen(section.key)" class="sub-menu">
            <router-link
              v-for="item in section.items"
              :key="item.key"
              :to="item.route"
              class="nav-item sub-item"
              :class="{ active: route.path === item.route, disabled: item.enabled === false }"
              :title="item.label"
              @click="handleItemClick(item, $event)"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span v-if="!appStore.collapsed" class="item-label">{{ item.label }}</span>
              <span v-if="!appStore.collapsed && item.isFirstWave" class="item-badge" :class="{ off: item.enabled === false }">
                {{ moduleStatusLabel(item.enabled !== false) }}
              </span>
            </router-link>
          </div>
        </transition>
      </div>
    </nav>

    <footer class="sidebar-footer">
      <router-link v-for="link in bottomLinks" :key="link.label" :to="link.route" class="footer-item" :title="link.label">
        <el-icon><component :is="link.icon" /></el-icon>
        <span v-if="!appStore.collapsed">{{ link.label }}</span>
      </router-link>
      <div class="sidebar-toggle" @click="appStore.toggleCollapsed">
        <el-icon><component :is="appStore.collapsed ? 'ArrowRight' : 'ArrowLeft'" /></el-icon>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.mb-sidebar { display: flex; flex-direction: column; height: 100%; background: var(--app-sidebar); transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1); width: 100%; border-right: 1px solid var(--app-border); }
.mb-sidebar.collapsed { width: 64px; }
.sidebar-brand { padding: 24px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--app-border); overflow: hidden; height: 84px; box-sizing: border-box; }
.collapsed .sidebar-brand { padding: 24px 16px; justify-content: center; gap: 0; }
.brand-avatar { width: 32px; height: 32px; min-width: 32px; background: color-mix(in srgb, var(--app-primary) 12%, transparent); color: var(--app-primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; }
.brand-info { flex: 1; min-width: 0; overflow: hidden; }
.brand-name { font-weight: 700; font-size: 14px; white-space: nowrap; color: var(--app-text); }
.brand-desc { font-size: 10px; color: var(--app-text-secondary); white-space: nowrap; font-weight: 500; letter-spacing: 0.2px; }
.sidebar-nav { flex: 1; padding: 12px 0; overflow-y: auto; overflow-x: hidden; }
.grouped-section { margin-top: 4px; }
.group-is-active { position: relative; }
.section-title { padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: var(--app-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
.section-label { display: flex; align-items: center; gap: 10px; min-width: 0; }
.group-icon { font-size: 13px; color: var(--app-text-secondary); }
.section-toggle { width: 100%; border: none; background: transparent; cursor: pointer; text-align: left; border-radius: 12px; }
.section-toggle:hover { color: var(--app-text); background: var(--app-hover); }
.section-toggle.active { color: var(--app-text); background: color-mix(in srgb, var(--app-primary) 8%, transparent); }
.section-toggle.active .group-icon,
.section-toggle.active .module-count { color: var(--app-primary); }
.section-meta { display: flex; align-items: center; gap: 8px; }
.module-count { font-size: 10px; color: var(--app-text-secondary); }
.section-arrow { transition: transform 0.2s ease; }
.section-toggle.open .section-arrow { transform: rotate(180deg); }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 18px; text-decoration: none; color: var(--app-text); font-size: 13px; transition: all 0.2s ease; white-space: nowrap; font-weight: 500; margin: 2px 8px; border-radius: 10px; }
.collapsed .nav-item { padding: 12px 0; justify-content: center; gap: 0; margin: 2px 8px; }
.nav-item:hover { color: var(--app-text); background: var(--app-hover); }
.nav-item.active { color: var(--app-primary); background: color-mix(in srgb, var(--app-primary) 10%, transparent); font-weight: 600; }
.nav-item.disabled { opacity: 0.55; }
.item-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.item-badge { padding: 2px 6px; border-radius: 999px; background: color-mix(in srgb, var(--app-primary) 10%, transparent); color: var(--app-primary); font-size: 10px; font-weight: 700; }
.item-badge.off { background: rgba(148, 163, 184, 0.14); color: var(--app-text-secondary); }
.sub-item { padding-left: 30px; }
.collapsed .sub-item { padding-left: 0; }
.sub-menu { overflow: hidden; }
.sidebar-footer { border-top: 1px solid var(--app-border); padding: 8px 0; }
.footer-item { display: flex; align-items: center; gap: 12px; padding: 12px 24px; text-decoration: none; color: var(--app-text); font-size: 13px; white-space: nowrap; font-weight: 500; transition: all 0.2s; margin: 0 8px; border-radius: 8px; }
.footer-item:hover { background: var(--app-hover); color: var(--app-text); }
.collapsed .footer-item { padding: 12px 0; justify-content: center; gap: 0; }
.sidebar-toggle { height: 40px; margin: 8px; border-radius: 8px; background: transparent; color: var(--app-text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.sidebar-toggle:hover { background: var(--app-hover); color: var(--app-text); }
.collapse-enter-active,.collapse-leave-active { transition: all 0.2s ease; }
.collapse-enter-from,.collapse-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
