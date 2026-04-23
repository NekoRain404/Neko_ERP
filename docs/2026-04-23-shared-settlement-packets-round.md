# 2026-04-23 共享结算闭环包 Round 1

## 本轮目标

把首批链路里的“结算闭环”从记录详情页能力继续下沉到共享切换层，避免结算语义只存在于单条记录页面，导致切换包、门槛包、异常包、回退包和工作台动作中心看不到同一套结算状态。

## 本轮修改

1. 在 `erp-client/src/utils/first-wave-settlement.ts` 新增首批模块 / 链路级结算摘要工具。
   - 提供 `buildModuleSettlementSummary`
   - 提供 `buildChainSettlementSummary`
   - 把销售、采购、发票、付款、出入库链上的结算关键步骤统一成共享摘要

2. 在 `erp-client/src/utils/cutover-control.ts` 把结算闭环接入共享控制数据。
   - `buildCutoverPacketChains` 输出 `settlementLabel / settlementMissingLabels / settlementWarningLabels / settlementLines`
   - `buildCutoverPacketModules` 输出模块级结算摘要
   - `buildCutoverControlModules` 输出模块压力面的结算摘要

3. 在 `erp-client/src/utils/cutover-packets.ts` 把结算闭环接入共享文档包。
   - 阻塞包
   - 放行包
   - 链路门槛包
   - 链路操作手册 / 回退演练内容
   - 试点用户手册
   - 试点确认模板
   - 模块手册
   - 模块演练摘要
   - 模块门槛包
   - 模块异常包
   - 切换控制包
   - 首批切换演练包

4. 在 `erp-client/src/utils/cutover-protection.ts` 把结算闭环接入共享回退演练包。
   - 链路回退范围现在同时输出闭环状态和结算闭环状态
   - 模块开关快照现在同时输出证据要求和结算闭环摘要

5. 在 `erp-client/src/components/ModuleWorkbench.vue` 把结算闭环接回模块工作台。
   - 为每条关联链路计算结算摘要
   - 为当前模块计算模块级结算摘要
   - 新增 `buildModuleSettlementLines`
   - 把结算闭环接入模块手册、门槛包、演练摘要、异常包、回退演练包、证据纪律包
   - 新增“补齐结算闭环”执行动作，让工作台能直接暴露结算缺口，而不是只导出文本

## 验证结果

1. `cd erp-server && mvn -q -DskipTests compile`
   - 通过

2. `cd erp-client && npm run build`
   - 通过

3. `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 通过
   - core smoke 通过
   - name-filter smoke 通过
   - core action smoke 通过
   - secondary action smoke 通过
   - secondary module smoke 通过
   - guardrail module smoke 通过
   - platform smoke 通过
   - all-list smoke `42/42` 通过

## 当前价值

1. 结算闭环不再只依赖详情页，已经进入共享切换治理层。
2. 销售 / 采购 / 发票 / 付款主链在 cutover、rollback、handoff、exception 这些高频协作文本里有了统一结算语义。
3. 模块工作台现在可以直接暴露“结算缺口”，更接近 ERPNext 的刚性主链控制，也更接近 Monica 式“持续跟进而不是只看交易结果”的操作体验。

## 下一步

1. 继续把结算闭环扩到 `Dashboard / Settings / Command Palette` 的直接操作入口和摘要卡片。
2. 开始补首批链路的 payment linkage / reconciliation / source trace 组合视图。
3. 继续把切换保护层做深，补模块开关、回退入口和 guardrail 的联动提示。
