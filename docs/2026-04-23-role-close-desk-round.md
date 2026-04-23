# 2026-04-23 责任与关账台 Round 1

## 本轮目标

- 把刷新后的开发总纲立即下沉到共享工作台
- 让 `ModuleWorkbench` 开始从“模块工作台”向“role + close cockpit”靠拢
- 在不引入新后端模型的前提下，先把现有责任人、门槛、闭环、结算、追溯汇总成一块共享关账面板

## 本轮修改

1. `erp-client/src/components/ModuleWorkbench.vue`
   - 新增 `Role And Close Desk / 责任与关账台`
   - 新增 `ops-close` section，可作为后续深链入口
   - 把以下信息收敛到同一块共享面板：
     - gate pending
     - settlement issues
     - financial trace issues
     - closed-loop gaps
     - role snapshot
   - 直接提供：
     - 打开切换设置
     - 打开门槛台
     - 打开闭环台
     - 打开结算台

2. 共享 close 摘要
   - 新增 `moduleCloseSummary`
   - 用于把门槛、结算、追溯、闭环合并成一份 close snapshot

3. 共享责任快照
   - 新增 `responsibilitySummaryRows`
   - 复用当前链路联系人：
     - owner
     - fallback
     - rehearsal
     - sign-off
   - 为后续 reviewer / finance owner 等角色字段扩展留下统一入口

## 验证结果

- 待执行：
  - `cd erp-server && mvn -q -DskipTests compile`
  - `cd erp-client && npm run build`
  - `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

## 当前价值

- 新总纲中的 `role + close cockpit` 不再只是文档目标，已经开始进入共享工作台
- 首批模块会自动继承责任与关账摘要，不需要每个模块再各自乱长
- 这为后续继续补 reviewer、company boundary、close tasks、close blockers 提供了统一壳层

## 下一步

- 继续把 role / close snapshot 下沉到 Dashboard、Settings、Command Palette
- 继续补 close blockers 的可解释性和最近一次结果快照
