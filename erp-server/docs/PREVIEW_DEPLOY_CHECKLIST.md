# NEKO_ERP 服务端 0.1 预览版部署清单

更新时间: 2026-04-23
适用范围: `erp-server` 预览版服务端部署与发版前核查

## 1. 使用方式

本清单用于服务端包发给试点团队前的最后核查。

建议至少执行一次“干净目录解压 + 按文档启动”的演练。

## 2. 基础依赖检查

发布前确认下面服务可用:

1. PostgreSQL
2. Redis
3. RabbitMQ
4. MinIO

默认端口:

- PostgreSQL: `5432`
- Redis: `6379`
- RabbitMQ: `5672`
- MinIO: `9000`

## 3. 配置检查

### 3.1 `settings.conf`

重点核查:

1. `server.port`
2. `server.servlet.context-path`
3. `spring.datasource.url`
4. `spring.datasource.username`
5. `spring.datasource.password`
6. `spring.data.redis.host`
7. `spring.rabbitmq.host`
8. `minio.endpoint`

### 3.2 预期接口根路径

默认应为:

```text
http://127.0.0.1:8080/api
```

### 3.3 PostgreSQL 历史数据卷检查

如果当前机器以前启动过别的预览环境，PostgreSQL 数据卷可能保留了旧账号和旧密码。

这会导致服务端启动时报出类似错误:

```text
FATAL: password authentication failed for user "neko"
```

出现这种情况时，优先检查:

1. 当前数据库里是否真的存在 `neko` 账号
2. `settings.conf` 中的数据库用户名密码是否与现有数据库一致
3. 当前 `postgres_data` 卷是否来自旧环境

如果不一致，不要直接误判为代码故障，应先对齐数据库账号和配置。

## 4. 启动检查

1. 解压服务端包
2. 核对 `bin/erp-server.jar` 存在
3. 核对 `conf/settings.conf` 存在
4. 执行 `start-server.sh` 或 `start-server.bat`
5. 确认启动过程没有明显 Flyway、数据库、Redis、RabbitMQ、MinIO 报错

## 5. 接口检查

最少确认下面事项:

1. 登录接口可访问
2. 当前用户接口可访问
3. 核心列表接口可访问
4. 客户端可成功连接当前服务端

## 6. 阻断发布的问题

出现下面任一问题，应暂停发包:

1. 服务端无法启动
2. Flyway 迁移失败
3. 登录接口不可用
4. 任意主链列表接口连续报错
5. 客户端无法连接当前服务端
6. `settings.conf` 修改后行为不符合预期
7. PostgreSQL 账号或密码与当前数据卷状态不一致

## 7. 发布前最后动作

1. 保留一份未修改的 `settings.conf`
2. 记录当前发包时间和版本号
3. 保存服务端日志
4. 把客户端试跑结果和服务端部署结果一起归档
