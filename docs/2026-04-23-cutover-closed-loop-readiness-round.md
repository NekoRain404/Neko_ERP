# 2026-04-23 切换闭环门槛 Round 1

## 本轮目标

- 把上一轮新增的“回退演练 / 试点签收 / 异常导出”从记录层推进到门槛层
- 让首页、设置页、命令中心、批处理台都使用同一套闭环 readiness 判断
- 避免出现“门槛都勾了，但没有真实闭环证据”仍被视为可切换的情况

## 本轮修改

1. 闭环 readiness 统一规则
   - 在 `erp-client/src/utils/cutover-ops.ts` 新增共享判断逻辑
   - 统一判断：
     - 是否有回退演练
     - 最近演练是否通过
     - 是否有放行签收
     - 最近签收是否为 go
     - 是否有异常导出记录
     - 上述证据是否过期
   - 输出统一的：
     - `ready`
     - `tone`
     - `label`
     - `missingLabels`
     - `staleLabels`

2. 设置页切换门槛加硬
   - `SettingsView.vue`
   - 放行门槛卡片现在直接显示闭环状态
   - 门槛备注自动填充时会把闭环状态写进去
   - 如果 6 项放行条件全部勾选，但闭环证据仍然缺失或过期，保存时会自动警告
   - 新增“闭环台”快速跳转按钮

3. 首页切换 readiness 校准
   - `DashboardView.vue`
   - 首页的“已放行链路”不再只看 6 项门槛勾选
   - 现在还要求闭环 readiness 为 true
   - 首页链路卡片新增：
     - 闭环标签
     - 缺失/过期说明
     - 直达闭环台入口

4. 命令中心接入闭环语义
   - `CommandPalette.vue`
   - 链路命令项现在带上闭环状态
   - 新增“打开闭环台”命令
   - 导出异常清单时会自动登记闭环异常导出台账

5. 批处理台导出纳入台账
   - `PilotBatchActionPanel.vue`
   - 不管从哪个批处理入口导出范围异常清单，都会自动登记切换异常导出记录

## 验证结果

1. `cd erp-server && mvn -q -DskipTests compile`
   - 通过

2. `cd erp-client && npm run build`
   - 通过

3. `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 通过
   - `42/42` controller list smoke 通过
   - platform smoke 通过

## 当前价值

- 首批切换 readiness 不再只是人工勾选表面门槛
- 首页、设置、命令中心、批处理台开始共享同一套闭环判断标准
- 回退演练、试点签收、异常导出不再是孤立记录，而开始参与真实切换判断

## 下一步

1. 继续把闭环 readiness 从“前端判断”推进到更强的服务端/动作 guardrail
2. 补 `stockPicking / accountInvoice / accountPayment` 更深层语义
3. 把 Timeline / Reminder / Command Center 继续收束成统一试点操作系统
