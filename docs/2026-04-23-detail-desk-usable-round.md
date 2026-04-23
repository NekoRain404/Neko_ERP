# 2026-04-23 详情工作区收口 Round

## 本轮目标

继续沿着 `VIBECODING_GUIDE.md` 的“快速可用 ERP”主线推进，不再扩散新概念，而是直接收口当前最影响日常使用的共享详情页问题：

1. 把记录详情从“长网页堆叠”收成“单记录工作区切换”
2. 修掉客户端吞掉服务端异常后只剩模糊报错的问题
3. 让文档导入后和当前详情页、时间轴状态保持一致

## 本轮修改

### 1. `EntityTableView` 进入工作区切换模式

- 顶部 section chip 现在开始承担真正的工作区切换职责，而不只是滚动定位。
- 新增 `record` 主记录工作区，把以下内容收回到统一区域：
  - 主表单字段
  - `ext_data`
  - notebook 子表
- 其他区域开始按 section 独立展示：
  - `cutover`
  - `context`
  - `chain`
  - `traceability`
  - `review`
  - `documents`
  - `workflow`
  - `reminders`
  - `timeline`
  - `rollback`
- 这让详情页更接近桌面 ERP 的“单对象多工作区”模式，而不是继续把所有面板同时摊开。

### 2. 客户端异常反馈改成“可见、可重试”

- `erp-client/src/api/http.ts`
  - 导出共享的 `resolveUiRequestErrorMessage`
- `erp-client/src/components/EntityTableView.vue`
  - 增加持久化的页面级失败提示条
  - 每类失败现在都有更明确的标题：
    - 列表刷新失败
    - 详情页打开失败
    - 动作执行失败
    - 保存失败
    - 删除失败
    - 文件导入失败
    - 时间轴刷新失败
  - 提供就地重试入口，而不是只靠一次性 toast
  - 详情页局部加载失败时，明确提示是：
    - 子表区域
    - 文档中心
    - 时间轴 / 提醒区域
    出现了问题

### 3. 文档导入和详情页状态同步

- 记录文档导入成功后，现在会同步刷新：
  - 文档中心
  - 提醒 / 时间轴信号
- 这样上传附件、合同、发票后，当前详情页能立即反映出来，不再像“文件传上去了但当前页没跟上”。

### 4. 详情页交互细节收口

- 顶部 `Refresh` 统一改为刷新当前视图：
  - 在列表页刷新列表
  - 在详情页刷新详情
- detail section chip 增加 active 态，当前工作区更明确。
- 详情页顶部增加“当前工作区”提示条，帮助操作员维持线性处理，而不是继续在整张页里扫来扫去。

## 验证结果

1. `cd erp-client && npm run build`
   - 通过
2. `cd erp-server && mvn -q -DskipTests compile`
   - 通过
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 通过
   - 核心 create/update smoke 通过
   - core / secondary action smoke 通过
   - platform layer smoke 通过
   - full controller list smoke `42` 个端点通过

## 当前价值

这一步不是“又加一批卡片”，而是把已经存在的大量详情能力真正收成可用桌面工作区：

1. 页面更克制
2. 服务端异常更可见
3. 主记录、证据、流程、提醒开始真正分层
4. 更接近“能让业务员连续使用”的状态，而不是只适合演示

## 下一步

1. 继续统一销售 / 采购 / 发票 / 付款的默认工作区落点
2. 把导出 / 打印 / 导入的最小企业刚需补成闭环
3. 继续瘦身 `EntityTableView` 和 `ModuleWorkbench` 的首屏复杂度
