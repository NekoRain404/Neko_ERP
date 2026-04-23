# 2026-04-23 Dashboard 与 Settings 总览收敛 Round 8

## 本轮目标

继续沿着“快速可用 ERP”主线，收掉首页和设置页里最影响可用性的两个噪音源：

1. 首页头部动作墙
2. `Dashboard / Settings` 中连续平铺的重型治理面板

目标不是再加能力，而是让当前已有能力更容易被企业用户扫描和使用。

## 本轮修改

1. 收敛 `erp-client/src/views/DashboardView.vue` 的头部动作区。
   - 头部动作拆成两层：
     - 常驻主动作：
       - 演练包
       - 放行包
       - 打开责任台
       - 打开财务批量台
       - 打开切换设置
       - 导入配置
     - 次级打包动作：
       - blocker / control / role queue / finance batch
       - rollback drill / trace bundle
       - guardrail / manual / confirmation
       - pending gates / config / contact matrix / exceptions
   - 次级动作默认收起，通过 `展开更多打包动作` 进入
   - 这样首页不再一上来就是一堵动作墙

2. 收敛 `DashboardView.vue` 的链路总览。
   - 新增链路优先级排序：
     - 是否启用
     - `critical`
     - `warning`
     - `pendingLabels`
     - `blockerLabels`
   - 默认只展示前 `2` 条最高压力链路
   - 其余链路通过 `展开全部链路` 查看

3. 收敛 `DashboardView.vue` 的模块交接台。
   - `Operator Handoff Desks` 默认收起
   - 先显示紧凑摘要：
     - 阻塞台面数
     - 严重台面数
     - 警告台面数
   - 用户需要时再展开完整模块交接台网格

4. 收敛 `DashboardView.vue` 的治理面板区。
   - 首页默认继续显示：
     - `PilotReviewQueuePanel`
     - `PilotRiskStatsPanel`
   - 以下重型治理台改成摘要卡 + 按需展开：
     - `PilotBatchActionPanel`
     - `RoleDeskQueuePanel`
     - `FinanceCloseBatchPanel`
   - 新增 `Governance Desks` 摘要卡，首页先展示数量和说明，再决定是否展开完整台面

5. 收敛 `erp-client/src/views/SettingsView.vue` 的 cutover 治理区。
   - 新增统一 `desk-summary-grid`
   - 给以下重型台面增加摘要卡与展开状态：
     - `roleDesk`
     - `financeBatch`
     - `riskStats`
     - `batchReview`
     - `closedLoopRows`
   - 默认行为：
     - `roleDesk` 展开
     - `financeBatch` 展开
     - `riskStats` 收起
     - `batchReview` 收起
     - `closedLoopRows` 收起
   - 这样设置页不再把所有治理台一次性摊成一条长页

6. 收敛 `SettingsView.vue` 的 `Rollback Closed Loop` 明细。
   - 摘要卡和闭环态势继续常驻
   - 链路级 rollback closed-loop 明细默认收起
   - 只有需要记录演练、签收或导出异常时才展开完整链路卡

7. 更新 `VIBECODING_GUIDE.md`。
   - 明确：
     - Dashboard 头部动作必须分主次两层
     - Dashboard 默认只保留核心治理面板
     - Settings cutover 重型治理台必须先过摘要卡
     - Closed-loop 长链路明细默认收起

## 验证结果

1. 待本轮代码完成后统一执行：
   - `cd erp-server && mvn -q -DskipTests compile`
   - `cd erp-client && npm run build`
   - `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前价值

1. 首页扫描速度更快
2. 设置页 cutover 大区不再像无限下拉的治理长页
3. 企业用户先看到主路径和最高风险，而不是所有治理动作同时展开
4. 已有治理能力保留，但不再破坏“快速可用 ERP”的主线

## 下一步

1. 继续压缩 `chain handoff / gate / close` 三大长列表的默认信息密度
2. 继续统一主链详情页结构
3. 优先补销售、采购、发票、付款对象的直接可操作闭环
