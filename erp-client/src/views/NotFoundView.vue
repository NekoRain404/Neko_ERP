<script setup lang="ts">
import { useI18n } from '@/i18n'

const { t } = useI18n()
</script>

<template>
  <div class="not-found erp-card">
    <h1>404</h1>
    <p class="erp-muted">{{ t('app.notFoundText') }}</p>
    <router-link to="/">
      <el-button type="primary">{{ t('app.backHome') }}</el-button>
    </router-link>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 60vh;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 32px;
}

h1 {
  margin: 0;
  font-size: 72px;
}
</style>
