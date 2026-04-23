# 2026-04-22 Client Error Noise + Detail Popout Round

## 本轮目标

围绕首批切换链的“可操作性与可沟通性”，把以下问题一次性收口：

1. 客户端频繁弹出“服务端异常”导致噪音和信息泄露风险
2. 详情页信息密度高时，支持快速弹出独立窗口进行并行核对

## 本轮修改

### 1) 后端异常返回语义收敛

文件：

1. `erp-server/src/main/java/com/erp/server/common/exception/GlobalExceptionHandler.java`

改动：

1. 默认不再把技术异常信息直接透传给前端
2. 仅当异常 message 明显是“用户可读业务提示”时才返回该 message
3. 其余情况统一返回 `服务端异常`，详细堆栈继续写入服务端日志

目标：

1. 降低试点阶段误泄露内部实现细节的概率
2. 让客户端提示更稳定，减少不可控的长错误串

### 2) 客户端 HTTP 错误去噪与脱敏

文件：

1. `erp-client/src/api/http.ts`

改动：

1. Element Plus Message 启用 `grouping`，同类报错不再刷屏
2. 500 类异常默认显示 `服务端异常 / Server error`
3. 技术性 message(异常类名/SQL/堆栈特征等)默认不直出，回落到通用提示

### 3) 详情页弹出独立窗口（降低信息拥挤）

文件：

1. `erp-client/src/components/EntityTableView.vue`

改动：

1. 详情页新增 `弹出窗口 / Pop Out` 按钮（仅 Electron 环境可用）
2. 列表行支持 `Ctrl/Command + Click` 直接弹出详情窗口

## 验证结果

本轮已完成集中验证：

1. `cd erp-client && npm run build` 通过
2. `cd erp-server && mvn -q -DskipTests compile` 通过
3. `docker compose up -d postgres` 已启动数据库基线
4. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh` 通过
5. 全控制器 list smoke 通过 `42/42`

## 当前价值

1. 试点阶段用户不会被“服务端异常”刷屏，同时减少技术细节泄露
2. 详情页可以弹出独立窗口并行核对，减少在单窗口内来回切换造成的信息混乱

## 下一步

1. 集中跑 `erp-client build`、`erp-server compile`、全量 smoke
2. 如果仍存在“服务端异常”噪音，进一步把后台轮询接口加入静默策略（只在状态面板提示，不弹 toast）
