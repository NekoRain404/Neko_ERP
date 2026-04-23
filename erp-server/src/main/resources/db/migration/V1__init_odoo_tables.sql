-- Odoo ERP Final Comprehensive Schema (V1 - Full Restore & Audit Support)

-- 1. Base / Partners
CREATE TABLE IF NOT EXISTS res_currency (id SERIAL PRIMARY KEY, name VARCHAR(32), symbol VARCHAR(16), rounding NUMERIC(12,6), decimal_places INTEGER, active BOOL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS res_company (id SERIAL PRIMARY KEY, name VARCHAR(256), partner_id INTEGER, currency_id INTEGER, active BOOL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS res_partner (id SERIAL PRIMARY KEY, name VARCHAR(256), type VARCHAR(16) DEFAULT 'contact', parent_id INTEGER, active BOOL DEFAULT TRUE, is_company BOOL DEFAULT FALSE, user_id INTEGER, company_id INTEGER, email VARCHAR(256), phone VARCHAR(64), website VARCHAR(256), vat VARCHAR(64), credit_limit NUMERIC(19,2), comment TEXT);

-- 2. Products
CREATE TABLE IF NOT EXISTS product_category (id SERIAL PRIMARY KEY, name VARCHAR(256), parent_id INTEGER, complete_name VARCHAR(512));
CREATE TABLE IF NOT EXISTS product_template (id SERIAL PRIMARY KEY, name VARCHAR(256), type VARCHAR(16) DEFAULT 'consu', categ_id INTEGER, list_price NUMERIC(19,2), standard_price NUMERIC(19,2), default_code VARCHAR(64), barcode VARCHAR(64), active BOOL DEFAULT TRUE, company_id INTEGER, description TEXT);
CREATE TABLE IF NOT EXISTS product_product (id SERIAL PRIMARY KEY, product_tmpl_id INTEGER, default_code VARCHAR(64), barcode VARCHAR(64), active BOOL DEFAULT TRUE);

-- 3. Sales & Purchase
CREATE TABLE IF NOT EXISTS sale_order (id SERIAL PRIMARY KEY, name VARCHAR(64), state VARCHAR(16) DEFAULT 'draft', date_order TIMESTAMP, partner_id INTEGER, user_id INTEGER, company_id INTEGER, amount_untaxed NUMERIC(19,2), amount_tax NUMERIC(19,2), amount_total NUMERIC(19,2), note TEXT);
CREATE TABLE IF NOT EXISTS sale_order_line (id SERIAL PRIMARY KEY, order_id INTEGER, product_id INTEGER, name TEXT, product_uom_qty NUMERIC(19,2), price_unit NUMERIC(19,2), price_subtotal NUMERIC(19,2), price_total NUMERIC(19,2), company_id INTEGER, state VARCHAR(16));
CREATE TABLE IF NOT EXISTS purchase_order (id SERIAL PRIMARY KEY, name VARCHAR(64), state VARCHAR(16) DEFAULT 'draft', date_order TIMESTAMP, partner_id INTEGER, user_id INTEGER, company_id INTEGER, amount_untaxed NUMERIC(19,2), amount_tax NUMERIC(19,2), amount_total NUMERIC(19,2));
CREATE TABLE IF NOT EXISTS purchase_order_line (id SERIAL PRIMARY KEY, order_id INTEGER, product_id INTEGER, name TEXT, product_qty NUMERIC(19,2), price_unit NUMERIC(19,2), price_subtotal NUMERIC(19,2), price_total NUMERIC(19,2), company_id INTEGER, state VARCHAR(16));

-- 4. Stock
CREATE TABLE IF NOT EXISTS stock_warehouse (id SERIAL PRIMARY KEY, name VARCHAR(256), code VARCHAR(32), company_id INTEGER);
CREATE TABLE IF NOT EXISTS stock_location (id SERIAL PRIMARY KEY, name VARCHAR(256), usage VARCHAR(32), warehouse_id INTEGER, company_id INTEGER);
CREATE TABLE IF NOT EXISTS stock_picking (id SERIAL PRIMARY KEY, name VARCHAR(64), state VARCHAR(16) DEFAULT 'draft', partner_id INTEGER, origin VARCHAR(64), scheduled_date TIMESTAMP, date_done TIMESTAMP, company_id INTEGER);
CREATE TABLE IF NOT EXISTS stock_move (id SERIAL PRIMARY KEY, name VARCHAR(256), picking_id INTEGER, product_id INTEGER, product_uom_qty NUMERIC(19,2), quantity NUMERIC(19,2), location_id INTEGER, location_dest_id INTEGER, company_id INTEGER, state VARCHAR(16));
CREATE TABLE IF NOT EXISTS stock_quant (id SERIAL PRIMARY KEY, product_id INTEGER, location_id INTEGER, quantity NUMERIC(19,2), company_id INTEGER);

-- 5. Accounting
CREATE TABLE IF NOT EXISTS account_journal (id SERIAL PRIMARY KEY, name VARCHAR(256), code VARCHAR(32), type VARCHAR(16), company_id INTEGER, currency_id INTEGER);
CREATE TABLE IF NOT EXISTS account_account (id SERIAL PRIMARY KEY, name VARCHAR(256), code VARCHAR(64), account_type VARCHAR(32), company_id INTEGER);
CREATE TABLE IF NOT EXISTS account_move (id SERIAL PRIMARY KEY, name VARCHAR(64), ref VARCHAR(128), state VARCHAR(16) DEFAULT 'draft', move_type VARCHAR(32), date TIMESTAMP, partner_id INTEGER, journal_id INTEGER, company_id INTEGER, amount_total NUMERIC(19,2));
CREATE TABLE IF NOT EXISTS account_move_line (id SERIAL PRIMARY KEY, move_id INTEGER, name VARCHAR(256), account_id INTEGER, product_id INTEGER, debit NUMERIC(19,2), credit NUMERIC(19,2), balance NUMERIC(19,2), company_id INTEGER);
CREATE TABLE IF NOT EXISTS account_payment (id SERIAL PRIMARY KEY, name VARCHAR(64), state VARCHAR(16) DEFAULT 'draft', payment_type VARCHAR(16), partner_id INTEGER, amount NUMERIC(19,2), currency_id INTEGER, date DATE, journal_id INTEGER, memo VARCHAR(256), company_id INTEGER);

-- 6. MRP & Projects
CREATE TABLE IF NOT EXISTS mrp_bom (id SERIAL PRIMARY KEY, product_tmpl_id INTEGER, product_id INTEGER, code VARCHAR(64), product_qty NUMERIC(19,2), company_id INTEGER);
CREATE TABLE IF NOT EXISTS mrp_bom_line (id SERIAL PRIMARY KEY, bom_id INTEGER, product_id INTEGER, product_qty NUMERIC(19,2), company_id INTEGER);
CREATE TABLE IF NOT EXISTS mrp_production (id SERIAL PRIMARY KEY, name VARCHAR(64), state VARCHAR(16) DEFAULT 'draft', product_id INTEGER, product_qty NUMERIC(19,2), bom_id INTEGER, company_id INTEGER);
CREATE TABLE IF NOT EXISTS project_project (id SERIAL PRIMARY KEY, name VARCHAR(256), user_id INTEGER, partner_id INTEGER, company_id INTEGER, date_start DATE, date TIMESTAMP, active BOOL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS project_task (id SERIAL PRIMARY KEY, name VARCHAR(256), project_id INTEGER, user_id INTEGER, company_id INTEGER, date_deadline DATE, stage_id INTEGER, description TEXT, sequence INTEGER);

-- 7. HR & CRM
CREATE TABLE IF NOT EXISTS hr_employee (id SERIAL PRIMARY KEY, name VARCHAR(128), job_id INTEGER, department_id INTEGER, parent_id INTEGER, user_id INTEGER, company_id INTEGER, work_email VARCHAR(128), work_phone VARCHAR(64), active BOOL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS hr_department (id SERIAL PRIMARY KEY, name VARCHAR(128), parent_id INTEGER, manager_id INTEGER, company_id INTEGER);
CREATE TABLE IF NOT EXISTS hr_job (id SERIAL PRIMARY KEY, name VARCHAR(128), department_id INTEGER, no_of_employee INTEGER, company_id INTEGER);
CREATE TABLE IF NOT EXISTS hr_attendance (id SERIAL PRIMARY KEY, employee_id INTEGER, check_in TIMESTAMP, check_out TIMESTAMP, worked_hours NUMERIC(10,2));
CREATE TABLE IF NOT EXISTS hr_leave (id SERIAL PRIMARY KEY, employee_id INTEGER, holiday_status_id INTEGER, date_from TIMESTAMP, date_to TIMESTAMP, number_of_days NUMERIC(5,2), state VARCHAR(16) DEFAULT 'draft', name VARCHAR(256));
CREATE TABLE IF NOT EXISTS crm_lead (id SERIAL PRIMARY KEY, name VARCHAR(256), type VARCHAR(16) DEFAULT 'lead', priority VARCHAR(16), partner_id INTEGER, user_id INTEGER, company_id INTEGER, expected_revenue NUMERIC(19,2), probability NUMERIC(5,2), stage_id INTEGER, email_from VARCHAR(256), phone VARCHAR(64), description TEXT, active BOOL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS crm_stage (id SERIAL PRIMARY KEY, name VARCHAR(64), sequence INTEGER, is_won BOOL DEFAULT FALSE);

-- 8. System & Audit
CREATE TABLE IF NOT EXISTS sys_user (id SERIAL PRIMARY KEY, username VARCHAR(64), password VARCHAR(128), real_name VARCHAR(64), partner_id INTEGER, status INTEGER DEFAULT 1, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sys_role (id SERIAL PRIMARY KEY, role_code VARCHAR(64), role_name VARCHAR(64), status INTEGER DEFAULT 1, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS ir_logging (id SERIAL PRIMARY KEY, create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, type VARCHAR(32), name VARCHAR(256), level VARCHAR(32), message TEXT, path VARCHAR(256), line VARCHAR(16), func VARCHAR(128), metadata TEXT, res_model VARCHAR(128), res_id INTEGER, user_id INTEGER);
CREATE TABLE IF NOT EXISTS ir_attachment (id SERIAL PRIMARY KEY, name VARCHAR(256), res_model VARCHAR(128), res_id INTEGER, datas BYTEA, mimetype VARCHAR(128));
