# 2026-04-20 22:12:17 CST Cutover Chain Handoff Round

## 本轮目标

继续按照 `VIBECODING_GUIDE.md` 的首批切换主线推进，不再只把回退和演练能力放在单个模块页面，而是把它们提升到“链路级负责人台账”：

- 主数据试点
- 销售链试点
- 采购链试点

本轮重点是让切换设置页本身成为试点负责人可执行的交接入口。

## 本轮修改

### 1. 设置页新增链路交接台

- 修改：
  - `erp-client/src/views/SettingsView.vue`

新增 `Chain Handoff Desk / 链路交接台`，每条首批链路现在直接展示：

- 链路状态：
  - `Ready / 就绪`
  - `Needs Review / 需核对`
  - `Blocked / 阻塞`
  - `Rolled Back / 已回退`
- 负责人：
  - 链路负责人
  - Odoo 回退负责人
  - 演练负责人
- 风险压力：
  - 提醒总数
  - 严重提醒数
  - 警告提醒数
  - 最高风险记录

### 2. 链路级手册和回退演练可导出

每条链路新增导出动作：

- `Export Handbook / 导出手册`
- `Export Rollback / 导出回退`

导出内容包括：

- 生成时间
- 链路状态
- 负责人矩阵
- 涉及模块
- 风险快照
- 最高风险记录
- 操作步骤
- 放行门槛

同时设置页底部新增：

- `Export Chain Runbooks / 导出链路手册`

可一次导出三条首批链路的操作手册和回退演练包。

### 3. 链路级演练入口可直接跳转

链路交接台新增：

- `Open Rehearsal / 打开演练`
- `Top Risk / 最高风险`
- `Rollback Chain / 回退链路`
- `Restore Chain / 恢复链路`

这一步把“设置页开关”提升为“切换负责人工作台”，减少试点扩大前的人工搜索和口头交接。

### 4. 保持和已有模块演练台一致

本轮继续沿用上一轮的深链约定：

- `section=ops-handbook`
- `section=ops-rehearsal`
- `section=workflow`
- `section=traceability`
- `section=timeline`

最高风险记录仍然通过统一提醒规则跳到最可能解决问题的详情区。

## 验证

已执行：

- `cd erp-client && npm run build`
- `cd erp-server && mvn -q -DskipTests compile`

结果：

- 前端构建通过
- 后端编译通过

待最终回归：

- `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前状态

本轮之后，首批切换的“可回退、可交接、可演练”能力进一步收口：

- 首页可以看到首批模块交接台
- 模块页可以导出单模块手册和演练包
- 命令中心可以直达模块手册/演练/最高风险
- 设置页现在可以作为链路级切换负责人台账

这使 `saleOrder -> stockPicking -> accountInvoice`、`purchaseOrder -> accountInvoice -> accountPayment` 和主数据试点更接近可小范围切换状态。

## 追加推进

### 5. 链路联系人改为可编辑并持久化

新增：

- `erp-client/src/stores/cutover.ts`
- `erp-client/src/utils/cutover.ts`

本轮把链路负责人从固定展示升级为可维护台账：

- 链路负责人
- Odoo 回退负责人
- 演练负责人

这些联系人会保存到 Electron 本地 `localStorage`，用于：

- 设置页链路交接台
- 首页切换演练包
- 命令中心链路 runbook

### 6. 命令中心补链路级入口

- 修改：
  - `erp-client/src/components/CommandPalette.vue`

新增链路运维入口：

- 打开主数据链路演练
- 打开销售链演练
- 打开采购链演练
- 导出链路 runbook
- 导出切换配置快照

### 7. 首页切换演练包补负责人信息

- 修改：
  - `erp-client/src/views/DashboardView.vue`

首页导出的首批切换演练包现在会写入：

- 链路负责人
- 回退负责人
- 演练负责人

这样试点交接包不再只是技术状态快照，而是能直接用于实际切换会议和回退演练。

### 8. 设置页支持切换配置导入

- 修改：
  - `erp-client/src/views/SettingsView.vue`
  - `erp-client/src/stores/cutover.ts`

新增能力：

- `Export Config / 导出配置`
- `Copy Config / 复制配置`
- `Import Config / 导入配置`

导入的配置包括：

- 链路开关状态
- 模块覆盖状态
- 链路负责人联系人

这样试点机器之间或不同操作员之间可以更快复用同一套切换配置，而不是手工重新点一遍。

### 9. 模块工作台暴露链路联系人

- 修改：
  - `erp-client/src/components/ModuleWorkbench.vue`

模块工作台的切换横幅现在会直接显示：

- 当前链路
- 当前链路负责人

同时模块手册导出中也包含链路联系人章节，方便单模块交接包直接落地。

### 10. 首页和命令中心继续补联系人动作

- 修改：
  - `erp-client/src/views/DashboardView.vue`
  - `erp-client/src/components/CommandPalette.vue`
  - `erp-client/src/utils/cutover.ts`

新增：

- 首页 `Copy Chain Contacts / 复制链路联系人`
- 命令中心链路级 runbook 导出
- 命令中心切换配置快照导出

这一步把联系人矩阵从“设置页里看得到”推进到“首页和命令中心都能直接调用”。

### 11. 放行门槛台和导入前备份继续补强

- 修改：
  - `erp-client/src/stores/cutover.ts`
  - `erp-client/src/utils/cutover.ts`
  - `erp-client/src/views/SettingsView.vue`
  - `erp-client/src/views/DashboardView.vue`
  - `erp-client/src/components/ModuleWorkbench.vue`
  - `erp-client/src/components/CommandPalette.vue`

新增链路级放行门槛：

- `smokeReady`
- `workbenchReady`
- `rollbackReady`
- `traceabilityReady`
- `manualReady`
- `pilotConfirmed`
- `note`

新增能力：

- 设置页 `Acceptance Gate Desk / 放行门槛台`
- 首页首批放行包导出
- 工作台切换横幅显示链路门槛进度
- 命令中心打开/导出链路门槛包
- 配置快照包含 `chainGateStates`
- 配置导入前自动备份当前切换配置，并可恢复/导出最近备份

这一步把首批切换从“开关启用 + 联系人交接”推进到“是否满足切换门槛可记录、可导出、可回退”。
