# 2026-04-22 Control Packet Unification Round

## 本轮目标

继续围绕 `VIBECODING_GUIDE.md` 的首批切换主线，把 Dashboard、Settings、Command Palette 三个切换控制面之间重复的导出逻辑进一步统一。

本轮重点不是再铺模块页面，而是继续做厚“切换控制台”这一层：

1. 共享控制包
2. 联系人矩阵
3. 未完成门槛矩阵
4. 首页演练包
5. 命令中心导出动作扩容

## 本轮修改

### 1. `cutover-packets.ts` 新增控制台共享 builder

新增：

1. `buildSharedChainContactMatrix`
2. `buildSharedPendingGateMatrix`
3. `buildSharedCutoverControlPacket`
4. `buildSharedFirstWaveRehearsalPack`

以及对应的数据结构：

1. `CutoverContactMatrixRow`
2. `CutoverPendingGateRow`
3. `CutoverControlModuleRow`

这意味着：

1. 联系人矩阵不再在 Dashboard / Command Palette / Settings 各自拼字符串
2. 未完成门槛矩阵不再各写一份
3. 控制包与演练包开始进入共享平台层

### 2. `DashboardView.vue` 统一到共享 packet 平台

首页本轮收口了三类逻辑：

1. 演练包改用 `buildSharedFirstWaveRehearsalPack`
2. 联系人矩阵复制改用共享 builder
3. 未完成门槛矩阵复制改用共享 builder

同时新增：

1. 首页控制包导出
2. 首页联系人矩阵导出
3. 首页未完成门槛矩阵导出

这样首页从“能看、能复制”往“能归档、能交接、能发给试点负责人”更推进了一层。

### 3. `SettingsView.vue` 增加更多标准化导出

设置页本来已经是切换主控台，这轮继续补了：

1. 控制包导出
2. 联系人矩阵导出
3. 未完成门槛矩阵导出

这让设置页不仅能改配置，也能直接产出标准材料，符合文档中“切换保护能力 + 文档/记录”一体交付的要求。

### 4. `CommandPalette.vue` 升级为更完整的切换动作中心

命令中心本轮新增或重构：

1. 链路 packet 数据统一组装
2. 链路 gate packet 改用共享 builder
3. 交接包改用共享控制包 builder
4. 新增导出动作：
   - blocker packet
   - acceptance packet
   - pilot manual
   - pilot confirmation template
   - contact matrix
   - pending gate matrix

这让 `Ctrl+K` 更接近文档要求中的“动作中心”，不只是搜模块和跳页面，而是直接完成首批切换链的导出与交接工作。

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

## 当前价值

本轮完成后，首批切换链的控制台层面又更稳定了一层：

1. Dashboard、Settings、Command Palette 的导出内容更一致
2. 导出材料更适合作为真实试点交接包
3. 后续再加链路/模块时，新增重复代码会更少
4. 共享 packet builder 更接近真正的平台层能力

## 下一步

1. 统一跑前端构建、后端编译、全量 smoke
2. 修复本轮共享 builder 接入导致的类型或行为问题
3. 继续把更多切换控制逻辑从页面中抽到共享工具层
4. 继续沿首批销售/采购链补强回退、放行、交接闭环
