# 2026-04-23 切换共享快照联动 Round

## 本轮目标

- 把已经落地的服务端切换快照从 `Settings` 单点能力，继续扩展成多个首批操作入口可共用的共享同步能力。
- 让 `Dashboard`、`Command Palette`、`AppLayout` 与 `Settings` 共用同一套切换快照加载/保存逻辑，减少本地状态漂移和重复实现。
- 保持主链 smoke、平台层 smoke、42/42 list 回归全绿。

## 本轮修改

### 1. 抽出共享切换快照 store

新增文件:
- `erp-client/src/stores/cutover-remote.ts`

新增能力:
- 统一管理:
  - 服务端切换快照加载状态
  - 服务端切换快照保存状态
  - 最近更新时间
  - 最近更新人
  - 是否已有共享快照
- 统一封装:
  - `loadRemoteSnapshot`
  - `saveRemoteSnapshot`
  - `applySnapshot`

价值:
- 不再让每个入口自己拼装“如何取服务端切换快照、如何写回 cutoverStore”。
- 后续继续把回退、门槛签收、异常清单接到共享切换基线时，不需要重复造轮子。

### 2. Settings 改为复用共享切换快照 store

修改文件:
- `erp-client/src/views/SettingsView.vue`

调整内容:
- 移除页面内重复的服务端切换快照读写逻辑。
- 改为直接复用 `cutover-remote` store。
- 保留现有:
  - 载入服务端快照
  - 保存到服务端
  - 服务端快照状态展示
  - 与本地备份、导入导出、提醒刷新联动

### 3. Dashboard 直接接入共享切换快照

修改文件:
- `erp-client/src/views/DashboardView.vue`

新增能力:
- 首页 hero 区新增“共享快照”状态条。
- 可直接:
  - `载入服务端快照`
  - `保存到服务端`
- 会显示:
  - 最近更新时间
  - 最近更新人
- Dashboard 打开时若还没有加载过共享快照，会主动尝试拉一次。

价值:
- 试点负责人不必先跳到 Settings，直接在首页就能确认当前共享切换基线是否最新。
- 首批试点的“控制台视角”开始真正围绕共享切换配置工作，而不是只做本地导出工具。

### 4. Command Palette 接入共享切换快照动作

修改文件:
- `erp-client/src/components/CommandPalette.vue`

新增动作:
- `载入服务端快照`
- `保存服务端快照`

补充联动:
- 打开命令台时，如果当前客户端尚未载入共享快照，会尝试自动拉取一次。
- 命令项副标题会带入服务端快照的最近更新时间，方便操作者判断是否需要同步。

价值:
- `Ctrl + K` 开始真正承担“动作中心”角色，不只是导出包和跳页面。
- 共享切换基线已经能从桌面级全局入口直接操作，符合 Electron 主工作台路线。

### 5. 主壳层改为复用共享切换快照 store

修改文件:
- `erp-client/src/layouts/AppLayout.vue`

调整内容:
- 启动后拉取共享切换快照时，改为复用 `cutover-remote` store，而不是壳层自己单独请求。

价值:
- 主壳层、设置页、首页、命令中心围绕同一套切换快照同步机制工作。
- 为后续继续做“共享异常包 / 共享放行状态 / 共享回退入口”打基础。

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

- 共享切换基线不再只存在于设置页，而开始贯穿首页、命令台、主壳层。
- 首批切换保护能力又前进一层，从“有后端快照”升级成“多个操作入口围绕同一份后端快照协同”。
- 这更接近 ERPNext 式的统一元数据/状态中心，也更接近 Monica 式的“上下文在多个入口都一致可见”。

## 下一步

1. 继续把共享切换快照与异常清单、回退包、放行签收串成完整闭环。
2. 继续把 `saleOrder / purchaseOrder / accountInvoice / stockPicking / resPartner` 的专用工作台做深。
3. 继续把 Command Palette、Reminder、Timeline 直接接入共享切换基线，减少人工核对和手动同步。
