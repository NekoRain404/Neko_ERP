# 2026-04-23 范围追溯面板与活动中心贯通 Round

## 本轮目标

继续沿 `VIBECODING_GUIDE` 主线，把“真实 top-risk 追溯入口”从 Dashboard / Settings / Command Palette 再推进到共享范围面板和活动中心：

1. `PilotRiskStatsPanel`
2. `PilotBatchActionPanel`
3. `ActivityCenter`

这一轮不再只停留在 reminder 密度展示，而是让这些共享入口也直接落到真实 cockpit 的 top-risk 记录，并补齐 `documents / timeline / trace packet`。

## 本轮修改

### 1. 新增共享范围财务追溯工具层

新增文件：

- `erp-client/src/utils/scope-financial-trace.ts`

新增能力：

1. 为任意 scope 构造模块级 `CutoverFinancialTraceState`
2. 为任意 scope 聚合链路级 `CutoverFinancialTraceState`
3. 统一生成：
   - `traceability`
   - `documents`
   - `timeline`
   路由目标

结果：

- 范围级追溯逻辑不再散落在多个面板内部。
- 后续 Dashboard / Settings / ModuleWorkbench 继续铺类似入口时可直接复用。

### 2. 风险统计面板升级为真实 cockpit 驱动

更新文件：

- `erp-client/src/components/PilotRiskStatsPanel.vue`

本轮增强：

1. 风险统计面板开始批量拉取 scope 内可追溯模块的 backend cockpit
2. 每条 scope row 都会生成真实 `financialTraceSummary`
3. `Open Top Risk` 优先打开真实 cockpit 识别出的 top-risk 记录
4. 新增：
   - `Documents`
   - `Timeline`
5. 如果没有 backend cockpit，则自动回退到 reminder top-risk 的 `documents / timeline`

结果：

- 风险统计面板从“看密度”升级到“直接处理 top-risk”。
- 链路级和模块级 scope 都能直接打开文档区和时间轴，不再只能跳单一提醒详情。

### 3. 批处理面板升级为真实 top-risk 处理台

更新文件：

- `erp-client/src/components/PilotBatchActionPanel.vue`

本轮增强：

1. scope row 同步接入真实 `financialTraceSummary`
2. `Open Top Risk` 优先走 cockpit top-risk
3. 新增：
   - `Documents`
   - `Timeline`
   - `Export Top Trace`
4. `Export Rollback Review` 现在优先按真实 cockpit top-risk 记录生成追溯详情
5. 若该范围没有 backend cockpit，则回退到 reminder top-risk

结果：

- 批处理面板不再只是异常清单导出器。
- 现在已经具备：
   - 范围异常导出
   - 最高风险直达
   - 文档/时间轴旁路
   - 单条 top-risk 追溯包导出
   - 回退核对摘要导出

### 4. 活动中心改为详情页优先，并补文档/时间轴捷径

更新文件：

- `erp-client/src/components/ActivityCenter.vue`

本轮增强：

1. Activity 项打开方式从列表 focus 改为 `detailId` 详情页直开
2. Reminder 项仍走详情页，但现在统一用同一套 `detailId` 语义
3. 活动项和提醒项都新增：
   - `Documents`
   - `Timeline`
4. 活动中心卡片结构从单按钮改为：
   - 主内容点击打开详情
   - 底部快捷动作打开文档/时间轴

结果：

- 更符合“点击内容打开新页面而不是原地展开”的桌面主线。
- Monica 风格上下文补录入口不再只存在于工作台，活动中心也能直接补文档和时间轴。

## 当前价值

1. 共享范围面板终于不再只是“观察面板”，而是能真正承接 cutover cockpit 的处理动作。
2. Dashboard / Settings / ModuleWorkbench / Command Palette / Activity Center 这些高频入口，正在逐步收拢到同一条路由语义：
   - `detailId`
   - `traceability`
   - `documents`
   - `timeline`
3. 这一步同时吸收了两条成熟 ERP 精华：
   - ERPNext：把追溯、证据和执行动作做成稳定的共享工作台能力。
   - Monica：把文档与时间轴当作持续关系上下文，而不是附属弹窗。

## 下一步

1. 把 `PilotReviewQueuePanel` 和 `PilotBatchActionPanel` 的 trace packet 能力继续升级为 bundle 导出
2. 把 `ActivityCenter` 继续接到：
   - chain handoff
   - rollback drill
   - cutover ops
3. 继续补专用工作台：
   - `saleOrder`
   - `purchaseOrder`
   - `stockPicking`
   - `accountInvoice`
   - `accountPayment`
   的链路执行动作区
