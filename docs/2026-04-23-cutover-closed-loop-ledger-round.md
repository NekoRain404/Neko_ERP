# 2026-04-23 切换闭环台账 Round 1

## 本轮目标

- 校准 `VIBECODING_GUIDE.md` 的真实进度和当前最欠缺项
- 把首批切换从“能导出资料”推进到“有回退演练记录、有试点签收记录、有异常导出台账”
- 让上述闭环信息进入共享切换快照，跟随服务端持久化一起同步

## 本轮修改

1. 开发总指导更新
   - 更新主线进度、平台层进度、切换保护进度
   - 新增 2026-04-23 的真实工程判断
   - 明确当前最欠缺的是回退闭环、签收证据、异常处理与责任绑定

2. 切换闭环台账
   - 新增 `cutover-ops` 轻量结构
   - 记录三类闭环对象：
     - 回退演练记录
     - 试点签收记录
     - 异常导出记录
   - 本地持久化后再纳入共享切换快照

3. 共享快照升级
   - `buildCutoverConfigSnapshot` 升级到 version 2
   - 新增 `operations` 字段
   - Dashboard / Settings / CommandPalette 在保存共享快照时一并带上闭环台账
   - `cutover-remote` 在载入服务端快照时一并恢复闭环台账

4. 设置页切换控制增强
   - 新增“回退闭环台”区块
   - 每条首批链路可直接：
     - 记录演练通过
     - 记录演练阻塞
     - 记录放行签收
     - 记录暂缓
     - 记录回退决定
     - 导出链路异常
   - 新增“闭环台账导出”

5. 异常导出记录化
   - 全局切换异常导出时自动登记导出台账
   - 链路级异常导出时自动登记导出台账

## 验证结果

1. `cd erp-server && mvn -q -DskipTests compile`
   - 通过

2. `cd erp-client && npm run build`
   - 通过

3. `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 通过
   - `42/42` controller list smoke 通过
   - platform smoke 通过

## 当前价值

- 切换配置不再只有“开关 + 联系人 + 门槛备注”
- 首批试点已经开始具备最小闭环证据链：
  - 最近一次回退演练
  - 最近一次试点签收
  - 最近一次异常导出
- 共享服务端快照开始承载真实切换运营信息，而不只是静态配置

## 下一步

1. 把闭环台账继续向“责任确认 + 回退步骤核对 + 结果对象核验”推进
2. 补 `stockPicking / accountInvoice / accountPayment` 更深层业务语义
3. 继续把 Timeline / Reminder / Command Center 收束成统一试点操作系统
