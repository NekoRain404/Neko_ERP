# 2026-04-23 总览治理面板优化 Round

## 本轮目标

1. 收敛 `DashboardView` 和 `SettingsView` 中重复的提示条与摘要卡结构
2. 把重型治理面板切换为异步加载，降低首屏维护和打包压力
3. 让默认收起的治理台数据按需生成，避免折叠状态下继续计算大批量队列

## 本轮修改

1. 新增共享组件
   - `erp-client/src/components/CompactNoticeBar.vue`
   - `erp-client/src/components/SummaryCardGrid.vue`

2. 新增共享类型
   - `erp-client/src/types/summary-cards.ts`

3. 优化首页 `DashboardView`
   - 将治理面板组件改为 `defineAsyncComponent`
   - 用 `CompactNoticeBar` 替换多处重复的紧凑提示条
   - 用 `SummaryCardGrid` 替换治理摘要卡重复模板
   - 治理工作台默认收起时，不再提前构建 `Role Desk` 和 `Finance Batch` 大队列数据

4. 优化设置页 `SettingsView`
   - 将治理面板组件改为 `defineAsyncComponent`
   - 用共享组件替换治理摘要卡和折叠提示条
   - `Role Desk`、`Finance Batch`、`Risk Stats`、`Batch Review` 默认收起时按需生成行数据
   - 使用显式 helper 收口治理卡片动作，避免 slot 扩展字段带来的类型噪音
   - 删除被共享组件替代的旧样式定义，减少视图文件内重复 CSS

## 验证结果

1. `cd erp-server && mvn -q -DskipTests compile`
   - 通过

2. `cd erp-client && npm run build`
   - 通过
   - 仍存在 Vite 大包体 warning，当前未阻断构建

3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 通过
   - 核心 CRUD、名称过滤、动作烟测、平台层烟测、全量列表烟测均通过

## 当前价值

1. 继续压缩首页和设置页的模板重复度，后续再改治理文案和动作时只需要动共享组件
2. 默认折叠的治理台不再在后台无意义地生成整批 rows，降低大视图打开时的计算负担
3. 首页/设置页的治理区块更接近“桌面操作台”，而不是一长页重复卡片和提示条

## 下一步

1. 继续拆分 `DashboardView` / `SettingsView` 的治理区块，把更重的 operations 片段抽成独立子组件
2. 继续沿主线收敛 `ModuleWorkbench` 的超大 chunk，优先拆分财务、闭环、时间轴相关面板
3. 保持“默认收起 + 按需展开 + 按需计算”的策略，继续处理页面过乱的问题
