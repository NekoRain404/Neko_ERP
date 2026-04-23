# 2026-04-23 桌面导出与打印闭环 Round

## 本轮目标

继续沿着“快速可用 ERP”主线推进，不做大而全输出系统，而是先把企业用户最常用、最缺的最小闭环补齐：

1. 让现有导出统一走 Electron 原生保存
2. 给详情页补“导出当前工作区 / 打印当前工作区 / 导入文件”快捷入口
3. 让跨模块详情跳转默认落到更相关的工作区

## 本轮修改

### 1. Electron 桌面桥新增保存与打印能力

- `erp-client/src-electron/preload.js`
  - 暴露：
    - `saveFile`
    - `printCurrentWindow`
- `erp-client/src-electron/main.js`
  - 新增：
    - `file:save`
    - `window:print`
  - 文件导出现在可通过原生保存对话框落盘
  - 当前窗口可以直接调起系统打印

### 2. 共享导出工具自动吃到原生保存

- `erp-client/src/utils/export.ts`
  - `downloadCsv`
  - `downloadJson`
  - `downloadText`
  现在统一先尝试走 Electron `saveFile`
  - 如果不在桌面端，则继续走浏览器下载

这意味着现有大量导出动作不需要重写，就能直接得到更像桌面 ERP 的保存体验。

### 3. `EntityTableView` 顶栏补齐最小输出闭环

- 详情页顶栏新增：
  - 导出当前工作区
  - 打印当前工作区
  - 导入文件
- 列表页顶栏新增：
  - 导出当前列表

其中“导出当前工作区”会按当前工作区自动选择更合适的内容：

- `context`：导出上下文摘要
- `workflow / review / reminders / rollback`：导出风险 / 异常包
- 其他工作区：导出交接摘要

### 4. 跨模块详情默认落点继续收口

- `erp-client/src/utils/module-navigation.ts`
  - 新增详情页默认工作区规则：
    - `resPartner / resCompany` -> `context`
    - `product*` -> `record`
    - `saleOrder / purchaseOrder` -> `chain`
    - `stockPicking / accountInvoice / accountPayment / accountMove` -> `workflow`
- 共享详情页内部跳转也开始复用这套默认落点逻辑

这让“打开对象详情页”不再只是打开一个 ID，而是尽量直接打开最相关的处理区域。

## 验证结果

1. `cd erp-client && npm run build`
   - 通过
2. `cd erp-server && mvn -q -DskipTests compile`
   - 通过
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
   - 通过
   - core / secondary create-update smoke 通过
   - core / secondary action smoke 通过
   - platform layer smoke 通过
   - full controller list smoke `42` 个端点通过

## 当前价值

这一步直接提高了“可用 ERP”的三个核心感受：

1. 导出不再像网页下载，而更像桌面应用保存
2. 详情页终于有了最小可用的打印 / 导入 / 导出快捷入口
3. 主链详情跳转更接近“打开就能做事”，而不是“打开后再找区域”

## 下一步

1. 继续把销售 / 采购 / 发票 / 付款详情页的默认落点和动作台压得更线性
2. 继续补最小导入模板和批量导入入口
3. 再补最小打印样式，而不是一上来做完整报表 / PDF 系统
