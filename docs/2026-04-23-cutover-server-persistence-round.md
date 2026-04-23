# 2026-04-23 切换配置服务端持久化 Round

## 本轮目标

- 把首批切换链的模块开关、链路负责人、放行门槛从“只存在客户端本地”推进到“可落库、可共享、可回放”的状态。
- 让 Settings 的切换页不仅能导入导出 JSON，还能显式从服务端加载和保存切换快照。
- 让 Electron 主壳层在启动后尝试拉取共享切换配置，避免不同客户端各自漂移。

## 本轮修改

### 1. 后端新增切换配置持久化

新增数据库迁移:
- `erp-server/src/main/resources/db/migration/V24__cutover_config_persistence.sql`

新增表:
- `sys_cutover_config`

字段:
- `config_key`
- `config_data JSONB`
- `updated_time`
- `updated_by`

新增后端文件:
- `erp-server/src/main/java/com/erp/server/modules/system/entity/SysCutoverConfig.java`
- `erp-server/src/main/java/com/erp/server/modules/system/dto/CutoverConfigDto.java`
- `erp-server/src/main/java/com/erp/server/modules/system/mapper/SysCutoverConfigMapper.java`
- `erp-server/src/main/java/com/erp/server/modules/system/service/CutoverConfigService.java`
- `erp-server/src/main/java/com/erp/server/modules/system/controller/CutoverConfigController.java`

新增接口:
- `GET /api/system/cutover-config/current`
- `PUT /api/system/cutover-config/current`

价值:
- 首批切换配置开始有了服务端单一来源，而不是只保存在浏览器本地。
- 后续回退包、模块开关、试点链协同可以围绕同一份快照继续扩展。

### 2. 前端切换页接入服务端快照

新增文件:
- `erp-client/src/api/cutover.ts`

修改文件:
- `erp-client/src/views/SettingsView.vue`

新增能力:

1. 切换页可显示服务端快照状态
   - 是否存在
   - 最近更新时间
   - 最近更新人

2. 切换页可直接执行:
   - `载入服务端快照`
   - `保存到服务端`

3. 从服务端加载后会同步刷新:
   - 链路开关
   - 模块覆盖开关
   - 链路负责人
   - gate 放行状态
   - 切换提醒数据

### 3. 主壳层在启动时加载共享切换配置

修改文件:
- `erp-client/src/layouts/AppLayout.vue`

新增能力:
- Electron 主壳层在后端可用且会话已登录时，启动后会尝试拉取当前切换快照并灌入 `cutoverStore`。

价值:
- 不再要求每台客户端先手动去 Settings 导入本地 JSON 才看到一致的切换状态。
- 首批模块详情页、切换台、动作护栏开始共享同一套服务端切换基线。

### 4. 补充平台层 smoke

修改文件:
- `scripts/smoke_platform_layer.py`

新增验证:
- 保存切换配置快照
- 再次读取并校验:
  - `chainStates`
  - `moduleOverrides`
  - `chainContacts`
  - `chainGateStates`
  - `updatedBy`

这意味着这层能力不是“只有页面按钮”，而是已经纳入平台层持续回归。

## 验证结果

已执行:

1. `cd erp-server && mvn -q -DskipTests compile`
2. `cd erp-client && npm run build`
3. `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

结果:

- 后端编译通过
- 前端 build 通过
- core smoke 通过
- core action smoke 通过
- secondary action smoke 通过
- secondary module smoke 通过
- guardrail smoke 通过
- platform smoke 通过
- 其中新增 `cutover config persistence` 验证通过
- `42/42` controller list smoke 通过

## 当前价值

- 切换开关不再只是“当前客户端记得什么”，而开始变成“系统知道什么”。
- 这一步直接补了 `VIBECODING_GUIDE.md` 中切换保护能力最核心的一层短板。
- 后续如果继续做回退入口、试点放行、链路负责人与异常包导出，就可以直接复用这份服务端切换快照。

## 下一步

1. 继续把切换快照和回退包、异常清单、放行门槛导出形成更完整闭环。
2. 继续补强 `saleOrder / purchaseOrder / accountInvoice / stockPicking / resPartner` 的专用工作台与动作语义。
3. 继续把 Electron reminder、Command Palette、Timeline 与服务端切换配置打通成统一的首批试点操作系统。
