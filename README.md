<div align="center">

# 🌌 Neko ERP

**Next-Generation Enterprise Resource Planning System**

[![License](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.0-4FC08D?style=for-the-badge&logo=vue.js)](https://vuejs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=for-the-badge&logo=spring-boot)](https://spring.io/projects/spring-boot)
[![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

*重塑企业级软件的美学与性能边界*

[特性](#-核心特性) • [技术架构](#-技术架构) • [模块概览](#-核心业务模块) • [快速开始](#-快速开始) • [界面预览](#-界面预览)

</div>

---

## 📖 项目简介 (Introduction)

**Neko ERP** 是一个旨在打破传统 ERP 沉重、僵化刻板印象的现代化企业管理系统。

本项目使用当今最前沿的技术栈 **Java 21 + Vue 3 + Electron** 构建。不仅拥有媲美顶级原生桌面软件的**殿堂级 UI 交互体验**，更在后端引入了基于 AOP 的**通用工作流引擎**和**动态元数据扩展**能力，实现真正的“轻盈与专业并重”。系统专注于提供严谨的业务逻辑与极致的操作流，助力企业实现高效的数字化转型。

## 🗂 仓库分层 (Repository Layout)

仓库已经按“源码 / 开发指导 / 过程记录 / 参考源码”重新拆分，后续开发默认按下面的目录找资料：

- `erp-client/`
  Electron + Vue 3 桌面客户端源码
- `erp-server/`
  Spring Boot + MyBatis-Plus 后端源码
- `guides/`
  当前有效的开发指导、路线图和汇总文档
  核心入口是 `guides/VIBECODING_GUIDE.md`
- `process/rounds/`
  历史 vibecoding 过程记录、每轮 round 文档
- `references/`
  参考源码与上游项目快照
  包含 `references/odoo`、`references/erpnext`、`references/monica`
- `scripts/`
  开发脚本、代码生成、smoke、发布脚本

说明：

- 历史 round 文档保留原始语义，个别旧文档可能仍引用旧路径，这是历史记录的一部分
- 新开发、新说明、新脚本默认只写入新的分层目录，不再回到旧的混合 `docs/` 结构

## ✨ 核心特性 (Key Features)

- 🎨 **极致美学 UI**：抛弃传统的套壳 Web 界面，采用无边框沉浸式设计、毛玻璃动效、平滑的主从分栏布局 (Master-Detail) 以及全局 `Cmd+K` 指令面板，打造丝滑的桌面级交互。
- ⚡️ **全量高性能架构**：采用 Spring Boot 3.2 + MyBatis-Plus，提供极速的数据响应与百万级数据处理能力，确保高并发下的系统稳定性。
- 🔄 **通用业务流转引擎 (Universal Workflow Engine)**：基于 AOP 与状态机的智能引擎，无需为每个模块编写冗余代码，单据的验证、过账、流转、核销均可通过统一接口一键处理。
- 🧩 **全维度业务覆盖**：内置 40+ 核心业务模块，涵盖客户关系管理、销售、采购、库存、生产制造 (MRP) 及财务对账，实现端到端的业务闭环。
- 🧬 **动态架构设计**：采用混合模型扩展理念，基础业务字段保障严谨性，同时支持通过扩展列实现无代码的业务属性灵活增加。并引入多维时间轴聚合沟通与系统日志，提升单据追踪维度。
- 🖥 **原生桌面级增强**：借助 Electron 深度集成操作系统，提供系统级主动预警通知、多窗口并发工作以及原生快捷键支持。

## 🛠 技术架构 (Tech Stack)

### Backend (后端引擎)
- **核心框架**：Java 21, Spring Boot 3.2.x
- **持久层**：MyBatis-Plus 3.5.x, PostgreSQL 16
- **数据库迁移**：Flyway (自动化 Schema 演进)
- **安全与审计**：Spring Security, 自定义 AOP 审计追踪与行级安全 (RLS) 拦截器
- **其他中间件**：Redis, RabbitMQ, MinIO

### Frontend (前端界面)
- **核心框架**：Vue 3 (Composition API), Vite, TypeScript
- **UI 组件库**：Element Plus (深度定制主题)
- **状态管理**：Pinia
- **路由控制**：Vue Router 4
- **交互引擎**：HTML5 Native Drag-and-Drop (零依赖高性能拖拽)

### Desktop (桌面端)
- **容器**：Electron
- **通讯桥梁**：ContextBridge IPC (安全进程间通信)

## 📦 核心业务模块 (Core Modules)

系统包含了高度内聚且松耦合的 10 大核心领域：

1. **📊 工作台首页 (Dashboard)**：全模块概览与核心业务数据透视。
2. **🤝 客户关系 (CRM)**：线索/商机全生命周期跟进、动态状态看板、多维沟通时间轴。
3. **💰 销售与采购 (Sales & Purchase)**：订单审批流管理、自动化价格计算、进销存凭证无缝联动。
4. **📦 智能库存 (Inventory)**：多仓库/多层级库位管理、出入库及内部调拨 (Picking & Moves)、精准实时库存量追踪。
5. **⚙️ 生产制造 (MRP)**：多级物料清单 (BoM)、制造订单下达与执行反馈。
6. **🧾 财务与记账 (Accounting)**：标准会计科目与多账簿配置、业财一体化凭证自动生成、收付款对账管理。
7. **🎯 项目协同 (Projects)**：项目全景规划、任务分配与敏捷看板追踪。
8. **👥 人力资源 (HR)**：员工电子档案库、组织架构树、考勤打卡记录与休假审批流。
9. **🗃️ 基础数据 (Master Data)**：标准产品 SKU 及变体管理、企业多级价格表、多公司组织及多币种汇率配置。
10. **🛡️ 系统基建 (System Core)**：细粒度 RBAC 权限管控、系统级个性化偏好设置、全局操作审计与变更日志。

## 🚀 快速开始 (Getting Started)

## 📣 0.1 预览版发布目标

当前仓库已经切换到 `0.1 预览版` 目标。

本版本的定位不是“全量正式上线”，而是：

- 交付一个可以给小范围团队试跑的 Electron ERP 预览版
- 覆盖首批主链：主数据、销售、采购、调拨、发票、基础账户管理
- 保留 Docker 基础设施依赖，但把桌面端和后端启动路径尽量收敛成可交付的预览包

如果需要分别生成客户端包和服务端包，执行：

```bash
cd erp-client
npm run release:client
npm run release:server
```

如果需要一次性同时生成两个包，执行：

```bash
cd erp-client
npm run release:preview
```

如果需要直接执行“发布门禁”模式，除了打包外还会额外校验压缩包结构并输出门禁报告：

```bash
cd erp-client
npm run release:gate
```

当前会生成：

- `dist/NEKO_ERP-client-v0.1.0-preview.1`
- `dist/NEKO_ERP-server-v0.1.0-preview.1`
- `dist/NEKO_ERP-preview-delivery-v0.1.0-preview.1`
- 对应的 `.tar.gz` 压缩包
- 每个目录内各自的 `SHA256SUMS.txt`
- 每个目录内各自的安装顺序、用户手册、发布说明与 `release-manifest.json`
- 客户端试跑清单与服务端部署清单
- `dist/PREVIEW_RELEASE_GATE_REPORT.md` 门禁报告

其中总交付目录 `NEKO_ERP-preview-delivery-v0.1.0-preview.1` 会把:

- 客户端包
- 服务端包
- 门禁报告
- 试跑与部署清单
- 总入口 `START_HERE.txt`

整理到同一个可分发入口，适合直接发给试点负责人。

本次版本的最终发布说明见根目录:

- `RELEASE_NOTES.md`

发布脚本现在会在打包后自动校验:

- 客户端和服务端版本是否一致
- 发布目录结构是否完整
- 关键启动脚本、手册、配置和说明文件是否齐全
- `SHA256SUMS.txt` 是否可通过校验

如果你在本机继续做试跑联调，额外要注意一件事：

- 若 PostgreSQL 数据卷来自旧环境，库里的账号密码可能和当前 `settings.conf` 不一致
- 这类问题通常会表现为 `FATAL: password authentication failed for user "neko"`
- 出现时先对齐数据库角色与配置，再继续启动服务端

Linux 下如需同时生成 `AppImage / tar.gz`，可以使用：

```bash
cd erp-client
RELEASE_TARGET=linux npm run release:client
```

### 1. 环境要求
- Node.js 18+
- JDK 21+
- Maven 3.8+
- Docker & Docker Compose

### 2. 启动基础设施 (Database & Middleware)
```bash
# 启动 PostgreSQL, Redis, RabbitMQ, MinIO
docker compose up -d postgres redis rabbitmq minio
```

### 3. 启动后端 API (Server)
系统启动时，内置的 Flyway 机制将自动连接数据库、建立完整表结构并注入开箱即用的演示数据。
```bash
cd erp-server
mvn clean compile
mvn spring-boot:run
```
*后端 API 运行于 `http://localhost:8080/api`*

### 4. 启动前端界面 (Client)
打开一个新的终端窗口：
```bash
cd erp-client
npm install
npm run dev
```
*在浏览器中访问 `http://localhost:5173`，或通过 Electron 客户端打包运行以获得原生体验。*

> **默认管理员账号**: `admin` / `admin`
>
> **0.1 预览版说明**:
> - 当前推荐把客户端包和服务端包分开发给使用者
> - 请先启动服务端包，再启动桌面客户端
> - 服务端仍然依赖 PostgreSQL、Redis、RabbitMQ、MinIO 基础设施
> - 当前版本适合小范围试跑，不建议直接作为正式生产版交付

## 🎨 界面预览 (UI Showcase)

*(您可以稍后在此处添加系统的实际运行截图，例如：)*

* **「极简沉浸」工作台**：展示清晰的模块入口与舒适的排版空间。
* **分栏文档详情 (Master-Detail)**：展示左侧列表与右侧抽屉无缝融合的高级信息流交互。
* **高性能可视化看板**：展示零依赖的原生拖拽状态流转卡片。
* **Cmd+K 全局指令台**：展示通过快捷键唤起的极简命令与全局搜索面板。

## 🤝 参与贡献 (Contributing)

欢迎提交 Issue 和 Pull Request 参与共建。在提交代码前，请确保遵循项目中现有的代码规范与工程约束。

## 📄 开源协议 (License)

本项目采用 [GPLv3 License](LICENSE) 协议开源。

---
<div align="center">
  <i>"Simplicity is the ultimate sophistication." — Leonardo da Vinci</i>
</div>
