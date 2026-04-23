import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { moduleManifestMap, moduleManifests, type ModuleKey } from '@/config/module-manifest'
import { resolveModuleView } from '@/views/modules'
import { useAuthStore } from '@/stores/auth'
import { useCutoverStore } from '@/stores/cutover'

const SplashView = () => import('@/views/SplashView.vue')
const LoginView = () => import('@/views/LoginView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')
const AboutView = () => import('@/views/AboutView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

const moduleRoutes = moduleManifests.map((config) => ({
  path: config.route,
  name: config.key,
  component: resolveModuleView(config.key as ModuleKey),
  meta: {
    title: config.title,
    moduleKey: config.key,
  },
}))

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/splash',
      name: 'splash',
      component: SplashView,
      meta: {
        title: '启动页',
      },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        title: '登录',
      },
    },
    {
      path: '/',
      component: AppLayout,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
          meta: {
            title: '架构总览',
          },
        },
        {
          path: '/settings',
          name: 'settings',
          component: SettingsView,
          meta: {
            title: '系统设置',
          },
        },
        {
          path: '/about',
          name: 'about',
          component: AboutView,
          meta: {
            title: '关于系统',
          },
        },
        ...moduleRoutes,
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const cutoverStore = useCutoverStore()
  authStore.initialize()

  if (to.name === 'splash') {
    return true
  }
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }
  const moduleKey = to.meta.moduleKey as ModuleKey | undefined
  if (moduleKey) {
    if (!cutoverStore.isModuleEnabled(moduleKey)) {
      return {
        name: 'settings',
        query: {
          tab: 'cutover',
          module: moduleKey,
          blockedFrom: String(to.fullPath),
        },
      }
    }
    const manifest = moduleManifestMap[moduleKey]
    if (manifest?.hidden) {
      const hasContext = Boolean(
        to.query.contextField ||
        to.query.focusField ||
        to.query.keyword ||
        to.query.parentId ||
        to.query.relatedTo,
      )
      if (!hasContext) {
        return manifest.parentModuleKey
          ? { name: manifest.parentModuleKey }
          : { path: '/' }
      }
    }
  }
  if (to.name === 'login' && authStore.isAuthenticated) {
    return { path: '/' }
  }
  return true
})

router.afterEach((to) => {
  const language =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('neko_erp_setting_language') || 'zh-CN'
      : 'zh-CN'
  const isEnglish = String(language).startsWith('en')
  let title = String(to.meta.title || 'NEKO_ERP')
  if (isEnglish) {
    if (title === '架构总览') title = 'Dashboard'
    if (title === '系统设置') title = 'Settings'
    if (title === '关于系统') title = 'About'
    if (title === '登录') title = 'Login'
    if (title === '启动页') title = 'Splash'
  }
  document.title = `${title} | NEKO_ERP`
})

export default router
