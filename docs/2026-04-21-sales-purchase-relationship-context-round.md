# 2026-04-21 销售采购关系上下文 Round

## 本轮目标

继续沿 `VIBECODING_GUIDE.md` 主线推进，把上一轮的 Monica 风格关系记忆从 `resPartner` 延展到首批业务主链：

1. `saleOrder`
2. `purchaseOrder`

同时补后端 reminder，让“没有 Timeline 便签的已确认销售/采购单”能被主动提醒。

## 本轮修改

### 1. 销售/采购工作台接入关系记忆面板

文件：

- `erp-client/src/views/modules/custom/SaleOrdersView.vue`
- `erp-client/src/views/modules/custom/PurchaseOrdersView.vue`

本轮新增：

1. 销售订单侧栏加入 `RelationshipMemoryPanel`
2. 采购订单侧栏加入 `RelationshipMemoryPanel`
3. 对应提醒流纳入本模块自身：
   - `saleOrder`
   - `purchaseOrder`

意义：

- 关系记忆不再只停留在伙伴主档
- 销售交接和采购交接也能沉淀人本上下文

### 2. 后端 Reminder 增加销售/采购 Timeline 上下文缺口

文件：

- `erp-server/src/main/java/com/erp/server/modules/system/service/ReminderService.java`

新增提醒：

1. `saleOrder_context_gap`
   - 已确认且未取消的销售单
   - 没有 Timeline note 时提醒

2. `purchaseOrder_context_gap`
   - 已确认且未取消的采购单
   - 没有 Timeline note 时提醒

意义：

- reminder 不再只关注伙伴沉寂和附件证据
- 已进入主链的销售/采购单如果缺少交接上下文，会被主动暴露

### 3. 平台 smoke 扩展主链上下文提醒验证

文件：

- `scripts/smoke_platform_layer.py`

新增验证：

1. 创建并确认销售单
2. 验证 `saleOrder_context_gap`
3. 添加 Timeline note
4. 验证提醒消失
5. 创建并确认采购单
6. 验证 `purchaseOrder_context_gap`
7. 添加 Timeline note
8. 验证提醒消失

意义：

- Timeline 与 Reminder 的联动开始覆盖业务主链
- 首批链路不只是“可追溯”，而是能主动提示缺少上下文的记录

## 验证结果

本轮执行：

1. `cd erp-server && mvn -q -DskipTests compile`：通过
2. `cd erp-client && npm run build`：通过
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`：通过

关键结果：

- `saleOrder_context_gap` 可被创建并在添加 Timeline note 后消失
- `purchaseOrder_context_gap` 可被创建并在添加 Timeline note 后消失
- 平台层 smoke 通过
- 全控制器 list smoke：`42/42` 通过

## 当前价值

本轮把 Monica 精华进一步落到首批主链：

1. 伙伴主档有关系记忆
2. 销售订单有交接记忆
3. 采购订单有供应商跟进记忆
4. Reminder 能主动发现缺少 Timeline 上下文的主链记录

## 下一步

继续推进：

1. 把 `accountInvoice` 的结算上下文也纳入关系/交接记忆
2. 继续补主动作 guardrail 到 `sys_script` 模板
3. 继续收紧切换回退包里的 Timeline 与证据摘要
