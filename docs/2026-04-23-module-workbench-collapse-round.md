# 2026-04-23 模块工作台折叠与异步加载 Round

## 本轮目标

1. 收缩 `ModuleWorkbench` 的首屏复杂度，避免工作台一打开就是整页重型运营面板
2. 把重量级运营面板改成按需展开和异步加载，降低模块工作台的维护负担
3. 保持主链可用前提下，继续解决“页面乱”和“加载重”的问题

## 本轮修改

1. 新增共享壳层组件
   - `erp-client/src/components/CollapsibleWorkbenchDesk.vue`
   - 统一承接工作台运营台的标题、描述、动作区、展开/收起逻辑

2. 优化 `ModuleWorkbench.vue`
   - 将以下重型组件改为 `defineAsyncComponent`
     - `PilotBatchActionPanel`
     - `PilotRiskStatsPanel`
     - `SettlementCockpitPanel`
     - `StockExecutionFeedbackPanel`
     - `PaymentLinkagePanel`
     - `QuantImpactPanel`
   - 为以下运营台增加默认收起能力
     - 风险统计
     - 批处理
     - 结算 / 对账台
     - 付款联动台
     - 执行反馈台
     - 库存影响台
     - Guardrail 运维台
     - 证据运维台
     - 操作手册台
     - 切换演练台
     - 财务追溯台
     - 回退演练台
   - 通过 `route.query.section` 深链进入时自动展开对应运营台，避免跳转后目标区块仍处于折叠状态
   - 为顶部的风险统计和批处理补齐展开后可再次收起的入口

3. 直接结果
   - `ModuleWorkbench` 不再默认把大量运营细节整页铺开
   - 工作台更接近“主操作 + 按需展开治理台”的桌面操作模式
   - 重型面板从主 chunk 中继续拆出，降低耦合

## 验证结果

1. `cd erp-client && npm run build`
   - 通过
   - `ModuleWorkbench` 构建产物从上一轮约 `437.88 kB` 下降到约 `421.82 kB`
   - 仍有大包体 warning，但本轮已经把数个重型面板拆成独立 chunk

2. 后续本轮还需统一确认
   - `cd erp-server && mvn -q -DskipTests compile`
   - `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前价值

1. 模块工作台不再像“长网页”，而是更接近企业桌面操作台
2. 运营细节不再默认全部展开，减少视觉噪音和操作者的扫描负担
3. 后续继续拆 `ModuleWorkbench` 时，可以在 `CollapsibleWorkbenchDesk` 这个壳层上复用，而不是继续复制头部和折叠逻辑

## 下一步

1. 继续拆 `ModuleWorkbench` 中仍偏重的摘要卡和运营摘要逻辑
2. 考虑把 `close / gates / trace / evidence` 这些块进一步抽成独立子组件
3. 继续降低大 chunk，优先处理 `elementPlus` 和 `ModuleWorkbench` 残余体积
