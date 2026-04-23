# 2026-04-21 财务库存上下文记忆 Round

## 本轮目标

按 `VIBECODING_GUIDE.md` 继续大批量推进，把 Monica 风格关系/交接记忆与 Timeline 缺口提醒从伙伴、销售、采购继续覆盖到首批链路支撑对象，同时把 ERPNext 风格的“证据槽位/元数据化交付”扩大到首批主数据：

1. `stockPicking`
2. `accountInvoice`
3. `accountPayment`
4. `resCompany`
5. `productTemplate`
6. `productProduct`
7. `productCategory`
8. `productPricelist`

## 本轮修改

### 1. 关系记忆预设覆盖更多主链对象

文件：

- `erp-client/src/utils/relationship-memory.ts`

新增预设：

1. `accountInvoice`
   - 过账上下文
   - 结算负责人
   - 冲销风险

2. `accountPayment`
   - 付款方向
   - 银行凭证
   - 凭证交接

3. `stockPicking`
   - 路由决策
   - 装箱/签收证明
   - 质量风险

4. `resCompany`
   - 法人维护负责人
   - 币种基线
   - 回退范围

5. `productTemplate`
   - 规格负责人
   - 成本依据
   - 下单可用性

6. `productProduct`
   - 模板关联
   - 条码证明
   - 变体审批

7. `productCategory`
   - 品类负责人
   - 分类规则
   - 清理风险

8. `productPricelist`
   - 审批负责人
   - 生效范围
   - 回退说明

意义：

- Monica 的“人本关系记忆”不只停留在 CRM，而是覆盖真实主链交接点
- 每个主链对象都有可复用便签模板，减少后续手写上下文成本
- 首批主数据也有“为什么这样建、谁批准、如何回退”的可视化记忆入口

### 2. 发票、付款、调拨工作台接入关系记忆面板

文件：

- `erp-client/src/views/modules/custom/AccountInvoicesView.vue`
- `erp-client/src/views/modules/custom/AccountPaymentsView.vue`
- `erp-client/src/views/modules/custom/StockPickingsView.vue`

新增：

1. `accountInvoice` 侧栏显示结算交接记忆
2. `accountPayment` 侧栏显示付款过账记忆
3. `stockPicking` 侧栏显示调拨执行记忆
4. `FirstWaveMasterDataWorkbench` 侧栏显示当前主数据模块的关系/定义记忆

意义：

- 关键支撑对象不再只是字段表格
- 操作员可以在同一工作台里看到应该沉淀哪些上下文
- 公司、产品、品类、价目表不再只是通用表格，而是有首批切换语义的主数据工作台

### 3. 后端 Reminder 增加财务/库存 Timeline 缺口与主数据证据缺口

文件：

- `erp-server/src/main/java/com/erp/server/modules/system/service/ReminderService.java`

新增提醒：

1. `stockPicking_context_gap`
2. `accountInvoice_context_gap`
3. `accountPayment_context_gap`
4. `resCompany_evidence_gap`
5. `productTemplate_evidence_gap`
6. `productProduct_evidence_gap`
7. `productCategory_evidence_gap`
8. `productPricelist_evidence_gap`

触发条件：

- 记录已经离开草稿/取消等低风险状态
- 当前对象还没有 Timeline note

添加 note 后，提醒自动消失。

主数据证据缺口要求：

1. `resCompany`
   - `[LEGAL_DOC]`
   - `[TAX_DOC]`

2. `productTemplate`
   - `[SPEC]`
   - `[COSTING]`

3. `productProduct`
   - `[BARCODE_LABEL]`
   - `[VARIANT_APPROVAL]`

4. `productCategory`
   - `[CATEGORY_POLICY]`

5. `productPricelist`
   - `[PRICE_APPROVAL]`
   - `[EFFECTIVE_POLICY]`

这些附件补齐后，对应 evidence gap 提醒自动消失。

### 4. 前端证据槽位口径与 Reminder 对齐

文件：

- `erp-client/src/utils/first-wave-evidence.ts`

本轮把前端首批证据预设与后端 Reminder 要求对齐：

1. 公司：法人文件、税务文件
2. 产品模板：规格书、成本依据
3. 产品变体：条码标签、变体审批
4. 产品品类：品类规则
5. 价目表：价格审批、生效规则

意义：

- 工作台看到的“应上传什么”与后端主动提醒完全一致
- 回退包、放行包和异常清单使用同一套证据语义
- 减少后续每个模块重复解释附件命名规则

### 5. 服务端脚本模板继续扩主数据 guardrail

文件：

- `erp-client/src/utils/sys-script-presets.ts`

新增模板：

1. `company_currency_required`
   - 公司保存前必须有币种

2. `product_template_code_required`
   - 产品模板保存前必须有默认编码

3. `pricelist_currency_required`
   - 价目表保存前必须有币种

意义：

- ERPNext 风格 Server Script 不只保护销售/采购动作，也开始保护首批主数据入口
- 实施人员可以从模板直接生成规则，而不是每轮重复写 Groovy

### 6. 命令中心 Timeline 入口扩展

文件：

- `erp-client/src/components/CommandPalette.vue`

`Timeline Desks / 时间轴工作台` 现在覆盖所有首批模块：

1. `resPartner`
2. `resCompany`
3. `resCurrency`
4. `productTemplate`
5. `productProduct`
6. `productCategory`
7. `productPricelist`
8. `saleOrder`
9. `purchaseOrder`
10. `stockPicking`
11. `accountInvoice`
12. `accountPayment`

意义：

- `Ctrl+K` 可以直接进入首批链路关键对象的上下文补录入口

### 7. 平台 smoke 扩展

文件：

- `scripts/smoke_platform_layer.py`

新增验证：

1. 创建并确认 `stockPicking`
2. 验证 `stockPicking_context_gap`
3. 添加 Timeline note 后验证提醒消失
4. 创建并过账 `accountInvoice`
5. 验证 `accountInvoice_context_gap`
6. 添加 Timeline note 后验证提醒消失
7. 创建并过账 `accountPayment`
8. 验证 `accountPayment_context_gap`
9. 添加 Timeline note 后验证提醒消失
10. 创建 `resCompany` 并验证 evidence gap
11. 上传 `[LEGAL_DOC]` / `[TAX_DOC]` 后验证提醒消失
12. 创建 `productCategory` 并验证 evidence gap
13. 上传 `[CATEGORY_POLICY]` 后验证提醒消失
14. 创建 `productTemplate` 并验证 evidence gap
15. 上传 `[SPEC]` / `[COSTING]` 后验证提醒消失
16. 创建 `productProduct` 并验证 evidence gap
17. 上传 `[BARCODE_LABEL]` / `[VARIANT_APPROVAL]` 后验证提醒消失
18. 创建 `productPricelist` 并验证 evidence gap
19. 上传 `[PRICE_APPROVAL]` / `[EFFECTIVE_POLICY]` 后验证提醒消失

## 验证结果

本轮已执行并通过：

1. `git diff --check`
2. `python3 -m py_compile scripts/smoke_platform_layer.py`
3. `cd erp-server && mvn -q -DskipTests compile`
4. `cd erp-client && npm run build`
5. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

验证结果：

- 后端编译通过
- 前端生产构建通过
- core smoke 通过
- name-filter smoke 通过
- core action smoke 通过
- secondary action smoke 通过
- secondary module smoke 通过
- guardrail module smoke 通过
- platform layer smoke 通过
- full controller list smoke `42/42` 通过

## 当前价值

这轮后，首批链路的上下文提醒覆盖范围扩大为：

1. 伙伴主档
2. 销售订单
3. 采购订单
4. 调拨单
5. 发票
6. 付款
7. 公司主档证据
8. 产品模板证据
9. 产品变体证据
10. 产品品类证据
11. 价目表证据

这意味着首批链路不只是能产生对象，还能主动提醒“哪些对象缺少交接上下文”。

同时，首批主数据也开始具备可放行、可回退、可审查的证据槽位，不再只是“字段能保存”。

## 下一步

继续推进：

1. 把这些 evidence/context 缺口进一步汇总到 Settings 的放行门槛编辑区
2. 给回退包增加当前记录 Timeline note 与附件摘要
3. 继续把 `sys_script` 模板做成可一键安装/禁用的规则操作流
4. 继续推进销售/采购工作台的结果对象回查和回退包导出
