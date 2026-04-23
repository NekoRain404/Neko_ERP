# 2026-04-22 证据纪律与 Guardrail 联动 Round

## 本轮目标

1. 把首批模块的证据纪律从“侧边说明”升级为“可操作运维台”。
2. 让服务端脚本工作台支持按来源模块批量安装/停用 guardrail 预设。
3. 把证据、guardrail、回退三类动作继续在模块工作台和命令台打通。

## 本轮修改

### 1. 证据面板升级

- `erp-client/src/components/FirstWaveEvidencePanel.vue`
  - 新增证据摘要卡
  - 明确显示：
    - 必备类别数量
    - 推荐优先上传类别
    - 时间轴提示
  - 对推荐上传类别增加醒目标记
  - 将证据类别按优先级排序，先显示必备和推荐项

- `erp-client/src/utils/first-wave-evidence.ts`
  - 新增 `sortEvidencePresetsByPriority`
  - 用于把首批模块证据类型统一按：
    - 必备优先
    - 推荐上传优先
    - 名称排序

### 2. 模块工作台新增 Evidence Ops Desk

- `erp-client/src/components/ModuleWorkbench.vue`
  - 新增 `Evidence Ops Desk`
  - 直接显示：
    - 必备证据类别
    - 推荐上传类别
    - 当前模块证据范围
  - 支持：
    - 导出 / 复制模块级证据纪律包
    - 从模块工作台直接打开新草稿
    - 从最高风险记录直达文档区 / 时间轴
  - 继续把证据纪律和回退演练包、guardrail 运维台放在同一层级

### 3. 脚本工作台支持当前模块批量 guardrail 运维

- `erp-client/src/views/modules/custom/SysScriptsView.vue`
  - 在来源模块上下文区新增：
    - 当前模块推荐上传信息
    - 必备证据数量
    - 打开来源模块证据台
  - 新增动作：
    - 安装当前模块预设
    - 停用当前模块规则
    - 复制当前模块规则包
    - 导出当前模块规则包

### 4. 命令台补齐证据入口

- `erp-client/src/components/CommandPalette.vue`
  - 为首批模块新增 `Evidence Desk` 命令入口
  - 可以直接跳转到模块内的证据运维台

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

1. 证据纪律不再只是附件建议，而是首批切换模块的一线运维动作。
2. Monica 风格的上下文沉淀和 ERPNext 风格的 guardrail 规则进一步贴近同一业务工作台。
3. 回退前的证据缺口、guardrail 规则和最高风险记录现在可以在模块内更快联动处理。

## 下一步

1. 继续补首批模块的结果对象核对与链内跳转动作。
2. 继续把证据缺口、guardrail 阻断和提醒压力汇总到更明确的放行门槛视图。
3. 继续扩大主链专用工作台对销售链 / 采购链结果对象的操作闭环。
