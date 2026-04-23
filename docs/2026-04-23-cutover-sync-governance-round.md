# 2026-04-23 切换共享基线一致性治理 Round

## 本轮目标

- 把“服务端切换快照”从单纯可加载/可保存，继续推进到“能判断当前桌面是否已经和共享基线一致”。
- 让 Settings、Dashboard、Command Palette 都能看见本地状态是否领先于共享服务端基线，减少试点协作中的静默漂移。
- 保持主链 smoke、平台层 smoke、42/42 list 回归继续全绿。

## 本轮修改

### 1. 共享切换快照新增一致性判断

修改文件:
- `erp-client/src/stores/cutover-remote.ts`

新增能力:
- 对切换快照做稳定排序后的指纹计算
- 保存服务端快照后记录远端指纹
- 载入服务端快照后记录远端指纹
- 新增 `isSnapshotDirty(snapshot)` 判断当前本地快照是否与共享服务端基线不一致

这意味着切换治理开始从“有没有快照”提升到“当前客户端是不是已经脱离共享基线”。

### 2. Settings 直接显示“待写回共享基线”

修改文件:
- `erp-client/src/views/SettingsView.vue`

新增能力:
- 当当前本地切换配置领先于服务端快照时，明确提示:
  - 当前客户端存在尚未写回共享快照的切换变更
- 服务端保存按钮在这种情况下保持更强主动作语义

价值:
- 设置页从“配置工具”进一步变成“切换治理台”。
- 试点负责人能直接知道当前改动是否已经变成共享基线，而不是靠记忆判断。

### 3. Dashboard 直接显示共享基线漂移

修改文件:
- `erp-client/src/views/DashboardView.vue`

新增能力:
- 首页共享快照条新增“本地状态与共享基线不一致”的直接提示
- 若当前桌面还没把本地切换配置保存回服务端，会在首页明确显示
- 服务端保存按钮在有漂移时保持强调状态

价值:
- 这让 Dashboard 不再只是查看风险和导出包，而开始承担“首批试点总控台”的角色。
- 试点团队可以直接从首页看出当前桌面是不是工作在共享基线之上。

### 4. Command Palette 感知共享基线漂移

修改文件:
- `erp-client/src/components/CommandPalette.vue`

新增能力:
- 命令中心副标题会根据当前状态切换为:
  - 共享基线最新
  - 共享基线已过期/当前桌面未保存
- `保存服务端快照` 在没有本地漂移时自动禁用，避免重复无效保存

价值:
- `Ctrl + K` 更像真正的动作中心，而不是单纯命令列表。
- 操作者在全局入口就能知道“要不要先同步共享基线再继续交接”。

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
- `cutover config persistence` 验证继续通过
- `42/42` controller list smoke 通过

## 当前价值

- 共享切换快照开始具备“基线治理”语义，不再只是一个远端 JSON 存储点。
- 这一步非常关键，因为真正的首批试点切换风险，很多时候不是功能缺失，而是多人桌面之间的状态静默漂移。
- 现在系统已经能显式告诉你: 当前这台桌面有没有比共享基线走得更远。

## 下一步

1. 继续把共享基线和异常清单、回退包、放行签收串成闭环。
2. 继续把首批主链专用工作台做深，让专用动作和共享基线治理真正融合。
3. 继续把 reminder、timeline、command center 与共享基线联动，减少人工判断和口头交接。
