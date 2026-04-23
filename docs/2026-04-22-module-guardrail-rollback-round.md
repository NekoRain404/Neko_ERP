# 2026-04-22 模块级 Guardrail 与回退运维 Round

## 本轮目标

1. 把 guardrail 运维入口从总控面板下沉到首批模块工作台。
2. 让首批模块可以直接打开对应的服务端脚本预设和生效规则。
3. 补齐模块级回退演练包导出与命令台入口，减少试点操作绕路。

## 本轮修改

### 1. 模块工作台下沉 Guardrail 运维

- `erp-client/src/components/ModuleWorkbench.vue`
  - 新增 `Guardrail Ops Desk`
  - 直接展示模块关联的 `before_save / before_action` 预设数量
  - 直接列出当前模块命中的服务端脚本预设卡片
  - 支持：
    - 打开预设草稿
    - 查看对应模型/事件的生效规则
    - 导出 / 复制模块级 guardrail 规则包

### 2. 模块工作台下沉回退演练

- `erp-client/src/components/ModuleWorkbench.vue`
  - 新增 `Rollback Drill Desk`
  - 直接展示：
    - 必备证据数量
    - 推荐上传类型
    - 关联链路门槛压力
  - 支持：
    - 导出 / 复制模块级回退演练包
    - 在工作台内直接执行模块回退

### 3. 服务端脚本工作台识别来源模块上下文

- `erp-client/src/views/modules/custom/SysScriptsView.vue`
  - 支持通过 `guardrailModule` 查询参数识别来源模块
  - 新增来源模块上下文横幅
  - 高亮当前模块命中的预设分组与预设卡片
  - 增加返回来源模块 guardrail 运维台的快捷入口

### 4. 服务端脚本预设新增模块映射能力

- `erp-client/src/utils/sys-script-presets.ts`
  - 新增模块到模型 / lane 的映射
  - 新增：
    - `listSysScriptPresetsForModule`
    - `resolvePrimarySysScriptModelForModule`
    - `resolveSysScriptLanesForModule`

### 5. 命令面板补齐模块级入口

- `erp-client/src/components/CommandPalette.vue`
  - 为首批模块新增：
    - Guardrail Desk
    - Rollback Desk
  - 让命令面板可以直接跳转到模块内的规则台与回退台

## 验证结果

1. `cd erp-server && mvn -q -DskipTests compile`
   - 通过
2. `cd erp-client && npm run build`
   - 通过
3. `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 通过
   - `42/42` 控制器 list smoke 通过
   - 平台层 smoke 通过
   - 核心动作 smoke 通过

## 当前价值

1. guardrail 不再只是系统级概念，而是贴着首批模块工作台落地。
2. 回退演练从“导出总包”推进到“模块内可执行”。
3. 服务端脚本工作台开始真正服务销售 / 采购 / 发票 / 库存 / 伙伴主线，而不是孤立存在。

## 下一步

1. 继续补模块级证据与 guardrail 的联动提示。
2. 继续补销售链 / 采购链的链内结果对象核对动作。
3. 继续补切换门槛、回退记录和主链 guardrail 的 smoke 覆盖。
