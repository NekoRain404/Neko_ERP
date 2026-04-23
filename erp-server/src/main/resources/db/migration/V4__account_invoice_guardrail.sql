-- V4: ensure account_invoice exists for runtime list/detail queries

CREATE TABLE IF NOT EXISTS account_invoice (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    partner_id BIGINT,
    invoice_date DATE,
    due_date DATE,
    state VARCHAR(32) DEFAULT 'draft',
    company_id BIGINT,
    amount_untaxed NUMERIC(16, 2) DEFAULT 0,
    amount_tax NUMERIC(16, 2) DEFAULT 0,
    amount_total NUMERIC(16, 2) DEFAULT 0,
    payment_state VARCHAR(32),
    create_uid INTEGER,
    create_date TIMESTAMP DEFAULT NOW(),
    write_uid INTEGER,
    write_date TIMESTAMP DEFAULT NOW()
);
