CREATE TABLE IF NOT EXISTS sys_cutover_role_task (
    task_id VARCHAR(64) PRIMARY KEY,
    scope_type VARCHAR(16) NOT NULL,
    scope_key VARCHAR(64) NOT NULL,
    scope_label VARCHAR(255) NOT NULL,
    role_key VARCHAR(32) NOT NULL,
    role_label VARCHAR(64) NOT NULL,
    owner_name VARCHAR(128) NOT NULL,
    status VARCHAR(16) NOT NULL,
    note TEXT,
    updated_by VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_cutover_role_task_scope
    ON sys_cutover_role_task(scope_type, scope_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sys_cutover_role_task_owner
    ON sys_cutover_role_task(owner_name, role_key, created_at DESC);

CREATE TABLE IF NOT EXISTS sys_cutover_finance_review (
    review_id VARCHAR(64) PRIMARY KEY,
    scope_type VARCHAR(16) NOT NULL,
    scope_key VARCHAR(64) NOT NULL,
    scope_label VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL,
    note TEXT,
    updated_by VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_cutover_finance_review_scope
    ON sys_cutover_finance_review(scope_type, scope_key, created_at DESC);
