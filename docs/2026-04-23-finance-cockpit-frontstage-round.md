# 2026-04-23 财务驾驶舱前台运营层与责任台摘要 Round 6

## 本轮目标

把已经进入共享导出和模块工作台的 finance cockpit 继续推进到真正可点击的 `Dashboard / Settings / Command Palette / Module Workbench` 入口，并继续把 `Role Desk / Finance Batch` 从“服务端治理看板 + 统一同步 + 批量视图导出”推进到“责任 SLA + 财务结果包归档 + accountMove close task 对象化”。

## 本轮修改

1. 扩展 `erp-client/src/utils/cutover-ops.ts` 与 `erp-client/src/stores/cutover-ops.ts`，把两块新台面正式纳入统一操作快照。
   - `CutoverOperationsSnapshot` 新增：
     - `roleDeskTasks`
     - `financeBatchReviews`
   - 新增记录类型：
     - `CutoverRoleDeskTaskRecord`
     - `CutoverFinanceBatchReviewRecord`
   - 新增状态语义：
     - `claimed / blocked / done`
     - `reviewed / blocked / reconciled`
   - 新增标准化与本地持久化逻辑：
     - `normalizeRoleDeskTasks`
     - `normalizeFinanceBatchReviews`
   - 这样 role desk 和 finance batch 的处理记录可以跟随 cutover snapshot 一起保存、导出、回放

2. 在 `erp-client/src/components/RoleDeskQueuePanel.vue` 把责任待办台推进成可操作任务台。
   - 每个 role bucket 里的 scope 现在都能直接：
     - `Claim`
     - `Block`
     - `Done`
   - 记录维度包含：
     - `scopeType`
     - `scopeKey`
     - `roleKey`
     - `roleLabel`
     - `owner`
     - `updatedBy`
   - 每条 scope 头部会展示最近一次责任任务记录，避免角色处理痕迹只留在聊天或备注里

3. 在 `erp-client/src/components/FinanceCloseBatchPanel.vue` 把财务批量台推进成可回查复核台。
   - 每条 scope 现在都能直接：
     - `Reviewed`
     - `Block`
     - `Reconcile`
   - `Reconcile` 会先写入一条 `reconciled` 记录，再跳到 `accountMove -> ops-settlement`
   - 每条 scope 同样展示最近一次财务复核记录

4. 扩展切换快照兼容层 `erp-client/src/utils/cutover.ts`。
   - `parseCutoverConfigSnapshot` 现在会把新记录数组一并带回
   - `summarizeCutoverConfigSnapshot` 新增：
     - `Role Desk Tasks`
     - `Finance Batch Reviews`
   - 这样共享快照不再只知道 drill / signoff / export，也知道责任台和财务批量台的实际处理进度

5. 扩展 `erp-client/src/views/SettingsView.vue` 的治理统计与闭环台账。
   - `Export Closed-Loop Ledger` 现在新增：
     - `Role Desk Tasks`
     - `Finance Batch Reviews`
   - `Local Review State` 卡片新增：
     - `Role Tasks`
     - `Finance Reviews`
   - 本地治理状态不再只统计 reminder triage，也开始覆盖责任任务和财务复核动作

6. 新增服务端治理看板接口与汇总 DTO。
   - 后端新增：
     - `CutoverOpsBoardDto`
     - `CutoverRoleTaskSummaryDto`
     - `CutoverFinanceReviewSummaryDto`
   - `CutoverOpsController` 新增：
     - `GET /system/cutover-ops/board`
   - 现有列表接口增加过滤参数：
     - role desk: `status / owner / keyword`
     - finance batch: `status / updatedBy / keyword`
   - `CutoverOpsRecordService` 现在不仅能保存和列出记录，还能返回：
     - 服务端最近治理记录
     - 状态分布
     - 角色分布 / 责任人分布
     - 财务复核人分布 / 范围分布

7. 在 `erp-client/src/stores/cutover-ops.ts` 增加服务端治理同步层。
   - 新增状态：
     - `roleDeskSummary`
     - `financeBatchSummary`
     - `serverSyncing`
     - `serverSyncedAt`
     - `serverSyncError`
   - 新增能力：
     - `syncServerBoard()`
     - `roleDeskHistoryFor(...)`
     - `financeBatchHistoryFor(...)`
   - 设计选择：
     - 服务端记录同步采用“合并入本地”而不是简单覆盖
     - 保留离线 fallback，避免桌面端短时离线时把未保存治理动作冲掉

8. 在 `RoleDeskQueuePanel.vue` 和 `FinanceCloseBatchPanel.vue` 落地桌面治理面板增强。
   - 两块面板都新增：
     - 打开即同步服务端治理看板
     - 搜索过滤
     - `只看需关注`
     - `导出当前视图`
     - 同步时间 / 服务端总数 / 阻塞或已对账计数
   - 每条 scope banner 现在会显示：
     - 最近记录
     - 操作人
     - 时间
     - 历史记录数量
   - 结果：
     - role desk / finance batch 不再只是单条记录器，而开始具备服务端共享协作面的基本形态

9. 继续把责任台推进到可追责的 SLA 语义。
   - 数据库迁移 `V26__cutover_ops_sla_bundle_close_tasks.sql` 为 `sys_cutover_role_task` 新增：
     - `assignee_name`
     - `due_at`
     - `sla_status`
   - 后端 `CutoverRoleTaskDto / SummaryDto` 增加：
     - `assignee`
     - `dueAt`
     - `slaStatus`
     - `assigneeCounts`
     - `slaCounts`
   - 前端 `RoleDeskQueuePanel.vue` 新增：
     - `Assign 4h`
     - `Reassign 24h`
     - 最近任务展示 `Assignee / Due At / SLA`
     - 面板总览显示 `Overdue`
   - 当前设计取向：
     - 先把桌面端责任动作从“认领/阻塞/完成”推进到“可指派、可转派、可看到超时”
     - 还没有做完整 SLA 策略中心，但已经形成第一层责任纪律

10. 新增财务结果包归档对象，开始把 finance batch 的导出结果落成服务端记录。
    - 新增表：
      - `sys_cutover_finance_result_pack`
    - 新增 API：
      - `GET /system/cutover-ops/finance-result-packs`
      - `POST /system/cutover-ops/finance-result-packs`
    - `FinanceCloseBatchPanel.vue` 在导出：
      - 单条 row packet
      - 当前面板可见批量包
      时会优先归档到服务端，失败再回退到本地 store
    - `cutover ops board` 新增：
      - `financeResultPacks`
      - `financeResultPackSummary`
    - 价值：
      - 财务批量台开始具备“不是只下载文件，而是系统知道你导出了什么治理包”的语义

11. 新增 `close task` 服务端对象，并把 `accountMove` 的关账重点下沉成明确任务。
    - 新增表：
      - `sys_cutover_close_task`
    - 新增 API：
      - `GET /system/cutover-ops/close-tasks`
      - `POST /system/cutover-ops/close-tasks`
    - 新增 `CloseTaskPanel.vue`
      - 当前先挂到 `AccountMovesView.vue`
      - 内置四类任务：
        - `reconcile-open-items`
        - `reverse-safety`
        - `journal-item-review`
        - `source-anchor-check`
      - 每类任务支持：
        - `Open`
        - `In Progress`
        - `Blocked`
        - `Done`
        - 导出任务包
    - 这是把 `accountMove` 从“只有入口和语义摘要”推进到“有明确 close task 对象”的第一步

12. 扩展 cutover snapshot 兼容层与共享 store。
    - `CutoverOperationsSnapshot` 新增：
      - `financeResultPacks`
      - `closeTasks`
    - `useCutoverOpsStore` 新增：
      - `financeResultPacks`
      - `closeTasks`
      - `financeResultPackSummary`
      - `closeTaskSummary`
      - 对应 `latest / history / upsert / add / sync`
    - `summarizeCutoverConfigSnapshot` 也开始统计：
      - `Finance Packs`
      - `Close Tasks`

13. 把 `role task / close task` 正式接进统一 Reminder feed。
    - `ReminderService.java` 新增：
      - `role_task_overdue`
      - `role_task_due_soon`
      - `close_task_blocked`
      - `close_task_stale`
    - 当前只先接：
      - `scope_type = module` 的责任台任务
      - `scope_type = module` 的 close task
    - 目的：
      - 让治理压力不再只存在于单独面板和汇总 DTO
      - 直接进入和普通证据缺口/时间线缺口同一条桌面提醒链

14. 收敛 `Dashboard / Settings` 的首屏治理摘要，减少页面“满屏都是指标卡”的噪音。
    - `DashboardView.vue`
      - 把原来的长列表指标拆成两组：
        - `核心切换态势`
        - `治理对象`
      - 新接入：
        - `overdueRoleTasks`
        - `riskRoleTasks`
        - `financeResultPacks`
        - `closeTasks`
        - `blockedCloseTasks`
    - `SettingsView.vue`
      - 把 `Rollback Closed Loop` 摘要拆成两组：
        - `闭环态势`
        - `治理压力`
      - 结果：
        - 页面不再把回退闭环、责任 SLA、财务关账对象全部摊平成一排
        - 首屏扫描负担明显降低

15. 接通治理提醒的前端跳转，不再让新提醒成为“只能看、不能进”的静态数字。
    - `ReminderSummaryPanel.vue`
      - 责任超时提醒现在会直接跳到 `Settings -> roleDesk`
      - close task 类提醒会直接跳到模块治理分区
    - `ActivityCenter.vue`
      - 同样补齐上述跳转逻辑
    - `utils/reminders.ts`
      - 为治理提醒补上 `Governance Pressure / 治理压力` 族别文案
      - 为 role/close task 指定更合理的 section 目标

16. 继续推进“统一详情页”主线，把一批已知 ID 的跳转从 `focusField/focusValue` 改成 `detailId`。
    - `EntityTableView.vue`
      - 关系对象跳转
      - 子表首行跳转
      - 上下文 chip
      - relation links
      - `openResolvedLink(...)` 兼容层
    - `CommandPalette.vue`
      - 最近对象
      - 快速动作后的返回对象
      - 最高风险对象
    - `ReminderSummaryPanel.vue`
      - 当前记录提醒跳转
    - `ModuleWorkbench.vue`
      - 子工作台回父记录
    - 当前价值：
      - 已知对象不再被重新丢回列表检索态
      - “点击对象就是进对象详情”这条主路径开始稳定

17. 继续推进“页面收敛”主线，把主链详情页从“什么都展示”收回到“默认展示最关键的动作和证据入口”。
    - `EntityTableView.vue`
      - 清空剩余 `focusField = id` 的历史跳转残留
      - `Chain Action Deck` 默认只展示高优先动作
      - `Exception Desk` 默认只展示高价值异常动作
      - 主链对象的 `linkedDocuments / linkedRelations` 不再重复摊开，优先收敛到 `Document Hub / Traceability Center`
    - 当前价值：
      - 销售 / 采购 / 发票 / 付款 / 调拨详情页更接近“可操作工作台”，而不是“信息堆叠页”
      - 已知对象统一直达详情后，页面跳转噪音和重复入口进一步下降

18. 继续推进“线性工作台导航”主线，把跨模块入口从“裸跳转”收敛成“带 section / relatedTo / chainKey 的目标工作区跳转”。
    - `ModuleWorkbench.vue`
      - 统一通过共享导航构造器补齐默认落点 section
      - 主链工作台跳到别的模块时默认保留 `relatedTo`
      - 首批切换链继续保留 `chainKey`
    - `first-wave-workbench-shortcuts.ts`
      - 销售 / 采购 / 发票 / 付款 / 调拨 / 伙伴快车道统一落到正确工作区
    - `SysScriptsView.vue`
      - guardrail 往返模块不再裸跳
      - 默认回到 `ops-guardrails / ops-evidence`
    - `CommandPalette.vue`
      - 打开模块 / 新建 / 最近对象 / 时间轴 / 运营台入口复用同一套工作台导航规则
    - `CloseTaskPanel.vue`
      - chain 范围下的关账任务继续带上 `chainKey`
    - `DashboardView / SettingsView / ActivityCenter / ReminderSummaryPanel / PilotReviewQueuePanel`
      - 总览页、侧栏提醒和审核队列统一复用共享导航构造器
      - 打开对象和打开工作区不再各写一套 query 语义
    - 当前价值：
      - 用户从一个模块跳到另一个模块时，不再先落到噪音最大的页头区域
      - 销售链 / 采购链 / 主数据链开始具备更稳定的“线性前进感”
      - 后续继续收敛页面时，不需要再在每个页面手工修一遍跳转语义

## 当前价值

1. 责任治理已经从“服务端任务表 + 面板同步”推进到“可指派、可转派、可看到 SLA 超时”。
2. 财务关账已经从“服务端复核记录 + 批量视图导出”推进到“结果包可归档、系统可统计导出资产”。
3. `accountMove` 首次拥有明确的 `close task` 对象，不再只靠 `trace / settlement / reconcile` 入口描述会计闭环。
4. `cutover snapshot` 和服务端独立表进一步对齐，治理记录从 review/task 扩展到 `result pack / close task`。
5. 这一步更接近成熟 ERP 常见的 close cockpit / responsibility desk / audit package 语义，而不只是可演示的工作台。
6. 首页和设置页开始从“功能堆叠”回收为“核心态势 + 治理对象”双层结构，这对后续页面收敛非常关键。
7. 治理提醒已经进入统一桌面提醒链，责任 SLA 和关账阻塞不再只存在于孤立面板。
8. `EntityTableView` 已经清空主文件内所有 `focusField = id` 老跳转，已知对象统一改为 `detailId` 直达详情页。
9. 主链详情页开始执行“默认少而准”策略，最常用动作被保留，重复关系卡和次级导出入口开始回收到专门区域。
10. 模块工作台、命令中心、关账任务和 guardrail 页面开始共享同一套跨模块导航规则，目标工作区落点更稳定。

## 当前仍然欠缺

1. 责任台虽然已经有 `assign / reassign / overdue / SLA` 第一层语义，但还没有可配置 SLA 规则中心和提醒调度。
2. 财务结果包虽然已经能归档，但还没有批量差异清单、版本比较和责任签收链。
3. `accountMove` 虽然已经有 close task 对象，但只覆盖第一层任务，还没有把 invoice/payment/move 的跨对象任务自动串联。
4. 当前服务端治理看板仍是轻量聚合，还没有独立审计评论、附件挂接、提醒升级链和权限约束。
5. role desk / finance batch / close task / rollback / signoff 之间还没有自动 guardrail 联动规则和切换拦截。
6. Dashboard / Settings 虽然已经开始收敛，但模块详情页和通用表单页的层级仍然偏乱，还需要继续把“列表页 / 详情页 / 治理侧栏”彻底分层。
7. 当前详情页虽然已经开始压缩重复入口，但还没有彻底形成“主链对象专用工作台优先、共享卡片次之、导出工具最后”的稳定秩序。
8. 部分非主链模块和少数历史入口仍未完全接入新的共享导航构造器，仍有零星裸跳模块的风险。

## 下一步

1. 给 role desk 增加可配置 SLA 策略和超时提醒扫描，而不是只在 UI 上显示超时状态。
2. 给 finance batch 增加批量差异清单、归档包签收和结果包版本对比。
3. 把 `accountMove` close task 继续扩到 `accountInvoice / accountPayment / accountMove` 三对象协同任务。
4. 把 role desk / finance batch / close task 的结果继续反写到 rollback / signoff / exception export 闭环记录里。
5. 开始把服务端治理看板与 guardrail / cutover switch / rollback 文档联动起来。
6. 继续把 `EntityTableView / ModuleWorkbench / Detail Page` 的信息架构收敛，优先解决“页面很乱”的根问题。
7. 继续把销售 / 采购 / 发票 / 付款 / 调拨的详情页做成真正的线性工作台，减少同屏并列区域数量。
8. 把更多历史入口接入共享导航构造器，直到“打开模块、打开对象、打开治理工作区”三类动作完全一致。

## 验证结果

1. 本轮代码已完成，尚未执行新的统一构建验证。
2. 下一步必须统一执行：
   - `cd erp-client && npm run build`
   - `cd erp-server && mvn -q -DskipTests compile`
   - `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
