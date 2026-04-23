-- V6: sequence guardrail for res_company

SELECT setval(
    pg_get_serial_sequence('res_company', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM res_company), 1), 1),
    true
);
