NEKO_ERP 0.1 Preview

Release scope
- Desktop client: Electron preview package
- Local backend: bundled Spring Boot jar
- Core chains: master data, sales, purchase, stock picking, invoice, payment trace
- Basic account management: login, current session, change password, system users and roles

Operator prerequisites
1. Install Java 21 and ensure `java -version` is available.
2. Start infrastructure services before launching the preview:
   - PostgreSQL
   - Redis
   - RabbitMQ
   - MinIO
3. Default backend URL remains `http://127.0.0.1:8080/api`.

Bundled desktop behavior
- The packaged preview client will try to start the bundled backend jar automatically.
- If the backend does not come up, check the log at:
  `<userData>/logs/preview-backend.log`
- If you want to manage the backend yourself, set:
  `NEKO_ERP_DISABLE_EMBEDDED_SERVER=1`

Preview limitations
- This is a controlled preview release, not a full production build.
- Security is tightened for account basics, but full module-level RBAC is still pending.
- The preview should be used with a small pilot team and a clear rollback path.

Default admin
- Username: admin
- Password: admin
