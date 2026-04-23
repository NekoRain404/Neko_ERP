<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus/es/components/message/index'
import { useAuthStore } from '@/stores/auth'
import { useConnectionStore } from '@/stores/connection'
import { useI18n } from '@/i18n'

const router = useRouter()
const authStore = useAuthStore()
const connectionStore = useConnectionStore()
const { locale } = useI18n()

const form = reactive({
  username: connectionStore.lastUsername || 'admin',
  password: 'admin',
})
const loading = ref(false)
const testingConnection = ref(false)

function persistConnectionOptions() {
  connectionStore.setServerUrl(connectionStore.serverUrl)
  connectionStore.setProxyEnabled(connectionStore.proxyEnabled)
  connectionStore.setProxyRules(connectionStore.proxyRules)
  connectionStore.setProxyBypassRules(connectionStore.proxyBypassRules)
  connectionStore.setRememberUsername(connectionStore.rememberUsername)
  connectionStore.setLastUsername(form.username)
}

async function submitLogin() {
  loading.value = true
  try {
    persistConnectionOptions()
    await authStore.login(form.username.trim(), form.password)
    connectionStore.setLastUsername(form.username)
    ElMessage.success(locale.value === 'en-US' ? 'Login successful' : '登录成功')
    void router.replace('/')
  } catch (error: any) {
    ElMessage.error(error?.message || (locale.value === 'en-US' ? 'Login failed' : '登录失败'))
  } finally {
    loading.value = false
  }
}

async function checkConnection() {
  testingConnection.value = true
  try {
    persistConnectionOptions()
    await connectionStore.testConnection()
    ElMessage.success(locale.value === 'en-US' ? 'Connection successful' : '连接成功')
  } catch (error: any) {
    ElMessage.error(error?.message || (locale.value === 'en-US' ? 'Connection failed' : '连接失败'))
  } finally {
    testingConnection.value = false
  }
}
</script>

<template>
  <section class="login-shell">
    <div class="login-hero">
      <div class="hero-logo">NE</div>
      <div class="hero-title">NEKO_ERP</div>
      <p class="hero-copy">
        <span v-if="locale === 'en-US'">A desktop workspace for accelerated Odoo refactoring.</span>
        <span v-else>面向 Odoo 重构加速场景的桌面 ERP 工作台。</span>
      </p>
      <div class="hero-grid">
        <div class="hero-item">
          <strong>Electron</strong>
          <span>{{ locale === 'en-US' ? 'Desktop shell' : '桌面壳层' }}</span>
        </div>
        <div class="hero-item">
          <strong>Spring Boot</strong>
          <span>{{ locale === 'en-US' ? 'Backend core' : '服务端核心' }}</span>
        </div>
        <div class="hero-item">
          <strong>Vue + TS</strong>
          <span>{{ locale === 'en-US' ? 'Renderer workbench' : '渲染层工作台' }}</span>
        </div>
      </div>
    </div>

    <div class="login-panel erp-card">
      <div class="panel-head">
        <h1>{{ locale === 'en-US' ? 'Sign In' : '登录系统' }}</h1>
        <p>{{ locale === 'en-US' ? 'Continue to the NEKO_ERP desktop workspace.' : '登录后进入 NEKO_ERP 桌面工作区。' }}</p>
      </div>

      <form class="login-form" @submit.prevent="submitLogin">
        <label class="field">
          <span>{{ locale === 'en-US' ? 'Username' : '用户名' }}</span>
          <el-input v-model="form.username" :placeholder="locale === 'en-US' ? 'Enter username' : '请输入用户名'" />
        </label>

        <label class="field">
          <span>{{ locale === 'en-US' ? 'Password' : '密码' }}</span>
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="locale === 'en-US' ? 'Enter password' : '请输入密码'"
          />
        </label>

        <section class="connection-section">
          <div class="section-head">
            <strong>{{ locale === 'en-US' ? 'Server Settings' : '服务器设置' }}</strong>
            <span>{{ locale === 'en-US' ? 'Remembered on this device' : '当前设备自动记忆' }}</span>
          </div>

          <label class="field">
            <span>{{ locale === 'en-US' ? 'Server Address' : '服务地址' }}</span>
            <el-input
              v-model="connectionStore.serverUrl"
              :placeholder="locale === 'en-US' ? 'http://127.0.0.1:8080/api' : '请输入服务端地址，例如 http://127.0.0.1:8080/api'"
            />
          </label>

          <div class="switch-row">
            <div class="switch-copy">
              <strong>{{ locale === 'en-US' ? 'Use Proxy' : '启用代理' }}</strong>
              <span>{{ locale === 'en-US' ? 'Use an HTTP proxy when reaching a remote server.' : '远程连接服务端时可通过 HTTP 代理转发。' }}</span>
            </div>
            <el-switch v-model="connectionStore.proxyEnabled" />
          </div>

          <template v-if="connectionStore.proxyEnabled">
            <label class="field">
              <span>{{ locale === 'en-US' ? 'Proxy Address' : '代理地址' }}</span>
              <el-input
                v-model="connectionStore.proxyRules"
                :placeholder="locale === 'en-US' ? 'http=127.0.0.1:7890;https=127.0.0.1:7890' : '例如 http=127.0.0.1:7890;https=127.0.0.1:7890'"
              />
            </label>

            <label class="field">
              <span>{{ locale === 'en-US' ? 'Bypass Rules' : '绕过规则' }}</span>
              <el-input
                v-model="connectionStore.proxyBypassRules"
                :placeholder="locale === 'en-US' ? '<local>;localhost;127.0.0.1' : '例如 <local>;localhost;127.0.0.1'"
              />
            </label>
          </template>

          <div class="switch-row compact">
            <div class="switch-copy">
              <strong>{{ locale === 'en-US' ? 'Remember Username' : '记住用户名' }}</strong>
              <span>{{ locale === 'en-US' ? 'Restore the last username next time.' : '下次打开桌面端时恢复上次用户名。' }}</span>
            </div>
            <el-switch v-model="connectionStore.rememberUsername" />
          </div>

          <div class="connection-actions">
            <el-button :loading="testingConnection" @click="checkConnection">
              {{ locale === 'en-US' ? 'Test Connection' : '测试连接' }}
            </el-button>
            <div class="resolved-hint">{{ connectionStore.resolvedApiBaseUrl }}</div>
          </div>
        </section>

        <el-button class="submit-btn" native-type="submit" type="primary" :loading="loading">
          {{ locale === 'en-US' ? 'Enter Workspace' : '进入工作台' }}
        </el-button>
      </form>

      <div class="login-hint">
        <span>{{ locale === 'en-US' ? 'Default demo account:' : '当前演示账号：' }}</span>
        <strong>admin / admin</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(420px, 520px);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--app-primary) 12%, transparent), transparent 34%),
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--app-success) 10%, transparent), transparent 30%),
    var(--app-bg);
}

.login-hero {
  padding: 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-logo {
  width: 74px;
  height: 74px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(145deg, var(--app-primary), color-mix(in srgb, var(--app-primary) 60%, white));
  box-shadow: 0 22px 42px color-mix(in srgb, var(--app-primary) 22%, transparent);
}

.hero-title {
  margin-top: 28px;
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -1.6px;
  color: var(--app-text);
}

.hero-copy {
  margin: 16px 0 0;
  max-width: 520px;
  font-size: 16px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.hero-grid {
  margin-top: 40px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  max-width: 720px;
}

.hero-item {
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--app-panel) 82%, transparent);
  backdrop-filter: blur(10px);
}

.hero-item strong {
  display: block;
  color: var(--app-text);
  font-size: 15px;
}

.hero-item span {
  display: block;
  margin-top: 8px;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.login-panel {
  margin: 32px;
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 28px;
}

.panel-head h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -1px;
  color: var(--app-text);
}

.panel-head p {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--app-text-secondary);
}

.login-form {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.connection-section {
  margin-top: 4px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background: var(--app-muted-bg);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-head strong {
  font-size: 14px;
  color: var(--app-text);
}

.section-head span {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
}

.submit-btn {
  margin-top: 6px;
  height: 44px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.switch-row.compact {
  padding-top: 4px;
}

.switch-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.switch-copy strong {
  font-size: 13px;
  color: var(--app-text);
}

.switch-copy span {
  font-size: 12px;
  color: var(--app-text-secondary);
  line-height: 1.5;
}

.connection-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.resolved-hint {
  min-width: 0;
  text-align: right;
  font-size: 12px;
  color: var(--app-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-hint {
  margin-top: 22px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.login-hint strong {
  margin-left: 6px;
  color: var(--app-text);
}

@media (max-width: 1120px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-hero {
    padding: 48px 28px 0;
  }

  .hero-grid {
    grid-template-columns: 1fr;
  }

  .login-panel {
    margin: 28px;
  }

  .connection-actions,
  .switch-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .resolved-hint {
    text-align: left;
  }
}
</style>
