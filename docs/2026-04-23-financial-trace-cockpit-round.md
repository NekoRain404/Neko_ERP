# 2026-04-23 财务追溯驾驶舱 Round 1

## 本轮目标

在不偏离 `VIBECODING_GUIDE.md` v3 主线的前提下，把 `payment linkage / reconciliation / source trace` 从记录级页面能力提升为共享驾驶舱能力。

本轮重点：

1. 补共享 `financial-trace` 语义层
2. 把财务追溯接到 `ModuleWorkbench`
3. 把财务追溯接到 `AccountInvoice / AccountPayment / AccountMove` 专用工作台
4. 把财务追溯入口接到 `Dashboard / Settings / CommandPalette`
5. 把导出包带上财务追溯摘要

## 本轮修改

### 1. 共享语义层

- 新增 `erp-client/src/utils/financial-trace.ts`
- 提供：
  - `buildModuleFinancialTraceSummary`
  - `buildChainFinancialTraceSummary`
- 统一把以下语义收口成共享摘要：
  - 来源锚点 / 上游来源
  - 付款链接 / 账单交接
  - 凭证追溯 / 对账上下文
  - 财务证据连续性

### 2. 模块工作台

- `ModuleWorkbench.vue`
  - 新增模块级 `financialTraceSummary`
  - 新增链路级 `financialTraceSummary`
  - 新增 `buildModuleFinancialTraceLines()`
  - 新增执行动作：
    - `Repair Financial Trace / 补齐财务追溯`
  - 新增 `Financial Trace Desk / 财务追溯台`
  - 支持 deep link：
    - `section=ops-financial-trace`
  - 模块导出包补入财务追溯：
    - rollback drill
    - evidence packet
    - handbook
    - gate packet
    - rehearsal
    - exception packet

### 3. 财务模块专用工作台

- `AccountInvoicesView.vue`
  - 新增 `Billing Trace Cockpit / 账单追溯驾驶舱`
- `AccountPaymentsView.vue`
  - 新增 `Payment Trace Cockpit / 付款追溯驾驶舱`
- `AccountMovesView.vue`
  - 新增 `Journal Trace Cockpit / 凭证追溯驾驶舱`

### 4. 入口层

- `DashboardView.vue`
  - 新增链路和模块级财务追溯摘要
  - 新增 `Trace Ready / 追溯就绪` 指标
- `SettingsView.vue`
  - 在交接台、门槛台、回退闭环台新增财务追溯状态
  - 导出备注加入财务追溯摘要
- `CommandPalette.vue`
  - 新增链路级命令：
    - `Open ... Financial Trace Desk`
  - 新增模块级命令：
    - `Open ... Financial Trace Desk`

### 5. 共享导出包

- `cutover-packets.ts`
  - 新增共享字段：
    - `financialTraceLabel`
    - `financialTraceMissingLabels`
    - `financialTraceWarningLabels`
    - `financialTraceLines`
- `cutover-protection.ts`
  - 回退演练包补入财务追溯摘要

## 当前价值

这轮之后，项目的财务闭环不再只停留在：

1. 单条记录详情里的“能看到”
2. 某个页面里的“局部卡片”

而是变成了：

1. 共享语义层
2. 工作台动作层
3. 入口层可见
4. 导出包可带走

这更贴近成熟 ERP 的要求：

- 像 ERPNext 一样强调刚性的来源连续性
- 像 Monica 一样强调上下文不要在交接时丢失
- 像真正可切换系统一样，让回退、审计、交接看到的是同一套语义

## 当前仍未完成

这轮仍然没有完成的主线缺口：

1. 后端尚未形成真正的对账驾驶舱接口
2. `accountMoveLine` 级别的 reconcile 统计仍主要在记录页内
3. Dashboard / Settings 导出主包里对财务追溯的聚合还可以继续加深
4. payment linkage / reconciliation / source trace 还没有形成独立 smoke

## 下一步

按主线继续推进时，优先级建议固定为：

1. 后端补 `financial trace / reconcile cockpit` 聚合接口
2. 给 `accountMove / accountMoveLine` 补更强的对账摘要与异常入口
3. 把 `settingsPacketChains / commandPacketChains / dashboard exports` 全部补齐财务追溯字段
4. 增加前端 smoke：
   - financial trace desk
   - command palette trace entry
   - module workbench trace deep-link
   - rollback / handbook packet financial trace output
