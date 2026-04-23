<script setup lang="ts">
import { computed } from 'vue'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')

const highlights = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Odoo Entry',
          value: 'Users',
          description: 'Aligned with Odoo `res.users`, keeping the user master, login email, phone, and company data.',
        },
        {
          label: 'Primary List Fields',
          value: 'Name / Login / Role',
          description: 'Preserve the Odoo-style user name, login, language, recent login, and role columns.',
        },
        {
          label: 'Tab Structure',
          value: 'Access / Preferences / Security',
          description: 'Keep the page structure close to Odoo access rights, preferences, and security areas.',
        },
      ]
    : [
        {
          label: 'Odoo 入口',
          value: 'Users',
          description: '对齐 Odoo `res.users`，保留用户主档、登录邮箱、电话和公司信息。',
        },
        {
          label: '主列表字段',
          value: 'Name / Login / Role',
          description: '按 Odoo 列表保留用户姓名、登录账号、语言、最近登录和角色展示。',
        },
        {
          label: '标签结构',
          value: 'Access / Preferences / Security',
          description: '页面组织尽量贴近 Odoo 的访问权限、偏好设置和安全分区。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Internal Users / Portal Users',
          description: 'Search and status semantics should stay aligned with Odoo internal, portal, and inactive user filters.',
        },
        {
          label: 'Change Password',
          description: 'Password maintenance should reuse the Odoo security page semantics and actions.',
        },
        {
          label: 'API Keys / Devices',
          description: 'The security area will later expose API keys and device sign-out with the same information architecture.',
        },
      ]
    : [
        {
          label: 'Internal Users / Portal Users',
          description: '搜索和状态语义优先对齐 Odoo 的内部用户、门户用户和停用用户筛选。',
        },
        {
          label: 'Change Password',
          description: '密码维护沿用 Odoo 的安全页语义，后续直接接 Change Password 动作。',
        },
        {
          label: 'API Keys / Devices',
          description: '安全区后续优先挂 API Keys 和设备登出能力，尽量复用 Odoo 的信息架构。',
        },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Access Rights',
          value: 'Roles / Companies',
          description: 'Map the Odoo Access Rights page for roles, companies, and the default company structure.',
        },
        {
          label: 'Preferences',
          value: 'Language / Signature',
          description: 'Keep preferences close to Odoo language, signature, and timezone instead of redesigning the groups.',
        },
        {
          label: 'Security',
          value: 'Password / API Keys',
          description: 'Security actions will continue to align with Change Password, API Keys, and Devices.',
        },
      ]
    : [
        {
          label: 'Access Rights',
          value: 'Roles / Companies',
          description: '优先映射 Odoo Access Rights 页里的角色、公司和默认公司结构。',
        },
        {
          label: 'Preferences',
          value: 'Language / Signature',
          description: '偏好设置优先贴近 Odoo 的语言、签名和时区，而不是重新设计字段分组。',
        },
        {
          label: 'Security',
          value: 'Password / API Keys',
          description: '安全页动作会优先对齐 Odoo 的 Change password、API Keys 和 Devices。',
        },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'System Users Workbench' : '系统用户工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'Aligned with the Odoo `res.users` Access Rights / Preferences / Security structure without inventing a new workflow.'
    : '按 Odoo `res.users` 的 Access Rights / Preferences / Security 结构收敛，不额外发明新的用户工作流。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Next, align the Odoo Users form/search with Internal Users, Portal Users, Inactive Users, Change Password, and API Keys.'
    : '下一步直接对齐 Odoo Users 的 form/search：Internal Users、Portal Users、Inactive Users、Change Password、API Keys。',
)
</script>

<template>
  <ModuleWorkbench
    module-key="sysUser"
    :config="moduleConfigMap.sysUser"
    :title="pageTitle"
    :description="pageDescription"
    :highlights="highlights"
    :focus-items="focusItems"
    :action-items="actionItems"
    :note="note"
  />
</template>
