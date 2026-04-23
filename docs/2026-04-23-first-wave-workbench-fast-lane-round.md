# 2026-04-23 首批工作台快车道 Round 1

## 本轮目标

- 把 `saleOrder / purchaseOrder / stockPicking / accountInvoice / accountPayment` 从“有专页”继续推进到“有模块专属执行快车道”
- 在共享 `ModuleWorkbench` 上补一层可配置的模块快捷执行区
- 让首批工作台更接近 cutover cockpit，而不是只有通用说明和共享运维面板

## 本轮修改

1. 共享工作台补充模块快车道
   - `erp-client/src/components/ModuleWorkbench.vue`
   - 新增 `cockpitShortcutItems` 配置能力
   - 新增 `模块快车道 / Module Fast Lane` 区块
   - 快捷区支持：
     - 新建草稿
     - 跳转模块
     - 跳转当前工作台 section
     - 打开追溯 / 文档 / 时间轴
     - 打开 Guardrail / Cutover / Closed Loop / Settlement
     - 导出异常包 / 追溯包 / 最高追溯包 / 回退演练包 / 手册
   - 模块手册导出内容同步纳入快捷区动作，便于后续交接

2. 首批工作台新增专属快捷动作定义
   - `erp-client/src/utils/first-wave-workbench-shortcuts.ts`
   - 为以下模块集中定义中英双语快捷动作：
     - `saleOrder`
     - `purchaseOrder`
     - `stockPicking`
     - `accountInvoice`
     - `accountPayment`

3. 五个首批模块页面接入模块快车道
   - `erp-client/src/views/modules/custom/SaleOrdersView.vue`
   - `erp-client/src/views/modules/custom/PurchaseOrdersView.vue`
   - `erp-client/src/views/modules/custom/StockPickingsView.vue`
   - `erp-client/src/views/modules/custom/AccountInvoicesView.vue`
   - `erp-client/src/views/modules/custom/AccountPaymentsView.vue`
   - 各模块现在都具备更贴业务语义的高频入口，例如：
     - 销售：调拨、发票、追溯、合同/报价文档、回退包
     - 采购：收货、账单、付款、供应商证据、采购追溯包
     - 调拨：校验追溯、执行证据、时间轴、上游销售、回退包
     - 发票：付款登记、结算闭环、发票文档、账单追溯包、Guardrail
     - 付款：源发票、凭证、结算追溯、银行凭证、最高追溯包

## 验证结果

- 待本轮统一执行：
  - `cd erp-server && mvn -q -DskipTests compile`
  - `cd erp-client && npm run build`
  - `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前价值

- 首批模块的专用工作台不再只是“通用运维面板 + 表格”
- 真实高频路径开始收敛到每个模块自己的快车道
- 继续贴近文档中的主线要求：
  - 首批切换模块优先
  - 平台层复用
  - cutover / rollback / trace / evidence / handoff 一体化

## 下一步

- 继续把模块快车道和记录详情页的具体动作联动得更深
- 把更多记录级动作继续往 `detailId` 单页模式和 cutover desk 聚合
- 补更多主链 guardrail 与 record-level packet/export 闭环
