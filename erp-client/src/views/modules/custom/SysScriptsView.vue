<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import { createEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { ModuleKey } from '@/config/module-manifest'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'
import { buildSharedGuardrailRulesPacket } from '@/utils/cutover-protection'
import { downloadText } from '@/utils/export'
import { buildModuleEvidenceExpectation } from '@/utils/first-wave-evidence'
import { buildModuleWorkbenchRouteQuery } from '@/utils/module-navigation'
import { listSysScriptPresets, listSysScriptPresetsForModule } from '@/utils/sys-script-presets'
import type { SysScriptPreset } from '@/utils/sys-script-presets'

const route = useRoute()
const router = useRouter()
const { locale, moduleTitle } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const installingKey = ref('')
const guardrailModule = computed<ModuleKey | null>(() => {
  const raw = route.query.guardrailModule
  return typeof raw === 'string' ? (raw as ModuleKey) : null
})
const focusedModulePresets = computed(() =>
  guardrailModule.value ? listSysScriptPresetsForModule(guardrailModule.value) : [],
)
const focusedEvidenceExpectation = computed(() =>
  guardrailModule.value ? buildModuleEvidenceExpectation(guardrailModule.value, isEnglish.value) : null,
)
const routeModelFilter = computed(() => (typeof route.query.model === 'string' ? route.query.model : ''))
const routeEventFilter = computed(() => (typeof route.query.eventName === 'string' ? route.query.eventName : ''))
const routeChainKey = computed(() => (typeof route.query.chainKey === 'string' ? route.query.chainKey : undefined))

const pageTitle = computed(() => (isEnglish.value ? 'Server Script Workbench' : '服务端脚本工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'Ship first-wave platform guardrails faster with reusable script presets, fallback-safe syntax, and one-page rule operations.'
    : '用可复用预设、兼容降级语法和单页运维方式，更快交付首批平台层 guardrail。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Keep scripts focused on first-wave cutover guardrails instead of expanding into a full low-code engine.'
    : '脚本当前只聚焦首批切换 guardrail，不要发散成完整低代码引擎。',
)
const routeFocusTitle = computed(() => {
  if (!guardrailModule.value) return ''
  return isEnglish.value
    ? `${moduleTitle(guardrailModule.value)} Guardrail Context`
    : `${moduleTitle(guardrailModule.value)} Guardrail 上下文`
})
const routeFocusDescription = computed(() => {
  if (!guardrailModule.value) return ''
  const presetCount = focusedModulePresets.value.length
  const modelLabel = routeModelFilter.value || '-'
  if (isEnglish.value) {
    return `Opened from ${moduleTitle(guardrailModule.value)}. Review ${presetCount} mapped presets here, starting from model ${modelLabel}${routeEventFilter.value ? ` and event ${routeEventFilter.value}` : ''}.`
  }
  return `当前从 ${moduleTitle(guardrailModule.value)} 跳转而来。请优先核对这里映射的 ${presetCount} 条预设，先从模型 ${modelLabel}${routeEventFilter.value ? ` 和事件 ${routeEventFilter.value}` : ''} 开始。`
})

const highlights = computed(() =>
  isEnglish.value
    ? [
        { label: 'Primary Goal', value: 'Guardrails', description: 'The module exists to block risky saves and actions before they leak into the first-wave pilot chains.' },
        { label: 'Fallback Safe', value: 'Subset Ready', description: 'Common null, numeric, and action checks are now supported even when full Groovy runtime support is unavailable.' },
        { label: 'Reuse First', value: 'Preset Driven', description: 'Operators can start from reusable templates instead of rewriting similar guardrails every round.' },
      ]
    : [
        { label: '主目标', value: 'Guardrails', description: '这个模块的核心价值是阻断高风险保存和动作，避免问题流入首批试点链。' },
        { label: '降级安全', value: '子集可用', description: '即使完整 Groovy 运行时不可用，常见的空值、数值和动作判断也能继续执行。' },
        { label: '优先复用', value: '预设驱动', description: '操作人员可以直接从模板起步，不必每轮都重写类似规则。' },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'before_save', description: 'Use it for master data and draft validation before new records keep flowing into the shared workbench.' },
        { label: 'before_action', description: 'Use it for confirm, validate, post, and payment registration guardrails on first-wave chains.' },
        { label: 'Small Grammar', description: 'Prefer simple conditions so rules stay readable, smokeable, and robust across runtime compatibility modes.' },
      ]
    : [
        { label: 'before_save', description: '适合主数据和草稿校验，避免新记录继续流入共享工作台。' },
        { label: 'before_action', description: '适合首批链路上的确认、验证、过账和付款登记动作 guardrail。' },
        { label: '小语法集', description: '优先使用简单条件，让规则更可读、更易 smoke，也更稳。' },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Fastest Entry', value: 'Use Preset', description: 'Create a new rule from a curated preset and adjust only the minimal business wording.' },
        { label: 'Safety Check', value: 'Disable First', description: 'When a pilot issue appears, disable the offending rule first and then review the remark and script body.' },
      ]
    : [
        { label: '最快入口', value: '使用预设', description: '从整理好的模板直接创建规则，只改最少的业务文案。' },
        { label: '安全检查', value: '先停规则', description: '当试点出现异常时，先停掉对应规则，再回看备注和脚本内容。' },
      ],
)

const quickLinkItems = computed(() =>
  [
    ...(guardrailModule.value
      ? [
          {
            label: isEnglish.value ? `Back To ${moduleTitle(guardrailModule.value)}` : `返回${moduleTitle(guardrailModule.value)}`,
            description: isEnglish.value ? 'Return to the source first-wave workbench after reviewing or editing the rule set.' : '核对或编辑规则后，直接返回来源首批工作台。',
            routeName: guardrailModule.value,
            query: buildGuardrailWorkbenchQuery(guardrailModule.value, { section: 'ops-guardrails' }),
            buttonType: 'primary',
          },
        ]
      : []),
    ...(isEnglish.value
      ? [
          { label: 'New Script', description: 'Open a blank rule draft in the same workbench.', routeName: 'sysScript', query: { create: '1' }, buttonType: guardrailModule.value ? 'default' : 'primary' },
          {
            label: 'Open Sales Workbench',
            description: 'Jump to the sales pilot chain guardrail desk without losing the current pilot chain hint.',
            routeName: 'saleOrder',
            query: buildGuardrailWorkbenchQuery('saleOrder', { section: 'ops-guardrails' }),
          },
          {
            label: 'Open Purchase Workbench',
            description: 'Jump to the purchase pilot chain guardrail desk without losing the current pilot chain hint.',
            routeName: 'purchaseOrder',
            query: buildGuardrailWorkbenchQuery('purchaseOrder', { section: 'ops-guardrails' }),
          },
          { label: 'Open Settings', description: 'Review cutover switches and rollback preparation together with active rules.', routeName: 'settings', query: { tab: 'cutover' } },
        ]
      : [
          { label: '新建脚本', description: '在同一工作台里直接打开空白规则草稿。', routeName: 'sysScript', query: { create: '1' }, buttonType: guardrailModule.value ? 'default' : 'primary' },
          {
            label: '打开销售工作台',
            description: '跳到销售试点链的规则台，并保留当前试点链提示。',
            routeName: 'saleOrder',
            query: buildGuardrailWorkbenchQuery('saleOrder', { section: 'ops-guardrails' }),
          },
          {
            label: '打开采购工作台',
            description: '跳到采购试点链的规则台，并保留当前试点链提示。',
            routeName: 'purchaseOrder',
            query: buildGuardrailWorkbenchQuery('purchaseOrder', { section: 'ops-guardrails' }),
          },
          { label: '打开设置', description: '把切换开关、回退准备和当前规则一起查看。', routeName: 'settings', query: { tab: 'cutover' } },
        ]),
  ],
)

const readinessItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Preset Library', value: 'Ready', description: 'First-wave templates cover master data, sales, stock, invoice, and payment guardrails.', tone: 'success' },
        { label: 'Fallback Coverage', value: 'Expanded', description: 'Null checks and action + doc comparisons are covered by the lightweight fallback parser.', tone: 'success' },
        { label: 'Operator Surface', value: 'Workbench', description: 'Templates, syntax hints, and the live rule table now stay on one page.', tone: 'success' },
      ]
    : [
        { label: '模板库', value: '已就绪', description: '首批模板覆盖主数据、销售、库存、发票和付款 guardrail。', tone: 'success' },
        { label: '降级覆盖', value: '已扩展', description: '轻量降级解析已经覆盖空值判断和 action + doc 组合判断。', tone: 'success' },
        { label: '操作界面', value: '工作台', description: '模板、语法提示和实时规则列表现在都在同一页。', tone: 'success' },
      ],
)

const syntaxExamples = computed(() =>
  isEnglish.value
    ? [
        "if (doc.email == null) { throw new RuntimeException('Partner email is required') }",
        "if (doc.amountUntaxed >= 500000) { throw new RuntimeException('Large sales orders need review') }",
        "if (action == 'action_confirm') { throw new RuntimeException('Confirm is temporarily blocked') }",
        "if (action == 'action_post' && doc.originRef == null) { throw new RuntimeException('Origin reference is required') }",
      ]
    : [
        "if (doc.email == null) { throw new RuntimeException('Partner email is required') }",
        "if (doc.amountUntaxed >= 500000) { throw new RuntimeException('Large sales orders need review') }",
        "if (action == 'action_confirm') { throw new RuntimeException('Confirm is temporarily blocked') }",
        "if (action == 'action_post' && doc.originRef == null) { throw new RuntimeException('Origin reference is required') }",
      ],
)
const focusedPresetKeySet = computed(() => new Set(focusedModulePresets.value.map((item) => item.key)))

const presetGroups = computed(() => {
  const laneLabels = isEnglish.value
    ? {
        masterData: 'Master Data',
        sales: 'Sales / Invoice',
        purchase: 'Purchase / Payment',
        platform: 'Platform',
      }
    : {
        masterData: '主数据',
        sales: '销售 / 发票',
        purchase: '采购 / 付款',
        platform: '平台层',
      }

  const laneDescriptions = isEnglish.value
    ? {
        masterData: 'Keep the partner and upstream identity layer stable before first-wave transactions expand.',
        sales: 'Protect save and confirm paths that drive picking, invoice, and downstream traceability.',
        purchase: 'Protect supplier, bill, and payment paths before first-wave procurement cutover.',
        platform: 'Shared platform presets that support multiple modules.',
      }
    : {
        masterData: '先把伙伴和上游身份层做稳，再继续扩首批交易链。',
        sales: '保护驱动调拨、发票和下游追溯的保存与动作路径。',
        purchase: '在首批采购切换前保护供应商、账单和付款路径。',
        platform: '可支撑多个模块的共享平台层模板。',
      }

  const groups = new Map<string, ReturnType<typeof listSysScriptPresets>>()
  for (const preset of listSysScriptPresets()) {
    const rows = groups.get(preset.lane) ?? []
    rows.push(preset)
    groups.set(preset.lane, rows)
  }
  return Array.from(groups.entries()).map(([lane, items]) => ({
    lane,
    title: laneLabels[lane as keyof typeof laneLabels],
    description: laneDescriptions[lane as keyof typeof laneDescriptions],
    items,
    focusedCount: items.filter((item) => focusedPresetKeySet.value.has(item.key)).length,
  }))
})

async function openPreset(key: string) {
  await router.push({
    name: 'sysScript',
    query: {
      ...(guardrailModule.value ? { guardrailModule: guardrailModule.value } : {}),
      create: '1',
      preset: key,
    },
  })
  ElMessage.success(isEnglish.value ? 'Preset draft opened' : '已打开模板草稿')
}

function buildPresetPayload(preset: SysScriptPreset) {
  return {
    model: preset.model,
    eventName: preset.eventName,
    scriptLang: preset.scriptLang,
    scriptCode: preset.scriptCode,
    status: 1,
    remark: preset.remark,
  }
}

async function installPreset(preset: SysScriptPreset) {
  installingKey.value = preset.key
  try {
    await createEntity('/system/sys-script', buildPresetPayload(preset) as any)
    ElMessage.success(isEnglish.value ? 'Preset installed as active rule' : '模板已安装为启用规则')
  } finally {
    installingKey.value = ''
  }
}

async function installPresetGroup(items: SysScriptPreset[], lane: string) {
  installingKey.value = `group:${lane}`
  try {
    for (const preset of items) {
      await createEntity('/system/sys-script', buildPresetPayload(preset) as any)
    }
    ElMessage.success(isEnglish.value ? 'Preset group installed' : '模板分组已安装')
  } finally {
    installingKey.value = ''
  }
}

async function installAllPresets() {
  installingKey.value = 'all'
  try {
    for (const preset of listSysScriptPresets()) {
      await createEntity('/system/sys-script', buildPresetPayload(preset) as any)
    }
    ElMessage.success(isEnglish.value ? 'All presets installed' : '全部模板已安装')
  } finally {
    installingKey.value = ''
  }
}

async function disablePresetGroup(items: SysScriptPreset[], lane: string) {
  installingKey.value = `disable:${lane}`
  try {
    for (const preset of items) {
      const page = await fetchEntityPage<any>('/system/sys-script', {
        current: 1,
        size: 50,
        keyword: preset.remark,
      })
      const records = page?.records || []
      for (const row of records) {
        if (row.model === preset.model && row.eventName === preset.eventName && row.remark === preset.remark && row.status !== 0) {
          await updateEntity('/system/sys-script', Number(row.id), {
            ...row,
            status: 0,
          })
        }
      }
    }
    ElMessage.success(isEnglish.value ? 'Matching preset rules disabled' : '匹配的模板规则已停用')
  } finally {
    installingKey.value = ''
  }
}

function buildFocusedPresetPacket() {
  return buildSharedGuardrailRulesPacket({
    english: isEnglish.value,
    generatedAt: new Date().toISOString(),
    title: guardrailModule.value
      ? (isEnglish.value
        ? `${moduleTitle(guardrailModule.value)} Guardrail Rules`
        : `${moduleTitle(guardrailModule.value)} Guardrail 规则`)
      : (isEnglish.value ? 'NEKO_ERP Focused Guardrail Rules' : 'NEKO_ERP 聚焦 Guardrail 规则'),
    presets: focusedModulePresets.value,
  })
}

async function installFocusedModulePresets() {
  if (!guardrailModule.value || !focusedModulePresets.value.length) return
  await installPresetGroup(focusedModulePresets.value, `module:${guardrailModule.value}`)
}

async function disableFocusedModulePresets() {
  if (!guardrailModule.value || !focusedModulePresets.value.length) return
  await disablePresetGroup(focusedModulePresets.value, `module:${guardrailModule.value}`)
}

function exportFocusedPresetPacket() {
  if (!guardrailModule.value) return
  downloadText(
    `neko_erp_${guardrailModule.value}_guardrail_rules_${new Date().toISOString().slice(0, 10)}.md`,
    buildFocusedPresetPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(isEnglish.value ? 'Focused guardrail packet exported' : '当前模块 guardrail 包已导出')
}

async function copyFocusedPresetPacket() {
  if (!guardrailModule.value || !navigator.clipboard) return
  await navigator.clipboard.writeText(buildFocusedPresetPacket())
  ElMessage.success(isEnglish.value ? 'Focused guardrail packet copied' : '当前模块 guardrail 包已复制')
}

function exportPresetLibrary() {
  downloadText(
    `neko_erp_sys_script_presets_${new Date().toISOString().slice(0, 10)}.md`,
    [
      `# ${isEnglish.value ? 'NEKO_ERP Server Script Preset Library' : 'NEKO_ERP 服务端脚本模板库'}`,
      '',
      ...presetGroups.value.flatMap((group) => [
        `## ${group.title}`,
        group.description,
        '',
        ...group.items.map((preset) => [
          `### ${isEnglish.value ? preset.titleEn : preset.titleZh}`,
          `- Model: ${preset.model}`,
          `- Event: ${preset.eventName}`,
          `- Remark: ${preset.remark}`,
          '',
          '```groovy',
          preset.scriptCode,
          '```',
          '',
        ].join('\n')),
      ]),
    ].join('\n'),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(isEnglish.value ? 'Preset library exported' : '模板库已导出')
}

function buildGuardrailWorkbenchQuery(moduleKey: ModuleKey, rawQuery?: Record<string, string | undefined>) {
  return buildModuleWorkbenchRouteQuery({
    targetRouteName: moduleKey,
    rawQuery,
    chainKey: routeChainKey.value,
  })
}

async function openGuardrailModuleSection(section: string) {
  if (!guardrailModule.value) return
  await router.push({
    name: guardrailModule.value,
    query: buildGuardrailWorkbenchQuery(guardrailModule.value, { section }),
  })
}
</script>

<template>
  <ModuleWorkbench
    module-key="sysScript"
    :config="moduleConfigMap.sysScript"
    :title="pageTitle"
    :description="pageDescription"
    :highlights="highlights"
    :focus-items="focusItems"
    :action-items="actionItems"
    :quick-link-items="quickLinkItems"
    :readiness-items="readinessItems"
    :note="note"
  >
    <template #workspace>
      <div class="workspace-layout">
        <section class="workspace-main">
          <article v-if="guardrailModule" class="erp-card section-panel context-panel">
            <div class="context-panel-head">
              <div>
                <div class="section-title">{{ routeFocusTitle }}</div>
                <p class="section-copy">{{ routeFocusDescription }}</p>
              </div>
              <div class="context-actions">
                <el-button type="primary" plain @click="openGuardrailModuleSection('ops-guardrails')">
                  {{ isEnglish ? 'Back To Module Desk' : '回到模块运维台' }}
                </el-button>
                <el-button plain @click="openGuardrailModuleSection('ops-evidence')">
                  {{ isEnglish ? 'Open Evidence Desk' : '打开证据台' }}
                </el-button>
              </div>
            </div>
            <div class="context-chip-list">
              <span class="context-chip">{{ isEnglish ? 'Mapped Presets' : '关联预设' }}: {{ focusedModulePresets.length }}</span>
              <span v-if="routeModelFilter" class="context-chip">{{ isEnglish ? 'Model Filter' : '模型过滤' }}: {{ routeModelFilter }}</span>
              <span v-if="routeEventFilter" class="context-chip">{{ isEnglish ? 'Event Filter' : '事件过滤' }}: {{ routeEventFilter }}</span>
              <span v-if="focusedEvidenceExpectation" class="context-chip">{{ isEnglish ? 'Recommended Upload' : '推荐上传' }}: {{ focusedEvidenceExpectation.recommendedLabel }}</span>
              <span v-if="focusedEvidenceExpectation" class="context-chip">{{ isEnglish ? 'Required Evidence' : '必备证据' }}: {{ focusedEvidenceExpectation.requiredCount }}</span>
            </div>
            <p v-if="focusedEvidenceExpectation" class="context-copy-line">{{ focusedEvidenceExpectation.timelineHint }}</p>
            <div class="section-actions context-actions">
              <el-button :loading="installingKey === `group:module:${guardrailModule}`" @click="installFocusedModulePresets">
                {{ isEnglish ? 'Install Current Module Presets' : '安装当前模块预设' }}
              </el-button>
              <el-button :loading="installingKey === `disable:module:${guardrailModule}`" @click="disableFocusedModulePresets">
                {{ isEnglish ? 'Disable Current Module Rules' : '停用当前模块规则' }}
              </el-button>
              <el-button @click="copyFocusedPresetPacket">
                {{ isEnglish ? 'Copy Current Module Packet' : '复制当前模块规则包' }}
              </el-button>
              <el-button @click="exportFocusedPresetPacket">
                {{ isEnglish ? 'Export Current Module Packet' : '导出当前模块规则包' }}
              </el-button>
            </div>
          </article>

          <article class="erp-card section-panel">
            <div class="section-header">
              <div>
                <div class="section-title">{{ isEnglish ? 'Preset Library' : '模板库' }}</div>
                <p class="section-copy">
                  {{ isEnglish
                    ? 'Start from reusable first-wave guardrails and then tune only the model, message, or threshold.'
                    : '从可复用的首批 guardrail 模板起步，只调整模型、提示文案或阈值。' }}
                </p>
              </div>
              <div class="section-actions">
                <el-button :loading="installingKey === 'all'" @click="installAllPresets">
                  {{ isEnglish ? 'Install All' : '安装全部' }}
                </el-button>
                <el-button @click="exportPresetLibrary">
                  {{ isEnglish ? 'Export Library' : '导出模板库' }}
                </el-button>
              </div>
            </div>

            <div class="preset-groups">
              <section v-for="group in presetGroups" :key="group.lane" :class="['preset-group', { focused: group.focusedCount > 0 }]">
                <div class="preset-group-header">
                  <div>
                    <strong>{{ group.title }}</strong>
                    <span>{{ group.description }}</span>
                    <span v-if="group.focusedCount > 0" class="group-focus-note">
                      {{ isEnglish ? `${group.focusedCount} presets mapped to current module context.` : `当前模块上下文命中 ${group.focusedCount} 条预设。` }}
                    </span>
                  </div>
                  <div class="group-actions">
                    <el-button size="small" :loading="installingKey === `group:${group.lane}`" @click="installPresetGroup(group.items, group.lane)">
                      {{ isEnglish ? 'Install Group' : '安装分组' }}
                    </el-button>
                    <el-button size="small" :loading="installingKey === `disable:${group.lane}`" @click="disablePresetGroup(group.items, group.lane)">
                      {{ isEnglish ? 'Disable Matching' : '停用匹配规则' }}
                    </el-button>
                  </div>
                </div>
                <div class="preset-grid">
                  <article v-for="preset in group.items" :key="preset.key" :class="['preset-card', { focused: focusedPresetKeySet.has(preset.key) }]">
                    <div class="preset-card-header">
                      <strong>{{ isEnglish ? preset.titleEn : preset.titleZh }}</strong>
                      <span>{{ preset.model }} · {{ preset.eventName }}</span>
                    </div>
                    <p>{{ isEnglish ? preset.descriptionEn : preset.descriptionZh }}</p>
                    <code>{{ preset.scriptCode }}</code>
                    <div class="preset-actions">
                      <el-button type="primary" plain @click="openPreset(preset.key)">
                        {{ isEnglish ? 'Use Preset' : '使用模板' }}
                      </el-button>
                      <el-button plain :loading="installingKey === preset.key" @click="installPreset(preset)">
                        {{ isEnglish ? 'Install Active' : '直接安装' }}
                      </el-button>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </article>

          <EntityTableView module-key="sysScript" />
        </section>

        <aside class="workspace-side">
          <article class="erp-card section-panel">
            <div class="section-title">{{ isEnglish ? 'Fallback Syntax' : '降级语法' }}</div>
            <p class="section-copy">
              {{ isEnglish
                ? 'Use these small patterns first so rules still run when Groovy runtime compatibility is limited.'
                : '优先使用这些小语法，确保在 Groovy 兼容性受限时规则也能继续执行。' }}
            </p>
            <div class="syntax-list">
              <code v-for="item in syntaxExamples" :key="item">{{ item }}</code>
            </div>
          </article>

          <article class="erp-card section-panel">
            <div class="section-title">{{ isEnglish ? 'Operational Notes' : '运维提示' }}</div>
            <div class="bullet-list">
              <div class="bullet-item">
                <strong>{{ isEnglish ? 'Remark Matters' : '备注要清晰' }}</strong>
                <p>{{ isEnglish ? 'Add the pilot lane or cutover reason into remark so operators can disable the right rule fast.' : '在备注里写清试点链或切换原因，便于操作员快速停掉正确规则。' }}</p>
              </div>
              <div class="bullet-item">
                <strong>{{ isEnglish ? 'One Risk, One Rule' : '一条风险一条规则' }}</strong>
                <p>{{ isEnglish ? 'Prefer several small explicit rules over one long script that hides multiple side effects.' : '优先使用多条小而明确的规则，不要把多个副作用塞进一条长脚本。' }}</p>
              </div>
              <div class="bullet-item">
                <strong>{{ isEnglish ? 'Smoke With Target Chain' : '结合目标链 smoke' }}</strong>
                <p>{{ isEnglish ? 'Every new rule should be validated from the actual sales or purchase chain action that it protects.' : '每条新规则都应该从它保护的销售或采购链真实动作去验证。' }}</p>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </template>
  </ModuleWorkbench>
</template>

<style scoped>
.workspace-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
}

.workspace-main,
.workspace-side {
  min-width: 0;
}

.workspace-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-panel {
  padding: 22px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.section-actions,
.group-actions,
.preset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}

.section-copy {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.context-panel {
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(35, 128, 99, 0.08), rgba(15, 118, 110, 0.04)), var(--app-panel);
}

.context-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.context-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.context-chip-list {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.context-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.context-copy-line {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.preset-groups {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.preset-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preset-group.focused {
  padding: 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--app-primary) 5%, transparent);
}

.preset-group-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.preset-group-header div:first-child {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-group-header span {
  color: var(--app-text-secondary);
  line-height: 1.5;
}

.group-focus-note {
  color: var(--app-primary);
  font-weight: 700;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--app-panel) 92%, white 8%);
}

.preset-card.focused {
  border-color: color-mix(in srgb, var(--app-primary) 35%, var(--app-border));
  background: color-mix(in srgb, var(--app-primary) 6%, var(--app-panel));
}

.preset-card-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-card-header span,
.preset-card p {
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.preset-card code,
.syntax-list code {
  display: block;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--app-soft);
  color: var(--app-text);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.6;
}

.syntax-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bullet-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bullet-item strong {
  display: block;
  margin-bottom: 6px;
}

.bullet-item p {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }

  .section-header,
  .preset-group-header,
  .context-panel-head {
    flex-direction: column;
  }

  .section-actions,
  .group-actions,
  .preset-actions {
    justify-content: flex-start;
  }
}
</style>
