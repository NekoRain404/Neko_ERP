# 2026-04-23 付款联动与库存影响驾驶舱 Round

## 本轮目标

继续沿 `VIBECODING_GUIDE.md` 主线，把当前最欠缺的两条真实闭环再往前推进一层：

1. 财务侧 `accountInvoice -> accountPayment -> accountMove` 的 payment linkage
2. 库存侧 `stockPicking -> stockMove -> stockQuant` 的 quant 影响与回退解释

目标不是加散点页面，而是继续复用共享工作台和共享侧栏，把“可看、可跳、可解释”的桌面闭环做厚。

## 本轮修改

1. 新增共享财务联动面板
   - 新增 `PaymentLinkagePanel.vue`
   - 统一聚合近期 `accountInvoice / accountPayment / accountMove`
   - 在同一块面板里展示：
     - 发票锚点
     - 付款结果对象
     - 凭证引用
     - 待修补联动
   - 支持从联动面板直接跳往对应模块记录

2. 新增共享库存影响面板
   - 新增 `QuantImpactPanel.vue`
   - 统一聚合近期 `stockPicking / stockMove / stockQuant`
   - 在同一块面板里展示：
     - 涉及库位
     - quant 数量池
     - 已产生副作用的调拨
     - 回退敏感记录
   - 支持从库存影响面板直接跳往调拨详情或库存量列表

3. 共享工作台 section 再扩一层
   - `ModuleWorkbench.vue` 新增：
     - `ops-payment-linkage`
     - `ops-quant-impact`
   - 同时补齐：
     - section 深链滚动
     - execution action
     - 打开 desk 的快捷函数
     - 模块级提示动作

4. 首批模块侧栏继续收敛
   - `accountInvoice` 侧栏接入 `PaymentLinkagePanel`
   - `accountPayment` 侧栏接入 `PaymentLinkagePanel`
   - `accountMove` 侧栏接入 `PaymentLinkagePanel`
   - `stockPicking` 侧栏接入 `QuantImpactPanel`

5. 快捷入口和命令中心同步更新
   - `first-wave-workbench-shortcuts.ts`
     - 财务三模块补“付款联动台”快捷入口
     - `stockPicking` 补“库存影响台”快捷入口
   - `CommandPalette.vue`
     - 财务三模块新增 `Payment Linkage Desk`
     - `stockPicking` 新增 `Quant Impact Desk`

## 当前价值

这一轮带来的价值不是“又多了两个面板”，而是：

1. 财务三模块第一次拥有了共享的 payment linkage 视角，而不是分别在发票、付款、凭证列表里找线索。
2. 库存执行第一次把 `stockQuant` 副作用拉回 `stockPicking` 主线视角，减少执行与回退解释分离。
3. 工作台、侧栏、快捷入口、命令中心开始围绕同一套财务联动 / 库存影响 desk 语义协同。

这更接近 ERPNext 的共享平台操作层，也更接近成熟 ERP 对 close cockpit / inventory impact review 的做法。

## 验证结果

本轮文档落地时尚未执行构建与 smoke，需要在本轮批量代码完成后统一执行：

1. `cd erp-server && mvn -q -DskipTests compile`
2. `cd erp-client && npm run build`
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 下一步

1. 把 payment linkage 的真实解释继续往后端 guardrail 和 smoke 推进。
2. 把 quant 影响继续接入 rollback drill / close cockpit / evidence packet。
3. 继续让首批切换判断真正消费“联动是否完整、库存副作用是否可解释”这两类硬条件。
