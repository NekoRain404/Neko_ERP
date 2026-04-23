ALTER TABLE account_payment ADD COLUMN IF NOT EXISTS journal_entry_ref VARCHAR(255);

UPDATE account_payment
SET journal_entry_ref = 'MOVE/' || name
WHERE journal_entry_ref IS NULL
  AND name IS NOT NULL
  AND name <> '';
