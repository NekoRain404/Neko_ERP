#!/usr/bin/env python3
"""Smoke test for secondary module action endpoints."""

from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "http://127.0.0.1:8080/api"


@dataclass(frozen=True)
class ActionScenario:
    name: str
    base_path: str
    create_payload: dict[str, Any]
    actions: tuple[str, ...]
    expected_fields: dict[str, Any]


def request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {body}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {path} failed: {exc}") from exc


def find_record(base_path: str, expected_name: str) -> dict[str, Any]:
    page = request("GET", f"{base_path}/list?current=1&size=200")
    records = page["data"]["records"]
    for record in records:
        if record.get("name") == expected_name:
            return record
    raise RuntimeError(f"Record not found in {base_path}: {expected_name}")


def assert_fields(record: dict[str, Any], expected: dict[str, Any]) -> None:
    for key, value in expected.items():
        if record.get(key) != value:
            raise RuntimeError(
                f"Field check failed for {record.get('name')} -> {key}: "
                f"expected {value!r}, got {record.get(key)!r}"
            )


def decimal_value(value: Any) -> Decimal:
    return Decimal(str(value or 0))


def sum_quantities(records: list[dict[str, Any]]) -> Decimal:
    return sum((decimal_value(record.get("quantity")) for record in records), Decimal("0"))


def overwrite_quant_quantity(record: dict[str, Any], quantity: Decimal) -> None:
    payload = {
        "name": record.get("name"),
        "productId": record.get("productId"),
        "locationId": record.get("locationId"),
        "quantity": str(quantity),
        "companyId": record.get("companyId") or 1,
    }
    update_res = request("PUT", f"/stock/stock-quant/{record['id']}", payload)
    if update_res.get("code") != 200 or update_res.get("data") is not True:
        raise RuntimeError(f"Update failed for stockQuant #{record['id']}: {update_res}")


def reset_quant_scope(product_id: int, location_id: int) -> None:
    scope_records = request(
        "GET",
        f"/stock/stock-quant/list?current=1&size=200&productId={product_id}&locationId={location_id}",
    )["data"]["records"]
    for record in scope_records:
        overwrite_quant_quantity(record, Decimal("0.00"))


def run_scenario(scenario: ActionScenario) -> None:
    print(f"[secondary-action-smoke] create {scenario.name}")
    create_res = request("POST", scenario.base_path, scenario.create_payload)
    if create_res.get("code") != 200 or create_res.get("data") is not True:
        raise RuntimeError(f"Create failed for {scenario.name}: {create_res}")

    time.sleep(0.2)
    created = find_record(scenario.base_path, scenario.create_payload["name"])

    for action in scenario.actions:
        print(f"[secondary-action-smoke] execute {action} -> id={created['id']}")
        action_res = request("POST", f"{scenario.base_path}/{created['id']}/actions/{action}")
        if action_res.get("code") != 200 or action_res.get("data") is not True:
            raise RuntimeError(f"Action failed for {scenario.name}: {action_res}")
        time.sleep(0.2)

    updated = request("GET", f"{scenario.base_path}/{created['id']}")["data"]
    assert_fields(updated, scenario.expected_fields)


def run_stock_inventory_quant_sync() -> None:
    suffix = str(int(time.time()))[-6:]
    inventory_name = f"ACT-INV-SYNC-{suffix}"
    source_location = 200000 + int(suffix)
    product_id = 1

    print("[secondary-action-smoke] seed stockQuant.inventory")
    quant_res = request(
        "POST",
        "/stock/stock-quant",
        {
            "name": f"Q/{product_id}/{source_location}",
            "productId": product_id,
            "locationId": source_location,
            "quantity": 8.00,
            "companyId": 1,
        },
    )
    if quant_res.get("code") != 200 or quant_res.get("data") is not True:
        raise RuntimeError(f"Create failed for stockQuant.inventory: {quant_res}")

    print("[secondary-action-smoke] create stockInventory.quantSync")
    create_res = request(
        "POST",
        "/stock/stock-inventory",
        {
            "name": inventory_name,
            "companyId": 1,
            "locationIds": str(source_location),
        },
    )
    if create_res.get("code") != 200 or create_res.get("data") is not True:
        raise RuntimeError(f"Create failed for stockInventory.quantSync: {create_res}")
    time.sleep(0.2)
    inventory = find_record("/stock/stock-inventory", inventory_name)

    print("[secondary-action-smoke] create stockInventoryLine.quantSync")
    line_res = request(
        "POST",
        "/stock/stock-inventory-line",
        {
            "inventoryId": inventory["id"],
            "locationId": source_location,
            "productId": product_id,
            "productQty": 5.00,
        },
    )
    if line_res.get("code") != 200 or line_res.get("data") is not True:
        raise RuntimeError(f"Create failed for stockInventoryLine.quantSync: {line_res}")
    time.sleep(0.2)
    lines = request("GET", f"/stock/stock-inventory-line/list?current=1&size=20&inventoryId={inventory['id']}")["data"]["records"]
    if len(lines) != 1:
        raise RuntimeError(f"Inventory line list failed: {lines}")
    line_detail = request("GET", f"/stock/stock-inventory-line/{lines[0]['id']}")["data"]
    if float(line_detail.get("theoreticalQty") or 0) != 8.0:
        raise RuntimeError(f"Inventory theoretical qty default failed: {line_detail}")
    if float(line_detail.get("differenceQty") or 0) != -3.0 or line_detail.get("differenceState") != "loss":
        raise RuntimeError(f"Inventory difference default failed: {line_detail}")

    print(f"[secondary-action-smoke] execute action_start -> inventory={inventory['id']}")
    start_res = request("POST", f"/stock/stock-inventory/{inventory['id']}/actions/action_start")
    if start_res.get("code") != 200 or start_res.get("data") is not True:
        raise RuntimeError(f"Start failed for stockInventory.quantSync: {start_res}")
    print(f"[secondary-action-smoke] execute action_validate -> inventory={inventory['id']}")
    validate_res = request("POST", f"/stock/stock-inventory/{inventory['id']}/actions/action_validate")
    if validate_res.get("code") != 200 or validate_res.get("data") is not True:
        raise RuntimeError(f"Validate failed for stockInventory.quantSync: {validate_res}")
    time.sleep(0.2)
    quant_after = request("GET", f"/stock/stock-quant/list?current=1&size=20&productId={product_id}&locationId={source_location}")["data"]["records"]
    if not quant_after or float(quant_after[0].get("quantity") or 0) != 5.0:
        raise RuntimeError(f"Inventory quant validate sync failed: {quant_after}")
    line_after = request("GET", f"/stock/stock-inventory-line/{lines[0]['id']}")["data"]
    if float(line_after.get("differenceQty") or 0) != 0.0 or line_after.get("differenceState") != "match":
        raise RuntimeError(f"Inventory difference validate sync failed: {line_after}")

    print(f"[secondary-action-smoke] execute action_draft -> inventory={inventory['id']}")
    draft_res = request("POST", f"/stock/stock-inventory/{inventory['id']}/actions/action_draft")
    if draft_res.get("code") != 200 or draft_res.get("data") is not True:
        raise RuntimeError(f"Draft failed for stockInventory.quantSync: {draft_res}")
    time.sleep(0.2)
    quant_reset = request("GET", f"/stock/stock-quant/list?current=1&size=20&productId={product_id}&locationId={source_location}")["data"]["records"]
    if not quant_reset or float(quant_reset[0].get("quantity") or 0) != 8.0:
        raise RuntimeError(f"Inventory quant draft rollback failed: {quant_reset}")
    line_reset = request("GET", f"/stock/stock-inventory-line/{lines[0]['id']}")["data"]
    if float(line_reset.get("differenceQty") or 0) != -3.0 or line_reset.get("differenceState") != "loss":
        raise RuntimeError(f"Inventory difference draft rollback failed: {line_reset}")


def run_account_payment_journal_linkage() -> None:
    suffix = str(int(time.time()))[-6:]
    payment_name = f"ACT-PAY-LINK-{suffix}"

    print("[secondary-action-smoke] create accountPayment.journalLink")
    create_res = request(
        "POST",
        "/account/account-payment",
        {
            "name": payment_name,
            "partnerId": 1,
            "currencyId": 1,
            "journalId": 1,
            "companyId": 1,
            "paymentType": "inbound",
            "amount": 66.66,
            "memo": "payment journal linkage",
        },
    )
    if create_res.get("code") != 200 or create_res.get("data") is not True:
        raise RuntimeError(f"Create failed for accountPayment.journalLink: {create_res}")
    time.sleep(0.2)
    payment = find_record("/account/account-payment", payment_name)

    print(f"[secondary-action-smoke] execute action_post -> payment={payment['id']}")
    post_res = request("POST", f"/account/account-payment/{payment['id']}/actions/action_post")
    if post_res.get("code") != 200 or post_res.get("data") is not True:
        raise RuntimeError(f"Post failed for accountPayment.journalLink: {post_res}")
    time.sleep(0.2)
    posted_payment = request("GET", f"/account/account-payment/{payment['id']}")["data"]
    journal_entry_ref = posted_payment.get("journalEntryRef")
    if not journal_entry_ref or not str(journal_entry_ref).startswith("MOVE/"):
        raise RuntimeError(f"Payment journal entry ref missing after post: {posted_payment}")

    moves = request("GET", f"/account/account-move/list?current=1&size=20&keyword={journal_entry_ref}")["data"]["records"]
    move = next((record for record in moves if record.get("name") == journal_entry_ref), None)
    if move is None or move.get("state") != "posted":
        raise RuntimeError(f"Payment journal entry move missing after post: {moves}")
    ref_moves = request("GET", f"/account/account-move/list?current=1&size=20&ref={payment_name}")["data"]["records"]
    if not any(record.get("name") == journal_entry_ref for record in ref_moves):
        raise RuntimeError(f"Payment journal entry ref filter failed: {ref_moves}")
    lines = request(
        "GET",
        f"/account/account-move-line/list?current=1&size=20&moveId={move['id']}&paymentRef={payment_name}",
    )["data"]["records"]
    if len(lines) != 2 or any(line.get("reconciled") != "open" for line in lines):
        raise RuntimeError(f"Payment journal entry lines missing after post: {lines}")

    print(f"[secondary-action-smoke] execute action_draft -> payment={payment['id']}")
    draft_res = request("POST", f"/account/account-payment/{payment['id']}/actions/action_draft")
    if draft_res.get("code") != 200 or draft_res.get("data") is not True:
        raise RuntimeError(f"Draft failed for accountPayment.journalLink: {draft_res}")
    time.sleep(0.2)
    draft_payment = request("GET", f"/account/account-payment/{payment['id']}")["data"]
    if draft_payment.get("journalEntryRef") != journal_entry_ref:
        raise RuntimeError(f"Payment journal ref changed unexpectedly on draft: {draft_payment}")
    draft_move = request("GET", f"/account/account-move/list?current=1&size=20&keyword={journal_entry_ref}")["data"]["records"]
    draft_move = next((record for record in draft_move if record.get("name") == journal_entry_ref), None)
    if draft_move is None or draft_move.get("state") != "draft":
        raise RuntimeError(f"Payment journal entry move draft sync failed: {draft_move}")
    draft_lines = request(
        "GET",
        f"/account/account-move-line/list?current=1&size=20&moveId={draft_move['id']}&paymentRef={payment_name}",
    )["data"]["records"]
    if len(draft_lines) != 2 or any(line.get("reconciled") != "draft" for line in draft_lines):
        raise RuntimeError(f"Payment journal entry lines draft sync failed: {draft_lines}")


def run_mrp_production_bom_sync() -> None:
    suffix = str(int(time.time()))[-6:]
    bom_name = f"ACT-BOM-LINK-{suffix}"
    production_name = f"ACT-MO-LINK-{suffix}"
    product_id = 1
    component_product_id = 2
    finished_location_id = 200000 + int(suffix)
    component_source_location_id = 1
    production_location_id = 2

    finished_before_list = request("GET", f"/stock/stock-quant/list?current=1&size=50&productId={product_id}&locationId={finished_location_id}")["data"]["records"]
    finished_before = sum_quantities(finished_before_list)
    # The MRP quant scope is reused across repeated smoke runs. Resetting the
    # source and WIP buckets keeps this scenario deterministic and avoids
    # numeric overflow from historical test residue.
    reset_quant_scope(component_product_id, component_source_location_id)
    reset_quant_scope(component_product_id, production_location_id)
    component_source_before_list = request(
        "GET",
        f"/stock/stock-quant/list?current=1&size=200&productId={component_product_id}&locationId={component_source_location_id}",
    )["data"]["records"]
    component_source_before = sum_quantities(component_source_before_list)
    component_wip_before_list = request(
        "GET",
        f"/stock/stock-quant/list?current=1&size=200&productId={component_product_id}&locationId={production_location_id}",
    )["data"]["records"]
    component_wip_before = sum_quantities(component_wip_before_list)

    print("[secondary-action-smoke] seed stockQuant.mrpComponent")
    quant_res = request(
        "POST",
        "/stock/stock-quant",
        {
            "name": f"Q/{component_product_id}/{component_source_location_id}",
            "productId": component_product_id,
            "locationId": component_source_location_id,
            "quantity": "30.00",
            "companyId": 1,
        },
    )
    if quant_res.get("code") != 200 or quant_res.get("data") is not True:
        raise RuntimeError(f"Create failed for stockQuant.mrpComponent: {quant_res}")
    component_source_seed_list = request(
        "GET",
        f"/stock/stock-quant/list?current=1&size=200&productId={component_product_id}&locationId={component_source_location_id}",
    )["data"]["records"]
    component_source_seed = sum_quantities(component_source_seed_list)

    print("[secondary-action-smoke] create mrpBom.productionLink")
    bom_res = request(
        "POST",
        "/mrp/mrp-bom",
        {
            "name": bom_name,
            "productId": product_id,
            "productQty": 2.00,
            "companyId": 1,
        },
    )
    if bom_res.get("code") != 200 or bom_res.get("data") is not True:
        raise RuntimeError(f"Create failed for mrpBom.productionLink: {bom_res}")
    time.sleep(0.2)
    bom = find_record("/mrp/mrp-bom", bom_name)

    print("[secondary-action-smoke] create mrpBomLine.productionLink")
    bom_line_res = request(
        "POST",
        "/mrp/mrp-bom-line",
        {
            "bomId": bom["id"],
            "productId": component_product_id,
            "productQty": 3.00,
        },
    )
    if bom_line_res.get("code") != 200 or bom_line_res.get("data") is not True:
        raise RuntimeError(f"Create failed for mrpBomLine.productionLink: {bom_line_res}")

    print("[secondary-action-smoke] create mrpProduction.bomSync")
    production_res = request(
        "POST",
        "/mrp/mrp-production",
        {
            "name": production_name,
            "bomId": bom["id"],
            "finishedLocationId": finished_location_id,
        },
    )
    if production_res.get("code") != 200 or production_res.get("data") is not True:
        raise RuntimeError(f"Create failed for mrpProduction.bomSync: {production_res}")
    time.sleep(0.2)
    production = find_record("/mrp/mrp-production", production_name)
    production_detail = request("GET", f"/mrp/mrp-production/{production['id']}")["data"]
    if production_detail.get("productId") != product_id or decimal_value(production_detail.get("productQty")) != Decimal("2.0"):
        raise RuntimeError(f"MRP production BOM sync failed on create: {production_detail}")

    filtered = request("GET", f"/mrp/mrp-production/list?current=1&size=20&bomId={bom['id']}")["data"]["records"]
    if not any(record.get("id") == production["id"] for record in filtered):
        raise RuntimeError(f"MRP production BOM filter failed: {filtered}")
    origin_filtered = request("GET", f"/mrp/mrp-production/list?current=1&size=20&originRef={bom_name}")["data"]["records"]
    if not any(record.get("id") == production["id"] for record in origin_filtered):
        raise RuntimeError(f"MRP production originRef filter failed: {origin_filtered}")

    print(f"[secondary-action-smoke] execute action_confirm -> production={production['id']}")
    confirm_res = request("POST", f"/mrp/mrp-production/{production['id']}/actions/action_confirm")
    if confirm_res.get("code") != 200 or confirm_res.get("data") is not True:
        raise RuntimeError(f"Confirm failed for mrpProduction.bomSync: {confirm_res}")
    time.sleep(0.2)
    move_after_confirm = request("GET", f"/stock/stock-move/list?current=1&size=20&productionId={production['id']}")["data"]["records"]
    if len(move_after_confirm) < 2:
        raise RuntimeError(f"MRP production move sync failed on confirm: {move_after_confirm}")
    if not any(str(record.get("name") or "").startswith("MO-FG/") for record in move_after_confirm):
        raise RuntimeError(f"MRP production finished move missing: {move_after_confirm}")
    if not any(str(record.get("name") or "").startswith("MO-COMP/") for record in move_after_confirm):
        raise RuntimeError(f"MRP production component move missing: {move_after_confirm}")
    component_move = next((record for record in move_after_confirm if str(record.get("name") or "").startswith("MO-COMP/")), None)
    if component_move is None:
        raise RuntimeError(f"MRP production component move lookup failed: {move_after_confirm}")
    source_line_filtered = request("GET", f"/stock/stock-move/list?current=1&size=20&sourceLineRef={component_move['sourceLineRef']}")["data"]["records"]
    if not any(record.get("id") == component_move["id"] for record in source_line_filtered):
        raise RuntimeError(f"Stock move sourceLineRef filter failed: {source_line_filtered}")
    origin_filtered_move = request("GET", f"/stock/stock-move/list?current=1&size=20&originRef={production_name}")["data"]["records"]
    if not any(record.get("productionId") == production["id"] for record in origin_filtered_move):
        raise RuntimeError(f"Stock move originRef filter failed: {origin_filtered_move}")

    print(f"[secondary-action-smoke] execute button_mark_done -> production={production['id']}")
    done_res = request("POST", f"/mrp/mrp-production/{production['id']}/actions/button_mark_done")
    if done_res.get("code") != 200 or done_res.get("data") is not True:
        raise RuntimeError(f"Done failed for mrpProduction.bomSync: {done_res}")
    time.sleep(0.2)
    move_after_done = request("GET", f"/stock/stock-move/list?current=1&size=20&productionId={production['id']}&state=done")["data"]["records"]
    if len(move_after_done) < 2:
        raise RuntimeError(f"MRP production move state sync failed on done: {move_after_done}")
    component_role_moves = request("GET", f"/stock/stock-move/list?current=1&size=20&productionId={production['id']}&moveRole=component")["data"]["records"]
    if not component_role_moves:
        raise RuntimeError(f"MRP component moveRole filter failed: {component_role_moves}")
    finished_role_moves = request("GET", f"/stock/stock-move/list?current=1&size=20&productionId={production['id']}&moveRole=finished")["data"]["records"]
    if len(finished_role_moves) != 1:
        raise RuntimeError(f"MRP finished moveRole filter failed: {finished_role_moves}")
    production_done = request("GET", f"/mrp/mrp-production/{production['id']}")["data"]
    if decimal_value(production_done.get("componentCost")) != Decimal("3.0") or decimal_value(production_done.get("finishedCost")) != Decimal("3.0"):
        raise RuntimeError(f"MRP production cost sync failed: {production_done}")

    finished_after_list = request("GET", f"/stock/stock-quant/list?current=1&size=50&productId={product_id}&locationId={finished_location_id}")["data"]["records"]
    finished_after = sum_quantities(finished_after_list)
    if finished_after != finished_before + Decimal("2.0"):
        raise RuntimeError(f"MRP finished quant sync failed: before={finished_before}, after={finished_after}")
    component_source_after_list = request(
        "GET",
        f"/stock/stock-quant/list?current=1&size=200&productId={component_product_id}&locationId={component_source_location_id}",
    )["data"]["records"]
    component_source_after = sum_quantities(component_source_after_list)
    if component_source_after != component_source_seed - Decimal("3.0"):
        raise RuntimeError(
            "MRP component source quant sync failed: "
            f"seed={component_source_seed}, after={component_source_after}"
        )
    component_wip_after_list = request(
        "GET",
        f"/stock/stock-quant/list?current=1&size=200&productId={component_product_id}&locationId={production_location_id}",
    )["data"]["records"]
    component_wip_after = sum_quantities(component_wip_after_list)
    if component_wip_after != component_wip_before + Decimal("3.0"):
        raise RuntimeError(
            "MRP component WIP quant sync failed: "
            f"before={component_wip_before}, after={component_wip_after}"
        )

    print(f"[secondary-action-smoke] execute action_draft -> production={production['id']}")
    draft_res = request("POST", f"/mrp/mrp-production/{production['id']}/actions/action_draft")
    if draft_res.get("code") != 200 or draft_res.get("data") is not True:
        raise RuntimeError(f"Draft failed for mrpProduction.bomSync: {draft_res}")
    time.sleep(0.2)
    move_after_draft = request("GET", f"/stock/stock-move/list?current=1&size=20&productionId={production['id']}&state=draft")["data"]["records"]
    if len(move_after_draft) < 2:
        raise RuntimeError(f"MRP production move rollback failed on draft: {move_after_draft}")

    finished_reset_list = request("GET", f"/stock/stock-quant/list?current=1&size=50&productId={product_id}&locationId={finished_location_id}")["data"]["records"]
    finished_reset = sum_quantities(finished_reset_list)
    if finished_reset != finished_before:
        raise RuntimeError(f"MRP finished quant rollback failed: before={finished_before}, reset={finished_reset}")
    component_source_reset_list = request(
        "GET",
        f"/stock/stock-quant/list?current=1&size=200&productId={component_product_id}&locationId={component_source_location_id}",
    )["data"]["records"]
    component_source_reset = sum_quantities(component_source_reset_list)
    if component_source_reset != component_source_seed:
        raise RuntimeError(
            "MRP component source quant rollback failed: "
            f"seed={component_source_seed}, reset={component_source_reset}"
        )
    component_wip_reset_list = request(
        "GET",
        f"/stock/stock-quant/list?current=1&size=200&productId={component_product_id}&locationId={production_location_id}",
    )["data"]["records"]
    component_wip_reset = sum_quantities(component_wip_reset_list)
    if component_wip_reset != component_wip_before:
        raise RuntimeError(
            "MRP component WIP quant rollback failed: "
            f"before={component_wip_before}, reset={component_wip_reset}"
        )


def run_account_move_reconciliation() -> None:
    suffix = str(int(time.time()))[-6:]
    move_name = f"ACT-MOVE-REC-{suffix}"

    print("[secondary-action-smoke] create accountMove.reconciliation")
    create_res = request(
        "POST",
        "/account/account-move",
        {
            "name": move_name,
            "moveType": "entry",
            "companyId": 1,
            "journalId": 1,
            "lineIds": [
                {"name": f"{move_name}-D", "accountId": 1, "debit": 100.00, "credit": 0.00, "balance": 100.00},
                {"name": f"{move_name}-C", "accountId": 1, "debit": 0.00, "credit": 100.00, "balance": -100.00},
            ],
        },
    )
    if create_res.get("code") != 200 or create_res.get("data") is not True:
        raise RuntimeError(f"Create failed for accountMove.reconciliation: {create_res}")
    time.sleep(0.2)
    move = find_record("/account/account-move", move_name)
    lines = request("GET", f"/account/account-move-line/list?current=1&size=20&moveId={move['id']}")["data"]["records"]
    if len(lines) != 2:
        raise RuntimeError(f"Move line create failed: {lines}")
    detail = request("GET", f"/account/account-move-line/{lines[0]['id']}")["data"]
    if detail.get("reconciled") != "draft" or float(detail.get("residualAmount") or 0) == 0.0:
        raise RuntimeError(f"Move line draft semantics failed: {detail}")

    print(f"[secondary-action-smoke] execute action_post -> move={move['id']}")
    post_res = request("POST", f"/account/account-move/{move['id']}/actions/action_post")
    if post_res.get("code") != 200 or post_res.get("data") is not True:
        raise RuntimeError(f"Post failed for accountMove.reconciliation: {post_res}")
    time.sleep(0.2)
    posted_lines = request("GET", f"/account/account-move-line/list?current=1&size=20&moveId={move['id']}&reconciled=open")["data"]["records"]
    if len(posted_lines) != 2:
        raise RuntimeError(f"Move line post semantics failed: {posted_lines}")

    print(f"[secondary-action-smoke] execute action_reconcile -> move={move['id']}")
    reconcile_res = request("POST", f"/account/account-move/{move['id']}/actions/action_reconcile")
    if reconcile_res.get("code") != 200 or reconcile_res.get("data") is not True:
        raise RuntimeError(f"Reconcile failed for accountMove.reconciliation: {reconcile_res}")
    time.sleep(0.2)
    matched_lines = request("GET", f"/account/account-move-line/list?current=1&size=20&moveId={move['id']}&reconciled=matched")["data"]["records"]
    if len(matched_lines) != 2 or any(float(line.get("residualAmount") or 0) != 0.0 for line in matched_lines):
        raise RuntimeError(f"Move line reconcile semantics failed: {matched_lines}")

    print(f"[secondary-action-smoke] execute action_unreconcile -> move={move['id']}")
    unreconcile_res = request("POST", f"/account/account-move/{move['id']}/actions/action_unreconcile")
    if unreconcile_res.get("code") != 200 or unreconcile_res.get("data") is not True:
        raise RuntimeError(f"Unreconcile failed for accountMove.reconciliation: {unreconcile_res}")
    time.sleep(0.2)
    reopened_lines = request("GET", f"/account/account-move-line/list?current=1&size=20&moveId={move['id']}&reconciled=open")["data"]["records"]
    if len(reopened_lines) != 2:
        raise RuntimeError(f"Move line unreconcile semantics failed: {reopened_lines}")

    print(f"[secondary-action-smoke] execute reverse -> move={move['id']}")
    reverse_res = request("POST", f"/account/account-move/{move['id']}/actions/reverse")
    if reverse_res.get("code") != 200 or reverse_res.get("data") is not True:
        raise RuntimeError(f"Reverse failed for accountMove.reconciliation: {reverse_res}")
    time.sleep(0.2)
    reversed_lines = request("GET", f"/account/account-move-line/list?current=1&size=20&moveId={move['id']}&reconciled=reversed")["data"]["records"]
    if len(reversed_lines) != 2:
        raise RuntimeError(f"Move line reverse semantics failed: {reversed_lines}")


def main() -> int:
    suffix = str(int(time.time()))[-6:]
    scenarios = (
        ActionScenario(
            name="mrpProduction.confirm",
            base_path="/mrp/mrp-production",
            create_payload={
                "name": f"ACT-MO-{suffix}",
                "productId": 1,
                "bomId": 1,
                "companyId": 1,
                "productQty": 1.00,
            },
            actions=("action_confirm",),
            expected_fields={"state": "confirmed"},
        ),
        ActionScenario(
            name="stockInventory.startValidate",
            base_path="/stock/stock-inventory",
            create_payload={
                "name": f"ACT-INV-{suffix}",
                "companyId": 1,
                "locationIds": "1",
            },
            actions=("action_start", "action_validate"),
            expected_fields={"state": "done"},
        ),
        ActionScenario(
            name="hrLeave.confirmApprove",
            base_path="/base/hr-leave",
            create_payload={
                "name": f"ACT-LEAVE-{suffix}",
                "employeeId": 1,
            },
            actions=("action_confirm", "action_approve"),
            expected_fields={"state": "validate"},
        ),
        ActionScenario(
            name="accountPayment.post",
            base_path="/account/account-payment",
            create_payload={
                "name": f"ACT-PAY-{suffix}",
                "partnerId": 1,
                "currencyId": 1,
                "journalId": 1,
                "companyId": 1,
                "paymentType": "inbound",
                "amount": 88.88,
                "memo": "secondary action smoke",
            },
            actions=("action_post",),
            expected_fields={"state": "posted"},
        ),
        ActionScenario(
            name="crmLead.markWon",
            base_path="/base/crm-lead",
            create_payload={
                "name": f"ACT-LEAD-{suffix}",
                "partnerId": 1,
                "userId": 1,
                "companyId": 1,
                "stageId": 1,
                "type": "lead",
            },
            actions=("action_mark_won",),
            expected_fields={"active": True, "priority": "3"},
        ),
        ActionScenario(
            name="projectTask.startDone",
            base_path="/base/project-task",
            create_payload={
                "name": f"ACT-TASK-{suffix}",
                "projectId": 1,
                "userId": 1,
                "companyId": 1,
            },
            actions=("action_start", "action_done"),
            expected_fields={"stageId": 3, "sequence": 100},
        ),
        ActionScenario(
            name="sysRole.disableArchive",
            base_path="/system/sys-role",
            create_payload={
                "name": f"ACT-ROLE-{suffix}",
                "roleCode": f"ACT_ROLE_{suffix}",
                "roleName": f"Act Role {suffix}",
            },
            actions=("action_disable", "action_archive"),
            expected_fields={"status": 0, "deleted": 1},
        ),
        ActionScenario(
            name="sysUser.disableArchive",
            base_path="/system/sys-user",
            create_payload={
                "name": f"ACT-USER-{suffix}",
                "username": f"act_user_{suffix}",
                "password": "act123456",
                "realName": f"Act User {suffix}",
                "partnerId": 1,
            },
            actions=("action_disable", "action_archive"),
            expected_fields={"status": 0, "deleted": 1},
        ),
    )

    try:
        for scenario in scenarios:
            run_scenario(scenario)
        run_account_move_reconciliation()
        run_account_payment_journal_linkage()
        run_stock_inventory_quant_sync()
        run_mrp_production_bom_sync()
    except Exception as exc:
        print(f"[secondary-action-smoke] FAILED: {exc}", file=sys.stderr)
        return 1

    print("[secondary-action-smoke] OK: secondary action flows passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
