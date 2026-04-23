import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { moduleManifests } from '@/config/module-manifest'

const SIDEBAR_COLLAPSED_KEY = 'neko_erp_sidebar_collapsed'
const SIDEBAR_PIN_ACTIVE_GROUP_KEY = 'neko_erp_sidebar_pin_active_group'

export const useAppStore = defineStore('app', () => {
  const collapsed = ref(loadCollapsedState())
  const pinActiveGroup = ref(loadPinActiveGroupState())

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
    persistCollapsedState(collapsed.value)
  }

  function setPinActiveGroup(value: boolean) {
    pinActiveGroup.value = value
    persistPinActiveGroupState(value)
  }

  const groupedModules = computed(() => {
    return moduleManifests.reduce<Record<string, typeof moduleManifests>>((acc, module) => {
      acc[module.group] ??= []
      acc[module.group].push(module)
      return acc
    }, {})
  })

  return {
    collapsed,
    groupedModules,
    pinActiveGroup,
    setPinActiveGroup,
    toggleCollapsed,
  }
})

function loadCollapsedState() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
}

function persistCollapsedState(value: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0')
}

function loadPinActiveGroupState() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_PIN_ACTIVE_GROUP_KEY) === '1'
}

function persistPinActiveGroupState(value: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_PIN_ACTIVE_GROUP_KEY, value ? '1' : '0')
}
