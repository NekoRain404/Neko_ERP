# 2026-04-23 Dashboard / Settings / Command Close Round

## 本轮目标

- 把 `role + close cockpit` 从单个工作台能力升级为首页、设置页、命令中心共享语义
- 把 `ops-close` 深链接到更多入口，减少切换演练时的跳转损耗
- 让 `Dashboard`、`Settings`、`CommandPalette` 对“关账就绪 / 关账阻塞”使用同一套判断口径

## 本轮修改

1. 共享 close 语义
   - 新增 `erp-client/src/utils/cutover-close.ts`
   - 抽出：
     - `buildAggregateClosedLoopSummary`
     - `buildCutoverCloseSummary`
   - 统一把以下因素合并为一个 close snapshot：
     - gate pending
     - settlement issue
     - financial trace issue
     - closed-loop evidence gap
     - reminder blocker count

2. `ModuleWorkbench` 对齐共享 close 语义
   - `erp-client/src/components/ModuleWorkbench.vue`
   - 模块级 closed-loop 聚合和 close summary 不再在页面内重复拼装
   - `ops-close` 的模块总览继续保留，但判断逻辑改为共享 util

3. `Dashboard` 升级为 close cockpit 入口
   - `erp-client/src/views/DashboardView.vue`
   - 链路卡片新增：
     - `Close Snapshot`
     - `Close Desk`
     - `Close Summary`
   - 模块交接卡新增：
     - 关账状态 badge
     - 关账说明行
     - `Close Desk`
     - `Close Summary`
   - 顶部指标新增：
     - `Close Ready`
     - `Close Blockers`

4. `Settings` 新增真正的 `Role + Close Desk`
   - `erp-client/src/views/SettingsView.vue`
   - 新增一个独立 section：`close`
   - 内容包括：
     - 统一 close summary 卡片
     - 链路级责任与关账卡
     - 模块级关账卡
     - 深链到 `ops-close`、`Closed Loop Desk`、文档与时间轴
   - `handoff` 和 `gates` 入口也补了直达 close desk 的动作

5. `CommandPalette` 升级为关账动作中心
   - `erp-client/src/components/CommandPalette.vue`
   - 新增全局命令：
     - `Open Role + Close Desk`
   - 新增链路命令：
     - `Open {Chain} Close Desk`
   - 新增模块命令：
     - `Open {Module} Close Desk`
   - 对禁用模块会回落到设置页 close section

6. 切换设置路由能力扩充
   - `erp-client/src/utils/cutover.ts`
   - `resolveCutoverSettingsQuery` 新增 `section: 'close'`

## 验证结果

- 待本轮统一执行：
  - `cd erp-server && mvn -q -DskipTests compile`
  - `cd erp-client && npm run build`
  - `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前价值

- 首页不再只是散列指标，而是具备统一关账语义的 pilot cockpit
- 设置页不再只有 handoff / gates / rollback 三段割裂视图，而是多了真正可执行的责任与关账台
- 命令中心开始接近 ERPNext 式动作台 + Monica 式上下文驾驶舱，而不是仅做模块跳转

## 下一步

- 继续把 `close cockpit` 结果导出到关账包、切换包、日报摘要
- 继续补 `settlement / reconciliation` 主线
- 继续补 `stock picking` 执行反馈和异常回写
