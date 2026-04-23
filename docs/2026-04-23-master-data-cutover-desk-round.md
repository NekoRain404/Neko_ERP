# 2026-04-23 首批主数据切换台与记录级切换可见性 Round 1

## 本轮目标

- 提升 `resCompany / productTemplate / productProduct / productCategory / productPricelist` 这批首批主数据候选模块的工作台强度。
- 把首批模块的记录级切换状态、证据压力和最高风险提示直接下沉到详情页。

## 本轮修改

### 主数据共享工作台增强

- 在 `erp-client/src/components/FirstWaveMasterDataWorkbench.vue` 增加动态侧栏能力：
  - 试点入口状态
  - 门槛就绪度
  - 证据压力
  - 最高风险提醒
- 增加首批主数据的动态链路快照：
  - 链路负责人
  - 兜底负责人
  - 当前 `ready / 6`
  - 待完成阻塞项
- 增加主数据证据阶梯：
  - 必备/建议证据类别
  - 推荐上传类别
  - 快速打开证据台、回退台
- 增加最高风险记录卡片：
  - 直接打开风险记录
  - 直接跳转到演练台

### 记录级切换可见性增强

- 在 `erp-client/src/components/EntityTableView.vue` 增加 `记录切换台`：
  - 首批模块试点入口状态
  - 当前关联试点链路
  - 门槛就绪度
  - 证据压力
  - 提醒压力
  - 下一核对区域
- 在详情导航芯片里加入 `切换台` 入口。
- 增加记录级顶部快捷操作：
  - 打开切换设置
  - 打开文档区
  - 打开核对台
  - 打开最高风险区域
  - 直接停止当前模块试点入口
- 增加记录级最高风险卡片：
  - 展示提醒标题、级别、内容
  - 给出建议区域
  - 可直接导出交接摘要

## 验证结果

- `cd erp-server && mvn -q -DskipTests compile` 通过
- `cd erp-client && npm run build` 通过
- `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh` 通过
- 全量 controller list smoke：`42/42`

## 当前价值

- 首批主数据不再只是静态说明页，而是具备了动态试点控制视角。
- 记录详情页现在也能直接判断：
  - 当前记录是否还在试点范围
  - 当前证据是否够
  - 当前门槛是否够
  - 当前最高风险该先看哪里
- 主数据和事务链都更接近“可小范围切换、可回退、可验证”的工作方式。

## 下一步

- 继续把首批主数据的交接包、门槛包、回退包进一步下沉到记录级。
- 继续补 `resCompany / product*` 与销售、采购链的跨模块追溯跳转。
- 继续压缩操作路径，让更多切换动作从详情页和工作台一键完成。
