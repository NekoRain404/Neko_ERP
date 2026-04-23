# 2026-04-23 财务追溯后端驾驶舱 Round 1

## 本轮目标

- 把 `accountInvoice / accountPayment / accountMove` 的财务追溯从前端静态摘要下沉到后端真实聚合接口。
- 让财务工作台可以直接看到来源锚点、付款链接、凭证引用、对账上下文、附件和便签证据的真实风险分布。
- 继续贴合 `VIBECODING_GUIDE.md` 的主线，优先加硬结算闭环、payment linkage、source anchor、journal trace 和 reconciliation context。

## 本轮修改

### 1. 后端新增财务追溯驾驶舱接口

- 新增 `GET /account/financial-trace/cockpit`
- 新增 DTO:
  - `AccountFinancialTraceCockpitDto`
  - `AccountFinancialTraceRecordDto`
- 新增服务:
  - `AccountFinancialTraceService`
- 新增控制器:
  - `AccountFinancialTraceController`

当前接口已支持按模块返回真实聚合摘要：

1. `accountInvoice`
   - 检查 `originRef`
   - 检查 `paymentRef / paymentState`
   - 聚合 `ir_note / ir_attachment / ir_logging`
   - 输出缺失项:
     - `origin-ref`
     - `payment-linkage`
     - `payment-state-open`
     - `billing-evidence`

2. `accountPayment`
   - 检查 `invoiceRef`
   - 检查 `originRef`
   - 检查 `journalEntryRef`
   - 聚合 `ir_note / ir_attachment / ir_logging`
   - 输出缺失项:
     - `invoice-ref`
     - `source-anchor`
     - `journal-entry`
     - `payment-proof`
     - `posting-pending`

3. `accountMove`
   - 检查 `ref / reversedFromRef`
   - 统计 `account_move_line`:
     - `lineCount`
     - `matchedLineCount`
     - `openLineCount`
   - 检查 `ext_data.reconcileContext`
   - 聚合 `ir_note / ir_attachment / ir_logging`
   - 输出缺失项:
     - `source-explanation`
     - `journal-lines`
     - `reconcile-open-items`
     - `reconcile-context`
     - `journal-evidence`

### 2. 前端接入真实驾驶舱

- 新增 API:
  - `erp-client/src/api/financial-trace.ts`
- 增强组件:
  - `erp-client/src/components/FinancialTracePanel.vue`

接入策略：

1. 对 `accountInvoice / accountPayment / accountMove`
   - 优先读取后端真实驾驶舱摘要
   - 直接展示风险记录卡片
   - 展示模块级真实计数:
     - 已审记录
     - 已就绪
     - 风险记录
   - 展示真实证据聚合:
     - 附件总数
     - 备注总数
     - 日志总数

2. 对其他模块
   - 继续复用 reminder 驱动的共享财务追溯摘要
   - 不打散当前主线

### 3. 财务工作台语义补强

- 更新:
  - `AccountInvoicesView.vue`
  - `AccountPaymentsView.vue`
  - `AccountMovesView.vue`

本轮把“后端真实驾驶舱已接通”的语义直接挂到工作台说明中，避免页面文案继续停留在“未来再做”的状态。

## 验证结果

已执行并通过：

1. `cd erp-server && mvn -q -DskipTests compile`
2. `cd erp-client && npm run build`
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

关键结果：

- 后端编译通过
- 前端构建通过
- smoke 全绿
- `all-list-smoke` 42 endpoints 通过
- 平台层 smoke 继续通过，未破坏 `ext_data / sys_script / timeline / reminder / attachment`
- action smoke 继续通过，未破坏 `accountInvoice.register_payment / accountPayment.action_post / accountMove.action_reconcile`

## 当前价值

这轮完成后，财务追溯不再只是：

1. 前端根据 reminder 家族做的静态推断
2. 零散存在于记录详情页里的局部判断

而是开始有了真正的后端聚合驾驶舱，可以直接回答：

1. 哪些发票缺来源或付款闭环
2. 哪些付款缺发票、来源或凭证锚点
3. 哪些凭证还有未清项、缺对账上下文或缺凭证证据

这一步直接补强了开发总纲里最欠缺的几块：

1. `payment linkage`
2. `source anchor`
3. `journal trace`
4. `reconciliation context`
5. `settlement evidence`

## 下一步

下一批继续沿主线做：

1. 把驾驶舱下沉到详情页级别
   - 支持按单据打开真实 trace detail
   - 支持从风险记录直接跳到源对象

2. 补结算闭环解释
   - `invoice -> payment -> move -> move line`
   - 增加更明确的 settlement reason / result explanation

3. 把真实驾驶舱进一步接到：
   - cutover protection
   - rollback packet
   - finance pilot review queue

4. 继续做平台层下一刀
   - 元数据第一刀
   - reminder 主动化
   - 最小报表 / 导入导出 / 打印闭环
