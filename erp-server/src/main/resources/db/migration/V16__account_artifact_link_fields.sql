ALTER TABLE account_invoice ADD COLUMN IF NOT EXISTS origin_ref VARCHAR(255);
ALTER TABLE account_invoice ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(255);

ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS invoice_ref VARCHAR(255);

ALTER TABLE account_move ADD COLUMN IF NOT EXISTS reversed_entry_ref VARCHAR(255);
ALTER TABLE account_move ADD COLUMN IF NOT EXISTS reversed_from_ref VARCHAR(255);

UPDATE account_invoice
SET origin_ref = SUBSTRING(name FROM 6)
WHERE origin_ref IS NULL
  AND name LIKE 'BILL/%';

UPDATE account_payment
SET invoice_ref = memo
WHERE invoice_ref IS NULL
  AND memo IS NOT NULL
  AND memo <> '';

UPDATE account_invoice ai
SET payment_ref = ap.name
FROM account_payment ap
WHERE ai.payment_ref IS NULL
  AND ap.invoice_ref = ai.name;

UPDATE account_move
SET reversed_from_ref = ref
WHERE reversed_from_ref IS NULL
  AND name LIKE 'REV/%'
  AND ref IS NOT NULL
  AND ref <> '';

UPDATE account_move original_move
SET reversed_entry_ref = reverse_move.name
FROM account_move reverse_move
WHERE original_move.reversed_entry_ref IS NULL
  AND reverse_move.name LIKE 'REV/%'
  AND reverse_move.reversed_from_ref = original_move.name;
