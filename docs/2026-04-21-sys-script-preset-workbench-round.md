# 2026-04-21 服务器脚本预设工作台 Round

## 本轮目标

继续按 `VIBECODING_GUIDE.md` 的平台层主线推进，把 `sys_script` 从“能存规则”推进到“更适合首批切换团队直接使用”的状态。

本轮重点：

1. 扩展 `before_action` 的降级执行语法
2. 给 `sysScript` 补一个可直接操作的专用工作台
3. 让命令面板可以直接打开脚本模板
4. 用 smoke 覆盖空值和组合动作规则

## 本轮修改

### 1. `ServerScriptExecutor` 降级语法继续补强

文件：

- `erp-server/src/main/java/com/erp/server/common/script/ServerScriptExecutor.java`

本轮补强：

1. 修复 `doc.xxx == null` 模式下的错误消息分组 bug
2. 继续支持以下降级语法：
   - `if (doc.email == null) { throw ... }`
   - `if (action == 'action_confirm') { throw ... }`
   - `if (action == 'action_confirm' && doc.amountUntaxed >= 500000) { throw ... }`

意义：

- 即使 Groovy 在当前 JDK 下不兼容，首批平台层 guardrail 也还能继续运行
- 更贴近 ERPNext 式“小规则快速落地”的节奏

### 2. 新增 `sysScript` 专用工作台

文件：

- `erp-client/src/views/modules/custom/SysScriptsView.vue`
- `erp-client/src/views/modules/index.ts`

本轮新增：

1. `sysScript` 不再只靠通用页
2. 新工作台直接展示：
   - 首批脚本模板库
   - 降级语法示例
   - 运维提示
   - 实时脚本表格

意义：

- 服务端脚本开始具备“可操作工作台”
- 首批切换团队可以更快创建和调整 guardrail

### 3. 新增首批脚本模板与草稿预填

文件：

- `erp-client/src/utils/sys-script-presets.ts`
- `erp-client/src/components/EntityTableView.vue`

本轮新增脚本模板：

1. 伙伴保存前联系方式校验
2. 销售大额单据保存前校验
3. 采购保存前供应商校验
4. 发票过账前来源校验
5. 调拨验证前来源校验
6. 付款过账前来源校验

并支持：

- `?create=1&preset=...` 直接打开已预填好的脚本草稿

意义：

- 把平台层 guardrail 变成“模板复用”而不是“每次重写”
- 更符合速度优先、token 成本优先的开发策略

### 4. 命令面板加入脚本模板入口

文件：

- `erp-client/src/components/CommandPalette.vue`

本轮新增：

1. `Server Script Presets / 服务端脚本模板` 分区
2. 可直接从 `Ctrl+K` 打开某个模板草稿

意义：

- `Ctrl+K` 更接近真正的动作中心
- 平台层功能与 Electron 工作台进一步融合

### 5. `sysScript` 模块配置同步更新

文件：

- `erp-client/src/config/modules.ts`

本轮调整：

1. `eventName` 选项改成：
   - `before_save`
   - `before_action`
2. 过滤提示同步更新

意义：

- 避免 UI 暴露当前阶段并未落稳的事件名
- 让前后端能力边界保持一致

### 6. 平台层 smoke 覆盖继续加深

文件：

- `scripts/smoke_platform_layer.py`

本轮新增验证：

1. `before_save` 空值阻断
2. `before_action` 纯动作阻断
3. `before_action` 动作 + 数值组合阻断
4. 禁用脚本后动作恢复

意义：

- `sys_script` 已不再只是“能存表”，而是有基本回归保护
- 平台层更接近切换前可用状态

## 验证结果

本轮按固定要求执行：

1. `cd erp-server && mvn -q -DskipTests compile`：通过
2. `cd erp-client && npm run build`：通过
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`：通过

关键 smoke 结果：

- 平台层 smoke 通过
- `before_save` 空值阻断通过
- `before_action` 动作阻断通过
- `before_action` 动作 + 金额组合阻断通过
- 禁用脚本后动作恢复通过
- 全控制器 list smoke：`42/42` 通过

## 当前价值

这轮完成后，`sys_script` 的状态从“平台底座已接通”进一步升级为：

1. 有最小专用工作台
2. 有模板复用
3. 有命令入口
4. 有更强 smoke 覆盖
5. 有运行时兼容兜底

这让平台层更接近首批切换真正可用，而不只是代码层完成。

## 下一步

继续按主线推进：

1. reminder 与 command center 继续深化
2. `resPartner` / `saleOrder` Timeline 再补强一层
3. 销售链和采购链继续补主动作 guardrail 与回退入口
