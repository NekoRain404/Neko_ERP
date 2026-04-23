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
          label: 'Role Domain',
          value: 'Authorization Skeleton',
          description: 'The role page is split out first so menu, data, and action permissions have room to grow.',
        },
        {
          label: 'Current Shape',
          value: 'Role Master',
          description: 'The current page focuses on role code, name, status, and memo to close the minimum master data loop.',
        },
        {
          label: 'Next Direction',
          value: 'Permission Matrix',
          description: 'The next round should split permissions into a tree assignment area instead of stopping at CRUD.',
        },
      ]
    : [
        {
          label: '角色域',
          value: '授权骨架',
          description: '角色页先独立出来，为后续菜单权限、数据权限和按钮权限预留位置。',
        },
        {
          label: '当前形态',
          value: '角色主档',
          description: '现阶段负责角色编码、名称、状态和备注，先把最小主档闭环打通。',
        },
        {
          label: '后续方向',
          value: '权限矩阵',
          description: '下一轮应把角色权限拆成树形分配区，不再停留在简单 CRUD。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Role Code Stability',
          description: 'Once referenced by external systems, role codes should not change often and need audit constraints.',
        },
        {
          label: 'Authorization Relations',
          description: 'The page still lacks role-user linkage, but once isolated it can host user lists and permission trees.',
        },
        {
          label: 'State Control',
          description: 'Enable and disable actions should align with real login policy and validate referenced roles.',
        },
      ]
    : [
        {
          label: '角色编码稳定性',
          description: '角色编码一旦被外部系统引用就不应该频繁改动，页面需要逐步引入只读和审计约束。',
        },
        {
          label: '授权关系',
          description: '当前页面还没有用户角色联动区，拆成独立页面后可以再挂接用户清单和授权树。',
        },
        {
          label: '状态控制',
          description: '启用和禁用要与实际登录策略联动，后续应追加角色被引用时的禁用校验。',
        },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Permission Matrix',
          value: 'Menu / Data',
          description: 'Reserve the page surface first, then attach the menu tree and data permission matrix here.',
        },
        {
          label: 'Member Management',
          value: 'Role Members',
          description: 'The next step is to split the related user list out so the page is not limited to role master fields.',
        },
        {
          label: 'Change Control',
          value: 'State Validation',
          description: 'When a role is referenced, delete and disable operations should be constrained with direct reminders here.',
        },
      ]
    : [
        {
          label: '权限矩阵',
          value: '菜单 / 数据',
          description: '页面层先预留授权入口，后续把菜单树和数据权限矩阵挂到这里。',
        },
        {
          label: '成员管理',
          value: '角色成员',
          description: '下一步要把角色关联用户列表独立出来，不再只看角色主档字段。',
        },
        {
          label: '变更控制',
          value: '状态校验',
          description: '当角色已被引用时，需要限制删除和禁用，后续直接在这里挂校验提醒。',
        },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'System Roles Workbench' : '系统角色工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'The role page is no longer hidden inside the generic module surface and can now grow its own permission tree, member list, and audit lane.'
    : '角色不再挂在通用模块页里，后面可以直接在这里扩权限树、成员列表和授权审计。',
)
const note = computed(() =>
  isEnglish.value
    ? 'The role page is already isolated, so later permission work can evolve here without affecting other generic modules.'
    : '角色页已经拆独立，后续只需要在这个页面上迭代权限能力，不会影响其他通用模块。',
)
</script>

<template>
  <ModuleWorkbench
    module-key="sysRole"
    :config="moduleConfigMap.sysRole"
    :title="pageTitle"
    :description="pageDescription"
    :highlights="highlights"
    :focus-items="focusItems"
    :action-items="actionItems"
    :note="note"
  />
</template>
