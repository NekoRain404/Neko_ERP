import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemePreference = 'system' | 'light' | 'dark' | 'eye' | 'custom'
export type LanguagePreference = 'zh-CN' | 'en-US'
export type DensityPreference = 'compact' | 'comfortable'
export type SystemColorScheme = 'light' | 'dark'

export interface CustomThemePalette {
  background: string
  surface: string
  sidebar: string
  primary: string
  text: string
  mutedText: string
}

const SETTINGS_PREFIX = 'neko_erp_setting_'

export const usePreferencesStore = defineStore('preferences', () => {
  const initialized = ref(false)
  const themePreference = ref<ThemePreference>(loadThemePreference())
  const language = ref<LanguagePreference>(loadLanguagePreference())
  const density = ref<DensityPreference>(loadDensityPreference())
  const fontScale = ref(loadFontScale())
  const animations = ref(loadBooleanSetting('animations', true))
  const notifications = ref(loadBooleanSetting('notifications', true))
  const sound = ref(loadBooleanSetting('sound', false))
  const dailySummary = ref(loadBooleanSetting('daily_summary', true))
  const systemColorScheme = ref<SystemColorScheme>('light')
  const systemLocale = ref('zh-CN')
  const customTheme = ref<CustomThemePalette>(loadCustomTheme())

  const resolvedTheme = computed<'light' | 'dark' | 'eye' | 'custom'>(() => {
    if (themePreference.value === 'system') {
      return systemColorScheme.value
    }
    return themePreference.value
  })

  const resolvedNativeThemeSource = computed<'system' | 'light' | 'dark'>(() => {
    if (themePreference.value === 'eye') return 'light'
    if (themePreference.value === 'custom') {
      return isColorDark(customTheme.value.background) ? 'dark' : 'light'
    }
    return themePreference.value
  })

  async function initialize() {
    if (initialized.value) {
      applyDocumentPreferences()
      return
    }

    const desktopBridge = window.erpDesktop
    if (desktopBridge) {
      const systemPreferences = await desktopBridge.getSystemPreferences()
      systemColorScheme.value = systemPreferences.colorScheme
      systemLocale.value = normalizeLanguage(systemPreferences.locale)
      if (!hasStoredLanguagePreference()) {
        language.value = normalizeLanguage(systemPreferences.locale)
      }
      desktopBridge.onSystemPreferencesChanged((payload) => {
        systemColorScheme.value = payload.colorScheme
        systemLocale.value = normalizeLanguage(payload.locale)
      })
    } else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemColorScheme.value = mediaQuery.matches ? 'dark' : 'light'
      systemLocale.value = normalizeLanguage(navigator.language)
      if (!hasStoredLanguagePreference()) {
        language.value = normalizeLanguage(navigator.language)
      }
      mediaQuery.addEventListener('change', (event) => {
        systemColorScheme.value = event.matches ? 'dark' : 'light'
      })
    }

    initialized.value = true
    applyDocumentPreferences()
    void syncNativeThemeSource()
  }

  function setThemePreference(value: ThemePreference) {
    themePreference.value = value
  }

  function setLanguage(value: LanguagePreference) {
    language.value = value
  }

  function setDensity(value: DensityPreference) {
    density.value = value
  }

  function setFontScale(value: number) {
    fontScale.value = normalizeFontScale(value)
  }

  function setAnimations(value: boolean) {
    animations.value = value
  }

  function setNotifications(value: boolean) {
    notifications.value = value
  }

  function setSound(value: boolean) {
    sound.value = value
  }

  function setDailySummary(value: boolean) {
    dailySummary.value = value
  }

  function setCustomThemePatch(patch: Partial<CustomThemePalette>) {
    customTheme.value = { ...customTheme.value, ...normalizeCustomTheme({ ...customTheme.value, ...patch }) }
  }

  function resetCustomTheme() {
    customTheme.value = defaultCustomTheme()
  }

  async function syncNativeThemeSource() {
    await window.erpDesktop?.setNativeThemeSource(resolvedNativeThemeSource.value)
  }

  function applyDocumentPreferences() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.theme = resolvedTheme.value
    root.dataset.density = density.value
    root.dataset.language = language.value
    root.dataset.animations = animations.value ? 'on' : 'off'
    root.style.setProperty('--app-font-scale', String(fontScale.value / 100))
    root.style.setProperty('--app-font-size-percent', `${fontScale.value}%`)
    applyCustomThemeVariables(root)
    document.documentElement.lang = language.value
  }

  function applyCustomThemeVariables(root: HTMLElement) {
    const variableKeys = [
      '--user-app-bg',
      '--user-app-surface',
      '--user-app-sidebar',
      '--user-app-panel',
      '--user-app-panel-elevated',
      '--user-app-muted-bg',
      '--user-app-hover',
      '--user-app-border',
      '--user-app-border-strong',
      '--user-app-text',
      '--user-app-text-secondary',
      '--user-app-primary',
      '--user-app-ring',
      '--user-app-success',
      '--user-app-warning',
      '--user-app-danger',
      '--user-app-card-shadow',
    ]
    for (const key of variableKeys) root.style.removeProperty(key)
    if (resolvedTheme.value !== 'custom') return

    const palette = customTheme.value
    root.style.setProperty('--user-app-bg', palette.background)
    root.style.setProperty('--user-app-surface', shiftColor(palette.background, isColorDark(palette.background) ? 8 : -2))
    root.style.setProperty('--user-app-sidebar', palette.sidebar)
    root.style.setProperty('--user-app-panel', palette.surface)
    root.style.setProperty('--user-app-panel-elevated', shiftColor(palette.surface, isColorDark(palette.surface) ? 8 : -3))
    root.style.setProperty('--user-app-muted-bg', shiftColor(palette.surface, isColorDark(palette.surface) ? 14 : -6))
    root.style.setProperty('--user-app-hover', rgbaFromHex(palette.primary, isColorDark(palette.background) ? 0.16 : 0.08))
    root.style.setProperty('--user-app-border', rgbaFromHex(palette.text, isColorDark(palette.background) ? 0.18 : 0.12))
    root.style.setProperty('--user-app-border-strong', rgbaFromHex(palette.text, isColorDark(palette.background) ? 0.32 : 0.18))
    root.style.setProperty('--user-app-text', palette.text)
    root.style.setProperty('--user-app-text-secondary', palette.mutedText)
    root.style.setProperty('--user-app-primary', palette.primary)
    root.style.setProperty('--user-app-ring', rgbaFromHex(palette.primary, 0.18))
    root.style.setProperty('--user-app-success', shiftColor('#22a06b', isColorDark(palette.background) ? 8 : 0))
    root.style.setProperty('--user-app-warning', shiftColor('#d97706', isColorDark(palette.background) ? 8 : 0))
    root.style.setProperty('--user-app-danger', shiftColor('#dc4c64', isColorDark(palette.background) ? 8 : 0))
    root.style.setProperty(
      '--user-app-card-shadow',
      isColorDark(palette.background) ? '0 18px 40px rgba(0, 0, 0, 0.34)' : '0 14px 30px rgba(15, 23, 42, 0.08)',
    )
  }

  watch(themePreference, (value) => {
    persistSetting('theme', value)
    applyDocumentPreferences()
    void syncNativeThemeSource()
  })

  watch(language, (value) => {
    persistSetting('language', value)
    applyDocumentPreferences()
  })

  watch(density, (value) => {
    persistSetting('density', value)
    applyDocumentPreferences()
  })

  watch(fontScale, (value) => {
    persistSetting('font_scale', String(value))
    applyDocumentPreferences()
  })

  watch(animations, (value) => {
    persistBooleanSetting('animations', value)
    applyDocumentPreferences()
  })

  watch(notifications, (value) => persistBooleanSetting('notifications', value))
  watch(sound, (value) => persistBooleanSetting('sound', value))
  watch(dailySummary, (value) => persistBooleanSetting('daily_summary', value))
  watch(
    customTheme,
    (value) => {
      persistSetting('custom_theme', JSON.stringify(value))
      applyDocumentPreferences()
      void syncNativeThemeSource()
    },
    { deep: true },
  )
  watch(systemColorScheme, () => {
    applyDocumentPreferences()
  })

  return {
    animations,
    customTheme,
    dailySummary,
    density,
    fontScale,
    initialize,
    initialized,
    language,
    notifications,
    resetCustomTheme,
    resolvedTheme,
    setAnimations,
    setCustomThemePatch,
    setDailySummary,
    setDensity,
    setFontScale,
    setLanguage,
    setNotifications,
    setSound,
    setThemePreference,
    sound,
    systemColorScheme,
    systemLocale,
    themePreference,
  }
})

function hasStoredLanguagePreference() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(`${SETTINGS_PREFIX}language`) !== null
}

function loadThemePreference(): ThemePreference {
  return normalizeTheme(loadSetting('theme', 'system'))
}

function loadLanguagePreference(): LanguagePreference {
  return normalizeLanguage(loadSetting('language', 'zh-CN'))
}

function loadDensityPreference(): DensityPreference {
  return normalizeDensity(loadSetting('density', 'comfortable'))
}

function loadFontScale() {
  return normalizeFontScale(Number(loadSetting('font_scale', '100')))
}

function loadCustomTheme(): CustomThemePalette {
  try {
    return normalizeCustomTheme(JSON.parse(loadSetting('custom_theme', JSON.stringify(defaultCustomTheme()))))
  } catch {
    return defaultCustomTheme()
  }
}

function loadSetting(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  return window.localStorage.getItem(`${SETTINGS_PREFIX}${key}`) ?? fallback
}

function persistSetting(key: string, value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`${SETTINGS_PREFIX}${key}`, value)
}

function loadBooleanSetting(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(`${SETTINGS_PREFIX}${key}`)
  if (value === null) return fallback
  return value === '1'
}

function persistBooleanSetting(key: string, value: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`${SETTINGS_PREFIX}${key}`, value ? '1' : '0')
}

function normalizeLanguage(value: string): LanguagePreference {
  return String(value).toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

function normalizeTheme(value: string): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'eye' || value === 'system' || value === 'custom') {
    return value
  }
  return 'system'
}

function normalizeDensity(value: string): DensityPreference {
  return value === 'compact' ? 'compact' : 'comfortable'
}

function normalizeFontScale(value: number) {
  const numeric = Number.isFinite(value) ? value : 100
  return Math.max(85, Math.min(130, Math.round(numeric)))
}

function defaultCustomTheme(): CustomThemePalette {
  return {
    background: '#f6f7fb',
    surface: '#ffffff',
    sidebar: '#ffffff',
    primary: '#2f6df6',
    text: '#172033',
    mutedText: '#667085',
  }
}

function normalizeCustomTheme(value: Partial<CustomThemePalette>): CustomThemePalette {
  const base = defaultCustomTheme()
  return {
    background: normalizeHex(value.background, base.background),
    surface: normalizeHex(value.surface, base.surface),
    sidebar: normalizeHex(value.sidebar, base.sidebar),
    primary: normalizeHex(value.primary, base.primary),
    text: normalizeHex(value.text, base.text),
    mutedText: normalizeHex(value.mutedText, base.mutedText),
  }
}

function normalizeHex(value: string | undefined, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? String(value) : fallback
}

function rgbaFromHex(hex: string, alpha: number) {
  const normalized = normalizeHex(hex, '#000000').replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function shiftColor(hex: string, amount: number) {
  const normalized = normalizeHex(hex, '#000000').replace('#', '')
  const clamp = (value: number) => Math.max(0, Math.min(255, value))
  const convert = (offset: string) => clamp(Number.parseInt(offset, 16) + amount)
  const red = convert(normalized.slice(0, 2))
  const green = convert(normalized.slice(2, 4))
  const blue = convert(normalized.slice(4, 6))
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function isColorDark(hex: string) {
  const normalized = normalizeHex(hex, '#ffffff').replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance < 0.56
}
