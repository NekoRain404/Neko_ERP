# 2026-04-21 Before Action Smoke Round

## 本轮目标

继续按 `VIBECODING_GUIDE.md` 主线推进平台层，不发散到深会计、深制造或报表系统。本轮只做一条高收益补强：

1. 把 `sys_script.before_action` 从“已有埋点”推进到“已验证、可回归、可持续复用”的状态。

## 本轮修改

### 1. 补强 `before_action` 的根因兼容

- 文件：
  - `erp-server/src/main/java/com/erp/server/common/script/ServerScriptExecutor.java`

本轮修正了两个关键点：

1. `before_action` 执行时，脚本里的 `doc` 默认指向当前实体
   - 这样动作脚本可以继续沿用 `doc.xxx` 习惯，不必区分 save 和 action 两种上下文

2. Groovy 不兼容时的降级规则新增 `action == 'xxx'` 判断
   - 原先降级规则只支持 `doc.field` 比较
   - 现在 `before_action` 也能走最小降级路径阻断动作

这一步把 `before_action` 从“理论支持”推进到“JDK / Groovy 不稳定时也能兜底”。

### 2. 平台层 smoke 新增 `before_action`

- 文件：
  - `scripts/smoke_platform_layer.py`

新增 smoke 场景：

1. 创建 `SaleOrder.before_action` 脚本
2. 脚本规则：
   - `action == 'action_confirm'` 时阻断
3. 创建销售订单
4. 验证 `action_confirm` 被脚本阻断
5. 禁用脚本
6. 再次执行 `action_confirm`
7. 验证动作恢复成功

这一步确保以后继续 vibecoding 时：

- `before_save` 不会是唯一被验证的脚本生命周期
- `before_action` 有实际回归保障

## 验证结果

本轮能力已被后续平台层全量验证覆盖：

1. `cd erp-server && mvn -q -DskipTests compile`：通过
2. `cd erp-client && npm run build`：通过
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`：通过

关键结果：

- `before_action` 动作阻断通过
- 禁用脚本后动作恢复通过
- 平台层 smoke 通过
- 全控制器 list smoke：`42/42` 通过

## 当前价值

本轮价值很集中，但非常关键：

1. `sys_script` 平台层更接近 ERPNext 的 server script 生命周期。
2. 首批主链动作未来可以逐步把 UI guardrail 下沉到后端规则。
3. smoke 现在覆盖 save + action 两条脚本埋点，不容易被后续重构悄悄破坏。

## 下一步

后续继续按主线推进：

1. 逐步把高风险动作的 UI guardrail 对接到 `before_action` 规则配置。
2. 把切换回退包继续补成更完整的链路引用包。
3. 继续增强 `saleOrder`、`purchaseOrder`、`accountInvoice`、`stockPicking` 的专用工作台和链路回查。
