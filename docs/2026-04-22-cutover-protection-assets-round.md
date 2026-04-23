# 2026-04-22 Cutover Protection Assets Round

## 本轮目标

继续围绕 `VIBECODING_GUIDE.md` 的阶段 C：

1. 把回退机制补成可复用资产
2. 把 guardrail 规则补成可导出的标准材料
3. 让首页、设置页和命令中心都能直接导出这些保护层材料

## 本轮修改

### 1. 新增共享 protection packet 工具

新增文件：

1. `erp-client/src/utils/cutover-protection.ts`

提供：

1. `buildSharedRollbackDrillPacket`
2. `buildSharedGuardrailRulesPacket`

用途：

1. 统一导出“回退演练包”
2. 统一导出“guardrail 规则包”
3. 让 Dashboard、Settings 和 Command Palette 不再各自拼装

### 2. 设置页新增保护层导出入口

修改文件：

1. `erp-client/src/views/SettingsView.vue`

新增能力：

1. 导出回退演练包
2. 导出 guardrail 规则

这让 Settings 的 cutover 区不只负责开关和交接，也能直接产出回退与规则材料。

### 3. 首页新增保护层导出入口

修改文件：

1. `erp-client/src/views/DashboardView.vue`

新增能力：

1. 导出回退演练包
2. 导出 guardrail 规则

这样 Dashboard 的 hero action 也能直接产出保护层材料。

### 4. 命令中心新增保护层导出命令

修改文件：

1. `erp-client/src/components/CommandPalette.vue`

新增命令：

1. `Export Rollback Drill Packet`
2. `Export Guardrail Rules`

这样 `Ctrl+K` 已经可以直接导出：

1. 控制包
2. 阻塞包
3. 放行包
4. 回退演练包
5. guardrail 规则包

### 5. 新增回退演练脚本

新增文件：

1. `scripts/rollback_drill.py`

策略：

1. 复用现有 `smoke_core_actions.py` 里的回退链路函数
2. 不重造新的 HTTP 测试框架
3. 聚焦首批主链的 rollback drill

当前覆盖：

1. 销售确认回退
2. 销售开票回退
3. 采购账单回退
4. 发票付款回退

### 6. 新增 guardrail 规则文档

新增文件：

1. `docs/guardrail-rules.md`

用途：

1. 作为首批 guardrail 的人工阅读版本
2. 对齐当前 preset library 的业务语义
3. 给后续调规则的人一个固定参考入口

## 验证结果

本轮已完成集中验证：

1. `cd erp-client && npm run build` 通过
2. `cd erp-server && mvn -q -DskipTests compile` 通过
3. `docker compose up -d postgres` 已启动数据库基线
4. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh` 通过
5. 全控制器 list smoke 通过 `42/42`

## 当前价值

1. 切换保护层不再只停留在 UI 开关，而是有了规则包、演练包和脚本资产
2. Dashboard、Settings 和 Command Palette 都能直接导出这些材料，降低交接成本
3. `rollback_drill.py` 补上了开发文档中明确要求的演练脚本入口

## 下一步

1. 跑前端构建、后端编译和全量 smoke
2. 如无问题，提交本轮 protection asset 批次
3. 继续往模块级回退入口和 guardrail 运维台深化
