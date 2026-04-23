# 2026-04-23 治理面板降噪与注意力优先 Round 7

## 本轮目标

把 `Dashboard / Settings` 中最容易把页面拉乱的治理面板收回到“默认少而准”的展示模式，继续服务“快速可用 ERP”的主线，而不是继续堆更多总览卡片。

## 本轮修改

1. 收敛 `erp-client/src/components/FinanceCloseBatchPanel.vue`。
   - 财务关账条目新增注意力优先排序：
     - 阻塞项更多
     - 存在最高风险
     - 最近复核为 `blocked`
     - 尚未有任何复核记录
   - 默认只展示前 `6` 条最需要处理的条目
   - 新增：
     - 紧凑展示提示
     - `展开全部 / 收起`
   - `导出当前视图` 现在只导出当前可见条目，避免用户导出看不见的数据

2. 收敛 `erp-client/src/components/RoleDeskQueuePanel.vue`。
   - 责任桶新增双层优先级：
     - 桶优先按 `blockerCount / rowCount / readyCount`
     - 桶内条目优先按 `missingRoles / checklistBlockers / blockerLabels / blocked / overdue`
   - 默认只展示前 `3` 个责任桶
   - 每个责任桶默认只展示前 `3` 条最紧急待办
   - 桶级和条目级都保留 `展开全部 / 收起`
   - `导出当前视图` 改为与当前可见责任桶和可见条目保持一致

3. 收敛 `erp-client/src/components/PilotBatchActionPanel.vue`。
   - 试点批处理范围新增优先级排序：
     - `critical`
     - `warning`
     - 追溯缺口
     - 是否存在待处理 reminder/top risk
   - 默认只展示前 `5` 个最值得处理的范围
   - 新增紧凑展示提示和 `展开全部 / 收起`

4. 收敛 `erp-client/src/components/PilotRiskStatsPanel.vue`。
   - 风险统计范围新增优先级排序：
     - `critical`
     - `warning`
     - `pendingGateCount`
     - 追溯缺口
     - 已解析最高风险引用
   - 默认只展示前 `5` 个最高风险范围
   - 新增紧凑展示提示和 `展开全部 / 收起`

5. 更新 `VIBECODING_GUIDE.md`，把“治理面板注意力优先展示”升级为明确规则。
   - `Dashboard` 不允许默认展开全部治理范围
   - `Settings` 不允许继续长列表摊平
   - 总览面板统一采用 `attention-first compact mode`
   - 当前视图导出必须与当前可见数据一致

## 验证结果

1. 待本轮代码完成后统一执行：
   - `cd erp-server && mvn -q -DskipTests compile`
   - `cd erp-client && npm run build`
   - `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前价值

1. `Dashboard / Settings` 首屏的信息密度会明显下降
2. 用户先看到的是最值得处理的事项，而不是所有事项
3. 导出语义和页面语义一致，减少误导
4. 主线继续朝“快速可用 ERP”收敛，而不是回到总览页堆卡片

## 下一步

1. 继续压缩 `DashboardView / SettingsView` 上剩余噪音源
2. 继续把主链详情页收口到统一结构
3. 优先补销售、采购、发票、付款的可操作闭环，而不是继续扩治理概念
