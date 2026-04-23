ALTER TABLE account_move_line ADD COLUMN IF NOT EXISTS residual_amount NUMERIC(19,2) DEFAULT 0;
ALTER TABLE account_move_line ADD COLUMN IF NOT EXISTS reconciled VARCHAR(32) DEFAULT 'open';
ALTER TABLE account_move_line ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(255);

UPDATE account_move_line
SET residual_amount = ABS(COALESCE(balance, 0)),
    reconciled = CASE
        WHEN COALESCE(balance, 0) = 0 THEN 'matched'
        ELSE 'open'
    END
WHERE residual_amount IS NULL
   OR reconciled IS NULL;

ALTER TABLE stock_inventory_line ADD COLUMN IF NOT EXISTS difference_qty NUMERIC(19,2) DEFAULT 0;
ALTER TABLE stock_inventory_line ADD COLUMN IF NOT EXISTS difference_state VARCHAR(32) DEFAULT 'match';

UPDATE stock_inventory_line
SET difference_qty = COALESCE(product_qty, 0) - COALESCE(theoretical_qty, 0),
    difference_state = CASE
        WHEN COALESCE(product_qty, 0) - COALESCE(theoretical_qty, 0) > 0 THEN 'gain'
        WHEN COALESCE(product_qty, 0) - COALESCE(theoretical_qty, 0) < 0 THEN 'loss'
        ELSE 'match'
    END
WHERE difference_qty IS NULL
   OR difference_state IS NULL;

ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS qty_produced NUMERIC(19,2);
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS finished_location_id INTEGER DEFAULT 1;
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS origin_ref VARCHAR(255);

UPDATE mrp_production
SET qty_produced = COALESCE(qty_produced, product_qty, 0),
    finished_location_id = COALESCE(finished_location_id, 1),
    origin_ref = COALESCE(origin_ref, name)
WHERE qty_produced IS NULL
   OR finished_location_id IS NULL
   OR origin_ref IS NULL;

ALTER TABLE stock_move ADD COLUMN IF NOT EXISTS production_id INTEGER;
