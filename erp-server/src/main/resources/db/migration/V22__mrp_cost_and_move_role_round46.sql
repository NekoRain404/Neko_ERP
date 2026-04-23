ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS component_cost NUMERIC(16,2) DEFAULT 0;
ALTER TABLE mrp_production ADD COLUMN IF NOT EXISTS finished_cost NUMERIC(16,2) DEFAULT 0;

ALTER TABLE stock_move ADD COLUMN IF NOT EXISTS move_role VARCHAR(32);
ALTER TABLE stock_move ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(16,2) DEFAULT 0;
ALTER TABLE stock_move ADD COLUMN IF NOT EXISTS total_cost NUMERIC(16,2) DEFAULT 0;

UPDATE mrp_production
SET component_cost = COALESCE(component_cost, 0),
    finished_cost = COALESCE(finished_cost, 0);

UPDATE stock_move
SET move_role = COALESCE(
        move_role,
        CASE
            WHEN name LIKE 'MO-COMP/%' THEN 'component'
            WHEN name LIKE 'MO-FG/%' THEN 'finished'
            ELSE NULL
        END
    ),
    unit_cost = COALESCE(unit_cost, 0),
    total_cost = COALESCE(total_cost, 0);
