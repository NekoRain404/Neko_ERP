-- Guardrail for partially initialized accounting tables used by secondary smoke.

ALTER TABLE account_account ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE account_account ADD COLUMN IF NOT EXISTS code VARCHAR(64);
ALTER TABLE account_account ADD COLUMN IF NOT EXISTS account_type VARCHAR(32);
ALTER TABLE account_account ADD COLUMN IF NOT EXISTS company_id INTEGER;

ALTER TABLE account_journal ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE account_journal ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE account_journal ADD COLUMN IF NOT EXISTS type VARCHAR(16);
ALTER TABLE account_journal ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE account_journal ADD COLUMN IF NOT EXISTS currency_id INTEGER;

ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS name VARCHAR(64);
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS state VARCHAR(16) DEFAULT 'draft';
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS payment_type VARCHAR(16);
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS partner_id INTEGER;
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS amount NUMERIC(19,2);
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS currency_id INTEGER;
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS journal_id INTEGER;
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS memo VARCHAR(256);
ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS company_id INTEGER;

UPDATE account_account
SET name = COALESCE(name, CONCAT('ACCOUNT-', id::text))
WHERE name IS NULL;

UPDATE account_journal
SET name = COALESCE(name, CONCAT('JOURNAL-', id::text)),
    code = COALESCE(code, CONCAT('J', id::text)),
    type = COALESCE(type, 'general')
WHERE name IS NULL OR code IS NULL OR type IS NULL;

UPDATE account_payment
SET name = COALESCE(name, CONCAT('PAY-', id::text)),
    state = COALESCE(state, 'draft')
WHERE name IS NULL OR state IS NULL;
