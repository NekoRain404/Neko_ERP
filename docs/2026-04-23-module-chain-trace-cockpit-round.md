# 2026-04-23 模块链路财务追溯驾驶舱 Round

## 本轮目标

把模块工作台里仍然停留在 reminder 摘要层的链路级财务追溯，升级成基于真实 backend cockpit 的跨模块聚合，让销售链、采购链和主数据链在工作台里直接看到真实追溯阻塞点。

## 本轮修改

1. 模块工作台开始拉取关联链路模块的真实财务 cockpit
   - `erp-client/src/components/ModuleWorkbench.vue`
   - `refreshModuleReminders()` 不再只拉当前模块的 cockpit。
   - 现在会按 `cutoverStore.chainsForModule(props.moduleKey)` 找到关联链路中的全部财务追溯模块，并批量拉取 cockpit，落到 `relatedModuleFinancialTraceCockpitMap`。

2. 链路财务追溯从 reminder summary 升级为 cockpit 聚合
   - `ModuleWorkbench.vue`
   - `chainGateRows` 现在对链路模块逐个生成 `CutoverFinancialTraceState`，再通过 `buildChainCutoverFinancialTraceState()` 聚合。
   - 结果不再依赖“当前模块提醒是否正好覆盖全链路”，而是直接吃到：
     - 记录数
     - 缺失项
     - 待推进项
     - top-risk 记录
     - record refs

3. 链路门槛包和回退包补齐链路级 trace refs / packet refs
   - `ModuleWorkbench.vue`
   - 下列导出内容中的 chain rows 现在不再复用当前模块的 trace refs，而是携带各自链路聚合后的真实引用：
     - 模块门槛包
     - 模块回退演练包
   - 每条链路都会输出自己的：
     - `financialTraceRecordRefs`
     - `financialTracePacketRefs`

4. 工作台门槛卡片直接展示链路级财务追溯状态
   - `ModuleWorkbench.vue`
   - 放行门槛台里的每张链路卡片新增：
     - 财务追溯状态
     - 追溯记录引用
   - 这样操作员不需要先导包，也能在桌面工作台上直接看见链路级 cockpit 结果。

## 当前价值

1. 首批切换链的工作台终于具备“跨模块真实 cockpit 聚合”能力，而不是只在 Settings / Dashboard 才能看见真实追溯。
2. 销售链和采购链的 cutover 包开始更像 ERPNext 风格的执行包，证据引用和 top-risk 记录都能跟着链路走。
3. 这一步也让 Monica 式上下文更完整，因为财务追溯不再只是抽象状态，而是带着具体记录引用沉到工作台一线。

## 下一步

1. 继续把链路级 cockpit 聚合下沉到：
   - `saleOrder`
   - `purchaseOrder`
   - `accountInvoice`
   - `stockPicking`
   - `accountPayment`
   专用工作台的执行动作推荐。
2. 给链路级追溯补更多 desk 入口：
   - 打开链路 top-risk 记录
   - 打开链路 documents
   - 打开链路 timeline
3. 把链路级 trace refs 继续接入 pilot sign-off、handoff 和 rollback 负责人模板。
