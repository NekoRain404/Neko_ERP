# 2026-04-23 治理层付款联动与库存影响 Round

## 本轮目标

把已经落地的 `payment linkage / quant impact` 从局部工作台能力，继续推进成切换治理层能力。

这轮不再继续堆新的独立页面，固定做三件事：

1. 进入共享导出包
2. 进入关账摘要
3. 进入后续开发主线文档

## 本轮修改

### 1. 共享治理摘要

新增：

- `erp-client/src/utils/cutover-governance.ts`

新增统一治理摘要能力：

1. `buildPaymentLinkageGovernanceSummary`
2. `buildQuantImpactGovernanceSummary`
3. `supportsPaymentLinkageModule`
4. `supportsQuantImpactModule`

作用：

- 让模块工作台、Dashboard、Settings、Command Palette、共享导出包使用同一套治理判断
- 避免同一类 payment / quant 语义在多个入口里各写一套

### 2. 共享导出包补齐新维度

补强文件：

- `erp-client/src/utils/cutover-packets.ts`
- `erp-client/src/utils/cutover-protection.ts`
- `erp-client/src/utils/cutover-control.ts`

新增或接入：

1. `CutoverPacketModule.paymentLinkageLines`
2. `CutoverPacketModule.quantImpactLines`
3. `ModulePacketGateRow.paymentLinkageLines`
4. `ModulePacketGateRow.quantImpactLines`
5. `CutoverControlModuleRow.paymentLinkageLines`
6. `CutoverControlModuleRow.quantImpactLines`

这些能力已经进入：

1. `buildSharedPilotUserManualPack`
2. `buildSharedModuleHandbookContent`
3. `buildSharedModuleRehearsalContent`
4. `buildSharedModuleGatePacket`
5. `buildSharedModuleExceptionPacket`
6. `buildSharedCutoverControlPacket`
7. `buildSharedFirstWaveRehearsalPack`
8. `buildSharedRollbackDrillPacket`

结果：

- `accountInvoice / accountPayment / accountMove` 的付款联动不再只存在局部面板
- `stockPicking` 的库存影响不再只存在局部面板
- 导出的手册、控制包、演练包、异常包已经能看见这两类治理信号

### 3. 模块工作台继续下沉治理摘要

补强文件：

- `erp-client/src/components/ModuleWorkbench.vue`

新增：

1. `modulePaymentLinkageSummary`
2. `moduleQuantImpactSummary`
3. `buildModulePaymentLinkageLines()`
4. `buildModuleQuantImpactLines()`

并接入：

1. 回退演练包
2. 证据纪律包
3. 操作手册
4. 门槛包
5. 切换演练摘要
6. 模块异常包

结果：

- 模块导出包已经形成 “结算闭环 + 财务追溯 + 付款联动 / 库存影响” 的组合视角
- 不再只有 settlement / trace 两条线

### 4. 关账摘要继续扩维

补强文件：

- `erp-client/src/utils/cutover-close.ts`
- `erp-client/src/views/DashboardView.vue`
- `erp-client/src/views/SettingsView.vue`
- `erp-client/src/components/CommandPalette.vue`

新增关账指标：

1. `paymentLinkageIssueCount`
2. `quantImpactIssueCount`

并让：

1. Dashboard
2. Settings
3. Command Palette
4. ModuleWorkbench

统一消费这些维度。

结果：

- close summary 不再只统计 gate / settlement / trace / closed loop
- 付款联动和库存影响已经成为明确可见的关账阻塞信号

### 5. 指导文档同步更新

补强文件：

- `VIBECODING_GUIDE.md`

新增强调：

1. 本轮增量已经把付款联动与库存影响纳入治理包和关账摘要
2. 后续主线必须继续把 `payment linkage / quant impact` 下沉到 `close summary / control packet / pilot manual / rollback drill`

## 当前价值

这轮的价值不在于“又多了两个面板”，而在于：

1. 把财务链的 payment linkage 提升成切换治理语义
2. 把库存链的 quant impact 提升成切换治理语义
3. 让工作台、导出包、控制包、关账摘要开始使用同一套判断
4. 继续吸收 ERPNext 的平台化复用思路，而不是每处手写
5. 继续吸收 Monica 的上下文连续性思路，让记录不只停留在单点页面

## 仍然欠缺

这轮之后，距离“优秀 ERP 工具”仍明显欠缺的部分主要有：

1. close cockpit 还不够硬
   - 现在有 close summary
   - 但还缺真正的 close owner / close checklist / close freeze 纪律

2. payment linkage 仍然偏治理摘要
   - 已经进入治理包
   - 但还缺更深的 reconciliation、journal explain、payment failure reason

3. quant impact 仍然偏治理摘要
   - 已经进入控制包和关账摘要
   - 但还缺 quant delta explain、rollback inventory explain、location-side audit trail

4. Query Report / Saved Query / KPI 还没有真正落地

5. 元数据平台层还没进入配置驱动主导阶段

## 下一步

下一批继续固定按主线推进：

1. 继续把 close cockpit 做成真正的 close checklist 和 close blocker 工作台
2. 补 `payment linkage -> reconciliation -> close-ready` 的更深财务语义
3. 补 `stockPicking -> stockMove -> stockQuant` 的库存差异解释和回退说明
4. 补最小 Query Report / Saved Query / KPI
5. 继续把治理判断从局部页面下沉成共享平台能力
