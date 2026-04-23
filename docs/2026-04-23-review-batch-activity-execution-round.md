# 2026-04-23 审核队列、批处理台与活动中心执行层推进 Round

## 本轮目标

继续沿 `VIBECODING_GUIDE` 主线，把共享入口从“能打开 top-risk”推进到“能导出追溯包、能直达 cutover 执行区、能承接审核动作”：

1. `PilotReviewQueuePanel`
2. `PilotBatchActionPanel`
3. `ActivityCenter`
4. 范围级 trace bundle 共享工具

目标不是增加更多展示，而是让这些共享入口真正承接首批切换链的一线执行动作。

## 本轮修改

### 1. 范围级 trace bundle 能力下沉到共享 util

增强文件：

- `erp-client/src/utils/scope-financial-trace.ts`

新增能力：

1. 解析 scope 的真实 top trace record
2. 汇总 scope 的 trace bundle targets
3. 为后续共享面板统一提供：
   - top-risk 记录
   - bundle target 列表
   - 真实 record ref label

结果：

- 范围级追溯包不再需要每个面板各写一套 targets 选择逻辑。
- Dashboard / Settings / ModuleWorkbench / Review / Batch 后续继续扩展时可以共用同一套 scope trace 语义。

### 2. 审核队列升级为“可导包的审核入口”

更新文件：

- `erp-client/src/components/PilotReviewQueuePanel.vue`

本轮增强：

1. 审核队列开始拉 scope 内支持财务追溯的 backend cockpit
2. 面板头部新增：
   - `Copy Bundle`
   - `Export Bundle`
3. 队列项新增：
   - `Documents`
   - `Timeline`
   - `Trace`
4. `Trace` 会直接导出当前队列记录的单条追溯包

结果：

- 审核队列不再只是“待处理列表”。
- 现在可以直接从审核入口产出证据包、打开时间轴、打开文档区。

### 3. 批处理台升级为“范围级 cutover 执行台”

更新文件：

- `erp-client/src/components/PilotBatchActionPanel.vue`

本轮增强：

1. 每个 scope row 新增：
   - `Handoff`
   - `Closed Loop`
   - `Copy Trace Bundle`
   - `Export Trace Bundle`
2. 原有 top-risk 动作继续保留，并与真实 cockpit top-risk 对齐
3. 范围级追溯包可直接按 scope 导出
4. row 级回退核对继续优先使用真实 trace detail

结果：

- 批处理台已经从“异常导出列表”升级为可直达交接台、闭环台、追溯包和单条 top-risk 的范围执行入口。

### 4. 活动中心接入 cutover 执行捷径

更新文件：

- `erp-client/src/components/ActivityCenter.vue`

本轮增强：

1. reminder 卡片新增：
   - `Handoff`
   - `Closed Loop`
2. 这两个动作会根据 reminder 所属链路直接跳到：
   - `settings?tab=cutover&section=handoff`
   - `settings?tab=cutover&section=ops`
3. 同时保留已有：
   - `Documents`
   - `Timeline`
   - 详情页直开

结果：

- Activity Center 现在不仅是提醒箱，也开始承担切换交接和闭环核对的桌面入口。
- Monica 风格的上下文入口与 ERPNext 风格的执行台入口，终于开始在同一处汇合。

## 当前价值

1. 共享入口层已经明显从“观察与提醒”转向“执行与导出”。
2. 首批切换链的桌面流转更完整了：
   - 审核队列可以导包
   - 批处理台可以开交接和闭环
   - 活动中心可以直接回到 cutover 执行位
3. 这一步继续压缩了用户在不同页面之间来回找入口的成本，更贴近桌面 ERP 应有的工作台体验。

## 下一步

1. 把 `PilotReviewQueuePanel` 继续接入：
   - mark reviewed 后的批量闭环动作
   - queue-level rollback review 导出
2. 把 `PilotBatchActionPanel` 继续接入：
   - exception export 与 sign-off packet 的联动
   - scope 级 rollback drill packet
3. 把专用工作台继续推进成真正的首批切换 cockpit：
   - `saleOrder`
   - `purchaseOrder`
   - `stockPicking`
   - `accountInvoice`
   - `accountPayment`
