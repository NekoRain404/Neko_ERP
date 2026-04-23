# 2026-04-23 结算闭环入口层 Round 1

## 本轮目标

把上一轮已经下沉到共享包层的“结算闭环”继续推进到首页、设置页和命令中心，让试点负责人不打开导出包也能直接看到结算状态，并能一跳进入对应工作台。

## 本轮修改

1. `erp-client/src/views/DashboardView.vue`
   - 为链路卡片增加结算闭环摘要
   - 为模块压力卡增加结算状态标签和说明
   - 在首页顶层指标中增加“结算就绪”计数
   - 首页链路 / 模块区现在会同时显示闭环状态和结算闭环状态

2. `erp-client/src/views/SettingsView.vue`
   - 链路交接台增加结算闭环摘要卡
   - 放行门槛台增加结算状态标签与摘要
   - 回退闭环台增加“结算就绪链路”指标
   - 保存门槛时，如果门槛全勾选但结算闭环仍不完整，会直接弹出警告
   - 导出的链路操作备注现在同时包含闭环和结算闭环信息

3. `erp-client/src/components/CommandPalette.vue`
   - 为每条首批链路新增“结算审查”命令
   - 为每个首批模块新增“结算台”命令
   - 链路演练、门槛、手册等命令的副标题现在会带上结算状态
   - 命令中心可以更快把用户送到结算缺口对应的工作台，而不是只会打开普通模块

## 验证结果

1. `cd erp-server && mvn -q -DskipTests compile`
   - 通过

2. `cd erp-client && npm run build`
   - 通过

3. `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 通过
   - core smoke 通过
   - name-filter smoke 通过
   - core action smoke 通过
   - secondary action smoke 通过
   - secondary module smoke 通过
   - guardrail module smoke 通过
   - platform smoke 通过
   - all-list smoke `42/42` 通过

## 当前价值

1. 结算闭环已经从“记录级局部能力”推进为“共享包层 + 入口层”双层可见。
2. 试点负责人在首页和设置页就能判断销售链、采购链的结算连续性，而不是靠记忆。
3. 命令中心现在能更快把人送到结算审查入口，减少在多张工作台之间反复寻找。

## 下一步

1. 继续把 payment linkage / reconciliation / source trace 做成更明确的组合视图。
2. 在模块工作台里继续把结算闭环和 evidence discipline 做得更可执行，而不是只停留在摘要。
3. 继续补切换保护层，强化模块开关、回退入口、guardrail 和结算状态之间的联动提示。
