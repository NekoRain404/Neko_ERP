-- Backfill schema columns for mrp/stock modules to align with current DTO/entity fields.

-- MRP BOM
ALTER TABLE mrp_bom ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE mrp_bom ADD COLUMN IF NOT EXISTS product_tmpl_id INTEGER;
ALTER TABLE mrp_bom ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE mrp_bom ADD COLUMN IF NOT EXISTS code VARCHAR(64);
ALTER TABLE mrp_bom ADD COLUMN IF NOT EXISTS product_qty NUMERIC(19,2);
ALTER TABLE mrp_bom ADD COLUMN IF NOT EXISTS company_id INTEGER;

UPDATE mrp_bom
SET name = COALESCE(name, code, CONCAT('BOM-', id::text))
WHERE name IS NULL;

UPDATE mrp_bom
SET product_qty = COALESCE(product_qty, 1.00)
WHERE product_qty IS NULL;

-- MRP BOM LINE
ALTER TABLE mrp_bom_line ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE mrp_bom_line ADD COLUMN IF NOT EXISTS bom_id INTEGER;
ALTER TABLE mrp_bom_line ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE mrp_bom_line ADD COLUMN IF NOT EXISTS product_qty NUMERIC(19,2);
ALTER TABLE mrp_bom_line ADD COLUMN IF NOT EXISTS company_id INTEGER;

UPDATE mrp_bom_line
SET name = COALESCE(name, CONCAT('BOM-LINE-', id::text))
WHERE name IS NULL;

UPDATE mrp_bom_line
SET product_qty = COALESCE(product_qty, 1.00)
WHERE product_qty IS NULL;

-- MRP PRODUCTION
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS name VARCHAR(64);
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS state VARCHAR(16);
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS product_qty NUMERIC(19,2);
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS bom_id INTEGER;
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS company_id INTEGER;

UPDATE mrp_production
SET name = COALESCE(name, CONCAT('MO-', id::text))
WHERE name IS NULL;

UPDATE mrp_production
SET state = COALESCE(state, 'draft')
WHERE state IS NULL;

UPDATE mrp_production
SET product_qty = COALESCE(product_qty, 1.00)
WHERE product_qty IS NULL;

-- STOCK LOCATION
ALTER TABLE stock_location ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE stock_location ADD COLUMN IF NOT EXISTS usage VARCHAR(32);
ALTER TABLE stock_location ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;
ALTER TABLE stock_location ADD COLUMN IF NOT EXISTS company_id INTEGER;

UPDATE stock_location
SET name = COALESCE(name, CONCAT('LOC-', id::text))
WHERE name IS NULL;

UPDATE stock_location
SET usage = COALESCE(usage, 'internal')
WHERE usage IS NULL;

-- STOCK WAREHOUSE
ALTER TABLE stock_warehouse ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE stock_warehouse ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE stock_warehouse ADD COLUMN IF NOT EXISTS company_id INTEGER;

UPDATE stock_warehouse
SET name = COALESCE(name, CONCAT('WH-', id::text))
WHERE name IS NULL;

UPDATE stock_warehouse
SET code = COALESCE(code, CONCAT('WH', id::text))
WHERE code IS NULL;

-- STOCK QUANT
ALTER TABLE stock_quant ADD COLUMN IF NOT EXISTS name VARCHAR(256);
ALTER TABLE stock_quant ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE stock_quant ADD COLUMN IF NOT EXISTS location_id INTEGER;
ALTER TABLE stock_quant ADD COLUMN IF NOT EXISTS quantity NUMERIC(19,2);
ALTER TABLE stock_quant ADD COLUMN IF NOT EXISTS company_id INTEGER;

UPDATE stock_quant
SET name = COALESCE(name, CONCAT('QUANT-', id::text))
WHERE name IS NULL;

UPDATE stock_quant
SET quantity = COALESCE(quantity, 0.00)
WHERE quantity IS NULL;

-- STOCK INVENTORY LINE
ALTER TABLE stock_inventory_line ADD COLUMN IF NOT EXISTS name VARCHAR(256);
UPDATE stock_inventory_line
SET name = COALESCE(name, CONCAT('INV-LINE-', id::text))
WHERE name IS NULL;

