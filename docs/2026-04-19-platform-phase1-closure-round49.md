# 2026-04-19 Platform Phase-1 Closure (Round 49)

## 时间
- 2026-04-19 23:10 (Asia/Shanghai)

## 目标
- 在不改变现有数据库与文件缓存机制的前提下，完成平台层第一批能力闭环：
  - `ext_data` 动态字段
  - `sys_script` 服务端脚本
  - `timeline` 统一时间轴
- 一次性通过全量冒烟回归并进入可继续批量迁移状态。

## 本轮关键修复
- 修复新增控制器路由前缀错误：
  - `SysScriptController` 从 `/api/system/sys-script` 改为 `/system/sys-script`
  - `TimelineController` 从 `/api/system/timeline` 改为 `/system/timeline`
  - `IrNoteController` 从 `/api/base/ir-note` 改为 `/base/ir-note`
- 修复平台冒烟脚本稳定性：
  - `resPartner` 创建后查询改为按 `email` 精确回查
  - 新建数据带 `companyId=1`，与当前数据权限规则一致
  - 业务失败判定从 HTTP 状态改为响应体 `code != 200`
- 修复脚本引擎兼容问题（JDK 26 + Groovy）：
  - 在 `ServerScriptExecutor` 增加 Groovy 不兼容降级执行逻辑
  - 仅在出现 `Unsupported class file major version` 时触发降级
  - 降级支持常见规则：`if (doc.xxx OP value) { throw new RuntimeException('...') }`
  - 保持优先 Groovy 执行，不改变原设计入口

## 不变项确认
- 未修改数据库连接参数、数据库引擎、现有表缓存语义。
- 未修改文件缓存/对象存储机制（MinIO 路径与策略保持原样）。
- 未替换原有数据权限和分页框架，仅对冒烟数据与路由对齐。

## 验证结果
- 后端编译：
  - `cd erp-server && mvn -q -DskipTests compile` 通过
- 前端构建：
  - `cd erp-client && npm run build` 通过
- 全量联调：
  - `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh` 通过
  - `platform layer smoke` 通过
  - `all-list smoke` 42 个端点全部通过

## 影响范围
- 后端：
  - 控制器路由对齐、脚本执行器兼容增强、平台冒烟脚本修正
- 前端：
  - 保持既有平台层接入（timeline/ext_data）与既有 UI 结构，未新增破坏性变更

## 下一步（速度优先）
- 继续按 speed-first 文档推进第二批：
  - `action presets` 批量模板
  - `field registry` 与批量映射生成
  - Electron 原生提醒联动 timeline 事件
