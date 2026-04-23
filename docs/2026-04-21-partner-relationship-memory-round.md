# 2026-04-21 伙伴关系记忆与时间轴入口 Round

## 本轮目标

继续按 `VIBECODING_GUIDE.md` 主线推进 Monica 风格的关系上下文能力，但不发散到深 CRM。

本轮只做高收益补强：

1. 给 `resPartner` 工作台补一个可复用的关系记忆面板
2. 把关系记忆模板复用到 Timeline 便签入口
3. 把时间轴入口提升进命令中心

## 本轮修改

### 1. 新增关系记忆预设工具

文件：

- `erp-client/src/utils/relationship-memory.ts`

本轮新增：

1. `resPartner` 的 Monica 风格关系记忆预设
   - 决策人
   - 最佳联系窗口
   - 合作风格
   - 商业风险
2. `saleOrder` / `purchaseOrder` 的交接型关系记忆预设
3. 对应的可复用 Timeline 便签模板

意义：

- 让“关系上下文”不再只有抽象说明，而是有可以直接复制和复用的模板
- 把 Monica 的人本信息沉淀到现有 Electron 工作台里

### 2. 新增 `RelationshipMemoryPanel`

文件：

- `erp-client/src/components/RelationshipMemoryPanel.vue`
- `erp-client/src/views/modules/custom/ResPartnersView.vue`

本轮新增：

1. `resPartner` 侧栏加入关系记忆面板
2. 面板内直接展示：
   - 建议优先沉淀的关系要点
   - 可复用便签模板
   - 一键复制模板

意义：

- 伙伴工作台更接近“关系记录仪”而不是纯地址簿
- 首批主数据切换团队能更快沉淀背景知识

### 3. Timeline 便签模板改为复用关系记忆预设

文件：

- `erp-client/src/components/TimelinePanel.vue`

本轮调整：

1. Timeline 面板不再只靠写死模板
2. 改为优先复用 `relationship-memory` 里的模板
3. 在编辑区直接显示当前模块的关系记忆提示

意义：

- 模板来源统一
- `resPartner`、`saleOrder`、`purchaseOrder` 的上下文书写方式更一致

### 4. 命令中心加入时间轴工作台入口

文件：

- `erp-client/src/components/CommandPalette.vue`

本轮新增：

1. `Timeline Desks / 时间轴工作台` 分区
2. 支持从命令中心直接打开最近的：
   - `resPartner` 时间轴
   - `saleOrder` 时间轴
   - `purchaseOrder` 时间轴

意义：

- `Ctrl+K` 更像真正的工作台动作中心
- 关系上下文录入不再埋在详情内部

## 验证结果

本轮主要是前端工作台增强。

执行：

1. `cd erp-client && npm run build`：通过

说明：

- 本轮未改后端接口和数据库迁移
- 继续沿用上一批已通过的后端编译与全量 smoke 基线

## 当前价值

这轮完成后，`resPartner` 已不只是“有 Timeline”：

1. 有关系记忆模板
2. 有侧栏上下文面板
3. 有时间轴命令入口
4. 有更接近 Monica 的人本工作方式

## 下一步

继续按主线推进：

1. 把相同的关系记忆方法继续沿 `saleOrder` / `purchaseOrder` 延展
2. 把 reminder 与 Timeline 的联动再收紧
3. 继续补销售链和采购链的切换前主动作 guardrail
