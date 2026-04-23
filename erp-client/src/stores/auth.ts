import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { changePasswordRequest, fetchCurrentUserRequest, loginRequest } from '@/api/auth'

const AUTH_TOKEN_KEY = 'neko_erp_auth_token'
const AUTH_USER_KEY = 'neko_erp_auth_user'

export interface AuthUser {
  userId: number
  username: string
  realName: string
  partnerId?: number | null
  status?: number | null
}

export const useAuthStore = defineStore('auth', () => {
  const initialized = ref(false)
  const token = ref('')
  const user = ref<AuthUser | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value && user.value))
  const displayName = computed(() => user.value?.realName || user.value?.username || 'NEKO')

  function initialize() {
    if (initialized.value) return
    if (typeof window !== 'undefined') {
      token.value = window.sessionStorage.getItem(AUTH_TOKEN_KEY) || ''
      user.value = parseStoredUser(window.sessionStorage.getItem(AUTH_USER_KEY))
      clearLegacyPersistentAuth()
    }
    initialized.value = true
  }

  async function login(username: string, password: string) {
    const response = await loginRequest({ username, password })
    token.value = response.token
    user.value = normalizeUser(response)
    persist()
    return response
  }

  async function refreshCurrentUser() {
    const response = await fetchCurrentUserRequest()
    user.value = normalizeUser(response)
    persist()
    return user.value
  }

  async function changeCurrentPassword(payload: {
    oldPassword: string
    newPassword: string
    confirmPassword: string
  }) {
    await changePasswordRequest(payload)
  }

  function logout() {
    token.value = ''
    user.value = null
    persist()
  }

  function persist() {
    if (typeof window === 'undefined') return
    if (token.value) {
      window.sessionStorage.setItem(AUTH_TOKEN_KEY, token.value)
    } else {
      window.sessionStorage.removeItem(AUTH_TOKEN_KEY)
    }
    if (user.value) {
      window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user.value))
    } else {
      window.sessionStorage.removeItem(AUTH_USER_KEY)
    }
    clearLegacyPersistentAuth()
  }

  return {
    displayName,
    initialize,
    initialized,
    isAuthenticated,
    changeCurrentPassword,
    login,
    logout,
    refreshCurrentUser,
    token,
    user,
  }
})

function parseStoredUser(value: string | null): AuthUser | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<AuthUser>
    if (!parsed || typeof parsed.userId !== 'number' || typeof parsed.username !== 'string') {
      return null
    }
    return {
      userId: parsed.userId,
      username: parsed.username,
      realName: parsed.realName || parsed.username,
      partnerId: typeof parsed.partnerId === 'number' ? parsed.partnerId : null,
      status: typeof parsed.status === 'number' ? parsed.status : null,
    }
  } catch {
    return null
  }
}

function normalizeUser(value: Partial<AuthUser>) {
  return {
    userId: Number(value.userId || 0),
    username: String(value.username || ''),
    realName: String(value.realName || value.username || ''),
    partnerId: typeof value.partnerId === 'number' ? value.partnerId : null,
    status: typeof value.status === 'number' ? value.status : null,
  }
}

function clearLegacyPersistentAuth() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
}
