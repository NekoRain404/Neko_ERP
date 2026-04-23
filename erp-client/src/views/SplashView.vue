<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'

const router = useRouter()
const authStore = useAuthStore()
const { locale } = useI18n()

onMounted(() => {
  window.setTimeout(() => {
    if (authStore.isAuthenticated) {
      void router.replace('/')
      return
    }
    void router.replace('/login')
  }, 1800)
})
</script>

<template>
  <section class="splash-shell" :class="{ english: locale === 'en-US' }">
    <div class="aurora aurora-a"></div>
    <div class="aurora aurora-b"></div>
    <div class="splash-card">
      <div class="logo-cluster">
        <div class="logo-ring"></div>
        <div class="logo-core">NE</div>
      </div>
      <div class="wordmark">NEKO_ERP</div>
      <div class="splash-tagline">
        <span v-if="locale === 'en-US'">Desktop ERP Workspace</span>
        <span v-else>桌面化企业工作台</span>
      </div>
      <div class="loading-track">
        <div class="loading-bar"></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.splash-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, color-mix(in srgb, var(--app-primary) 12%, transparent), transparent 38%),
    linear-gradient(180deg, var(--app-bg), var(--app-surface));
}

.aurora {
  position: absolute;
  inset: auto;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  filter: blur(70px);
  opacity: 0.5;
}

.aurora-a {
  top: -80px;
  left: -60px;
  background: color-mix(in srgb, var(--app-primary) 24%, transparent);
  animation: float-a 9s ease-in-out infinite;
}

.aurora-b {
  right: -80px;
  bottom: -120px;
  background: color-mix(in srgb, var(--app-success) 18%, transparent);
  animation: float-b 11s ease-in-out infinite;
}

.splash-card {
  position: relative;
  z-index: 1;
  width: min(560px, calc(100vw - 48px));
  padding: 56px 48px;
  border-radius: 28px;
  background: color-mix(in srgb, var(--app-panel) 88%, transparent);
  border: 1px solid var(--app-border);
  box-shadow: 0 24px 70px rgba(8, 15, 30, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  backdrop-filter: blur(16px);
}

.logo-cluster {
  position: relative;
  width: 108px;
  height: 108px;
  display: grid;
  place-items: center;
}

.logo-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--app-primary) 26%, transparent);
  box-shadow:
    inset 0 0 0 8px color-mix(in srgb, var(--app-primary) 10%, transparent),
    0 0 44px color-mix(in srgb, var(--app-primary) 14%, transparent);
  animation: spin 8s linear infinite;
}

.logo-core {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, var(--app-primary), color-mix(in srgb, var(--app-primary) 68%, #ffffff));
  color: white;
  font-weight: 800;
  font-size: 28px;
  letter-spacing: -1px;
  box-shadow: 0 18px 36px color-mix(in srgb, var(--app-primary) 26%, transparent);
}

.wordmark {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -1.4px;
  color: var(--app-text);
}

.splash-tagline {
  font-size: 14px;
  color: var(--app-text-secondary);
  letter-spacing: 0.2px;
}

.loading-track {
  width: 240px;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  overflow: hidden;
  margin-top: 8px;
}

.loading-bar {
  height: 100%;
  width: 42%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--app-primary), color-mix(in srgb, var(--app-success) 66%, var(--app-primary)));
  animation: loading 1.4s ease-in-out infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes loading {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(340%); }
}

@keyframes float-a {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(18px, 26px, 0); }
}

@keyframes float-b {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-26px, -16px, 0); }
}
</style>
