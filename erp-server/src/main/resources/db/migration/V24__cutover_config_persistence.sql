CREATE TABLE IF NOT EXISTS sys_cutover_config (
    config_key VARCHAR(64) PRIMARY KEY,
    config_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_sys_cutover_config_updated_time
    ON sys_cutover_config(updated_time DESC);
