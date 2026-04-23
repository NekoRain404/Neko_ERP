# 2026-04-23 Role + Close Cockpit 基线 Round

## 本轮目标

按照 `VIBECODING_GUIDE.md` 的批次 0，继续把当前工程从“能看关账摘要”推进到“能看责任、能看 close checklist、能看最近治理结果”的基线 close cockpit。

本轮固定不发散到新模块重写，聚焦：

1. `Role Snapshot`
2. `Close Checklist`
3. `Recent Close Activity`
4. 多入口一致可见

## 本轮修改

### 1. 新增共享 close cockpit 工具

新增文件：

- `erp-client/src/utils/cutover-close-cockpit.ts`

新增能力：

1. `buildCloseRoleSnapshot`
2. `buildModuleCloseChecklist`
3. `buildChainCloseChecklist`
4. `buildCloseRecentActivityLines`
5. `countPaymentLinkageIssues`
6. `summarizeCloseChecklist`

这层的作用是把以下语义从页面里抽出来：

1. owner / fallback / reviewer / finance owner / signoff owner
2. 来源就绪
3. 发票/账单就绪
4. 付款或库存影响就绪
5. 凭证就绪
6. 证据就绪
7. 放行就绪
8. 最近一次演练 / 签收 / 异常导出 / close snapshot

### 2. ModuleWorkbench 进入真正的 close cockpit 基线

补强文件：

- `erp-client/src/components/ModuleWorkbench.vue`

新增内容：

1. 关账台增加 `payment linkage / quant impact` 指标卡
2. 关账台增加模块级 close checklist
3. 责任卡增加 reviewer / finance owner / company scope
4. 责任卡直接展示最近治理结果
5. 模块导出包增加：
   - close checklist
   - recent close activity

结果：

- `ops-close` 不再只是一个 close summary 面板
- 已经开始具备 `Role + Close Cockpit` 的第一层语义

### 3. Settings 的 close desk 继续补齐

补强文件：

- `erp-client/src/views/SettingsView.vue`

新增内容：

1. 链路关账卡增加 reviewer / finance owner
2. 链路关账卡增加 close checklist 摘要
3. 链路关账卡增加 recent close activity
4. 模块关账卡增加 close checklist
5. 模块关账卡增加 recent close activity
6. 链路级 close summary 吸收 `payment linkage issue count`

结果：

- 设置页已经不只是“切换配置台”
- 已经更接近负责人与 close owner 的治理台

### 4. Dashboard / Command Palette 对齐同一套 close cockpit 语义

补强文件：

- `erp-client/src/views/DashboardView.vue`
- `erp-client/src/components/CommandPalette.vue`

新增内容：

1. Dashboard 链路卡增加 reviewer / finance owner / close checklist / recent close activity
2. Dashboard 模块卡增加 checklist 摘要和 recent close activity
3. Command Palette 的 close 命令 subtitle 直接吸收 checklist 结果

结果：

- Dashboard / Settings / Workbench / Palette 至少四处已经看到一致的 close blocker 语义
- 这一点符合开发文档对批次 0 的要求

### 5. 共享导出包继续吸收 close cockpit 语义

补强文件：

- `erp-client/src/utils/cutover-packets.ts`

新增模块导出段落：

1. `Close Checklist`
2. `Recent Close Activity`

已进入：

1. handbook
2. rehearsal
3. exception packet

结果：

- 导出包不再只写 settlement / trace / timeline
- 开始带上 role + close cockpit 的执行语义

## 当前价值

这轮的真实价值不是“又多了几个字段”，而是：

1. 让 close cockpit 开始具备责任语义
2. 让关账阻塞开始具备 checklist 语义
3. 让最近一次治理结果开始进入统一快照语义
4. 让主线从“看摘要”向“看责任 + 看清单 + 看最近结果”推进了一层

## 还没完成的部分

离开发文档里批次 0 完成，还差这些：

1. reviewer / finance owner 目前仍是最小表达
   - 还不是独立可配置字段
   - 当前主要靠现有联系人字段推导

2. close checklist 目前是治理判断层
   - 还不是可交互的 close checklist 工作流
   - 还没有“逐项确认 / 逐项签收 / 逐项冻结”

3. shared packet 的全局控制包还没有完整吸收 checklist / recent close activity

4. EntityTableView 还没有真正显示 role + close checklist 语义

5. close cockpit 还没有变成真正的 close owner / close blocker / close freeze 工作台

## 下一步

下一批继续按主线推进：

1. 把 close checklist 继续接入全局控制包和试点手册
2. 把 reviewer / finance owner 从“推导语义”推进到“最小可配置语义”
3. 把 close blocker 做成更强的统一 blocker list
4. 把 `saleOrder / purchaseOrder / accountInvoice / accountPayment / accountMove` 的 close owner 和 close checklist 做得更硬
5. 再继续往 `Payment / Settlement / Reconciliation Cockpit` 深化
