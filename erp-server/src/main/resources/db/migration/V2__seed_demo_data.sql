-- V2: Demo Data for Odoo Refactor

-- 1. 基础/币种/公司
INSERT INTO res_currency (id, name, symbol, rounding, decimal_places, active) VALUES
(1, 'CNY', '¥', 0.01, 2, TRUE),
(2, 'USD', '$', 0.01, 2, TRUE)
;

INSERT INTO res_company (id, name, active, currency_id) VALUES
(1, '我的 ERP 总部 (My ERP HQ)', TRUE, 1)
;

-- 2. 会计科目/账簿
INSERT INTO account_account (id, name, code, account_type, company_id) VALUES
(1, '库存现金 (Cash)', '1001', 'asset_cash', 1),
(2, '银行存款 (Bank)', '1002', 'asset_cash', 1),
(3, '应收账款 (Account Receivable)', '1122', 'asset_receivable', 1),
(4, '主营业务收入 (Product Sales)', '6001', 'income', 1),
(5, '主营业务成本 (Cost of Goods Sold)', '6401', 'expense', 1)
;

INSERT INTO account_journal (id, name, code, type, company_id) VALUES
(1, '销售日记账 (Sales Journal)', 'SAL', 'sale', 1),
(2, '采购日记账 (Purchase Journal)', 'PUR', 'purchase', 1),
(3, '现金日记账 (Cash Journal)', 'CSH', 'cash', 1)
;

-- 3. 基础资料 (Partner/Product)
INSERT INTO res_partner (id, name, type, active, is_company, company_id, email, phone) VALUES
(10, '阿里云计算有限公司 (AliCloud)', 'contact', TRUE, TRUE, 1, 'info@aliyun.com', '400-800-1234'),
(11, '华为技术有限公司 (Huawei)', 'contact', TRUE, TRUE, 1, 'info@huawei.com', '400-822-9999'),
(12, '演示个人客户 (Demo Customer)', 'contact', TRUE, FALSE, 1, 'customer@example.com', '13800138000')
;

INSERT INTO product_category (id, name, complete_name) VALUES
(1, '所有产品 (All)', 'All'),
(2, '电子办公 (Electronics)', 'All / Electronics')
;

INSERT INTO product_template (id, name, type, categ_id, list_price, standard_price, default_code, active, company_id) VALUES
(1, '华为笔记本 MateBook (Laptop)', 'consu', 2, 5999.00, 4500.00, 'NB001', TRUE, 1),
(2, '无线人体工学鼠标 (Mouse)', 'consu', 2, 199.00, 80.00, 'MS002', TRUE, 1)
;

INSERT INTO product_product (id, product_tmpl_id, default_code, active) VALUES
(1, 1, 'NB001', TRUE),
(2, 2, 'MS002', TRUE)
;

-- 4. 业务场景 (Sale Order)
INSERT INTO sale_order (id, name, state, partner_id, user_id, company_id, amount_untaxed, amount_tax, amount_total) VALUES
(1, 'S00001', 'sale', 12, 1, 1, 6198.00, 0, 6198.00),
(2, 'S00002', 'draft', 10, 1, 1, 199.00, 0, 199.00)
;

INSERT INTO sale_order_line (id, order_id, product_id, name, product_uom_qty, price_unit, price_subtotal, price_total, state) VALUES
(1, 1, 1, '华为笔记本 MateBook', 1, 5999.00, 5999.00, 5999.00, 'sale'),
(2, 1, 2, '无线人体工学鼠标', 1, 199.00, 199.00, 199.00, 'sale'),
(3, 2, 2, '无线人体工学鼠标', 1, 199.00, 199.00, 199.00, 'draft')
;

-- 5. 系统管理 (Users)
INSERT INTO sys_user (id, username, password, real_name, partner_id, status) VALUES
(1, 'admin', '$2b$12$Xd8OUY7d0vpGKVPXm4ZpzOdtWBPI9gWXzE8HfSjMRpQRWh/s5ghr.', '系统管理员 (Admin)', 1, 1)
;

-- 6. 财务凭证 (Account Move)
INSERT INTO account_move (id, name, ref, state, move_type, date, partner_id, journal_id, company_id, amount_total) VALUES
(1, 'BNK1/2026/04/0001', '演示初始化余额', 'posted', 'entry', NOW(), 1, 3, 1, 10000.00)
;

INSERT INTO account_move_line (id, move_id, name, account_id, debit, credit, balance, company_id) VALUES
(1, 1, 'Initial Balance Debit', 1, 10000.00, 0, 10000.00, 1),
(2, 1, 'Initial Balance Credit', 5, 0, 10000.00, -10000.00, 1)
;

-- 7. 制造模块演示数据 (MRP)
INSERT INTO mrp_bom (id, product_tmpl_id, product_id, code, product_qty, company_id) VALUES
(1, 1, 1, 'BOM-LAPTOP-01', 1.0, 1)
;

INSERT INTO mrp_bom_line (id, bom_id, product_id, product_qty, company_id) VALUES
(1, 1, 2, 1.0, 1) -- 笔记本包含一个鼠标
;

INSERT INTO mrp_production (id, name, state, product_id, product_qty, bom_id, company_id) VALUES
(1, 'MO/00001', 'draft', 1, 10.0, 1, 1)
;
