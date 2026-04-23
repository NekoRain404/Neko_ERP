#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_URL = "http://127.0.0.1:8080/api"

SYS_SCRIPT_PRESET_SMOKE_RULES = [
    {
        "key": "partner_contact_required",
        "lane": "masterData",
        "model": "ResPartner",
        "eventName": "before_save",
        "scriptCode": "if (doc.email == null) { throw new RuntimeException('Partner email is required before save') }",
    },
    {
        "key": "company_currency_required",
        "lane": "masterData",
        "model": "ResCompany",
        "eventName": "before_save",
        "scriptCode": "if (doc.currencyId == null) { throw new RuntimeException('Company currency is required before save') }",
    },
    {
        "key": "product_template_code_required",
        "lane": "masterData",
        "model": "ProductTemplate",
        "eventName": "before_save",
        "scriptCode": "if (doc.defaultCode == null) { throw new RuntimeException('Product default code is required before save') }",
    },
    {
        "key": "pricelist_currency_required",
        "lane": "masterData",
        "model": "ProductPricelist",
        "eventName": "before_save",
        "scriptCode": "if (doc.currencyId == null) { throw new RuntimeException('Pricelist currency is required before save') }",
    },
    {
        "key": "sale_large_amount_review",
        "lane": "sales",
        "model": "SaleOrder",
        "eventName": "before_save",
        "scriptCode": "if (doc.amountUntaxed >= 500000) { throw new RuntimeException('Large sales orders need extra review before save') }",
    },
    {
        "key": "purchase_vendor_required",
        "lane": "purchase",
        "model": "PurchaseOrder",
        "eventName": "before_save",
        "scriptCode": "if (doc.partnerId == null) { throw new RuntimeException('Vendor is required before save') }",
    },
    {
        "key": "invoice_post_origin_required",
        "lane": "sales",
        "model": "AccountInvoice",
        "eventName": "before_action",
        "scriptCode": "if (action == 'post' && doc.originRef == null) { throw new RuntimeException('Origin reference is required before posting invoice') }",
    },
    {
        "key": "picking_validate_origin_required",
        "lane": "sales",
        "model": "StockPicking",
        "eventName": "before_action",
        "scriptCode": "if (action == 'action_validate' && doc.origin == null) { throw new RuntimeException('Origin is required before transfer validation') }",
    },
    {
        "key": "payment_post_origin_required",
        "lane": "purchase",
        "model": "AccountPayment",
        "eventName": "before_action",
        "scriptCode": "if (action == 'action_post' && doc.originRef == null) { throw new RuntimeException('Origin reference is required before posting payment') }",
    },
]


def request(method: str, path: str, payload: dict | None = None) -> dict:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=15) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {body}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {path} failed: {exc}") from exc


def request_expect_business_error(method: str, path: str, payload: dict | None = None) -> None:
    res = request(method, path, payload)
    if res.get("code") == 200:
        raise RuntimeError(f"{method} {path} unexpectedly succeeded: {res}")


def create_partner(name: str, ext_data: dict) -> int:
    print("[platform-smoke] create resPartner.extData")
    email = f"{name.lower()}@example.com"
    payload = {
        "name": name,
        "email": email,
        "phone": "18800000000",
        "active": True,
        "companyId": 1,
        "extData": ext_data,
    }
    res = request("POST", "/base/res-partner", payload)
    if res.get("code") != 200 or res.get("data") is not True:
        raise RuntimeError(f"create partner failed: {res}")
    record = None
    for _ in range(5):
        listing = request("GET", f"/base/res-partner/list?{urlencode({'current': 1, 'size': 5, 'email': email})}")
        records = listing.get("data", {}).get("records", [])
        record = next((item for item in records if item.get("email") == email), None)
        if record:
            break
        time.sleep(0.3)
    if record is None:
        raise RuntimeError(f"partner not found after create: email={email}")
    if record.get("extData", {}).get("industry") != ext_data["industry"]:
        raise RuntimeError(f"extData missing from list response: {record}")
    detail = request("GET", f"/base/res-partner/{record['id']}")
    if detail["data"].get("extData", {}).get("riskLevel") != ext_data["riskLevel"]:
        raise RuntimeError(f"extData missing from detail response: {detail}")
    return record["id"]


def verify_before_save_script() -> None:
    script_name = f"blocked-{int(time.time())}"
    print("[platform-smoke] create sysScript.beforeSave")
    script_res = request(
        "POST",
        "/system/sys-script",
        {
            "model": "ResPartner",
            "eventName": "before_save",
            "scriptLang": "groovy",
            "scriptCode": "if (doc.name == 'SCRIPT_BLOCKED') { throw new RuntimeException('blocked by script') }",
            "status": 1,
            "remark": script_name,
        },
    )
    if script_res.get("code") != 200:
        raise RuntimeError(f"create sys_script failed: {script_res}")

    listing = request("GET", f"/system/sys-script/list?{urlencode({'current': 1, 'size': 10, 'keyword': script_name})}")
    script = listing["data"]["records"][0]

    print("[platform-smoke] verify before_save block")
    request_expect_business_error(
        "POST",
        "/base/res-partner",
        {
            "name": "SCRIPT_BLOCKED",
            "active": True,
            "companyId": 1,
        },
    )

    print("[platform-smoke] disable sysScript.beforeSave")
    disable_res = request(
        "PUT",
        f"/system/sys-script/{script['id']}",
        {
            "status": 0,
            "remark": script_name,
        },
    )
    if disable_res.get("code") != 200:
        raise RuntimeError(f"disable sys_script failed: {disable_res}")


def verify_before_save_null_script() -> None:
    script_name = f"null-guard-{int(time.time())}"
    print("[platform-smoke] create sysScript.beforeSave null rule")
    script_res = request(
        "POST",
        "/system/sys-script",
        {
            "model": "ResPartner",
            "eventName": "before_save",
            "scriptLang": "groovy",
            "scriptCode": "if (doc.email == null) { throw new RuntimeException('partner email required') }",
            "status": 1,
            "remark": script_name,
        },
    )
    if script_res.get("code") != 200:
        raise RuntimeError(f"create before_save null sys_script failed: {script_res}")

    listing = request("GET", f"/system/sys-script/list?{urlencode({'current': 1, 'size': 10, 'keyword': script_name})}")
    script = listing["data"]["records"][0]

    print("[platform-smoke] verify before_save null block")
    request_expect_business_error(
        "POST",
        "/base/res-partner",
        {
            "name": f"NULL-GUARD-{int(time.time())}",
            "active": True,
            "companyId": 1,
        },
    )

    print("[platform-smoke] disable sysScript.beforeSave null rule")
    disable_res = request(
        "PUT",
        f"/system/sys-script/{script['id']}",
        {
            "status": 0,
            "remark": script_name,
        },
    )
    if disable_res.get("code") != 200:
        raise RuntimeError(f"disable before_save null sys_script failed: {disable_res}")


def verify_before_action_script() -> None:
    script_name = f"action-blocked-{int(time.time())}"
    print("[platform-smoke] create sysScript.beforeAction")
    script_res = request(
        "POST",
        "/system/sys-script",
        {
            "model": "SaleOrder",
            "eventName": "before_action",
            "scriptLang": "groovy",
            "scriptCode": "if (action == 'action_confirm') { throw new RuntimeException('blocked by action script') }",
            "status": 1,
            "remark": script_name,
        },
    )
    if script_res.get("code") != 200:
        raise RuntimeError(f"create before_action sys_script failed: {script_res}")

    listing = request("GET", f"/system/sys-script/list?{urlencode({'current': 1, 'size': 10, 'keyword': script_name})}")
    script = listing["data"]["records"][0]

    order_name = f"SCRIPT-ACTION-{int(time.time())}"
    create_res = request(
        "POST",
        "/sale/sale-order",
        {
            "name": order_name,
            "partnerId": 1,
            "userId": 1,
            "companyId": 1,
            "amountUntaxed": 88.00,
            "amountTax": 8.80,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create sale order for before_action failed: {create_res}")

    order = None
    for _ in range(5):
        order_list = request("GET", f"/sale/sale-order/list?{urlencode({'current': 1, 'size': 10, 'keyword': order_name})}")
        records = order_list.get("data", {}).get("records", [])
        order = next((item for item in records if item.get("name") == order_name), None)
        if order:
            break
        time.sleep(0.3)
    if order is None:
        raise RuntimeError(f"sale order not found for before_action smoke: {order_name}")

    print("[platform-smoke] verify before_action block")
    request_expect_business_error("POST", f"/sale/sale-order/{order['id']}/actions/action_confirm")

    print("[platform-smoke] disable sysScript.beforeAction")
    disable_res = request(
        "PUT",
        f"/system/sys-script/{script['id']}",
        {
            "status": 0,
            "remark": script_name,
        },
    )
    if disable_res.get("code") != 200:
        raise RuntimeError(f"disable before_action sys_script failed: {disable_res}")

    print("[platform-smoke] verify before_action unblock")
    action_res = request("POST", f"/sale/sale-order/{order['id']}/actions/action_confirm")
    if action_res.get("code") != 200 or action_res.get("data") is not True:
        raise RuntimeError(f"sale order confirm after disabling before_action failed: {action_res}")


def verify_before_action_composite_script() -> None:
    script_name = f"action-composite-{int(time.time())}"
    print("[platform-smoke] create sysScript.beforeAction composite rule")
    script_res = request(
        "POST",
        "/system/sys-script",
        {
            "model": "SaleOrder",
            "eventName": "before_action",
            "scriptLang": "groovy",
            "scriptCode": "if (action == 'action_confirm' && doc.amountUntaxed >= 500000) { throw new RuntimeException('large orders need review before confirm') }",
            "status": 1,
            "remark": script_name,
        },
    )
    if script_res.get("code") != 200:
        raise RuntimeError(f"create before_action composite sys_script failed: {script_res}")

    listing = request("GET", f"/system/sys-script/list?{urlencode({'current': 1, 'size': 10, 'keyword': script_name})}")
    script = listing["data"]["records"][0]

    order_name = f"SCRIPT-COMPOSITE-{int(time.time())}"
    create_res = request(
        "POST",
        "/sale/sale-order",
        {
            "name": order_name,
            "partnerId": 1,
            "userId": 1,
            "companyId": 1,
            "amountUntaxed": 500000,
            "amountTax": 50000,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create sale order for before_action composite failed: {create_res}")

    order = None
    for _ in range(5):
        order_list = request("GET", f"/sale/sale-order/list?{urlencode({'current': 1, 'size': 10, 'keyword': order_name})}")
        records = order_list.get("data", {}).get("records", [])
        order = next((item for item in records if item.get("name") == order_name), None)
        if order:
            break
        time.sleep(0.3)
    if order is None:
        raise RuntimeError(f"sale order not found for before_action composite smoke: {order_name}")

    print("[platform-smoke] verify before_action composite block")
    request_expect_business_error("POST", f"/sale/sale-order/{order['id']}/actions/action_confirm")

    print("[platform-smoke] disable sysScript.beforeAction composite rule")
    disable_res = request(
        "PUT",
        f"/system/sys-script/{script['id']}",
        {
            "status": 0,
            "remark": script_name,
        },
    )
    if disable_res.get("code") != 200:
        raise RuntimeError(f"disable before_action composite sys_script failed: {disable_res}")

    print("[platform-smoke] verify before_action composite unblock")
    action_res = request("POST", f"/sale/sale-order/{order['id']}/actions/action_confirm")
    if action_res.get("code") != 200 or action_res.get("data") is not True:
        raise RuntimeError(f"sale order confirm after disabling before_action composite failed: {action_res}")


def verify_sys_script_preset_library_operations() -> None:
    preset_prefix = f"preset-library-{int(time.time())}"
    print("[platform-smoke] install sysScript preset library")
    for rule in SYS_SCRIPT_PRESET_SMOKE_RULES:
        create_res = request(
            "POST",
            "/system/sys-script",
            {
                "model": rule["model"],
                "eventName": rule["eventName"],
                "scriptLang": "groovy",
                "scriptCode": rule["scriptCode"],
                "status": 1,
                "remark": f"{preset_prefix}:{rule['lane']}:{rule['key']}",
            },
        )
        if create_res.get("code") != 200:
            raise RuntimeError(f"install preset sys_script failed: rule={rule['key']} res={create_res}")

    listing = request("GET", f"/system/sys-script/list?{urlencode({'current': 1, 'size': 50, 'keyword': preset_prefix})}")
    records = listing.get("data", {}).get("records", [])
    if len(records) < len(SYS_SCRIPT_PRESET_SMOKE_RULES):
        raise RuntimeError(f"preset library install count mismatch: expected={len(SYS_SCRIPT_PRESET_SMOKE_RULES)} got={len(records)}")
    active_records = [item for item in records if int(item.get("status") or 0) == 1]
    if len(active_records) != len(SYS_SCRIPT_PRESET_SMOKE_RULES):
        raise RuntimeError(f"preset library active count mismatch: {records}")

    print("[platform-smoke] disable sysScript preset library")
    for record in records:
        disable_res = request(
            "PUT",
            f"/system/sys-script/{record['id']}",
            {
                "status": 0,
                "remark": record.get("remark") or preset_prefix,
            },
        )
        if disable_res.get("code") != 200:
            raise RuntimeError(f"disable preset sys_script failed: record={record} res={disable_res}")

    disabled_listing = request("GET", f"/system/sys-script/list?{urlencode({'current': 1, 'size': 50, 'keyword': preset_prefix})}")
    disabled_records = disabled_listing.get("data", {}).get("records", [])
    if any(int(item.get("status") or 0) != 0 for item in disabled_records):
        raise RuntimeError(f"preset library disable did not clear active rules: {disabled_records}")


def verify_partner_reminders(partner_id: int, expect_context_gap: bool) -> None:
    print("[platform-smoke] verify partner reminders")
    reminders = request(
        "GET",
        f"/system/reminders?{urlencode({'limit': 20, 'moduleKey': 'resPartner', 'recordId': partner_id})}",
    )
    items = reminders.get("data") or []
    has_context_gap = any(item.get("type") == "partner_context_gap" for item in items)
    has_evidence_gap = any(item.get("type") == "resPartner_evidence_gap" for item in items)
    if has_context_gap != expect_context_gap:
        raise RuntimeError(f"partner context gap mismatch: expect={expect_context_gap}, items={items}")
    if not has_evidence_gap:
        raise RuntimeError(f"partner evidence gap reminder missing: {items}")


def create_sale_order_for_context() -> int:
    order_name = f"CTX-SALE-{int(time.time())}"
    create_res = request(
        "POST",
        "/sale/sale-order",
        {
            "name": order_name,
            "partnerId": 1,
            "userId": 1,
            "companyId": 1,
            "amountUntaxed": 128.00,
            "amountTax": 12.80,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create sale order for context reminder failed: {create_res}")
    order = find_record_by_keyword("/sale/sale-order/list", order_name)
    action_res = request("POST", f"/sale/sale-order/{order['id']}/actions/action_confirm")
    if action_res.get("code") != 200:
        raise RuntimeError(f"confirm sale order for context reminder failed: {action_res}")
    return int(order["id"])


def create_purchase_order_for_context() -> int:
    order_name = f"CTX-PURCHASE-{int(time.time())}"
    create_res = request(
        "POST",
        "/purchase/purchase-order",
        {
            "name": order_name,
            "partnerId": 1,
            "userId": 1,
            "companyId": 1,
            "amountUntaxed": 188.00,
            "amountTax": 18.80,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create purchase order for context reminder failed: {create_res}")
    order = find_record_by_keyword("/purchase/purchase-order/list", order_name)
    action_res = request("POST", f"/purchase/purchase-order/{order['id']}/actions/action_confirm")
    if action_res.get("code") != 200:
        raise RuntimeError(f"confirm purchase order for context reminder failed: {action_res}")
    return int(order["id"])


def create_stock_picking_for_context() -> int:
    picking_name = f"CTX-PICKING-{int(time.time())}"
    create_res = request(
        "POST",
        "/stock/stock-picking",
        {
            "name": picking_name,
            "partnerId": 1,
            "companyId": 1,
            "origin": "CTX-SALE",
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create picking for context reminder failed: {create_res}")
    picking = find_record_by_keyword("/stock/stock-picking/list", picking_name)
    action_res = request("POST", f"/stock/stock-picking/{picking['id']}/actions/action_confirm")
    if action_res.get("code") != 200:
        raise RuntimeError(f"confirm picking for context reminder failed: {action_res}")
    return int(picking["id"])


def create_invoice_for_context() -> int:
    invoice_name = f"CTX-INV-{int(time.time())}"
    create_res = request(
        "POST",
        "/account/account-invoice",
        {
            "name": invoice_name,
            "partnerId": 1,
            "companyId": 1,
            "originRef": "CTX-SALE",
            "amountUntaxed": 208.00,
            "amountTax": 20.80,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create invoice for context reminder failed: {create_res}")
    invoice = find_record_by_keyword("/account/account-invoice/list", invoice_name)
    action_res = request("POST", f"/account/account-invoice/{invoice['id']}/actions/post")
    if action_res.get("code") != 200:
        raise RuntimeError(f"post invoice for context reminder failed: {action_res}")
    return int(invoice["id"])


def create_payment_for_context() -> int:
    payment_name = f"CTX-PAY-{int(time.time())}"
    create_res = request(
        "POST",
        "/account/account-payment",
        {
            "name": payment_name,
            "partnerId": 1,
            "companyId": 1,
            "paymentType": "outbound",
            "originRef": "CTX-BILL",
            "amount": 99.00,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create payment for context reminder failed: {create_res}")
    payment = find_record_by_keyword("/account/account-payment/list", payment_name)
    action_res = request("POST", f"/account/account-payment/{payment['id']}/actions/action_post")
    if action_res.get("code") != 200:
        raise RuntimeError(f"post payment for context reminder failed: {action_res}")
    return int(payment["id"])


def create_company_for_evidence() -> int:
    name = f"CTX-COMPANY-{int(time.time() * 1000)}"
    create_res = request(
        "POST",
        "/base/res-company",
        {
            "name": name,
            "partnerId": 1,
            "currencyId": 1,
            "active": True,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create company for evidence reminder failed: {create_res}")
    company = find_record_by_keyword("/base/res-company/list", name)
    return int(company["id"])


def create_category_for_evidence() -> int:
    name = f"CTX-CATEGORY-{int(time.time() * 1000)}"
    create_res = request(
        "POST",
        "/product/product-category",
        {
            "name": name,
            "completeName": name,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create category for evidence reminder failed: {create_res}")
    category = find_record_by_keyword("/product/product-category/list", name)
    return int(category["id"])


def create_template_for_evidence(category_id: int) -> int:
    name = f"CTX-TEMPLATE-{int(time.time() * 1000)}"
    create_res = request(
        "POST",
        "/product/product-template",
        {
            "name": name,
            "type": "consu",
            "categId": category_id,
            "listPrice": 19.90,
            "standardPrice": 9.90,
            "defaultCode": f"{name}-CODE",
            "barcode": f"{int(time.time() * 1000)}",
            "active": True,
            "companyId": 1,
            "description": "context evidence smoke product",
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create product template for evidence reminder failed: {create_res}")
    template = find_record_by_keyword("/product/product-template/list", name)
    return int(template["id"])


def create_variant_for_evidence(template_id: int) -> int:
    default_code = f"CTX-VARIANT-{int(time.time() * 1000)}"
    create_res = request(
        "POST",
        "/product/product-product",
        {
            "productTmplId": template_id,
            "defaultCode": default_code,
            "barcode": f"BC-{int(time.time() * 1000)}",
            "active": True,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create product variant for evidence reminder failed: {create_res}")
    variant = find_record_by_keyword("/product/product-product/list", default_code)
    return int(variant["id"])


def create_pricelist_for_evidence() -> int:
    name = f"CTX-PRICELIST-{int(time.time() * 1000)}"
    create_res = request(
        "POST",
        "/product/product-pricelist",
        {
            "name": name,
            "active": True,
            "currencyId": 1,
            "companyId": 1,
        },
    )
    if create_res.get("code") != 200:
        raise RuntimeError(f"create pricelist for evidence reminder failed: {create_res}")
    pricelist = find_record_by_keyword("/product/product-pricelist/list", name)
    return int(pricelist["id"])


def find_record_by_keyword(list_path: str, keyword: str) -> dict:
    for _ in range(5):
        listing = request("GET", f"{list_path}?{urlencode({'current': 1, 'size': 10, 'keyword': keyword})}")
        records = listing.get("data", {}).get("records", [])
        record = next(
            (
                item
                for item in records
                if item.get("name") == keyword
                or item.get("defaultCode") == keyword
                or item.get("completeName") == keyword
            ),
            None,
        )
        if record:
            return record
        time.sleep(0.3)
    raise RuntimeError(f"record not found: path={list_path}, keyword={keyword}")


def verify_evidence_gap_reminder(module_key: str, record_id: int, prefixes: list[str]) -> None:
    print(f"[platform-smoke] verify {module_key} evidence reminder")
    expected_type = f"{module_key}_evidence_gap"
    reminders = request(
        "GET",
        f"/system/reminders?{urlencode({'limit': 20, 'moduleKey': module_key, 'recordId': record_id})}",
    )
    items = reminders.get("data") or []
    if not any(item.get("type") == expected_type for item in items):
        raise RuntimeError(f"{module_key} evidence gap reminder missing: {items}")

    for prefix in prefixes:
        attachment_res = request(
            "POST",
            "/base/ir-attachment",
            {
                "name": f"[{prefix}] evidence-smoke-{record_id}-{int(time.time() * 1000)}.txt",
                "resModel": module_key,
                "resId": record_id,
                "mimetype": "text/plain",
                "datas": "ZXZpZGVuY2Utc21va2U=",
            },
        )
        if attachment_res.get("code") != 200:
            raise RuntimeError(f"create {module_key} {prefix} evidence attachment failed: {attachment_res}")

    reminders_after = request(
        "GET",
        f"/system/reminders?{urlencode({'limit': 20, 'moduleKey': module_key, 'recordId': record_id})}",
    )
    items_after = reminders_after.get("data") or []
    if any(item.get("type") == expected_type for item in items_after):
        raise RuntimeError(f"{module_key} evidence gap still present after attachments: {items_after}")


def verify_timeline_context_reminder(module_key: str, record_id: int) -> None:
    print(f"[platform-smoke] verify {module_key} timeline context reminder")
    reminders = request(
        "GET",
        f"/system/reminders?{urlencode({'limit': 20, 'moduleKey': module_key, 'recordId': record_id})}",
    )
    items = reminders.get("data") or []
    expected_type = f"{module_key}_context_gap"
    if not any(item.get("type") == expected_type for item in items):
        raise RuntimeError(f"{module_key} context gap reminder missing: {items}")

    note_res = request(
        "POST",
        "/system/timeline/note",
        {
            "moduleKey": module_key,
            "id": record_id,
            "content": f"{module_key} context smoke note",
            "authorName": "NEKO_ERP",
        },
    )
    if note_res.get("code") != 200:
        raise RuntimeError(f"create {module_key} context note failed: {note_res}")

    reminders_after = request(
        "GET",
        f"/system/reminders?{urlencode({'limit': 20, 'moduleKey': module_key, 'recordId': record_id})}",
    )
    items_after = reminders_after.get("data") or []
    if any(item.get("type") == expected_type for item in items_after):
        raise RuntimeError(f"{module_key} context gap reminder still present after note: {items_after}")


def verify_timeline(partner_id: int) -> None:
    print("[platform-smoke] update resPartner.timeline")
    update_res = request(
        "PUT",
        f"/base/res-partner/{partner_id}",
        {
            "comment": "timeline-update",
        },
    )
    if update_res.get("code") != 200:
        raise RuntimeError(f"update partner failed: {update_res}")

    print("[platform-smoke] create timeline note")
    note_res = request(
        "POST",
        "/system/timeline/note",
        {
            "moduleKey": "resPartner",
            "id": partner_id,
            "content": "timeline smoke note",
            "authorName": "NEKO_ERP",
        },
    )
    if note_res.get("code") != 200:
        raise RuntimeError(f"create timeline note failed: {note_res}")

    attachment_name = f"timeline-attachment-{partner_id}-{int(time.time())}.txt"
    print("[platform-smoke] create timeline attachment")
    attachment_res = request(
        "POST",
        "/base/ir-attachment",
        {
            "name": attachment_name,
            "resModel": "resPartner",
            "resId": partner_id,
            "mimetype": "text/plain",
            "datas": "dGltZWxpbmUgYXR0YWNobWVudA==",
        },
    )
    if attachment_res.get("code") != 200:
        raise RuntimeError(f"create timeline attachment failed: {attachment_res}")

    attachment_record = None
    print("[platform-smoke] verify attachment list/detail")
    for _ in range(5):
        listing = request(
            "GET",
            f"/base/ir-attachment/list?{urlencode({'current': 1, 'size': 10, 'resModel': 'resPartner', 'resId': partner_id})}",
        )
        records = listing.get("data", {}).get("records", [])
        attachment_record = next((item for item in records if item.get("name") == attachment_name), None)
        if attachment_record:
            break
        time.sleep(0.3)
    if attachment_record is None:
        raise RuntimeError(f"attachment not found after create: {attachment_name}")
    if attachment_record.get("resModel") != "resPartner" or int(attachment_record.get("resId") or 0) != partner_id:
        raise RuntimeError(f"attachment list mismatch: {attachment_record}")
    attachment_detail = request("GET", f"/base/ir-attachment/{attachment_record['id']}")
    detail_data = attachment_detail.get("data") or {}
    if detail_data.get("name") != attachment_name or detail_data.get("resModel") != "resPartner":
        raise RuntimeError(f"attachment detail mismatch: {attachment_detail}")

    print("[platform-smoke] verify timeline feed")
    items = []
    for _ in range(5):
        timeline = request("GET", f"/system/timeline?{urlencode({'moduleKey': 'resPartner', 'id': partner_id})}")
        items = timeline.get("data") or []
        has_note = any(item.get("type") == "note" and item.get("content") == "timeline smoke note" for item in items)
        has_system = any(item.get("type") == "system" for item in items)
        has_attachment = any(item.get("type") == "attachment" and item.get("content") == attachment_name for item in items)
        if has_note and has_system and has_attachment:
            break
        time.sleep(0.3)
    if not any(item.get("type") == "note" and item.get("content") == "timeline smoke note" for item in items):
        raise RuntimeError(f"timeline note missing: {items}")
    if not any(item.get("type") == "system" for item in items):
        raise RuntimeError(f"system timeline event missing: {items}")
    if not any(item.get("type") == "attachment" and item.get("content") == attachment_name for item in items):
        raise RuntimeError(f"timeline attachment missing: {items}")
    verify_partner_reminders(partner_id, expect_context_gap=False)


def verify_cutover_config_persistence() -> None:
    print("[platform-smoke] save cutover config snapshot")
    snapshot = {
        "locale": "zh-CN",
        "chainStates": {"masterData": True, "sales": True, "purchase": False},
        "moduleOverrides": {"accountPayment": False, "resPartner": True},
        "chainContacts": {
            "purchase": {
                "owner": "采购试点负责人",
                "fallbackOwner": "Odoo 采购兜底",
                "rehearsalOwner": "采购演练负责人",
                "pilotConfirmOwner": "采购确认负责人",
            }
        },
        "chainGateStates": {
            "purchase": {
                "smokeReady": True,
                "workbenchReady": True,
                "rollbackReady": False,
                "traceabilityReady": True,
                "manualReady": False,
                "pilotConfirmed": False,
                "note": "payment pilot still gated by rollback rehearsal",
            }
        },
    }
    save_res = request(
        "PUT",
        "/system/cutover-config/current",
        {
            "configData": snapshot,
            "updatedBy": "platform-smoke",
        },
    )
    data = save_res.get("data") or {}
    if save_res.get("code") != 200 or data.get("configKey") != "current":
        raise RuntimeError(f"save cutover config failed: {save_res}")
    if (data.get("configData") or {}).get("chainStates", {}).get("purchase") is not False:
        raise RuntimeError(f"saved cutover config payload mismatch: {save_res}")

    print("[platform-smoke] verify cutover config snapshot")
    detail = request("GET", "/system/cutover-config/current")
    remote = detail.get("data") or {}
    remote_data = remote.get("configData") or {}
    if remote_data.get("moduleOverrides", {}).get("accountPayment") is not False:
        raise RuntimeError(f"cutover module override mismatch: {detail}")
    if remote_data.get("chainContacts", {}).get("purchase", {}).get("fallbackOwner") != "Odoo 采购兜底":
        raise RuntimeError(f"cutover chain contact mismatch: {detail}")
    if remote_data.get("chainGateStates", {}).get("purchase", {}).get("rollbackReady") is not False:
        raise RuntimeError(f"cutover gate state mismatch: {detail}")
    if remote.get("updatedBy") != "platform-smoke":
        raise RuntimeError(f"cutover updatedBy mismatch: {detail}")


def main() -> int:
    try:
        partner_id = create_partner(
            name=f"PlatformPartner{int(time.time())}",
            ext_data={"industry": "Manufacturing", "riskLevel": "medium"},
        )
        verify_before_save_script()
        verify_before_save_null_script()
        verify_before_action_script()
        verify_before_action_composite_script()
        verify_sys_script_preset_library_operations()
        verify_cutover_config_persistence()
        verify_partner_reminders(partner_id, expect_context_gap=True)
        verify_timeline(partner_id)
        company_id = create_company_for_evidence()
        verify_evidence_gap_reminder("resCompany", company_id, ["LEGAL_DOC", "TAX_DOC"])
        category_id = create_category_for_evidence()
        verify_evidence_gap_reminder("productCategory", category_id, ["CATEGORY_POLICY"])
        template_id = create_template_for_evidence(category_id)
        verify_evidence_gap_reminder("productTemplate", template_id, ["SPEC", "COSTING"])
        variant_id = create_variant_for_evidence(template_id)
        verify_evidence_gap_reminder("productProduct", variant_id, ["BARCODE_LABEL", "VARIANT_APPROVAL"])
        pricelist_id = create_pricelist_for_evidence()
        verify_evidence_gap_reminder("productPricelist", pricelist_id, ["PRICE_APPROVAL", "EFFECTIVE_POLICY"])
        sale_order_id = create_sale_order_for_context()
        verify_timeline_context_reminder("saleOrder", sale_order_id)
        purchase_order_id = create_purchase_order_for_context()
        verify_timeline_context_reminder("purchaseOrder", purchase_order_id)
        picking_id = create_stock_picking_for_context()
        verify_timeline_context_reminder("stockPicking", picking_id)
        invoice_id = create_invoice_for_context()
        verify_timeline_context_reminder("accountInvoice", invoice_id)
        payment_id = create_payment_for_context()
        verify_timeline_context_reminder("accountPayment", payment_id)
    except Exception as exc:
        print(f"[platform-smoke] FAILED: {exc}", file=sys.stderr)
        return 1

    print("[platform-smoke] OK: ext_data + sys_script + cutover config persistence + preset library ops + null/action composite fallback coverage + reminder + master evidence + timeline context + attachment aggregation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
