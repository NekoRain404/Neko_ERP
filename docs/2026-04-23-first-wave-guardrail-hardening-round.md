# 2026-04-23 首批主链动作护栏加硬 Round

## 本轮目标

- 加硬首批切换链的动作前置护栏，减少销售、采购、库存、发票、付款链在试点阶段带着明显缺口继续流转。
- 把动作护栏和切换台、文档区、时间轴、流程区真正连起来，避免弹窗只提示风险却不能把操作员带到正确核对区。
- 保持现有主链 smoke、平台层 smoke、42/42 list 回归全部可过。

## 本轮修改

### 1. 首批动作前置拦截补强

文件:
- `erp-client/src/components/EntityTableView.vue`

补强内容:

1. 新增 `ActionGuardrailBlocker` 语义层
   - 让动作护栏不再只依赖泛化提醒，而是能描述“这次动作为什么不稳、应该回哪个区域看”。

2. 加入首批主链专属 blocker 规则
   - `saleOrder`
     - `action_confirm`
     - `action_create_invoice`
   - `purchaseOrder`
     - `action_confirm`
     - `action_create_bill`
   - `stockPicking`
     - `action_confirm`
     - `action_validate`
   - `accountInvoice`
     - `post`
     - `register_payment`
   - `accountPayment`
     - `action_post`
     - `post`

3. 每类动作会优先检查:
   - 伙伴/客户/供应商上下文
   - 公司范围
   - 行项目是否存在
   - 上下游结果对象是否可见
   - 凭证/账簿/金额等关键执行语义
   - 文档证据是否已附着

### 2. 切换保护与动作护栏真正打通

补强内容:

1. 模块切换关闭时，动作护栏会直接给出 `cutover` 级别 blocker
   - 不再只在页面其他地方静态提示。

2. 链路 gate 未放行时，动作护栏会把待处理 gate 直接带进弹窗
   - 让操作员在执行动作前就能看到当前链路还有哪些 acceptance blocker。

3. 护栏推荐跳转区域新增 `cutover`
   - 当风险来自模块关闭或 gate 未放行时，取消动作会直接把用户带到切换台，而不是误导到追溯区或文档区。

4. `stockPicking.action_confirm` 正式纳入首批动作护栏
   - 之前规则里已有校验语义，但动作白名单未覆盖，实际不会弹出前置拦截；本轮已补齐。

### 3. 用户体验层的直接收益

这轮改动把 ERPNext 式“刚性状态前置检查”和 Monica 式“上下文先于动作”进一步融合到了当前 Electron 工作台里：

- 不是单纯阻止动作，而是告诉用户缺什么、为什么缺、应先去哪里补。
- 不是把风险散落在多个标签页，而是让动作入口主动把人送回正确的切换核对区。
- 不是只强调流程，还把证据、上下游对象、切换 gate 一起作为试点动作的前置语义。

## 验证结果

已执行:

1. `cd erp-server && mvn -q -DskipTests compile`
2. `cd erp-client && npm run build`
3. `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

结果:

- 后端编译通过
- 前端 build 通过
- core smoke 通过
- name-filter smoke 通过
- core action smoke 通过
- secondary action smoke 通过
- secondary module smoke 通过
- guardrail smoke 通过
- platform smoke 通过
- `42/42` controller list smoke 通过

## 当前价值

- 首批可切换链的动作入口更接近“能带着风险解释去执行”，而不是“先点再说”。
- 模块切换、gate 放行、证据完整度、上下游对象可见性已经开始汇总到同一套前置护栏里。
- 这一步直接降低了销售/采购主链试点中最容易出现的误操作和越权扩散风险。

## 下一步

1. 继续把切换保护从前端工作台下沉到更完整的模块开关/回退包/异常清单闭环。
2. 继续补强首批模块专用工作台，让 `saleOrder / purchaseOrder / accountInvoice / stockPicking / resPartner` 的主动作和核对区更专用。
3. 继续把 Timeline、Reminder、Command Palette 和切换台串成一套更完整的首批试点操作系统。
