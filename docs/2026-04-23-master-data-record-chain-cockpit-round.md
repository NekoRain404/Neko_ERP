# 2026-04-23 主数据记录级链路驾驶舱 Round

## 本轮目标

- 把首批主数据模块真正接入现有记录级链路驾驶舱，而不是停留在模块级工作台
- 让 `resCompany / productTemplate / productProduct / productCategory / productPricelist` 可以从详情页直达销售/采购主链或其精确支撑面
- 把切换台、证据台、回退包入口继续下沉到记录级，避免操作员在多个页面之间来回切换

## 本轮修改

- 前端 `EntityTableView.vue`
  - 将 `resCompany / productTemplate / productProduct / productCategory / productPricelist` 纳入首批链路驾驶舱覆盖范围
  - 为上述主数据模块补齐记录级 `Chain Cockpit`
    - `resCompany` 直达：
      - 公司产品模板范围
      - 公司价目表范围
      - 公司销售订单范围
      - 公司采购订单范围
      - 主体伙伴上下文
    - `productTemplate` 直达：
      - 变体包
      - 品类治理
      - 公司范围
      - 销售审查入口
      - 采购审查入口
    - `productProduct` 直达：
      - 父模板
      - 精确销售订单行
      - 精确采购订单行
      - 销售审查入口
      - 采购审查入口
    - `productCategory` 直达：
      - 上级分类
      - 下级分类
      - 模板目录
      - 销售审查入口
      - 采购审查入口
    - `productPricelist` 直达：
      - 公司范围
      - 币种范围
      - 销售价格审查
      - 目录范围
      - 采购范围
  - 为上述主数据模块补齐记录级 `Next Suggestions`
    - 主详情头部可以直接给出下一跳，不再只能依赖人工搜索
  - 为上述主数据模块补齐记录级 `Chain Action Deck`
    - 让主数据也能在详情页里直接推进到销售/采购/目录/价格相关工作区
  - 把首批记录级 reminders/rollback 可见性扩到：
    - `resCompany`
    - `productTemplate`
    - `productProduct`
    - `productCategory`
    - `productPricelist`
    - `accountPayment`
  - 在所有首批模块详情页的动作台中补统一入口：
    - 打开切换台
    - 打开证据台
    - 打开回退台
    - 打开交接台
  - 为主数据型记录补充更贴近治理语义的切换台/证据台说明文案
  - 对 `Next Suggestions` 做兜底过滤，避免生成无效链接按钮

## 验证结果

- `cd erp-server && mvn -q -DskipTests compile`
  - 通过
- `cd erp-client && npm run build`
  - 通过
- `docker compose up -d postgres && ./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
  - 通过
- 全控制器列表回归
  - `42/42` 通过
- 平台层 smoke
  - `ext_data`
  - `sys_script`
  - reminder
  - timeline
  - attachment aggregation
  - master evidence reminder
  - 全通过

## 当前价值

- 首批主数据不再只是“可维护”，而是已经具备“可沿主链继续推进”的记录级操作面
- 销售/采购主链和主数据链之间的跳转成本进一步下降，符合文档里“首批可切换链优先”的要求
- 切换/证据/回退入口继续统一收口到详情页，减少后续补专用工作台时的重复改动
- 更接近 ERPNext 的“从字段/对象继续推进到业务流”以及 Monica 的“记录本身携带证据与上下文”的组合形态

## 下一步

- 继续补强销售链和采购链的记录级回查与 guardrail，尤其是主数据进入订单后的更深追溯
- 继续把首批主链模块的专用工作台和记录级动作面打磨到切换门槛
- 继续推进模块开关、回退入口、交接包、试点门槛的统一化
