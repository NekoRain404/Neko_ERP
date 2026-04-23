# First-Wave Guardrail Rules

## 1. Scope

This document describes the minimum server-side guardrails that currently protect the first-wave cutover scope.

The target is not a full low-code engine. The target is stable protection for:

1. master data
2. sales chain
3. purchase chain

## 2. Operating Rules

1. Use `before_save` to stop bad drafts early.
2. Use `before_action` to block risky state transitions.
3. Keep error prompts business-readable.
4. Prefer reusable presets before writing one-off scripts.
5. Keep guardrails aligned with rollback, traceability, and evidence discipline.

## 3. Master Data

### `ResPartner.before_save`

- Purpose: require a contact email before partner masters continue into first-wave sales and purchase pilots.
- Failure prompt: `Partner email is required before save`

### `ResCompany.before_save`

- Purpose: require a company currency before records become the ownership baseline for downstream modules.
- Failure prompt: `Company currency is required before save`

### `ProductTemplate.before_save`

- Purpose: require a default code before products enter order, stock, and rollback flows.
- Failure prompt: `Product default code is required before save`

### `ProductPricelist.before_save`

- Purpose: require pricing currency before pricelists drive trial sales and billing amounts.
- Failure prompt: `Pricelist currency is required before save`

## 4. Sales Chain

### `SaleOrder.before_save`

- Purpose: stop large risky sales drafts from flowing deeper into the pilot without review.
- Failure prompt: `Large sales orders need extra review before save`

### `AccountInvoice.before_action(post)`

- Purpose: require an `originRef` before posting invoices so billing remains attached to the sales or purchase source.
- Failure prompt: `Origin reference is required before posting invoice`

### `StockPicking.before_action(action_validate)`

- Purpose: require an `origin` before transfer validation so execution remains traceable.
- Failure prompt: `Origin is required before transfer validation`

## 5. Purchase Chain

### `PurchaseOrder.before_save`

- Purpose: require a vendor before purchase orders enter receipt and bill flows.
- Failure prompt: `Vendor is required before save`

### `AccountPayment.before_action(action_post)`

- Purpose: require an `originRef` before payment posting so payable traceability remains on one path.
- Failure prompt: `Origin reference is required before posting payment`

## 6. Review Checklist

Before enabling or editing a guardrail, confirm:

1. the rule still protects a first-wave module or chain
2. the block point is correct: `before_save` or `before_action`
3. the error message is business-readable
4. the rule does not break rollback or traceability
5. the rule matches current evidence and handoff discipline

## 7. Drill Link

Rollback drill execution script:

- `scripts/rollback_drill.py`

Primary verification commands:

1. `cd erp-server && mvn -q -DskipTests compile`
2. `cd erp-client && npm run build`
3. `./scripts/dev_down.sh && RUN_ALL_LIST_SMOKE=1 ./scripts/dev_up.sh`
