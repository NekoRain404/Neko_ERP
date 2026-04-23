# 2026-04-23 销售采购深层回查与切换护栏 Round

## 本轮目标

- 继续沿 `VIBECODING_GUIDE.md` 主线补强销售链和采购链
- 把 `saleOrder / purchaseOrder / accountInvoice / stockPicking / accountPayment` 的记录级回查从“只看头和结果对象”推进到“头、行、伙伴、公司、结果对象”闭环
- 让这些闭环直接反映到切换核对、回退摘要和风险提示里，而不是只停留在可跳转层

## 本轮修改

- 前端 `EntityTableView.vue`
  - 新增共享帮助方法
    - 子表行计数
    - 子表上下文跳转
  - 销售链补强
    - `saleOrder`
      - `Context Coverage` 新增：
        - 公司范围
        - 订单行数量
      - `Downstream Rollback Summary` 新增：
        - 客户上下文
        - 公司范围
        - 订单行
      - `Chain Cockpit` 新增：
        - 订单行直达
        - 公司范围直达
      - `Next Suggestions` 新增：
        - 订单行直达
        - 公司范围直达
      - `Workflow Execution Cards` 新增：
        - 订单行就绪卡
      - `Pilot Review Checklist` 新增：
        - 订单行就绪
        - 公司范围就绪
  - 采购链补强
    - `purchaseOrder`
      - `Context Coverage` 新增：
        - 公司范围
        - 订单行数量
      - `Downstream Rollback Summary` 新增：
        - 供应商上下文
        - 公司范围
        - 订单行
      - `Chain Cockpit` 新增：
        - 订单行直达
        - 公司范围直达
      - `Next Suggestions` 新增：
        - 订单行直达
        - 公司范围直达
      - `Workflow Execution Cards` 新增：
        - 订单行就绪卡
      - `Pilot Review Checklist` 新增：
        - 订单行就绪
        - 公司范围就绪
  - 会计/库存闭环补强
    - `accountInvoice`
      - 新增伙伴范围与公司范围覆盖
      - 回退摘要增加伙伴 / 公司
      - 驾驶舱增加伙伴上下文 / 公司范围
      - 建议动作增加伙伴 / 公司跳转
      - 执行卡增加伙伴 / 公司范围卡
      - 核对清单增加：
        - 来源追溯
        - 伙伴 / 公司范围
    - `stockPicking`
      - 新增伙伴范围与公司范围覆盖
      - 回退摘要增加伙伴 / 公司
      - 驾驶舱增加伙伴上下文 / 公司范围
      - 建议动作增加：
        - 移动行直达
        - 伙伴 / 公司跳转
      - 执行卡增加执行包卡
      - 核对清单增加伙伴 / 公司范围
    - `accountPayment`
      - 新增伙伴范围与公司范围覆盖
      - 回退摘要增加伙伴 / 公司
      - 驾驶舱增加伙伴上下文 / 公司范围
      - 建议动作增加伙伴 / 公司跳转
      - 执行卡增加伙伴 / 公司范围卡
      - 核对清单增加伙伴 / 公司范围
  - 护栏增强
    - 因为 `Context Coverage` 增加了订单行、公司范围、伙伴范围，这些缺口现在会自动进入 `Context Alerts`
    - `accountPayment` 现在也会在无证据文件时给出记录级文档风险提示
  - 建议动作兜底
    - 对 `Next Suggestions` 统一过滤无效 link / action，避免生成空按钮

## 验证结果

- `cd erp-server && mvn -q -DskipTests compile`
  - 通过
- `cd erp-client && npm run build`
  - 通过
- `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
  - 通过
- 全控制器列表回归
  - `42/42` 通过
- 核心 action smoke
  - 销售链
  - 采购链
  - 发票付款链
  - 调拨执行链
  - 全通过
- 平台层 smoke
  - `ext_data`
  - `sys_script`
  - reminder
  - timeline
  - attachment aggregation
  - 全通过

## 当前价值

- 销售链和采购链的详情页现在不再只是“看到结果对象”，而是已经能把头、行、伙伴、公司、结果对象作为同一条记录级核对链来使用
- 缺少订单行、缺少公司范围、缺少伙伴范围这类问题现在会直接出现在切换核对和风险提示里，更接近真正的 cutover gate
- 回退摘要和核对清单更接近 ERPNext 风格的刚性业务门槛，同时保留 Monica 风格的记录级上下文与证据视角

## 下一步

- 继续补 `saleOrder / purchaseOrder / accountInvoice / stockPicking / accountPayment` 的记录级 guardrail，尤其是动作执行前的链路前置条件解释
- 继续推进模块开关、回退入口、交接包、试点门槛的统一收口
- 继续沿首批可切换链推进，不发散到深会计、深制造和全量重写
