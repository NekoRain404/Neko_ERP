import axios from 'axios'
import { ElMessage } from 'element-plus/es/components/message/index'
import type { ApiResult } from '@/types/api'
import { readStoredApiBaseUrl } from '@/stores/connection'

const http = axios.create({
  timeout: 15000,
})

function isTechnicalMessage(message: string) {
  const trimmed = String(message || '').trim()
  if (!trimmed) return false
  if (trimmed.length > 160) return true
  if (trimmed.includes('\n') || trimmed.includes('\r') || trimmed.includes('\t')) return true
  const lower = trimmed.toLowerCase()
  const markers = [
    'exception',
    'stacktrace',
    'org.springframework',
    'java.',
    'javax.',
    'jakarta.',
    'com.erp',
    'psql',
    'postgres',
    'sql',
    'select ',
    'insert ',
    'update ',
    'delete ',
  ]
  return markers.some((marker) => lower.includes(marker))
}

http.interceptors.request.use((config) => {
  if (!config.baseURL && config.url && !/^https?:\/\//i.test(config.url)) {
    config.baseURL = readStoredApiBaseUrl()
  }
  if (typeof window !== 'undefined') {
    const token =
      window.sessionStorage.getItem('neko_erp_auth_token') ||
      window.localStorage.getItem('neko_erp_auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

function uiText(key: 'requestFailed' | 'networkError') {
  const language =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('neko_erp_setting_language') || 'zh-CN'
      : 'zh-CN'
  const isEnglish = String(language).startsWith('en')
  if (key === 'requestFailed') return isEnglish ? 'Request failed' : '请求失败'
  return isEnglish ? 'Network error' : '网络异常'
}

function uiServerError() {
  const language =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('neko_erp_setting_language') || 'zh-CN'
      : 'zh-CN'
  const isEnglish = String(language).startsWith('en')
  return isEnglish ? 'Server error' : '服务端异常'
}

function showError(message: string) {
  const text = String(message || '').trim()
  ElMessage({
    type: 'error',
    message: text || uiText('requestFailed'),
    grouping: true,
  })
}

function resolveErrorMessage(error: any) {
  const response = error?.response
  const status = Number(response?.status || 0)
  const data = response?.data

  let message = ''
  if (data && typeof data === 'object' && typeof data.message === 'string') {
    message = data.message
  } else if (typeof data === 'string') {
    message = data.length > 240 ? data.slice(0, 240) : data
  } else if (typeof error?.message === 'string') {
    message = error.message
  }

  if (status >= 500) {
    if (!message || isTechnicalMessage(message)) return uiServerError()
  }
  if (isTechnicalMessage(message)) return uiText('requestFailed')
  return message || (status ? uiText('requestFailed') : uiText('networkError'))
}

export function resolveUiRequestErrorMessage(error: unknown) {
  return resolveErrorMessage(error)
}

http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResult<unknown>
    if (typeof body?.code === 'number' && body.code !== 200) {
      const message = body.message || uiText('requestFailed')
      showError(isTechnicalMessage(message) ? uiText('requestFailed') : message)
      return Promise.reject(new Error(message))
    }
    return response
  },
  (error) => {
    showError(resolveErrorMessage(error))
    return Promise.reject(error)
  },
)

export default http
