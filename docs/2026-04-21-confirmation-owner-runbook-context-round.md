# 2026-04-21 Confirmation Owner Runbook Context Round

## 本轮目标

继续按 `VIBECODING_GUIDE.md` 的主线推进，把切换保护从“有材料可导出”继续推进到“有明确确认负责人、共享 runbook builder、记录级确认模板上下文”。

本轮聚焦三件事：

1. 给首批链路补固定的试点确认负责人
2. 把 chain runbook 抽成共享 builder
3. 把试点确认模板进入记录级回退/交接上下文

## 本轮修改

### 1. 链路联系人补试点确认负责人

文件：

- `erp-client/src/stores/cutover.ts`
- `erp-client/src/utils/cutover.ts`
- `erp-client/src/views/SettingsView.vue`
- `erp-client/src/views/DashboardView.vue`
- `erp-client/src/components/ModuleWorkbench.vue`
- `erp-client/src/components/CommandPalette.vue`
- `erp-client/src/components/EntityTableView.vue`

本轮新增字段：

- `ChainContacts.pilotConfirmOwner`

同时补齐：

1. 默认负责人矩阵
   - 主数据放行确认负责人
   - 销售放行确认负责人
   - 采购放行确认负责人

2. Settings 交接台可编辑
   - Owner
   - Fallback Owner
   - Rehearsal Owner
   - Pilot Confirmation Owner

3. Dashboard / ModuleWorkbench / CommandPalette / EntityTableView 直接展示确认负责人

意义：

- 试点确认不再是匿名动作，而是固定到负责人
- 放行模板、回退模板、命令面板、工作台、详情页开始共享同一套责任语义
- 更接近开发文档里“运营门槛”和“试点团队确认”的要求

### 2. Chain runbook 抽成共享 builder

文件：

- `erp-client/src/utils/cutover-packets.ts`
- `erp-client/src/views/SettingsView.vue`
- `erp-client/src/components/CommandPalette.vue`

新增共享 builder：

- `buildSharedChainRunbookContent(...)`

本轮把以下入口切换到共享 builder：

1. Settings 链路手册导出
2. Settings 回退演练导出
3. Command Palette 导出链路 runbook

共享 runbook 现在统一包含：

1. 负责人 / 回退负责人 / 演练负责人 / 试点确认负责人
2. 风险快照
3. 证据纪律
4. 操作步骤
5. 放行门槛摘要

意义：

- 链路手册不再由多个页面各自拼接
- 后续补字段时可一处扩、多处复用
- 更符合“优先平台层，减少后续重复改代码”的原则

### 3. 记录级回退 / 交接上下文补确认模板

文件：

- `erp-client/src/components/EntityTableView.vue`

本轮新增：

1. `buildRecordPilotConfirmationTemplate()`
2. 回退包 JSON 的 `cutoverContext.pilotConfirmationTemplate`
3. 交接摘要里的 `Chain Ownership`
4. 交接摘要里的 `Pilot Confirmation Template`
5. 详情页链路责任区显示确认负责人

意义：

- 记录级导出不再只有“负责人 + 阻塞项”，现在还带试点确认模板
- 某条单据在回退或交接时，可以直接带着当前链路的确认骨架走
- Monica 风格的上下文沉淀继续进入真实交接材料，而不是停留在页面展示层

## 验证结果

本轮已执行并通过：

1. `git diff --check`
2. `cd erp-client && npm run build`
3. `cd erp-server && mvn -q -DskipTests compile`
4. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

Smoke 结果：

1. core smoke 通过
2. name-filter smoke 通过
3. core action smoke 通过
4. secondary action smoke 通过
5. secondary module smoke 通过
6. guardrail module smoke 通过
7. platform layer smoke 通过
8. full controller list smoke `42/42` 通过

## 当前价值

这一轮继续把首批切换链往“可运营、可确认、可交接”推进：

1. 首批链路有固定的试点确认负责人
2. chain runbook 开始真正平台化
3. 记录级回退包具备确认模板上下文
4. Dashboard / Settings / 工作台 / 命令面板 / 详情页的责任语义进一步统一

## 下一步

继续优先推进：

1. 把模块级 handbook / rehearsal 导出继续抽成共享 builder
2. 给首批链路补固定的回退负责人联系信息模板
3. 让记录级回退包自动附带链路 runbook 摘要
4. 继续深化销售 / 采购链的下游对象自动聚合
