ALTER TABLE sys_cutover_role_task
    ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(128);

ALTER TABLE sys_cutover_role_task
    ADD COLUMN IF NOT EXISTS due_at TIMESTAMP;

ALTER TABLE sys_cutover_role_task
    ADD COLUMN IF NOT EXISTS sla_status VARCHAR(16);

UPDATE sys_cutover_role_task
   SET assignee_name = COALESCE(NULLIF(assignee_name, ''), owner_name)
 WHERE assignee_name IS NULL
    OR assignee_name = '';

UPDATE sys_cutover_role_task
   SET sla_status = CASE
       WHEN status = 'done' THEN 'met'
       WHEN due_at IS NOT NULL AND due_at < CURRENT_TIMESTAMP THEN 'overdue'
       WHEN due_at IS NOT NULL AND due_at <= CURRENT_TIMESTAMP + INTERVAL '6 hour' THEN 'risk'
       ELSE 'open'
   END
 WHERE sla_status IS NULL
    OR sla_status = '';

CREATE INDEX IF NOT EXISTS idx_sys_cutover_role_task_due_at
    ON sys_cutover_role_task(due_at, sla_status);

CREATE TABLE IF NOT EXISTS sys_cutover_finance_result_pack (
    pack_id VARCHAR(64) PRIMARY KEY,
    scope_type VARCHAR(16) NOT NULL,
    scope_key VARCHAR(64) NOT NULL,
    scope_label VARCHAR(255) NOT NULL,
    pack_type VARCHAR(32) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    created_by VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_cutover_finance_result_pack_scope
    ON sys_cutover_finance_result_pack(scope_type, scope_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sys_cutover_finance_result_pack_type
    ON sys_cutover_finance_result_pack(pack_type, created_at DESC);

CREATE TABLE IF NOT EXISTS sys_cutover_close_task (
    task_id VARCHAR(64) PRIMARY KEY,
    scope_type VARCHAR(16) NOT NULL,
    scope_key VARCHAR(64) NOT NULL,
    scope_label VARCHAR(255) NOT NULL,
    module_key VARCHAR(64) NOT NULL,
    task_type VARCHAR(64) NOT NULL,
    task_label VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL,
    note TEXT,
    updated_by VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_cutover_close_task_scope
    ON sys_cutover_close_task(scope_type, scope_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sys_cutover_close_task_module
    ON sys_cutover_close_task(module_key, task_type, created_at DESC);
