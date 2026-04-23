-- V9: bootstrap product_pricelist and sequence guardrail

CREATE TABLE IF NOT EXISTS product_pricelist (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256),
    active BOOLEAN DEFAULT TRUE,
    currency_id INTEGER REFERENCES res_currency(id),
    company_id INTEGER REFERENCES res_company(id)
);

SELECT setval(
    pg_get_serial_sequence('product_pricelist', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM product_pricelist), 1), 1),
    true
);
