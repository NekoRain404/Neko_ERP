# 2026-04-23 财务追溯详情与切换接线 Round 2

## 本轮目标

- 把上一轮的模块级财务追溯驾驶舱继续下沉到记录级详情。
- 让 `accountInvoice / accountPayment / accountMove` 不只看到风险摘要，还能直接看到链路解释、结算路径和关联对象跳转。
- 把真实财务追溯继续接到工作台、审核队列和 cutover 导出内容里，避免仍停留在 reminder 驱动的静态摘要层。

## 本轮修改

### 1. 后端新增记录级财务追溯详情接口

新增接口：

- `GET /account/financial-trace/detail`

新增 DTO：

- `AccountFinancialTraceDetailDto`
- `AccountFinancialTraceLinkDto`

后端服务增强：

- `AccountFinancialTraceService`

当前详情接口已支持：

1. `accountInvoice`
   - 返回当前记录状态
   - 返回链路解释
   - 返回结算路径
   - 返回关联对象：
     - 销售单 / 采购单
     - 付款
     - 凭证

2. `accountPayment`
   - 返回当前记录状态
   - 返回链路解释
   - 返回结算路径
   - 返回关联对象：
     - 发票
     - 来源销售单 / 采购单
     - 凭证

3. `accountMove`
   - 返回当前记录状态
   - 返回链路解释
   - 返回结算路径
   - 返回关联对象：
     - 付款
     - 发票
     - 来源销售单 / 采购单
     - 冲销凭证 / 来源凭证

### 2. 财务追溯面板支持记录级 drill-down

增强：

- `erp-client/src/components/FinancialTracePanel.vue`

新增能力：

1. 后端记录卡片支持点击查看详情
2. 新增详情抽屉，展示：
   - 链路解释
   - 结算路径
   - 关联对象
   - 风险键
3. 详情抽屉可直接跳转到：
   - 发票
   - 付款
   - 凭证
   - 销售订单
   - 采购订单
4. 记录卡片支持直接 `Open Record`
   - 现在会带 `detailId`
   - 直接打开目标记录详情，而不是只做列表 focus

### 3. 审核队列改为直接打开记录详情

更新：

- `erp-client/src/components/PilotReviewQueuePanel.vue`

改动：

- 点击审核队列项时，改为使用 `detailId`
- 审核入口不再只停在列表聚焦，而是直接打开记录详情页
- 这和“点击表格内容应打开新详情页面而不是原地展开”的主线更一致

### 4. 工作台与 cutover 导出优先使用真实财务追溯态

增强：

- `erp-client/src/components/ModuleWorkbench.vue`

当前行为：

1. 对财务三模块：
   - `accountInvoice`
   - `accountPayment`
   - `accountMove`

工作台会额外拉取后端真实 cockpit 数据。

2. 工作台里的财务追溯执行动作、摘要、导出线索，开始优先使用：
   - 后端 recordCount
   - ready / warning / missing
   - missingKeys / warningKeys
   - 真实证据总量

3. `Open Trace Desk`
   - 现在会优先打开真实风险记录
   - 不再只依赖 reminder 的 top risk

4. `buildModuleFinancialTraceLines()`
   - 已开始把真实 backend cockpit 的记录与证据统计写入导出内容
   - 这样 rollback drill / operator handbook / exception packet 的财务追溯段不再只有静态检查项

### 5. Dashboard 接入真实财务追溯 cockpit

增强：

- `erp-client/src/views/DashboardView.vue`

本轮新增：

1. 首页会并行拉取 `accountInvoice` 的后端真实财务追溯 cockpit
2. 首页模块卡片和链路卡片的财务追溯摘要，不再只靠 reminder 推断
3. 销售链 / 采购链的 trace 状态现在会吸收真实发票记录状态
4. 首页的 `Top Risk` 优先打开真实 trace 记录详情
   - 使用 `detailId`
   - 优先落在 `traceability`
   - 不再回退成列表聚焦
5. 最近记录重开也改为 `detailId`
   - 和“打开新详情页而不是原地展开”的桌面路线保持一致

### 6. 风险面板与批处理面板统一 detailId 跳转

增强：

- `erp-client/src/components/PilotRiskStatsPanel.vue`
- `erp-client/src/components/PilotBatchActionPanel.vue`
- `erp-client/src/views/SettingsView.vue`
- `erp-client/src/components/ModuleWorkbench.vue`

统一后的行为：

1. 风险统计面板打开最高风险记录时优先使用 `detailId`
2. 批处理面板打开最高风险记录时优先使用 `detailId`
3. 设置页链路最高风险入口也改为 `detailId`
4. 工作台的最高风险记录 / 财务追溯台 fallback 跳转也改为 `detailId`

结果：

- 最高风险入口不再大量退回 `focusField + focusValue`
- 详情打开路径更一致
- 更符合 Electron 工作台的“直开记录详情页”体验

### 7. cutover 共享构建器补上财务追溯输出

增强：

- `erp-client/src/utils/cutover-control.ts`
- `erp-client/src/utils/cutover-packets.ts`

本轮补齐：

1. `buildCutoverPacketChains`
   - 现在会写入 `financialTraceLabel`
   - `financialTraceMissingLabels`
   - `financialTraceWarningLabels`
   - `financialTraceLines`

2. `buildCutoverPacketModules`
   - 现在会把模块级财务追溯摘要一起写入导出对象

3. `buildCutoverControlModules`
   - 控制包、演练包、回退包可以继续消费财务追溯态

4. 多个导出包追加 `financialTraceLines`
   - blocker packet
   - acceptance packet
   - user manual
   - confirmation template
   - control packet
   - rehearsal pack

结果：

- cutover 导出现在不只是“追溯状态好/坏”
- 还能直接看到真实记录引用、证据总量和重点记录线索
- 回退和放行文档开始真正承载 record-level trace 证据

### 8. cockpit 接口异常的前端兜底

增强：

- `erp-client/src/components/FinancialTracePanel.vue`
- `erp-client/src/components/ModuleWorkbench.vue`
- `erp-client/src/views/DashboardView.vue`

本轮补上：

1. cockpit 接口失败时自动回退到 reminder 驱动摘要
2. 不再因为单个 cockpit 请求失败拖垮整块工作台或首页
3. 首页会对 cockpit 拉取做逐模块兜底，不影响整体提醒加载

## 验证结果

已执行并通过：

1. `cd erp-server && mvn -q -DskipTests compile`
2. `cd erp-client && npm run build`
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

结果：

- 后端编译通过
- 前端构建通过
- smoke 全绿
- `all-list-smoke` 42 endpoints 通过
- action smoke 继续通过
- secondary action smoke 继续通过
- guardrail smoke 继续通过
- platform smoke 继续通过
- 没有破坏已有 `ext_data / sys_script / timeline / reminder / attachment / settlement / reconciliation` 主线

## 当前价值

这轮完成后，财务主线的推进层次已经变成：

1. 模块级真实财务追溯驾驶舱
2. 记录级财务追溯详情
3. 关联对象直接跳转
4. cutover / rollback / review 继续消费真实追溯状态
5. dashboard / risk / batch / settings 开始统一走 detail page 导航

相比之前，最重要的提升是：

1. 不再只知道“有风险”
2. 现在能直接解释“为什么有风险”
3. 也能直接跳到“要补哪条业务链”
4. 首页和导出包开始引用真实财务记录，而不是只做提醒层猜测

这一步继续补强了开发总纲里最欠缺的内容：

1. `source anchor`
2. `payment linkage`
3. `journal trace`
4. `settlement explanation`
5. `record-level trace drill-down`
6. `dashboard trace cockpit`
7. `cutover packet trace evidence`

## 下一步

下一批继续沿主线推进：

1. 继续把 `accountPayment / accountMove` 的真实 trace 状态接到更多全局入口
2. 增加 `invoice -> payment -> move -> move line` 的更细粒度结算解释
3. 做记录级回退包，直接引用 trace detail 的 explanation / settlement / related links
4. 继续推进 payment linkage / reconcile context / source explanation 的更深 guardrail
