-- Guardrail: some generic keyword filters use "name ILIKE ..." across modules.
-- Ensure key legacy tables have a name column to avoid runtime SQL 500.

ALTER TABLE mrp_bom ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE mrp_bom_line ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE stock_quant ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE sys_role ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS name VARCHAR(256);

-- Backfill name from existing business columns where possible.
UPDATE mrp_bom
SET name = COALESCE(name, code, CONCAT('BOM-', id::text))
WHERE name IS NULL;

UPDATE mrp_bom_line
SET name = COALESCE(name, CONCAT('BOM-LINE-', id::text))
WHERE name IS NULL;

UPDATE stock_quant
SET name = COALESCE(name, CONCAT('QUANT-', id::text))
WHERE name IS NULL;

UPDATE sys_role
SET name = COALESCE(name, role_name, role_code, CONCAT('ROLE-', id::text))
WHERE name IS NULL;

UPDATE sys_user
SET name = COALESCE(name, real_name, username, CONCAT('USER-', id::text))
WHERE name IS NULL;

