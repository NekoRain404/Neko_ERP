# 2026-04-22 首批链路驾驶舱与异常兜底 Round 1

## 本轮目标

- 把首批切换模块的结果对象、下一步动作、追溯入口和核对入口收拢到详情页同一层。
- 修掉详情页和快捷动作在服务端失败时容易冒出未处理前端异常的问题。

## 本轮修改

### 前端详情工作台

- 在 `erp-client/src/components/EntityTableView.vue` 新增首批链路驾驶舱：
  - `resPartner`
  - `saleOrder`
  - `purchaseOrder`
  - `accountInvoice`
  - `stockPicking`
  - `accountPayment`
- 新增结果对象轨道：
  - 直接打开已有结果对象
  - 缺结果对象时直接给出下一步动作
  - 仍不满足条件时直接引导到 `workflow / traceability / documents / review`
- 新增链路摘要卡：
  - 当前门禁
  - 结果对象包
  - 下一步
  - 未处理风险
  - 证据信号
  - 可执行项
- 在详情页导航芯片中加入 `链路驾驶舱` 入口。

### 前端异常兜底

- 为 `EntityTableView.vue` 补充服务端失败降级：
  - `loadData`
  - `openDetailPage`
  - `syncDetailRoute`
  - `handleTimelineUpdated`
  - `saveActiveRow`
  - `removeActiveRow`
  - `handleAction`
- 详情页打开时改成 `Promise.allSettled`，避免子表、文档或提醒接口其中一个失败就把整张详情页带崩。
- 删除确认取消时直接返回，不再把取消当成异常抛出。
- 为 `CommandPalette.vue` 的最近记录快捷动作补充 `try/catch`，避免服务端动作失败时前端抛未处理异常。

## 验证结果

- 本文档编写时尚未执行构建与 smoke。
- 下一步需要统一执行：
  - `cd erp-server && mvn -q -DskipTests compile`
  - `cd erp-client && npm run build`
  - `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前价值

- 首批切换链从“已有逻辑但分散”变成“结果对象和动作显式聚合”。
- 运营人员可以更快完成：
  - 结果对象回查
  - 下一步动作判断
  - 文档/时间轴/核对台跳转
- 服务端异常不再更容易放大成前端未处理异常，详情页韧性更高。

## 下一步

- 继续把销售链、采购链的结果对象核对和回退核对做成更明确的交接包。
- 补切换门槛与模块开关在记录级的可见性。
- 统一构建、全量 smoke、中文 commit。
