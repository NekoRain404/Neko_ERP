# 2026-04-23 切换台结算闭环下沉 Round

## 本轮目标

- 不让“结算闭环”只停在 workflow 卡片和回退包里
- 把首批链路的结算缺口下沉到 cutover desk、context brief、上下文风险提示
- 继续让首批切换链靠近“可切换、可追责、可回退”的状态

## 本轮修改

### 1. cutover desk 开始直接感知结算闭环

- `EntityTableView.vue`
  - `buildContextAlertItems`
    - 新增 `settlement-closure`
    - 当 `saleOrder / purchaseOrder / accountInvoice / stockPicking / accountPayment` 存在结算闭环缺口时，切换台直接给出风险项
  - `buildContextSummaryCards`
    - 新增 `Settlement Closure`
    - 让上下文总览不只看知识覆盖、门槛、证据，也直接看结算闭环
  - `buildFirstWaveRecordCutoverCards`
    - 新增 `cutover-settlement`
    - 把记录级闭环摘要直接塞进首批切换总览卡

### 2. context brief 开始自带结算闭环摘要

- `buildContextBriefContent`
  - 新增 `## Settlement Closure`
  - 复制上下文摘要、导出上下文摘要时，直接包含结算闭环状态与分项缺口

### 3. 切换台风险区扩大到 8 项

- 原来上下文风险区只截前 6 项
- 现在扩大为 8 项
- 避免结算闭环缺口在已有 context / gate / evidence 风险存在时被截断看不到

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

- 结算闭环已经从“详情页局部信息”继续推进成“切换台的一等公民”
- 后续把结算缺口继续接到 cutover ledger、rollback drill、pilot signoff 时会更顺
- 更贴近 ERPNext 的刚性链路门槛和 Monica 的上下文/交接一体化桌面体验

## 下一步

- 把结算闭环继续接入共享 cutover packet / protection packet
- 继续加硬 `accountPayment` 的来源锚点、凭证证据、付款证明文件
- 让 `closed loop + settlement closure` 一起成为切换门槛
