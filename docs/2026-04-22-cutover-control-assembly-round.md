# 2026-04-22 Cutover Control Assembly Round

## 本轮目标

继续围绕首批切换链，把 Dashboard、Settings、Command Palette 三处切换控制面的重复装配逻辑进一步平台化。

本轮重点不是新增很多单独页面，而是继续加强“平台层能力”：

1. 抽共享 `cutover-control` 装配层
2. 用共享装配层统一生成 packet chain / module / contact / pending gate 数据
3. 补控制包复制动作
4. 继续减少首页、设置页、命令中心三处的重复字符串拼装

## 本轮修改

### 1. 新增 `cutover-control.ts`

新增文件：

1. `erp-client/src/utils/cutover-control.ts`

主要提供：

1. `buildCutoverPacketChains`
2. `buildCutoverPacketModules`
3. `buildCutoverControlModules`
4. `buildCutoverContactRows`
5. `buildCutoverPendingGateRows`

这层负责把：

1. 链路联系人
2. 链路门槛状态
3. 关联提醒
4. 模块证据要求

装配成后续 packet builder 可以直接消费的数据结构。

### 2. `DashboardView.vue` 接入共享装配层

首页不再自己手工拼：

1. packet chains
2. packet modules
3. control modules
4. contact matrix rows
5. pending gate rows

同时新增：

1. 首页控制包复制

这样首页除了导出，还能直接把控制包贴给试点负责人或群组。

### 3. `SettingsView.vue` 接入共享装配层

设置页把下面几类数据也切到共享装配逻辑：

1. packet chains
2. packet modules
3. control modules
4. contact matrix rows
5. pending gate rows

同时新增：

1. 设置页控制包复制

这让设置页既是主控台，也是标准化交接材料的稳定出口。

### 4. `CommandPalette.vue` 接入共享装配层

命令中心本轮继续往真正的动作中心收敛：

1. packet chain 组装改走共享装配层
2. packet module 组装改走共享装配层
3. control module 组装改走共享装配层
4. contact matrix / pending gate rows 改走共享装配层

同时新增：

1. `Copy Handoff Packet`

这意味着 `Ctrl+K` 不只是导出，还能直接完成“复制控制包并贴到外部沟通渠道”的动作。

## 验证结果

本轮已完成集中验证：

1. `cd erp-client && npm run build` 通过
2. `cd erp-server && mvn -q -DskipTests compile` 通过
3. `docker compose up -d postgres` 已启动数据库基线
4. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh` 通过
5. 全控制器 list smoke 通过 `42/42`

## 当前价值

本轮的价值主要在于降低后续返工：

1. 三个控制面现在共用同一套切换装配逻辑
2. 后续新增导出包时，不再需要每个页面重复做一遍链路/模块数据整理
3. 首页、设置页、命令中心之间的导出语义会更一致
4. 更符合 `VIBECODING_GUIDE.md` 中“先做平台层、减少后续重复改代码”的方向

## 下一步

1. 跑前端构建、后端编译、全量 smoke
2. 修掉共享装配层带来的类型或行为问题
3. 继续把剩余切换控制面中的重复逻辑往平台层下沉
4. 在共享装配层稳定后，继续回到首批销售/采购链的切换与回退闭环
