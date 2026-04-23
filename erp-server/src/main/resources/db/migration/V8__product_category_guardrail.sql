-- V8: sequence guardrail for product_category

SELECT setval(
    pg_get_serial_sequence('product_category', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM product_category), 1), 1),
    true
);
