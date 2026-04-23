# 2026-04-23 工作台执行台与闭环导出 Round

## 本轮目标

- 把切换闭环从“只在设置页和首页可见”推进到“首批模块工作台和记录页可直接执行”
- 把闭环状态、缺失项、过期项写入共享导出包，避免交接文档和 UI 脱节
- 继续围绕 `VIBECODING_GUIDE.md` 主线，优先补首批切换链的 cutover / rollback / guardrail / traceability

## 本轮修改

### 1. 记录页与工作台闭环联动补齐

- `erp-client/src/components/EntityTableView.vue`
  - 记录详情的链路卡片增加闭环状态、缺失项、过期项
  - 首批记录 cutover 卡片新增“闭环就绪”摘要
  - 首批动作 guardrail 在原有门槛阻塞之外，新增闭环证据阻塞
  - 记录页上的链路标签改成同时显示门槛状态和闭环状态

- `erp-client/src/components/ModuleWorkbench.vue`
  - 链路门槛行增加最近演练、最近签收、最近异常导出对应的闭环摘要
  - 工作台 cutover banner 增加闭环入口和闭环摘要
  - 模块异常导出会自动登记到 `cutoverOpsStore`
  - 新增“切换执行台”，把门槛缺口、闭环缺口、最高风险、异常导出、证据补齐、guardrail 审核、手册冻结、演练冻结都变成可执行动作
  - 模块级导出包增加闭环摘要和执行动作，减少交接时的信息缺失

### 2. 共享导出包补齐闭环语义

- `erp-client/src/utils/cutover-packets.ts`
  - `CutoverPacketChain`、`ModulePacketGateRow` 增加闭环字段
  - 放行包、阻塞包、链路 runbook、链路 gate 包、用户手册、试点确认模板、模块门槛包、模块演练包、模块异常包统一输出闭环状态
  - 模块手册新增执行动作导出段，导出的文档可直接指导操作员下一步动作

- `erp-client/src/utils/cutover-protection.ts`
  - 回退演练包增加闭环状态、缺失项、过期项

### 3. 首页 / 设置页导出链路继续补齐

- `erp-client/src/utils/cutover-control.ts`
  - `buildCutoverPacketChains` 增加闭环字段透传

- `erp-client/src/views/DashboardView.vue`
  - dashboard 导出的链路包现在包含闭环摘要

- `erp-client/src/views/SettingsView.vue`
  - settings 导出的链路包现在包含闭环摘要

## 验证结果

- `cd erp-server && mvn -q -DskipTests compile`
  - 通过

- `cd erp-client && npm run build`
  - 通过

- `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
  - 通过
  - `all-list-smoke: 42/42`

## 当前价值

- 首批模块工作台已经不只是“展示切换状态”，而是开始具备真正的切换执行台能力
- 闭环证据从 UI 延伸到导出包、回退包、交接包，切换准备更完整
- 销售链、采购链、主数据链的 cutover / rollback / evidence / guardrail 信息一致性进一步提高

## 下一步

- 继续把执行护栏下沉到 `saleOrder / purchaseOrder / accountInvoice / stockPicking / accountPayment` 的链路动作建议和结果对象回查
- 强化模块开关、回退入口、异常清单、手册导出的互相联动
- 继续沿 `VIBECODING_GUIDE.md` 优先补首批切换链，不发散到深会计、深制造和全量低代码
