# NEKO_ERP 服务端使用手册

更新时间: 2026-04-23
适用范围: `erp-server` Spring Boot 服务端
目标读者: 开发人员、实施人员、运维人员、试点支持人员

## 1. 服务端定位

NEKO_ERP 服务端负责下面几类核心能力:

- 提供业务 API
- 管理认证与当前会话识别
- 执行数据库迁移
- 维护主数据和业务单据
- 支撑时间轴、附件、提醒和脚本能力
- 为 Electron 客户端提供统一后端入口

当前默认 API 根路径:

```text
http://127.0.0.1:8080/api
```

## 2. 运行环境要求

### 2.1 软件版本

- Java 21
- Maven 3.8+
- PostgreSQL 16 或兼容版本
- Redis 7+
- RabbitMQ 3+
- MinIO

### 2.2 本地基础设施

项目根目录默认提供 `docker-compose.yml`，可用于启动基础依赖:

```bash
docker-compose up -d postgres redis rabbitmq minio
```

默认端口:

- PostgreSQL: `5432`
- Redis: `6379`
- RabbitMQ: `5672`
- RabbitMQ 管理台: `15672`
- MinIO API: `9000`
- MinIO Console: `9001`

## 3. 目录说明

`erp-server` 当前重点目录如下:

- `src/main/java/`
  服务端 Java 源码
- `src/main/resources/`
  配置与数据库迁移资源
- `docs/USER_MANUAL.md`
  当前服务端使用手册
- `pom.xml`
  Maven 构建配置

## 4. 启动方式

### 4.1 开发模式启动

```bash
cd erp-server
mvn spring-boot:run
```

### 4.2 编译检查

```bash
cd erp-server
mvn -q -DskipTests compile
```

### 4.3 打包

```bash
cd erp-server
mvn -q -DskipTests clean package
```

当前预览版默认输出:

```text
erp-server/target/erp-server.jar
```

## 5. 配置说明

服务端预览版建议配置见:

```text
erp-client/build-resources/preview/application-preview.yml.example
```

除此之外，服务端现在也支持直接读取:

```text
erp-server/settings.conf
```

优先级说明:

1. 如果启动时找到了 `settings.conf`，其中的键值会覆盖 `application.yml`
2. 如果没有找到 `settings.conf`，则继续使用 `application.yml` 默认值
3. 如需自定义路径，可通过下面任一方式指定:
   - JVM 参数: `-Dneko.erp.settings.path=/path/to/settings.conf`
   - 环境变量: `NEKO_ERP_SETTINGS_PATH=/path/to/settings.conf`

当前默认会按下面顺序查找:

1. `settings.conf`
2. `config/settings.conf`
3. `erp-server/settings.conf`

当前重点配置包括:

### 5.1 Web

- `server.port`
- `server.servlet.context-path`

### 5.2 数据库

- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`

### 5.3 Redis

- `spring.data.redis.host`
- `spring.data.redis.port`

### 5.4 RabbitMQ

- `spring.rabbitmq.host`
- `spring.rabbitmq.port`
- `spring.rabbitmq.username`
- `spring.rabbitmq.password`

### 5.5 MinIO

- `minio.endpoint`
- `minio.access-key`
- `minio.secret-key`
- `minio.bucket`

### 5.6 JWT

- `jwt.secret`
- `jwt.expiration`

### 5.7 `settings.conf` 示例

```properties
server.port=8080
server.servlet.context-path=/api
spring.datasource.url=jdbc:postgresql://localhost:5432/neko_erp
spring.datasource.username=neko
spring.datasource.password=neko
```

如果你只想改端口，最小可只保留:

```properties
server.port=8081
```

## 6. 数据库迁移

系统启动时会执行 Flyway 迁移。

当前原则:

- 迁移脚本尽量幂等
- 新库和已有库都要能执行
- 启动时自动建立和补齐结构

如果数据库无法启动，优先检查:

- PostgreSQL 是否已启动
- 数据库名、用户名、密码是否正确
- 当前账号是否有建表权限
- 迁移脚本是否与当前库状态冲突

## 7. 认证与账户

### 7.1 登录接口

```text
POST /api/auth/login
```

### 7.2 当前用户接口

```text
GET /api/auth/me
```

### 7.3 当前密码修改接口

```text
POST /api/auth/change-password
```

### 7.4 当前认证语义

当前实现重点如下:

- 服务端基于 token 识别当前用户
- 会话按无状态接口方式处理
- 当前密码修改要求校验原密码
- 新密码与确认密码必须一致
- 旧的明文密码会在成功登录后逐步升级为 BCrypt 哈希

默认管理员账号:

```text
用户名: admin
密码: admin
```

## 8. 0.1 预览版重点模块

服务端当前优先支撑下面几类模块:

### 8.1 主数据

- `res_partner`
- `res_company`
- `product_template`
- `product_product`
- `product_category`
- `product_pricelist`

### 8.2 销售链

- `sale_order`
- `stock_picking`
- `account_move` 中的发票语义

### 8.3 采购链

- `purchase_order`
- 账单与付款追踪相关对象

### 8.4 系统基础

- `sys_user`
- `sys_role`
- `auth`
- timeline / note / attachment

## 9. 联调与预览版发布

### 9.1 本地开发联调

项目根目录提供统一脚本:

```bash
./scripts/dev_up.sh
./scripts/dev_down.sh
```

说明:

- `dev_up.sh` 会尝试启动后端和桌面端
- `dev_down.sh` 会停止相关本地进程

### 9.2 预览版发布

项目根目录提供预览版发布脚本:

```bash
cd erp-client
npm run release:server
```

如果需要同时生成客户端和服务端两个包:

```bash
cd erp-client
npm run release:preview
```

如果需要执行完整的预览版发布门禁:

```bash
cd erp-client
npm run release:gate
```

当前服务端独立发布目录包含:

1. `bin/erp-server.jar`
2. `conf/settings.conf`
3. `start-server.sh`
4. `start-server.bat`
5. `docs/server-user-manual.md`
6. `docs/server-deploy-checklist.md`

发布脚本会完成:

1. 服务端打包
2. 服务端目录组装
3. 启动脚本生成
4. `SHA256SUMS.txt` 生成
5. 压缩包结构校验
6. 门禁报告生成

## 10. 日志与排错

### 10.1 开发期日志

开发联调时，通常可从下面位置查看运行日志:

- `.runtime/server.log`
- `.runtime/desktop.log`

### 10.2 常见故障排查顺序

推荐按这个顺序排查:

1. Java 是否正确安装
2. PostgreSQL、Redis、RabbitMQ、MinIO 是否可访问
3. 数据库连接参数是否正确
4. 端口 `8080` 是否被其他进程占用
5. Flyway 迁移是否报错
6. 当前账号是否可正常登录
7. PostgreSQL 数据卷是否沿用了旧账号或旧密码

## 11. 常见问题

### 11.1 后端启动失败

优先检查:

- Java 版本是否为 21
- Maven 是否可用
- 基础设施是否启动
- `settings.conf` 是否正确
- 启动脚本是否指向正确的 `settings.conf`
- PostgreSQL 当前数据卷中的账号密码是否仍和 `settings.conf` 一致

### 11.1A PostgreSQL 认证失败

如果日志中出现:

```text
FATAL: password authentication failed for user "neko"
```

优先不要直接怀疑业务代码。

更常见的原因是:

1. 本机 `postgres_data` 卷是旧环境遗留
2. 当前库里并不存在 `neko` 角色
3. 当前数据库密码已经被本地历史环境改过

此时应先对齐数据库角色、密码和 `settings.conf`，再继续启动服务端和跑 smoke。

### 11.2 登录接口报错

优先检查:

- `sys_user` 中是否存在目标用户
- 用户状态是否启用
- 密码是否正确
- token 相关配置是否异常

### 11.3 修改密码失败

优先检查:

- 原密码是否正确
- 新密码与确认密码是否一致
- 当前 token 是否已失效

### 11.4 附件或对象存储异常

优先检查:

- MinIO 是否启动
- endpoint 和 bucket 是否正确
- access key / secret key 是否正确

## 12. 试点运行建议

0.1 预览版阶段，服务端使用建议如下:

- 优先服务小范围试点团队
- 发布前先跑编译与打包链
- 保留数据库备份
- 关键对象必须可追溯
- 问题记录优先落到文档或时间轴，不要只停留在口头反馈

当前版本重点是“可试跑、可排错、可回退”，不是“全模块生产级完成态”。
