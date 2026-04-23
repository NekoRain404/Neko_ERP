# 2026-04-23 财务追溯记录包与回退导出 Round 3

## 本轮目标

- 把记录级财务追溯详情继续向“可导出、可回退、可复核”推进，而不只是停留在详情抽屉里浏览。
- 让财务三模块的最高风险记录可以直接生成追溯包，服务 cutover / rollback / sign-off 主线。
- 把共享 trace packet 接到多个入口，减少后续重复改代码。

## 本轮修改

### 1. 新增共享财务追溯记录包工具

新增：

- `erp-client/src/utils/financial-trace-packets.ts`

新增能力：

1. 判断模块是否支持后端记录级 trace detail
2. 构建统一的 `Financial Trace Packet`
3. 统一导出文件名

记录包固定包含：

1. 基础摘要
   - 模块
   - 记录引用
   - 状态
   - 业务状态
   - 金额
   - 证据快照

2. 链路解释
3. 结算路径
4. 关联对象
5. 风险键
6. 回退核对清单

这样后续：

- FinancialTracePanel
- PilotBatchActionPanel
- ModuleWorkbench

都可以直接复用同一套记录级导出语义。

### 2. 财务追溯详情抽屉支持直接复制/导出追溯包

增强：

- `erp-client/src/components/FinancialTracePanel.vue`

新增动作：

1. `Copy Trace Packet`
2. `Export Trace Packet`
3. `Open Record`

现在点击后端真实记录查看详情后，可以直接把当前记录打成追溯包导出，而不需要再手工整理：

- explanation
- settlement
- related links
- risk keys

这一步让记录级详情第一次具备“交付给别人”的能力。

### 3. 批处理台的回退核对自动嵌入真实 trace detail

增强：

- `erp-client/src/components/PilotBatchActionPanel.vue`

当前行为：

1. 如果最高风险记录属于：
   - `accountInvoice`
   - `accountPayment`
   - `accountMove`

2. 导出 rollback review 时，会自动尝试拉取真实 `financial-trace/detail`

3. 成功时把记录级 trace packet 直接嵌到回退核对文档中
4. 失败时写出明确兜底说明，而不是静默缺失

结果：

- scope rollback review 不再只有 reminder 摘要
- 开始带有真实的 record-level 追溯证据

### 4. 工作台支持导出当前最高风险的真实 trace packet

增强：

- `erp-client/src/components/ModuleWorkbench.vue`

新增动作：

1. `Copy Top Trace`
2. `Export Top Trace`

行为规则：

1. 优先使用后端 cockpit 中第一条非 `ready` 记录
2. 如果没有风险记录，再退回第一条真实记录
3. 生成的文档基于 `financial-trace/detail`

这让模块工作台的财务追溯台不再只是看状态，而是能直接输出：

- 最高风险记录证据包
- 切换前复核材料
- 回退前单据级说明

### 5. 交互补强

本轮顺手补了几处桌面化体验细节：

1. FinancialTracePanel 的复制/导出动作增加成功提示
2. ModuleWorkbench 的 top trace 导出增加失败提示
3. cockpit detail 拉取仍保留错误兜底，不影响主界面使用

## 验证结果

本轮代码完成后执行：

1. `cd erp-server && mvn -q -DskipTests compile`
2. `cd erp-client && npm run build`
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

预期目标：

- 后端编译通过
- 前端构建通过
- smoke 全绿

## 当前价值

这轮最重要的价值不是“多了几个按钮”，而是：

1. 记录级 trace detail 终于变成了可传播的工程产物
2. rollback review 开始真正吸收后端真实财务追溯
3. cutover 证据从 reminder 层继续下沉到 record 层

这更接近开发总纲里要求的：

1. `payment linkage`
2. `source explanation`
3. `journal trace`
4. `record-level rollback packet`
5. `traceability evidence`

## 下一步

下一批继续沿主线推进：

1. 给 `Dashboard / Settings / Control Packet` 增加 record-level trace packet 汇总入口
2. 继续下沉 `accountMoveLine` 粒度的 journal item 解释
3. 让 rollback packet 进一步引用 trace packet 文件名与关键记录索引
4. 把最小 reconciliation 解释接进更多财务入口
