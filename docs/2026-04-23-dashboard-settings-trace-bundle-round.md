# 2026-04-23 Dashboard / Settings 财务追溯证据包 Round

## 本轮目标

把首页与设置页从“提醒级摘要”推进到“记录级财务追溯引用”，并让 cutover 导出包开始携带真实的追溯记录与追溯包引用。

## 本轮修改

1. 共享财务追溯状态层
   - 新增 `erp-client/src/utils/cutover-financial-trace.ts`
   - 统一封装：
     - 模块级 cockpit -> 追溯状态
     - 链路级模块聚合 -> 追溯状态
     - top risk record / record refs / packet refs

2. 共享追溯证据包工具
   - 扩展 `erp-client/src/utils/financial-trace-packets.ts`
   - 新增：
     - `buildFinancialTraceRecordRefLabel`
     - `buildFinancialTracePacketRefLabel`
     - `buildFinancialTraceBundlePacket`
     - `buildFinancialTraceBundleFilename`
   - 支持把多个记录级 detail 合并成一个 bundle。

3. cutover 包结构增强
   - 扩展 `erp-client/src/utils/cutover-control.ts`
   - 扩展 `erp-client/src/utils/cutover-packets.ts`
   - 扩展 `erp-client/src/utils/cutover-protection.ts`
   - 新增字段：
     - `financialTraceRecordRefs`
     - `financialTracePacketRefs`
   - 让以下文档导出开始直接出现记录级线索：
     - blocker packet
     - acceptance packet
     - pilot manual
     - pilot confirmation
     - control packet
     - rehearsal / rollback packet

4. Dashboard 真正接入追溯证据包
   - `erp-client/src/views/DashboardView.vue`
   - 现在会：
     - 从 backend cockpit 生成真实模块级 / 链路级财务追溯状态
     - 把 record refs / packet refs 注入所有 cutover packet builder
     - 新增首页级：
       - 导出追溯证据包
       - 复制追溯证据包
   - bundle 以首批模块的 top-risk backend trace detail 作为核心证据。

5. Settings 真正接入 backend cockpit
   - `erp-client/src/views/SettingsView.vue`
   - 现在切换页刷新提醒时会同时拉取 backend financial trace cockpit。
   - `chainGateRows` 与模块导出不再只靠 reminder summary，而是优先使用真实 cockpit。
   - 新增设置页级：
     - 导出追溯证据包
     - 复制追溯证据包
   - 链路 gate / control / rollback / manual / confirmation 导出都会附带记录级追溯引用。

## 当前价值

1. cutover 导出包不再只是“Trace Ready / Blocked”的口头判断，而是开始附上具体记录线索。
2. 首页和设置页都能导出统一的财务追溯证据包，便于试点确认、回退演练和异常交接。
3. 这一步把 ERPNext 风格的 traceability packet 化，和 Monica 风格的上下文保留，进一步落到了主线切换文档链上。

## 下一步

1. 把 record refs / trace bundle 进一步接入：
   - 专用工作台 handbook
   - rehearsal desk
   - module exception packet
2. 继续把 `detailId` 深链贯穿到更多销售 / 采购 / 发票专用页。
3. 给 trace bundle 加上更多上下文：
   - 当前门槛状态
   - 负责人
   - 最近 rollback / signoff / exception export
