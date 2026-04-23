# 2026-04-23 财务驾驶舱摘要主线 Round 1

## 本轮目标

把首批主线里已经具备的结算闭环、付款联动、财务追溯、回退保护语义继续收敛成一层统一的“财务驾驶舱摘要”，避免这些信号散落在不同工作台、不同导出文本和不同模块里，导致切换前无法快速判断销售链、采购链、发票、付款、凭证的财务闭环是否真的可控。

## 本轮修改

1. 在 `erp-client/src/utils/cutover-finance-cockpit.ts` 新增共享财务驾驶舱摘要工具。
   - 提供 `supportsFinanceCockpitModule`
   - 提供 `supportsFinanceCockpitChain`
   - 提供 `buildModuleFinanceCockpitSummary`
   - 提供 `buildChainFinanceCockpitSummary`
   - 将 `accountInvoice / accountPayment / accountMove` 以及 `sales / purchase` 的财务主线统一归纳为共享摘要

2. 在 `erp-client/src/utils/cutover-control.ts` 把财务驾驶舱接入切换治理层。
   - `buildCutoverPacketChains` 现在输出链路级 `financeCockpitLabel / financeCockpitLines`
   - `buildCutoverPacketModules` 现在输出模块级财务驾驶舱摘要
   - `buildCutoverControlModules` 现在输出模块压力面的财务驾驶舱摘要

3. 在 `erp-client/src/utils/cutover-packets.ts` 把财务驾驶舱接入共享导出体系。
   - 阻塞包
   - 放行包
   - 链路门槛包
   - 链路操作手册 / 回退演练
   - 试点用户手册
   - 试点确认模板
   - 模块手册
   - 模块演练摘要
   - 模块门槛包
   - 模块异常包
   - 控制包
   - 首批切换演练包
   - 同时把模块压力摘要里的财务驾驶舱状态提升到主摘要行，而不是只藏在附加 section 里

4. 在 `erp-client/src/utils/cutover-protection.ts` 把财务驾驶舱接入共享回退演练包。
   - 回退演练包的模块快照现在直接展示 `Finance Cockpit`
   - 模块级回退判断不再只看结算和追溯，而是同时纳入财务驾驶舱统一语义

5. 在 `erp-client/src/components/ModuleWorkbench.vue` 把链路级财务驾驶舱真正接到模块工作台。
   - 每条关联链路现在单独计算 `financeCockpitSummary`
   - 新增 `buildChainFinanceCockpitLines`
   - 模块级财务驾驶舱明细现在会附带链路级 trace record 和 blocker 提示
   - 模块回退演练包中的链路行现在使用链路自己的财务驾驶舱摘要，不再误用模块级摘要
   - 模块门槛包中的链路行现在使用链路自己的财务驾驶舱摘要和 blocker
   - 模块演练摘要中的 gate pressure 现在附带 `Finance Cockpit`
   - 模块异常包中的 blocker lines 现在附带 `Finance Cockpit`
   - 门槛操作台卡片现在直接显示链路级 `Finance Cockpit`
   - 结算 / 对账台和付款联动台顶部新增摘要卡片，直接展示财务驾驶舱、结算闭环、财务追溯和 blocker 关键信息

## 验证结果

1. `cd erp-client && npm run build`
   - 已通过

2. `cd erp-server && mvn -q -DskipTests compile`
   - 本轮待执行

3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 本轮待执行

## 当前价值

1. “财务驾驶舱”不再只是概念描述，已经成为切换治理层的一等语义对象。
2. 销售链 / 采购链 / 发票 / 付款 / 凭证现在能在共享控制包、回退演练包、门槛包和工作台顶部看到同一套财务闭环判断结果。
3. 模块工作台对 `settlement / payment linkage / financial trace / blocker` 的聚合更接近 ERPNext 式刚性主链控制，也更接近 Monica 式持续跟进和上下文记忆，而不是只在单条交易上点状修补。

## 当前仍然欠缺

1. `Dashboard / Settings / Command Palette` 虽然已经能导出财务驾驶舱语义，但前台可视摘要还不够强。
2. `accountMove` 侧的 reconcile / open item 解释虽然进入摘要，但还没有形成更细的操作面板。
3. `saleOrder -> accountInvoice -> accountPayment -> accountMove` 与 `purchaseOrder -> accountInvoice -> accountPayment -> accountMove` 两条财务收口链还缺少更明确的 cutover gate 联动动作。

## 下一步

1. 继续把财务驾驶舱摘要显式露出到 `Dashboard / Settings / Command Palette` 的摘要卡和动作入口。
2. 继续补 `accountMove` 的对账压力解释、open item 语义和 reverse-safe guardrail。
3. 把销售链 / 采购链的财务收口动作继续下沉为更明确的切换门槛和回退动作。
