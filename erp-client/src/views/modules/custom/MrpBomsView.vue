<script setup lang="ts">
import { computed } from 'vue'
import ModuleWorkbench from '@/components/ModuleWorkbench.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import { moduleConfigMap } from '@/config/modules'
import { useI18n } from '@/i18n'

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')

const highlights = computed(() =>
  isEnglish.value
    ? [
        {
          label: 'Workbench Focus',
          value: 'Structure / Component / Quantity',
          description: 'The BOM page now focuses on parent BOM headers, component rows, and quantity review instead of exposing component lines as a first-class menu item.',
        },
        {
          label: 'Search Surface',
          value: 'BOM / Template / Product / Company',
          description: 'Search prioritizes the fields that matter during BOM maintenance and review.',
        },
        {
          label: 'Child Workspace',
          value: 'Components Notebook',
          description: 'Component lines stay inside the BOM detail notebook so the workflow remains parent-first.',
        },
      ]
    : [
        {
          label: '工作台重点',
          value: '结构 / 组件 / 用量',
          description: 'BOM 页面现在优先围绕 BOM 头、组件行和数量校核，不再把组件行当成一级业务入口暴露。',
        },
        {
          label: '搜索面',
          value: 'BOM / Template / Product / Company',
          description: '搜索优先围绕 BOM 维护和审查真正会用到的字段。',
        },
        {
          label: '子工作区',
          value: 'Components Notebook',
          description: '组件行保留在 BOM 详情 notebook 里处理，工作流保持父单据优先。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Header First', description: 'Start from the BOM header, then drill into component lines with parent context preserved.' },
        { label: 'Quantity Review', description: 'The list emphasizes the produced quantity so BOM revisions can be reviewed without opening every record.' },
        { label: 'Child Context', description: 'Hidden component lines now stay traceable back to the parent BOM record.' },
      ]
    : [
        { label: 'Header First', description: '先看 BOM 头，再在父记录上下文里下钻组件行。' },
        { label: 'Quantity Review', description: '列表直接强调产出数量，方便快速审 BOM 版本。' },
        { label: 'Child Context', description: '隐藏的组件行现在始终能追溯回父 BOM 记录。' },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Maintenance Flow', value: 'Header -> Components', description: 'The page is now optimized for editing BOM headers and then checking components inside the notebook.' },
        { label: 'Review Flow', value: 'Search -> Inspect -> Trace', description: 'The side guidance keeps the workflow aligned with parent-child traceability.' },
      ]
    : [
        { label: '维护链路', value: 'Header -> Components', description: '页面现在优先按 BOM 头维护，再进入 notebook 检查组件。' },
        { label: '审查链路', value: 'Search -> Inspect -> Trace', description: '侧边指引保持父子追溯优先。' },
      ],
)

const componentCards = computed(() =>
  isEnglish.value
    ? [
        { label: 'Parent BOM', value: 'mrp.bom', description: 'The header keeps product template, product, code, and produced quantity in one place.' },
        { label: 'Components', value: 'mrp.bom.line', description: 'Components are handled as a child workspace instead of an exposed standalone module.' },
        { label: 'Traceability', value: 'Parent Context', description: 'Child routes now prefer returning to the parent BOM record, not just the parent list.' },
      ]
    : [
        { label: '父 BOM', value: 'mrp.bom', description: '头部统一承载产品模板、产品、编码和产出数量。' },
        { label: '组件明细', value: 'mrp.bom.line', description: '组件行作为子工作区处理，不再作为独立业务模块暴露。' },
        { label: '追溯', value: 'Parent Context', description: '子路由现在优先回到父 BOM 记录，而不是只回列表。' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'BOM Workbench' : 'BOM 工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'Parent-first BOM maintenance with a dedicated components notebook and cleaner traceability for hidden child records.'
    : '以父记录为中心的 BOM 维护页，组件 notebook 和隐藏子记录追溯都已经收紧。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Component lines stay available, but only inside the BOM context where they belong.'
    : '组件行仍然可用，但现在只在 BOM 上下文内处理，不再散落成独立入口。',
)
</script>

<template>
  <ModuleWorkbench
    module-key="mrpBom"
    :config="moduleConfigMap.mrpBom"
    :title="pageTitle"
    :description="pageDescription"
    :highlights="highlights"
    :focus-items="focusItems"
    :action-items="actionItems"
    :note="note"
  >
    <template #workspace>
      <div class="workspace-layout">
        <section class="workspace-main">
          <EntityTableView module-key="mrpBom" :config="moduleConfigMap.mrpBom" />
        </section>

        <aside class="workspace-side">
          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'BOM Summary' : 'BOM 摘要' }}</div>
            <div class="state-vertical">
              <div v-for="item in componentCards" :key="item.label" class="state-card-mini">
                <div class="state-header">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
                <p>{{ item.description }}</p>
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
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
}

.workspace-main {
  min-width: 0;
}

.side-panel {
  padding: 22px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.state-vertical {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.state-card-mini {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.state-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.state-header strong {
  color: var(--app-text);
  font-size: 14px;
}

.state-card-mini p {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }
}
</style>
