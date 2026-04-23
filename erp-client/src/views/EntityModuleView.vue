<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import type { ModuleKey } from '@/config/module-manifest'
import { moduleConfigMap } from '@/config/modules'
import { buildModuleWorkbenchPreset } from '@/config/module-workbench'
import { useI18n } from '@/i18n'

const route = useRoute()
const moduleKey = computed(() => route.meta.moduleKey as ModuleKey)
const { locale } = useI18n()
const config = computed(() => moduleConfigMap[moduleKey.value])
const preset = computed(() => buildModuleWorkbenchPreset(moduleKey.value, config.value, locale.value === 'en-US'))
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
    :note="preset.note"
  />
</template>
