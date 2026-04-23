# 2026-04-23 关账责任配置与全局治理导出 Round

## 本轮目标

- 把首批链路的关账责任从推导语义升级为可配置语义
- 把 reviewer / finance owner、关账清单、最近关账活动接入全局治理导出
- 让设置页、首页、命令中心、模块工作台在切换治理语义上保持一致

## 本轮修改

- 扩展 `ChainContacts`
  - 新增 `reviewerOwner`
  - 新增 `financeOwner`
  - 本地存储、快照导入导出、默认联系人矩阵全部跟进
- 更新关账角色推导
  - `buildCloseRoleSnapshot(...)` 优先读取显式配置的 reviewer / finance owner
  - 若未配置，仍兼容回退到 rehearsal / signoff / owner 逻辑
- 扩展链路级 packet 协议
  - `CutoverPacketChain` 新增 reviewer / finance owner
  - 新增 `closeChecklistLines`
  - 新增 `closeActivityLines`
- 补齐导出内容
  - blocker packet
  - acceptance packet
  - chain gate packet
  - chain runbook
  - pilot user manual
  - pilot confirmation template
  - control packet
  - first-wave rehearsal pack
  - chain contact matrix
- 设置页补强
  - 链路交接台支持编辑 reviewer / finance owner
  - packet 源数据带出链路级关账清单与最近关账活动
- 首页补强
  - dashboard packet 链路源数据带出关账清单与最近活动
- 命令中心补强
  - command packet 链路源数据带出 closed loop / close checklist / recent close activity
- 模块工作台与记录级导出兼容
  - 模块工作台导出联系人增加 reviewer / finance owner
  - 记录级链路手册导出也保留 reviewer / finance owner

## 验证结果

- 待本轮统一构建与 smoke

## 当前价值

- 首批切换链的责任人已经不再只有 owner / fallback / rehearsal / signoff 四个层次
- 全局治理导出开始具备“谁复核、谁负责财务闭环、最近做过什么”的最小运营语义
- 设置页、首页、命令中心、工作台导出的口径开始统一，减少试点切换时的责任断层

## 下一步

- 继续把 payment / settlement / reconciliation cockpit 结果更深入接到 close checklist 与 control packet
- 继续把 reviewer / finance owner 接入更多链路动作和签收记录
- 补强回退模板与 cutover control 的责任追踪
