-- V3: runtime guardrails for migrated environments

CREATE TABLE IF NOT EXISTS ir_logging (
    id BIGSERIAL PRIMARY KEY,
    create_date TIMESTAMP DEFAULT NOW(),
    type VARCHAR(32),
    name VARCHAR(255),
    level VARCHAR(32),
    message TEXT,
    path VARCHAR(255),
    line VARCHAR(64),
    func VARCHAR(255),
    metadata TEXT,
    res_model VARCHAR(255),
    res_id BIGINT,
    user_id BIGINT
);

SELECT setval(
    pg_get_serial_sequence('sale_order', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM sale_order), 1), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('purchase_order', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM purchase_order), 1), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('stock_picking', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM stock_picking), 1), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('account_move', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM account_move), 1), 1),
    true
);
