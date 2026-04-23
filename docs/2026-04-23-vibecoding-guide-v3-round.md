# 2026-04-23 Vibecoding Guide v3 Round 1

## 本轮目标

基于当前真实工程状态、最近多轮主线推进结果，以及成熟 ERP 系统的共性能力，重写 `VIBECODING_GUIDE.md`，把后续 vibecoding 的执行总纲更新到可直接指导下一阶段开发的程度。

## 本轮修改

1. 重写 `VIBECODING_GUIDE.md` 到 `v3.0`
2. 新增当前工程全面总结
   - 当前已形成的核心资产
   - 当前成熟度判断
   - 当前最强部分
   - 当前最欠缺部分
3. 新增成熟 ERP 对标视角
   - ERPNext
   - Monica
   - Odoo
   - SAP / Dynamics / NetSuite 共性能力
4. 重新定义当前主线
   - 首批链固定为主数据、销售链、采购链
   - 把 `accountPayment` 明确纳入财务主链
5. 重新定义当前最欠缺能力
   - settlement / payment / reconciliation / source trace
   - stock execution semantics
   - rollback ledger / cutover ledger
   - metadata first cut
   - reminder / timeline richer write side
6. 新增未来默认批次
   - 批次 1: Payment / Settlement / Reconciliation Cockpit
   - 批次 2: Stock Picking 执行语义补硬
   - 批次 3: 切换台账硬化
   - 批次 4: ERPNext 平台化第一刀
   - 批次 5: Monica 式关系与提醒系统
   - 批次 6: 企业硬能力最小闭环
7. 更新切换门槛
   - 增加财务链额外门槛
   - 要求结算闭环、payment linkage、journal entry 回查进入切换判断
8. 固化默认开发与 commit 规则
   - 默认中文 commit
   - 默认一批一验一记

## 验证结果

1. 本轮为文档重构
2. 未执行 `compile / build / smoke`
3. 原因:
   - 本轮未修改工程代码
   - 仅更新后续开发总指导与执行基线

## 当前价值

1. 后续 vibecoding 不再只靠“继续推进”的口头方向，而是有明确的新总纲
2. 主线从“继续补平台层”进一步收敛为“先做结算、付款、对账、来源追溯”
3. 文档已经把成熟 ERP 的共性能力映射到当前工程，后续更不容易偏航

## 下一步

1. 按 `VIBECODING_GUIDE.md v3.0` 先推进 `Payment / Settlement / Reconciliation Cockpit`
2. 优先做销售链和采购链的 payment linkage、journal entry 回查、结算门槛联动
3. 做完后再推进 `stockPicking / stockMove / stockQuant` 的执行语义补硬
