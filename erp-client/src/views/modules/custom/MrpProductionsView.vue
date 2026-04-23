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
          label: 'Mainline Focus',
          value: 'MO / Components / Finished Move',
          description: 'Manufacturing orders now stay parent-first and expose stock moves as an execution notebook instead of a detached stock screen.',
        },
        {
          label: 'Traceability',
          value: 'Origin / BOM / Move Role',
          description: 'The page prioritizes origin reference, BOM linkage, and component or finished move roles for faster production tracing.',
        },
        {
          label: 'Cost View',
          value: 'Component Cost / Finished Cost',
          description: 'The workbench keeps manufacturing cost fields visible so cost semantics are no longer buried in raw API rows.',
        },
      ]
    : [
        {
          label: '主线重点',
          value: 'MO / 组件 / 成品移动',
          description: '制造单现在按父工作台处理，库存移动收进执行 notebook，不再散落成独立库存页。',
        },
        {
          label: '追溯',
          value: '来源 / BOM / Move Role',
          description: '页面优先暴露来源引用、BOM 关联和组件/成品移动角色，方便快速追制造链。',
        },
        {
          label: '成本视图',
          value: 'Component Cost / Finished Cost',
          description: '制造成本字段直接可见，不再埋在原始 API 行里。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Plan First', description: 'Start from BOM, product, quantity, and source before drilling into component moves.' },
        { label: 'Execution Moves', description: 'Use the stock move notebook to review component consumption and finished move output in one place.' },
        { label: 'Cost Tracking', description: 'Component cost and finished cost stay visible during confirm, done, and rollback flows.' },
      ]
    : [
        { label: '计划优先', description: '先看 BOM、产品、数量和来源，再进入组件移动。' },
        { label: '执行移动', description: '通过 stock move notebook 同时审组件消耗和成品入库。' },
        { label: '成本跟踪', description: '确认、完工和回退过程里，组件成本和成品成本都保持可见。' },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Primary Flow', value: 'Confirm -> Mark Done', description: 'The core manufacturing sequence stays aligned with Odoo manufacturing order actions.' },
        { label: 'Rollback Flow', value: 'Cancel / Reset Draft', description: 'Rollback actions are grouped with execution review so quant side effects can be verified quickly.' },
        { label: 'Drilldown Flow', value: 'MO -> Stock Moves', description: 'Trace directly from the manufacturing order into component and finished stock moves.' },
      ]
    : [
        { label: '主动作链', value: 'Confirm -> Mark Done', description: '制造主流程保持对齐 Odoo 制造单动作。' },
        { label: '回退链', value: 'Cancel / Reset Draft', description: '回退动作和执行结果放在一起核对，便于快速确认 quant 副作用。' },
        { label: '下钻链', value: 'MO -> Stock Moves', description: '直接从制造单进入组件和成品库存移动。' },
      ],
)

const sideCards = computed(() =>
  isEnglish.value
    ? [
        { label: 'Execution', value: 'draft / confirmed / done', description: 'The status path keeps manufacturing order planning and completion distinct.' },
        { label: 'Move Roles', value: 'component / finished', description: 'Child stock moves now differentiate consumed components and finished output.' },
        { label: 'Source', value: 'originRef', description: 'Origin reference stays visible for BOM and traceability regression checks.' },
      ]
    : [
        { label: '执行阶段', value: 'draft / confirmed / done', description: '状态链区分制造计划和完工执行。' },
        { label: '移动角色', value: 'component / finished', description: '子 stock move 已区分组件消耗和成品产出。' },
        { label: '来源', value: 'originRef', description: '来源引用持续可见，便于 BOM 和追溯回归。' },
      ],
)

const quickGuides = computed(() =>
  isEnglish.value
    ? [
        { title: 'Manufacturing Plan', description: 'Search by BOM, product, and origin reference before entering the execution stage.' },
        { title: 'Component Consumption', description: 'Open the stock move notebook to inspect component rows and their cost allocation.' },
        { title: 'Finished Output', description: 'Use the same notebook to verify finished moves, finished location, and total cost carry-through.' },
      ]
    : [
        { title: '制造计划', description: '先按 BOM、产品、来源引用检索，再进入执行阶段。' },
        { title: '组件消耗', description: '通过 stock move notebook 检查组件行和成本分摊。' },
        { title: '成品产出', description: '在同一 notebook 核对成品移动、成品库位和成本承载。' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Manufacturing Order Workbench' : '制造单工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'A manufacturing-first workbench that keeps BOM linkage, source traceability, move roles, and cost semantics visible in one place.'
    : '以制造单为中心的工作台，把 BOM 关联、来源追溯、移动角色和成本语义放到同一个视图里。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Stock moves remain available, but they now stay inside the manufacturing execution context.'
    : '库存移动仍然可用，但现在固定放在制造执行上下文里处理。',
)
</script>

<template>
  <ModuleWorkbench
    module-key="mrpProduction"
    :config="moduleConfigMap.mrpProduction"
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
          <EntityTableView module-key="mrpProduction" :config="moduleConfigMap.mrpProduction" />
        </section>

        <aside class="workspace-side">
          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Manufacturing Snapshot' : '制造快照' }}</div>
            <div class="state-vertical">
              <div v-for="item in sideCards" :key="item.label" class="state-card-mini">
                <div class="state-header">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </article>

          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Execution Guide' : '执行指引' }}</div>
            <div class="side-list">
              <div v-for="item in quickGuides" :key="item.title" class="side-item">
                <strong>{{ item.title }}</strong>
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

.state-vertical,
.side-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.state-card-mini,
.side-item {
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

.state-header strong,
.side-item strong {
  color: var(--app-text);
  font-size: 14px;
}

.state-card-mini p,
.side-item p {
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
