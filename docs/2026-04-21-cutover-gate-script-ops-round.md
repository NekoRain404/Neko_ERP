# 2026-04-21 切换门槛与脚本运维 Round

## 本轮目标

继续按 `VIBECODING_GUIDE.md` 做大批量主线推进，不再分散到单个模块小修，而是增强三类共享能力：

1. Settings 切换放行门槛台
2. Server Script 模板安装/停用操作流
3. 记录级回退包的 Timeline 与证据摘要

这一轮继续吸收 ERPNext 与 Monica 的精华：

- ERPNext：Server Script 模板化、放行门槛、可导出的运维包
- Monica：Timeline 事件、附件、交接上下文进入回退/交接材料

## 本轮修改

### 1. Settings 放行门槛台增强

文件：

- `erp-client/src/views/SettingsView.vue`

新增能力：

1. 放行门槛压力摘要
   - Ready Chains
   - Critical Chains
   - Pending Gates
   - Open Reminders

2. 每条链路的门槛卡片新增：
   - 直接提醒数
   - 严重提醒数
   - 必备证据槽位数
   - 最高风险记录
   - 建议阻塞项

3. 新增门槛操作：
   - `Draft Note`：根据当前风险自动生成门槛备注
   - `Copy Blockers`：复制当前链路阻塞摘要
   - `Top Risk`：直接跳到最高风险记录
   - `Export Gate Packets`：导出全部链路放行包
   - `Export Blocker Packet`：导出首批切换阻塞包

意义：

- 切换开关不再只是开/关，而是有放行证据、提醒压力和负责人信息
- 链路是否能切换可以从同一个 Settings 入口审查
- 阻塞项可以直接复制给试点负责人或回退负责人

### 2. 放行包内容增强

文件：

- `erp-client/src/views/SettingsView.vue`

导出的 gate packet 现在包含：

1. 链路模块范围
2. 放行门槛通过度
3. 必备证据槽位
4. 直接提醒数量
5. 严重/警告提醒数量
6. 最高风险记录
7. 提醒家族统计
8. 建议阻塞项
9. 证据槽位快照
10. 直接提醒明细
11. 负责人/回退负责人/演练负责人
12. 门槛备注

意义：

- 回退和放行不再依赖口头沟通
- 试点链路可以导出成可审查、可交接、可归档的文本包

### 3. Server Script 模板操作流增强

文件：

- `erp-client/src/views/modules/custom/SysScriptsView.vue`

新增能力：

1. 单个模板直接安装为启用规则
2. 按分组安装模板
3. 一次安装全部模板
4. 按分组停用匹配规则
5. 导出模板库 Markdown

覆盖分组：

1. 主数据
2. 销售 / 发票
3. 采购 / 付款
4. 平台层

意义：

- ERPNext 风格 Server Script 不再只是“有模板可复制”
- 现在可以从模板库直接安装 guardrail，缩短实施路径
- 出问题时可以按分组快速停用匹配规则，符合可回退原则

### 4. 记录级回退包增强

文件：

- `erp-client/src/components/EntityTableView.vue`

`Export Packet` 的 JSON 现在额外包含：

1. `timelineSummary`
   - totalCount
   - noteCount
   - attachmentEventCount
   - systemEventCount

2. `timelineEvents`
   - timestamp
   - type
   - title
   - content
   - author
   - relatedRef

3. `cutoverContext`
   - pilot checklist
   - summary cards
   - chain gate cards

回退面板新增展示：

1. Timeline Signals
2. Open Reminders

意义：

- Monica 风格 Timeline 不只用于页面展示，也进入回退包和交接材料
- 回退负责人可以直接看到当前记录是否有便签、附件事件、系统日志和直接提醒
- 回退包更接近“可交给人处理”的材料，而不是单纯 JSON 数据导出

## 验证结果

本轮已执行并通过：

1. `git diff --check`
2. `cd erp-client && npm run build`
3. `cd erp-server && mvn -q -DskipTests compile`
4. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`

Smoke 结果：

1. core smoke 通过
2. name-filter smoke 通过
3. core action smoke 通过
4. secondary action smoke 通过
5. secondary module smoke 通过
6. guardrail module smoke 通过
7. platform layer smoke 通过
8. full controller list smoke `42/42` 通过

## 当前价值

这一轮后，首批切换保护又推进一层：

1. Settings 能直接看链路是否满足切换门槛
2. 阻塞项能直接复制或导出
3. 放行包能批量导出
4. 脚本模板能直接安装/停用
5. 记录级回退包包含 Timeline 与附件事件摘要

这把 `VIBECODING_GUIDE.md` 里的“切换门槛、guardrail、回退入口、关键数据可追溯”继续往可操作状态推进。

## 下一步

继续推进：

1. 给 Server Script 安装/停用流补 smoke 或最小 API 验证
2. 把 Dashboard 的放行/阻塞摘要与 Settings 的 gate packet 统一
3. 给销售/采购链回退包增加下游对象批量摘要
4. 把试点用户手册导出做成固定模板
