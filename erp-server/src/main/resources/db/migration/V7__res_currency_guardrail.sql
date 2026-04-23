-- V7: sequence guardrail for res_currency

SELECT setval(
    pg_get_serial_sequence('res_currency', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM res_currency), 1), 1),
    true
);
