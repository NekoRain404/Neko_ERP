# 2026-04-23 市场对标总纲刷新 Round 1

## 本轮目标

- 对照当前工程与主流 ERP / CRM / 桌面工作流工具的共性能力
- 找出 NEKO_ERP 真正还缺的企业硬能力，而不是继续只盯模块数量
- 把这些结论重新写回 `VIBECODING_GUIDE.md`，作为之后 vibecoding 的新主线

## 本轮修改

1. 更新 `VIBECODING_GUIDE.md`
   - 版本升级到 `v3.1`
   - 新增“与主流工具逐项对比后的真实缺口”
   - 把当前短板从“功能还不够多”重排为：
     - 角色责任工作台
     - 财务 close cockpit
     - 报表 / 查询 / KPI 语义层
     - 文档管道
     - 安全与公司边界
     - 元数据平台化
     - Monica 式关系操作系统
   - 重排后续批次路线：
     - 批次 0：Role + Close Cockpit
     - 批次 1：Settlement / Reconciliation
     - 批次 2：Stock Picking 执行语义
     - 批次 3：Reporting / Query / KPI
     - 批次 4：Document Pipeline / Import / Export / Print / Email
     - 批次 5：ERPNext 平台化第一刀
     - 批次 6：Monica 式关系与提醒系统

2. 更新门槛判断
   - 新增主流工具对标后的附加门槛
   - 强化：
     - role visibility
     - close blockers explainability
     - summary -> transaction drilldown
     - evidence gap visibility
     - latest governance snapshot visibility

## 验证结果

- 本轮为文档主线刷新，未执行构建与 smoke

## 当前价值

- 以后不会再把“加一个模块页”误判为接近成熟 ERP
- 后续主线将围绕：
  - 责任
  - 关账
  - 报表
  - 文档
  - 平台化
  这些更接近主流工具共性的硬能力推进

## 下一步

- 按新的批次 0 主线，优先补 `role + close cockpit`
- 再把当前工作台、Dashboard、Settings、Command Palette 的责任和关账快照继续做硬
