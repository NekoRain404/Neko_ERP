# 2026-04-22 Shared Packets And Record Context Round

## 本轮目标

在不偏离 `VIBECODING_GUIDE.md` 主线的前提下，把首批切换链的导出材料继续平台化，重点补强：

1. 模块级门槛包
2. 模块级异常包
3. 记录级上下文摘要
4. 记录级异常包
5. 回退包中的上下文与链路手册聚合

目标不是再铺新模块，而是继续把首批切换链的交接、追溯、回退材料做厚，减少试点操作员在 Dashboard、Settings、模块工作台、记录详情之间反复拼接信息的成本。

## 本轮修改

### 1. `cutover-packets.ts` 继续平台化

新增共享构建能力：

1. `buildSharedModuleGatePacket`
2. `buildSharedModuleExceptionPacket`
3. `ModulePacketGateRow`

这些能力让模块级门槛包、异常包不再是页面内联字符串，而是继续沉到共享工具层，后续 Settings、Dashboard、ModuleWorkbench 都可以复用。

### 2. `ModuleWorkbench.vue` 补强模块交付包

基于共享 packet builder，新增：

1. 模块门槛包导出
2. 模块门槛包复制
3. 模块异常包导出
4. 演练摘要复制

这样每个首批切换模块现在至少具备：

1. 操作手册
2. 门槛包
3. 演练摘要
4. 异常包

它们共同覆盖试点交接、放行核对、异常升级、回退准备四类高频场景。

### 3. `EntityTableView.vue` 继续做厚记录级交接能力

记录详情页新增：

1. 上下文摘要导出
2. 异常包导出
3. 交接动作卡新增 context / exception 相关动作

同时补强了三个导出内容：

1. `Context Brief`
   - 增加关系记忆
   - 增加可用模板
   - 增加切换链路与阻塞说明

2. `Handoff Note`
   - 增加关系记忆
   - 增加上下文覆盖
   - 增加可用模板
   - 增加下游回退摘要

3. `Rollback Packet JSON`
   - 增加 `coverageRows`
   - 增加 `alertItems`
   - 增加 `extDataInsights`
   - 增加 `contextBrief`
   - 增加 `exceptionPacket`

这部分的价值是把 ERPNext 风格的可追溯交付物，与 Monica 风格的关系上下文、背景知识、模板化交接一起收口到记录级别。

## 验证结果

已执行：

1. `cd erp-client && npm run build`
2. `cd erp-server && mvn -q -DskipTests compile`
3. `docker compose up -d postgres`
4. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

结果：

1. 前端构建通过
2. 后端编译通过
3. core smoke 通过
4. name-filter smoke 通过
5. core action smoke 通过
6. secondary action smoke 通过
7. secondary module smoke 通过
8. guardrail smoke 通过
9. platform layer smoke 通过
10. full controller list smoke 通过 `42/42`

说明：

第一次执行 `dev_up` 时因为本地 `PostgreSQL 5432` 未启动而失败；补起 `docker compose` 中的 `postgres` 后，整套验证已重新跑通。

## 当前价值

本轮完成后，首批切换链会进一步具备以下能力：

1. 模块级放行材料更标准化
2. 模块级异常升级材料更完整
3. 单据级交接不再只靠 CSV 和人工口头说明
4. 回退包可以直接携带上下文、关系记忆、链路责任和手册摘要

这会直接降低试点切换时的信息丢失风险，也更符合文档里“可切换、可回退、可验证”的要求。

## 下一步

1. 集中跑 `npm build`、`mvn compile`、全量 smoke
2. 修复本轮引入的构建或回归问题
3. 继续把共享 packet builder 扩展到 Dashboard / Settings 的更多导出入口
4. 继续补强首批切换链的 guardrail 和回退演练链
