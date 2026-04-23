# 2026-04-23 Dashboard / Settings / Command 链路追溯贯通 Round

## 本轮目标

把链路级 top-risk 追溯从模块工作台继续外扩到三个桌面高频入口：

1. `Dashboard`
2. `Settings`
3. `CommandPalette`

目标不是再做一层 reminder 摘要，而是让三个入口都直接落到真实 backend cockpit 识别出的 top-risk 记录，并能继续直达 `documents / timeline`。

## 本轮修改

### 1. Dashboard 链路卡片新增链路级追溯文档与时间轴直达

更新文件：

- `erp-client/src/views/DashboardView.vue`

新增能力：

1. 为链路卡片补 `buildChainTraceQuery()`
2. 新增两个动作：
   - `Documents`
   - `Timeline`
3. 跳转逻辑统一使用：
   - `financialTraceSummary.topRiskModuleKey`
   - `financialTraceSummary.topRiskRecordId`

结果：

- 首页不再只能打开链路最高风险，还能直接打开该链路当前 top-risk 记录的文档区和 Monica 风格时间轴。

### 2. Settings 切换面板同步链路级 documents / timeline 入口

更新文件：

- `erp-client/src/views/SettingsView.vue`

新增能力：

1. 链路交接台补 `Documents / Timeline`
2. 门槛台补 `Documents / Timeline`
3. 两处都统一走链路级 `buildChainTraceQuery()`

结果：

- Settings 不再只是配置台，也成为真实 cutover 处理入口。
- 链路负责人在交接和门槛核对过程中，可以直接补附件、补说明、补时间轴上下文。

### 3. Command Palette 升级为真实链路财务追溯 cockpit

更新文件：

- `erp-client/src/components/CommandPalette.vue`

本轮重点：

1. 命令中心开始批量拉取首批模块的 backend financial trace cockpit
   - `fetchFinancialTraceCockpit()`
   - 落到 `moduleFinancialTraceCockpitMap`

2. 命令中心不再用旧的链路 reminder 摘要构造 trace 状态
   - 模块级使用 `buildCommandModuleFinancialTraceState()`
   - 链路级使用 `buildCommandChainFinancialTraceState()`

3. 链路命令新增真实 top-risk 旁路：
   - `Open {chain} Financial Trace Desk`
   - `Open {chain} Trace Documents`
   - `Open {chain} Trace Timeline`

4. 模块命令同步补齐真实 top-risk 旁路：
   - `Open {module} Financial Trace Desk`
   - `Open {module} Trace Documents`
   - `Open {module} Trace Timeline`
   - `Open {module} Top Risk`

5. 审核命令 `Review {chain}` 优先跳真实 trace top-risk
   - 若 cockpit 有真实 top-risk，直接开详情
   - 只有在没有真实 trace 记录时才回退到 reminder top-risk

6. 命令中心导出与控制包补齐真实 trace 引用
   - `financialTraceRecordRefs`
   - `financialTracePacketRefs`
   - `topRiskLabel`

### 4. 命令中心 trace packet refs 改为真实包引用

命令中心新增：

1. `buildCommandModuleFinancialTracePacketRefs()`
2. `buildCommandChainFinancialTracePacketRefs()`

当前 packet ref 规则：

1. 优先给出 top-risk 记录包名引用
2. 如果模块 cockpit 已加载记录，再补 bundle 包名引用

结果：

- cutover 导出包、联系人交接、运行手册中的财务追溯引用，不再把 record refs 误当 packet refs。

## 当前价值

1. 链路级 top-risk 已在 `Dashboard / Settings / CommandPalette` 三个桌面入口统一成一套真实 cockpit 语义。
2. 这一步明显吸收了 ERPNext 与 Monica 的两条精华：
   - ERPNext：以执行台和包输出为核心，把追溯、文档和状态做成稳定动作入口。
   - Monica：把文档和时间轴当成同一条关系上下文的一部分，而不是分散在隐藏页面里。
3. 这也更贴合“点击表单进入新页面而不是原地展开”的主线，因为现在所有高频入口都优先直达记录详情页和其文档/时间轴分区。

## 下一步

1. 继续把链路级 top-risk 旁路补到：
   - `PilotRiskStatsPanel`
   - `PilotBatchActionPanel`
   - `ActivityCenter`

2. 继续加强 Command Palette 的 cutover 动作中心能力：
   - 直接导出 trace bundle
   - 直接打开 rollback drill
   - 直接打开 chain handoff

3. 把 `saleOrder / purchaseOrder / stockPicking / accountInvoice / accountPayment` 的专用工作台继续收口成真正的首批切换 cockpit。
