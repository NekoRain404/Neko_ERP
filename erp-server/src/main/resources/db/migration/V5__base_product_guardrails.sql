-- V5: sequence guardrails for foundational base/product modules

SELECT setval(
    pg_get_serial_sequence('res_partner', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM res_partner), 1), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('product_template', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM product_template), 1), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('product_product', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM product_product), 1), 1),
    true
);
