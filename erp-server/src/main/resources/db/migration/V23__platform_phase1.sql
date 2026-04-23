ALTER TABLE IF EXISTS res_partner
    ADD COLUMN IF NOT EXISTS ext_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS sale_order
    ADD COLUMN IF NOT EXISTS ext_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS purchase_order
    ADD COLUMN IF NOT EXISTS ext_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS account_move
    ADD COLUMN IF NOT EXISTS ext_data JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_res_partner_ext_data ON res_partner USING GIN (ext_data);
CREATE INDEX IF NOT EXISTS idx_sale_order_ext_data ON sale_order USING GIN (ext_data);
CREATE INDEX IF NOT EXISTS idx_purchase_order_ext_data ON purchase_order USING GIN (ext_data);
CREATE INDEX IF NOT EXISTS idx_account_move_ext_data ON account_move USING GIN (ext_data);

CREATE TABLE IF NOT EXISTS sys_script (
    id SERIAL PRIMARY KEY,
    model VARCHAR(128) NOT NULL,
    event_name VARCHAR(128) NOT NULL,
    script_lang VARCHAR(32) NOT NULL DEFAULT 'groovy',
    script_code TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    remark VARCHAR(512),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_script_model_event ON sys_script(model, event_name);

CREATE TABLE IF NOT EXISTS ir_note (
    id SERIAL PRIMARY KEY,
    create_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    res_model VARCHAR(128) NOT NULL,
    res_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author_name VARCHAR(128),
    user_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ir_note_model_res ON ir_note(res_model, res_id, create_date DESC);

ALTER TABLE IF EXISTS ir_attachment
    ADD COLUMN IF NOT EXISTS create_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS ir_attachment
    ADD COLUMN IF NOT EXISTS user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_ir_logging_model_res ON ir_logging(res_model, res_id, create_date DESC);
CREATE INDEX IF NOT EXISTS idx_ir_attachment_model_res ON ir_attachment(res_model, res_id, create_date DESC);
