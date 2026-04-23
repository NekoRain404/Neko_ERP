# 2026-04-21 Dashboard Manual Downstream Smoke Round

## 本轮目标

继续按 `VIBECODING_GUIDE.md` 大批量推进，不做单点小修。本轮聚焦三条共享主线：

1. Dashboard 从“展示首页”推进为“切换指挥台”
2. 记录级回退包补齐下游对象摘要
3. SysScript 模板安装/停用进入平台层 smoke

吸收方向：

- ERPNext：把 Server Script guardrail 模板化、可安装、可停用、可验证
- Monica：把 Timeline、附件、交接语境和人工负责人沉淀到手册、阻塞包、回退包

## 本轮修改

### 1. Dashboard 切换指挥台增强

文件：

- `erp-client/src/views/DashboardView.vue`

新增能力：

1. 首批链路压力汇总
   - Ready Chains
   - Critical Chains
   - Warning Chains
   - Pending Gates
   - Open Reminders

2. Dashboard 新增导出入口
   - `Export Blockers`
   - `Export Manual`

3. 链路卡片新增最高风险直达
   - 从首页直接打开链路中最高风险记录
   - 保留 `section` 与 `relatedTo` 深链上下文

4. 新增 Dashboard blocker packet
   - 链路启用状态
   - 门槛状态
   - 未完成门槛
   - 严重/警告提醒
   - 建议阻塞项
   - 最高风险记录
   - 负责人和回退负责人
   - 直接提醒明细

5. 新增首批试点用户手册导出
   - 操作规则
   - 链路负责人
   - 门槛状态
   - 模块证据要求
   - 回退步骤

意义：

- Dashboard 不再只是入口页，而是可以直接导出演练包、放行包、阻塞包和用户手册
- 首批切换所需的“手册、阻塞项、负责人、回退步骤”可以从同一个入口生成
- 试点负责人不用进入 Settings 才能拿到首批交接材料

### 2. 记录级回退包补下游对象摘要

文件：

- `erp-client/src/components/EntityTableView.vue`

新增 `downstreamRollbackSummary`，覆盖：

1. `saleOrder`
   - 出库调拨
   - 客户发票
   - 付款结果对象

2. `purchaseOrder`
   - 供应商收货
   - 供应商账单
   - 供应商付款

3. `accountInvoice`
   - 上游来源
   - 付款结果对象

4. `stockPicking`
   - 业务来源
   - 库存移动行

5. `accountPayment`
   - 付款来源
   - 来源发票
   - 会计凭证

回退包 JSON 新增：

- `downstreamSummary`

UI 新增：

- Traceability 里的 `Downstream Pack` 摘要卡
- `Downstream Rollback Checklist`

意义：

- 回退包不再只知道“当前记录 + 关联链接”，现在能说明每条主链缺哪些下游对象
- 销售/采购/发票/付款/调拨的交接审查更接近真实 Odoo 主链语义
- 试点回退负责人可以直接看到“缺的是出库、账单、付款还是凭证”

### 3. SysScript 模板库进入 smoke

文件：

- `scripts/smoke_platform_layer.py`

新增 `verify_sys_script_preset_library_operations()`：

1. 批量安装首批 Server Script preset 规则
2. 验证安装数量和启用状态
3. 批量停用匹配规则
4. 验证停用状态

覆盖规则：

- `partner_contact_required`
- `company_currency_required`
- `product_template_code_required`
- `pricelist_currency_required`
- `sale_large_amount_review`
- `purchase_vendor_required`
- `invoice_post_origin_required`
- `picking_validate_origin_required`
- `payment_post_origin_required`

意义：

- Server Script 不再只靠前端按钮“看起来可安装”
- 平台层 smoke 现在会验证模板库可批量安装、可批量停用
- guardrail 运维流真正进入回归体系

## 验证结果

本轮已执行并通过：

1. `git diff --check`
2. `cd erp-client && npm run build`
3. `python -m py_compile scripts/smoke_platform_layer.py`
4. `cd erp-server && mvn -q -DskipTests compile`
5. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

Smoke 结果：

1. core smoke 通过
2. name-filter smoke 通过
3. core action smoke 通过
4. secondary action smoke 通过
5. secondary module smoke 通过
6. guardrail module smoke 通过
7. platform layer smoke 通过
8. 新增 SysScript preset library install/disable smoke 通过
9. full controller list smoke `42/42` 通过

## 当前价值

这一轮继续推进 `VIBECODING_GUIDE.md` 的 P0：

1. 首批切换材料可以从 Dashboard 直接导出
2. 用户手册具备固定生成入口
3. 记录回退包包含更明确的下游对象缺口
4. Server Script 模板库具备 smoke 级验证
5. ERPNext 的 Server Script 和 Monica 的关系/证据记忆继续进入可操作层

## 下一步

继续优先推进：

1. 把 Dashboard 与 Settings 的放行包字段进一步抽成共享 builder
2. 给销售/采购链增加更深的下游对象自动查询摘要
3. 给首批试点模块补固定“试点团队确认”模板
4. 把用户手册导出入口同步到 Settings 切换台
5. 继续补回退包里的附件/Timeline 审核负责人字段
