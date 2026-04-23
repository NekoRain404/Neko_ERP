<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FirstWaveMasterDataWorkbench from '@/components/FirstWaveMasterDataWorkbench.vue'
import {
  buildFirstWaveMasterDataPreset,
  type FirstWaveMasterDataPreset,
} from '@/config/first-wave-master-data'
import type { ModuleKey } from '@/config/module-manifest'
import { useI18n } from '@/i18n'

type FirstWaveMasterModuleKey =
  | 'resCompany'
  | 'productTemplate'
  | 'productProduct'
  | 'productCategory'
  | 'productPricelist'

const route = useRoute()
const { locale } = useI18n()

const moduleKey = computed(() => route.meta.moduleKey as FirstWaveMasterModuleKey)

// These five master-data modules share one stronger workbench pattern so the
// first-wave cutover does not rely on generic pages for critical masters.
const preset = computed<FirstWaveMasterDataPreset>(() =>
  buildFirstWaveMasterDataPreset(moduleKey.value, locale.value === 'en-US'),
)
</script>

<template>
  <FirstWaveMasterDataWorkbench :module-key="moduleKey as ModuleKey" :preset="preset" />
</template>
