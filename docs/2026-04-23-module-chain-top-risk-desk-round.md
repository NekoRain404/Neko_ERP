# 2026-04-23 模块链路 Top-Risk 直达 Round

## 本轮目标

继续沿主线把模块工作台从“链路追溯可见”推进到“链路追溯可处理”，让每条链路都能直接打开自己的 top-risk 记录、文档区和时间轴，而不是只停留在聚合状态。

## 本轮修改

1. 链路门槛卡片新增 top-risk 直达动作
   - `erp-client/src/components/ModuleWorkbench.vue`
   - 放行门槛台的每张链路卡片现在可直接：
     - 打开链路追溯
     - 打开链路文档
     - 打开链路时间轴
   - 跳转目标优先使用链路 cockpit 聚合得到的真实 `topRiskModuleKey + topRiskRecordId`。

2. 执行动作中心补链路级财务追溯动作
   - `ModuleWorkbench.vue`
   - `executionActionRows` 新增“补齐链路财务追溯”动作。
   - 当某条链路仍有财务追溯缺口且已识别 top-risk 记录时，工作台会直接给出链路级动作入口。

3. 链路导出包补齐真实模块范围和链路 top-risk
   - `ModuleWorkbench.vue`
   - 模块回退演练包里的 chain row 不再错误写成当前模块标题，而是写入该链路实际模块组合。
   - 下列内容补入链路级 top-risk：
     - 模块门槛包
     - 模块回退演练包
     - 切换演练摘要
     - 模块异常包

4. 工作台与导出语义进一步对齐
   - 工作台里看到的链路追溯目标、导出包里的链路追溯目标、以及执行动作里的链路追溯目标，现在都指向同一套 backend cockpit 聚合结果。

## 当前价值

1. 首批切换链不再只是“知道哪里坏了”，而是能从模块工作台直接跳到链路级最该处理的那条记录。
2. 销售链和采购链的模块工作台更接近真实 cutover cockpit，能承接 ERPNext 风格的执行包，也保留 Monica 风格的上下文与时间轴入口。
3. 这一步让后续接 pilot sign-off、handoff owner、回退负责人模板时，不需要再重新发明一套链路 top-risk 语义。

## 下一步

1. 把链路级 top-risk 继续接进：
   - Dashboard 快捷动作
   - Command Palette 动作中心
   - Settings 的 cutover 面板
2. 给链路级 top-risk 增加更多 desk 旁路：
   - 直接打开 settlement desk
   - 直接打开 evidence docs
   - 直接打开 rollback packet
3. 把链路级执行动作下沉到 `saleOrder / purchaseOrder / accountInvoice / stockPicking / accountPayment` 的专用工作台推荐动作区。
