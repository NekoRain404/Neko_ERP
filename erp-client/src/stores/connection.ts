import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const SERVER_URL_KEY = 'neko_erp_server_url'
const PROXY_ENABLED_KEY = 'neko_erp_proxy_enabled'
const PROXY_RULES_KEY = 'neko_erp_proxy_rules'
const PROXY_BYPASS_KEY = 'neko_erp_proxy_bypass'
const REMEMBER_USERNAME_KEY = 'neko_erp_remember_username'
const LAST_USERNAME_KEY = 'neko_erp_last_username'

const DEFAULT_SERVER_URL = 'http://127.0.0.1:8080/api'
const DEFAULT_PROXY_BYPASS = '<local>;localhost;127.0.0.1'

export const useConnectionStore = defineStore('connection', () => {
  const initialized = ref(false)
  const serverUrl = ref(readStoredApiBaseUrl())
  const proxyEnabled = ref(loadBoolean(PROXY_ENABLED_KEY, false))
  const proxyRules = ref(loadString(PROXY_RULES_KEY, ''))
  const proxyBypassRules = ref(loadString(PROXY_BYPASS_KEY, DEFAULT_PROXY_BYPASS))
  const rememberUsername = ref(loadBoolean(REMEMBER_USERNAME_KEY, true))
  const lastUsername = ref(loadString(LAST_USERNAME_KEY, 'admin'))

  const resolvedApiBaseUrl = computed(() => normalizeApiBaseUrl(serverUrl.value))

  async function initialize() {
    if (initialized.value) {
      await applyProxySettings()
      return
    }
    serverUrl.value = normalizeApiBaseUrl(serverUrl.value)
    initialized.value = true
    await applyProxySettings()
  }

  function setServerUrl(value: string) {
    serverUrl.value = normalizeApiBaseUrl(value)
  }

  function setProxyEnabled(value: boolean) {
    proxyEnabled.value = value
  }

  function setProxyRules(value: string) {
    proxyRules.value = value.trim()
  }

  function setProxyBypassRules(value: string) {
    proxyBypassRules.value = value.trim() || DEFAULT_PROXY_BYPASS
  }

  function setRememberUsername(value: boolean) {
    rememberUsername.value = value
    if (!value) {
      lastUsername.value = ''
    }
  }

  function setLastUsername(value: string) {
    lastUsername.value = rememberUsername.value ? value.trim() : ''
  }

  async function applyProxySettings() {
    const rules = proxyEnabled.value ? proxyRules.value.trim() : ''
    const bypass = proxyEnabled.value ? proxyBypassRules.value.trim() : ''
    await window.erpDesktop?.setProxySettings({
      proxyRules: rules,
      proxyBypassRules: bypass,
    })
  }

  async function testConnection() {
    const url = `${resolvedApiBaseUrl.value}/base/res-company/list?current=1&size=1`
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const body = await response.json()
    if (typeof body?.code === 'number' && body.code !== 200) {
      throw new Error(body.message || 'Request failed')
    }
    return body
  }

  watch(serverUrl, (value) => persistString(SERVER_URL_KEY, normalizeApiBaseUrl(value)))
  watch(proxyEnabled, async (value) => {
    persistBoolean(PROXY_ENABLED_KEY, value)
    await applyProxySettings()
  })
  watch(proxyRules, async (value) => {
    persistString(PROXY_RULES_KEY, value)
    await applyProxySettings()
  })
  watch(proxyBypassRules, async (value) => {
    persistString(PROXY_BYPASS_KEY, value || DEFAULT_PROXY_BYPASS)
    await applyProxySettings()
  })
  watch(rememberUsername, (value) => persistBoolean(REMEMBER_USERNAME_KEY, value))
  watch(lastUsername, (value) => persistString(LAST_USERNAME_KEY, value))

  return {
    applyProxySettings,
    initialize,
    initialized,
    lastUsername,
    proxyBypassRules,
    proxyEnabled,
    proxyRules,
    rememberUsername,
    resolvedApiBaseUrl,
    serverUrl,
    setLastUsername,
    setProxyBypassRules,
    setProxyEnabled,
    setProxyRules,
    setRememberUsername,
    setServerUrl,
    testConnection,
  }
})

export function normalizeApiBaseUrl(value: string) {
  const raw = String(value || '').trim()
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw || '127.0.0.1:8080'}`
  const trimmed = withProtocol.replace(/\/+$/, '')
  return trimmed.toLowerCase().endsWith('/api') ? trimmed : `${trimmed}/api`
}

export function readStoredApiBaseUrl() {
  return normalizeApiBaseUrl(loadString(SERVER_URL_KEY, DEFAULT_SERVER_URL))
}

function loadString(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  return window.localStorage.getItem(key) || fallback
}

function persistString(key: string, value: string) {
  if (typeof window === 'undefined') return
  if (value) {
    window.localStorage.setItem(key, value)
    return
  }
  window.localStorage.removeItem(key)
}

function loadBoolean(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  if (value === null) return fallback
  return value === '1'
}

function persistBoolean(key: string, value: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value ? '1' : '0')
}
