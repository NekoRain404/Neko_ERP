# 2026-04-23 记录级结算闭环与回退联动 Round

## 本轮目标

- 继续沿 `VIBECODING_GUIDE.md` 主线推进首批切换链
- 把首批模块从“能看到下游结果对象”补到“能判断结算闭环缺口、能导出闭环摘要、能给出恢复入口”
- 加硬 `saleOrder / purchaseOrder / accountInvoice / stockPicking / accountPayment` 的记录级回退、交接、结算联动

## 本轮修改

### 1. `EntityTableView.vue` 继续加深首批链路闭环语义

- 新增统一的 `SettlementReadinessSummary`
  - 对 `saleOrder`
  - `purchaseOrder`
  - `accountInvoice`
  - `stockPicking`
  - `accountPayment`
  输出记录级“结算闭环摘要”
- 把结算闭环摘要接入：
  - 追溯概览卡片
  - Workflow 执行卡片
  - rollback packet JSON
  - 异常包 markdown
  - 交接摘要 markdown
- 首批模块现在会直接显示：
  - 当前结算闭环状态
  - 已就绪步数
  - 缺失标签
  - 待推进标签
  - 可直接打开的补链对象

### 2. 补强首批链路的流程告警和核对清单

- `saleOrder`
  - 增加付款结果对象缺失提醒
  - 增加结算闭环 checklist
- `purchaseOrder`
  - 增加付款结果对象缺失提醒
  - 增加结算闭环 checklist
- `accountInvoice`
  - 增加 draft 态过账提醒
  - 增加来源、伙伴、公司范围缺口提醒
- `stockPicking`
  - 增加 origin、move rows、company scope 缺口提醒
- `accountPayment`
  - 增加来源锚点缺失提醒
  - 增加 posted 后 journal entry 缺失提醒
  - 增加 journal closure checklist

### 3. 继续加深记录级动作台与恢复入口

- `buildWorkflowExecutionCards`
  - 新增统一的 `Settlement Closure` 执行卡
  - 自动聚焦首个未闭环的记录级缺口
- `buildChainActionCards`
  - 新增 `chain-settlement-focus`
  - 当存在可跳转的闭环缺口时，可直接打开缺口对象
  - 没有直达对象时，自动退化为打开流程区继续核对

### 4. 修复一处重复建议项噪音

- 去掉 `accountPayment` 的重复 `payment-entry-open` 建议，避免付款详情页重复出现同一入口

### 5. 更新主指导文档

- 更新 `VIBECODING_GUIDE.md`
  - 版本提升到 `v2.2`
  - 更新时间更新到 `2026-04-23`
  - 写入最新的“当前最欠缺部分”
  - 新增“当前最该继续补的缺口（执行优先级）”

## 验证结果

- `cd erp-server && mvn -q -DskipTests compile`
  - 通过
- `cd erp-client && npm run build`
  - 通过
- `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
  - 通过
  - `core smoke` 通过
  - `name-filter smoke` 通过
  - `core action smoke` 通过
  - `secondary action smoke` 通过
  - `secondary module smoke` 通过
  - `guardrail module smoke` 通过
  - `platform smoke` 通过
  - `all-list smoke` `42/42` 通过

## 当前价值

- 首批切换链的“结算闭环”已经从散落字段，升级成共享摘要能力
- 回退包、异常包、交接摘要开始真正携带“闭环状态”，后续更容易继续加硬到演练签收和自动门槛
- 更贴近 ERPNext 的刚性链路校验和 Monica 的关系/证据/时间轴联动，而不是只做孤立页面

## 下一步

- 继续把 `accountPayment` 和 `accountInvoice` 的最终会计闭环再加深一层
- 把闭环缺口继续接入 cutover gate 与 rollback ledger
- 推进“闭环状态 = 切换门槛”的更强语义
