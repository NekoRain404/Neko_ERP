ALTER TABLE sale_order
    ADD COLUMN IF NOT EXISTS picking_ref VARCHAR(100),
    ADD COLUMN IF NOT EXISTS invoice_ref VARCHAR(100);

ALTER TABLE purchase_order
    ADD COLUMN IF NOT EXISTS bill_ref VARCHAR(100);

UPDATE sale_order so
SET picking_ref = (
    SELECT sp.name
    FROM stock_picking sp
    WHERE sp.origin = so.name
    ORDER BY sp.id DESC
    LIMIT 1
)
WHERE COALESCE(so.picking_ref, '') = '';

UPDATE sale_order so
SET invoice_ref = (
    SELECT ai.name
    FROM account_invoice ai
    WHERE ai.origin_ref = so.name
    ORDER BY ai.id DESC
    LIMIT 1
)
WHERE COALESCE(so.invoice_ref, '') = '';

UPDATE purchase_order po
SET bill_ref = (
    SELECT ai.name
    FROM account_invoice ai
    WHERE ai.origin_ref = po.name
    ORDER BY ai.id DESC
    LIMIT 1
)
WHERE COALESCE(po.bill_ref, '') = '';
