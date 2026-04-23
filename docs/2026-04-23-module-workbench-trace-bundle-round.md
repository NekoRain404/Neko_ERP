# 2026-04-23 模块工作台财务追溯下沉 Round

## 本轮目标

把已经打通的 Dashboard / Settings 财务追溯记录级能力，继续下沉到模块工作台，避免工作台导出的 handbook、演练包、异常包仍然停留在摘要层。

## 本轮修改

1. 模块工作台改为复用统一财务追溯状态
   - `erp-client/src/components/ModuleWorkbench.vue`
   - 现在模块工作台的 `moduleFinancialTraceState` 改为复用共享的 `cutover-financial-trace` 工具，而不是继续保留一套本地拼装逻辑。

2. 模块工作台新增 trace bundle
   - `ModuleWorkbench.vue`
   - 在财务追溯台新增：
     - 复制追溯证据包
     - 导出追溯证据包
   - bundle 会按当前模块 backend cockpit 的记录优先级，抓取最多 3 条 detail 组成一份工作台级证据包。

3. 模块工作台深链优先走真实 backend detail
   - `openTopRiskRecord`
   - `openTopRiskDocuments`
   - `openTopRiskTimeline`
   - `openSettlementDesk`
   - 这些入口现在优先基于 backend trace top-risk 记录打开详情页，而不是只靠 reminder 跳转。

4. handbook / rehearsal / exception / gate / rollback 包补齐追溯引用
   - `erp-client/src/utils/cutover-packets.ts`
   - `erp-client/src/components/ModuleWorkbench.vue`
   - 下列导出内容现在可携带：
     - `financialTraceRecordRefs`
     - `financialTracePacketRefs`
   - 覆盖：
     - 模块操作手册
     - 模块演练摘要
     - 模块异常包
     - 模块门槛包
     - 模块回退演练包

## 当前价值

1. 专用工作台开始真正具备“记录级财务追溯交接能力”，而不只是首页 / 设置页能导包。
2. 首批切换模块的 handoff 资料更接近真实 cutover 执行包，便于现场试点、回退演练和人工补录交接。
3. 这一步让 ERPNext 风格的 packet 化证据和 Monica 风格的上下文工作台更进一步对齐。

## 下一步

1. 继续把 trace bundle / record refs 下沉到：
   - `saleOrder`
   - `purchaseOrder`
   - `accountInvoice`
   - `stockPicking`
   专用工作台的链路跳转说明。
2. 让工作台里的 chain gate 财务追溯，逐步吃到跨模块真实 cockpit，而不只是 reminder 聚合。
3. 把 trace bundle 再接到回退负责人导出模板和 pilot sign-off 模板里。
