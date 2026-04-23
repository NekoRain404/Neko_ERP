#!/usr/bin/env python3
"""Run a focused first-wave rollback drill using existing action smoke helpers."""

from __future__ import annotations

import json
import sys
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from smoke_core_actions import (
    run_invoice_payment_side_effect,
    run_purchase_bill_side_effect,
    run_sale_confirm_side_effect,
    run_sale_invoice_side_effect,
)


@dataclass(frozen=True)
class DrillResult:
    key: str
    title: str
    status: str


DRILLS: tuple[tuple[str, str, Callable[[], None]], ...] = (
    ("sales_confirm", "Sales confirm rollback", run_sale_confirm_side_effect),
    ("sales_invoice", "Sales invoice rollback", run_sale_invoice_side_effect),
    ("purchase_bill", "Purchase bill rollback", run_purchase_bill_side_effect),
    ("invoice_payment", "Invoice payment rollback", run_invoice_payment_side_effect),
)


def main() -> int:
    results: list[DrillResult] = []

    try:
        for key, title, runner in DRILLS:
            print(f"[rollback-drill] start {key}")
            runner()
            results.append(DrillResult(key=key, title=title, status="passed"))
            print(f"[rollback-drill] passed {key}")
    except Exception as exc:
        print(f"[rollback-drill] FAILED: {exc}", file=sys.stderr)
        if results:
            print(
                json.dumps(
                    {
                        "generatedAt": datetime.now(timezone.utc).isoformat(),
                        "status": "failed",
                        "completed": [asdict(item) for item in results],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
        return 1

    print(
        json.dumps(
            {
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "status": "passed",
                "results": [asdict(item) for item in results],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    print("[rollback-drill] OK: first-wave rollback drill passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
