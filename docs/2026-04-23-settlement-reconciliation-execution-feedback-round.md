# 2026-04-23 结算对账与执行反馈驾驶舱 Round

## 本轮目标

把共享工作台里的“结算 / 对账”和“执行反馈”从概念入口补到模块侧实际可达，避免首批链路继续依赖零散页面和隐式跳转。

## 本轮修改

1. 工作台主干继续补齐
   - `ModuleWorkbench` 已补上 `ops-settlement` 与 `ops-execution-feedback` 两个共享区段。
   - 执行动作行已支持直接打开结算驾驶舱和执行反馈台。
   - 深链滚动与 section 定位继续沿用同一套共享逻辑。

2. 模块侧栏接入共享驾驶舱
   - `accountInvoice` 侧栏接入 `SettlementCockpitPanel`。
   - `accountPayment` 侧栏继续承接 `SettlementCockpitPanel`。
   - `accountMove` 侧栏补入 `SettlementCockpitPanel`，形成未清项 / 已匹配分录 / 凭证追溯的共享入口。
   - `stockPicking` 侧栏承接 `StockExecutionFeedbackPanel`，把 picking 进度与 move 完成度拉回主链界面。

3. 首批工作台快捷入口补强
   - `stockPicking` 新增“执行反馈台”快捷入口，直接深链到 `ops-execution-feedback`。
   - `accountInvoice`、`accountPayment` 的结算快捷入口改为显式打开 `ops-settlement`，不再走模糊的旧入口。
   - `accountMove` 新增一套首批工作台快捷入口，覆盖新建凭证、对账驾驶舱、付款 / 发票返回和证据导出。

4. 命令中心跳转语义收敛
   - 链路级 settlement 命令改为打开 `ops-settlement`，不再落到 `ops-rehearsal`。
   - 模块级 settlement 命令统一改为 `ops-settlement`。
   - `stockPicking` 新增模块级 execution feedback 命令。
   - 财务模块新增更明确的 reconciliation cockpit 命令，减少操作员在追溯台、演练台之间误跳。

5. 财务支撑模块补强
   - `accountMove` 现在也接入首批工作台快捷区、快速入口、ready 摘要、pilot guide、rollback 指引。
   - 这让 `accountMove` 虽然仍属于“已接通但不宜切换”模块，但已具备为销售 / 采购闭环提供财务支撑驾驶舱的能力。

## 验证结果

本轮文档落地时尚未执行构建与 smoke，需在本轮代码批量修改完成后统一执行：

1. `cd erp-server && mvn -q -DskipTests compile`
2. `cd erp-client && npm run build`
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前价值

这一轮直接收敛了三类操作噪音：

1. 结算 / 对账不再散落在演练区、追溯区和列表侧栏之间。
2. 库存执行反馈终于从 `stockPicking` 主界面和共享工作台双向打通。
3. 命令中心、快捷入口、模块侧栏和共享工作台开始对同一套 desk 语义保持一致。

这一步更接近 ERPNext 的共享平台层能力，也更接近 Monica 那种“把上下文固定留在当前对象附近”的工作方式。

## 下一步

1. 统一构建并修正这轮批量改动引入的编译问题。
2. 继续把 `accountInvoice -> accountPayment -> accountMove` 的 settlement / reconciliation 深链做成一条真实闭环。
3. 顺着 `stockPicking` 执行反馈继续补 `move/quant` 回滚一致性与 guardrail 提示。
