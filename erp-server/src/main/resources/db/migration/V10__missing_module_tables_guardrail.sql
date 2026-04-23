-- Guardrail: backfill missing tables/columns for modules already exposed in API/routes.
-- This migration is idempotent and safe for partially initialized databases.

-- Accounting
CREATE TABLE IF NOT EXISTS account_payment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    state VARCHAR(16) DEFAULT 'draft',
    payment_type VARCHAR(16),
    partner_id INTEGER,
    amount NUMERIC(19,2),
    currency_id INTEGER,
    date DATE,
    journal_id INTEGER,
    memo VARCHAR(256),
    company_id INTEGER
);

-- HR
CREATE TABLE IF NOT EXISTS hr_department (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128),
    parent_id INTEGER,
    manager_id INTEGER,
    company_id INTEGER
);

CREATE TABLE IF NOT EXISTS hr_employee (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128),
    job_id INTEGER,
    department_id INTEGER,
    parent_id INTEGER,
    user_id INTEGER,
    company_id INTEGER,
    work_email VARCHAR(128),
    work_phone VARCHAR(64),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS hr_job (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128),
    department_id INTEGER,
    no_of_employee INTEGER,
    company_id INTEGER
);

CREATE TABLE IF NOT EXISTS hr_leave (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    holiday_status_id INTEGER,
    date_from TIMESTAMP,
    date_to TIMESTAMP,
    number_of_days NUMERIC(5,2),
    state VARCHAR(16) DEFAULT 'draft',
    name VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS hr_attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    worked_hours NUMERIC(10,2)
);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS name VARCHAR(256);

-- Base/system
CREATE TABLE IF NOT EXISTS ir_attachment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256),
    res_model VARCHAR(128),
    res_id INTEGER,
    datas BYTEA,
    mimetype VARCHAR(128)
);

-- CRM
CREATE TABLE IF NOT EXISTS crm_stage (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    sequence INTEGER,
    is_won BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS crm_lead (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256),
    type VARCHAR(16) DEFAULT 'lead',
    priority VARCHAR(16),
    partner_id INTEGER,
    user_id INTEGER,
    company_id INTEGER,
    expected_revenue NUMERIC(19,2),
    probability NUMERIC(5,2),
    stage_id INTEGER,
    email_from VARCHAR(256),
    phone VARCHAR(64),
    description TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- Projects
CREATE TABLE IF NOT EXISTS project_project (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256),
    user_id INTEGER,
    partner_id INTEGER,
    company_id INTEGER,
    date_start DATE,
    date TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS project_task (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256),
    project_id INTEGER,
    user_id INTEGER,
    company_id INTEGER,
    date_deadline DATE,
    stage_id INTEGER,
    description TEXT,
    sequence INTEGER
);

-- Stock inventory (used by stock module routes but not present in base schema)
CREATE TABLE IF NOT EXISTS stock_inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256),
    date TIMESTAMP,
    state VARCHAR(16) DEFAULT 'draft',
    location_ids VARCHAR(256),
    company_id INTEGER
);

CREATE TABLE IF NOT EXISTS stock_inventory_line (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER,
    location_id INTEGER,
    product_id INTEGER,
    product_qty NUMERIC(19,2),
    theoretical_qty NUMERIC(19,2)
);
ALTER TABLE stock_inventory_line ADD COLUMN IF NOT EXISTS name VARCHAR(256);

