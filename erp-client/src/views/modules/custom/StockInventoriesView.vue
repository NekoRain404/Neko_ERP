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
          value: 'Inventory Header / Lines / Quantities',
          description: 'Inventory adjustments are now handled as a parent workbench with counted lines kept inside the detail notebook.',
        },
        {
          label: 'Search Surface',
          value: 'Inventory / Date / State / Company',
          description: 'The search layer now matches the actual inventory adjustment review flow.',
        },
        {
          label: 'Child Workspace',
          value: 'Inventory Lines',
          description: 'Hidden inventory lines stay reachable through parent context and can return directly to the parent record.',
        },
      ]
    : [
        {
          label: '工作台重点',
          value: '盘点头 / 明细行 / 数量',
          description: '库存盘点现在按父工作台处理，盘点行收进详情 notebook，不再散落成一级模块。',
        },
        {
          label: '搜索面',
          value: 'Inventory / Date / State / Company',
          description: '搜索层现在更接近真实盘点审查流程。',
        },
        {
          label: '子工作区',
          value: 'Inventory Lines',
          description: '隐藏的盘点行通过父记录上下文进入，并且可以直接回父记录。',
        },
      ],
)

const focusItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Header Scope', description: 'Review inventory date, state, and scope before drilling into counted lines.' },
        { label: 'Counted Vs Theoretical', description: 'Line configuration now keeps counted quantity and theoretical quantity visible in the child workspace.' },
        { label: 'Trace Back', description: 'Hidden line records keep parent inventory context instead of acting like standalone stock modules.' },
      ]
    : [
        { label: 'Header Scope', description: '先看盘点日期、状态和范围，再进入明细行。' },
        { label: 'Counted Vs Theoretical', description: '盘点行现在直接保留实际数量和理论数量的对子。' },
        { label: 'Trace Back', description: '隐藏行记录保持父盘点上下文，不再像独立库存模块。' },
      ],
)

const actionItems = computed(() =>
  isEnglish.value
    ? [
        { label: 'Review Flow', value: 'Search -> Open -> Count Lines', description: 'The page is tuned for adjustment review before entering line-level work.' },
        { label: 'Trace Flow', value: 'Line -> Parent Inventory', description: 'Line routes can now return directly to the originating inventory record.' },
      ]
    : [
        { label: '审查链路', value: 'Search -> Open -> Count Lines', description: '页面现在优先服务盘点审查，再进入行级处理。' },
        { label: '追溯链路', value: 'Line -> Parent Inventory', description: '盘点行路由现在能直接回来源盘点记录。' },
      ],
)

const sideCards = computed(() =>
  isEnglish.value
    ? [
        { label: 'Inventory Header', value: 'stock.inventory', description: 'The header keeps date, state, scope, and company together.' },
        { label: 'Inventory Lines', value: 'stock.inventory.line', description: 'Child lines carry location, product, counted quantity, and theoretical quantity.' },
        { label: 'State Review', value: 'Draft / Confirm / Done / Cancel', description: 'The status filter and tag rendering now match the inventory adjustment flow.' },
      ]
    : [
        { label: '盘点头', value: 'stock.inventory', description: '头部统一承载日期、状态、范围和公司。' },
        { label: '盘点明细', value: 'stock.inventory.line', description: '子行现在保留库位、产品、实际数量和理论数量。' },
        { label: '状态审查', value: 'Draft / Confirm / Done / Cancel', description: '状态筛选和标签渲染已经对齐盘点流程。' },
      ],
)

const pageTitle = computed(() => (isEnglish.value ? 'Inventory Adjustment Workbench' : '库存盘点工作台'))
const pageDescription = computed(() =>
  isEnglish.value
    ? 'Inventory adjustments now use a parent-first workbench with line-level traceability and clearer state review.'
    : '库存盘点现在走父记录优先的工作台，行级追溯和状态审查都更完整。',
)
const note = computed(() =>
  isEnglish.value
    ? 'Inventory lines are still available, but they stay inside the inventory adjustment workflow.'
    : '盘点行仍然可用，但现在固定挂在盘点工作流内部。',
)
</script>

<template>
  <ModuleWorkbench
    module-key="stockInventory"
    :config="moduleConfigMap.stockInventory"
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
          <EntityTableView module-key="stockInventory" :config="moduleConfigMap.stockInventory" />
        </section>

        <aside class="workspace-side">
          <article class="erp-card side-panel">
            <div class="section-title">{{ isEnglish ? 'Inventory Summary' : '盘点摘要' }}</div>
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
