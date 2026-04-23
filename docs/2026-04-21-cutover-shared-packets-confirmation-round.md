# 2026-04-21 Cutover Shared Packets Confirmation Round

## 本轮目标

继续按 `VIBECODING_GUIDE.md` 的主线推进，不再让 Dashboard 和 Settings 各自维护一套重复的切换材料逻辑。本轮重点是：

1. 抽共享 cutover packet builder
2. 同步 Dashboard / Settings 的导出能力
3. 补首批试点团队确认模板

这一步继续吸收：

- ERPNext：把运维材料做成可复用、可模板化、可重复导出
- Monica：把负责人、提醒、上下文、证据一起进入交接材料，而不是散落在页面里

## 本轮修改

### 1. 新增共享导出层

文件：

- `erp-client/src/utils/cutover-packets.ts`

新增共享 builder：

1. `buildSharedCutoverBlockerPacket(...)`
2. `buildSharedAcceptancePacket(...)`
3. `buildSharedChainGatePacket(...)`
4. `buildSharedPilotUserManualPack(...)`
5. `buildPilotConfirmationTemplate(...)`

抽象出的共享结构：

- `CutoverPacketChain`
- `CutoverPacketModule`
- `CutoverPressureSummary`

意义：

- Dashboard 和 Settings 不再各写一套几乎相同的放行包/阻塞包/手册逻辑
- 后续再补字段时，只要扩共享 builder，不需要双处同步改
- 更符合开发文档里“优先平台层、减少重复改代码”的要求

### 2. Dashboard 改为复用共享 packet builder

文件：

- `erp-client/src/views/DashboardView.vue`

本轮把这些导出改成复用共享 builder：

1. `buildDashboardBlockerPacket()`
2. `buildDashboardAcceptancePacket()`
3. `buildPilotUserManualPack()`

新增：

1. `dashboardPacketChains()`
2. `dashboardPacketModules()`
3. `exportPilotConfirmationTemplate()`

Dashboard 新增导出按钮：

- `Export Confirmation`

意义：

- 首页继续作为切换指挥台，但底层材料生成不再是一次性字符串拼接逻辑
- 试点负责人可以直接从首页导出确认模板
- 首页和设置页开始共享同一套切换材料语义

### 3. Settings 同步复用共享 packet builder

文件：

- `erp-client/src/views/SettingsView.vue`

本轮新增：

1. `settingsPacketChains()`
2. `settingsPacketModules()`
3. `buildSettingsPilotUserManualPack()`
4. `exportPilotUserManualPack()`
5. `exportPilotConfirmationTemplate()`

并把以下逻辑切换到共享 builder：

1. `buildChainGatePacket(...)`
2. `buildCutoverBlockerPacket()`

Settings 的 Cutover actions 新增按钮：

- `Export User Manual`
- `Export Confirmation`

意义：

- Settings 现在不仅能导出链路手册、门槛包、阻塞包，也能直接导出用户手册和试点确认模板
- Settings 和 Dashboard 的材料字段开始一致，减少后续 drift
- 交接、放行、试点确认逐渐形成固定产物，而不是页面截图或人工整理

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

这一轮的核心价值不是“多了两个按钮”，而是：

1. 切换材料开始平台化
2. Dashboard / Settings 的 cutover 输出语义收敛
3. 首批试点团队确认模板进入系统内建能力
4. 后续加字段时可以一处扩、多处复用

这进一步符合 `VIBECODING_GUIDE.md` 的三条判断规则：

1. 直接帮助首批切换链
2. 减少后续重复改代码
3. 让回退、追溯、验证更清晰

## 下一步

继续优先推进：

1. 把 chain runbook 也抽到共享 builder
2. 给销售/采购链增加更深的自动下游摘要，不只依赖当前记录字段
3. 把试点确认模板挂到记录级回退包上下文中
4. 给首批链路补固定的“试点团队确认负责人”字段
