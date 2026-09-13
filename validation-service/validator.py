import math
from typing import Any

import numpy as np
from scipy.stats import chi2_contingency, mannwhitneyu


P_VALUE_THRESHOLD = 0.05
MIN_DAILY_POINTS = 4
MIN_PAIR_COUNT = 2


def _result(rec_id: str, passed: bool, test: str, p_value: float | None, message: str) -> dict[str, Any]:
    safe_p = None
    if p_value is not None:
        try:
            safe_p = round(float(p_value), 4)
            if math.isnan(safe_p):
                safe_p = None
        except (TypeError, ValueError):
            safe_p = None

    return {
        "id": rec_id,
        "passed": bool(passed),
        "test": test,
        "pValue": safe_p,
        "message": message,
    }


def _daily_units(product_daily_sales: dict, product_id: int) -> list[int]:
    series = product_daily_sales.get(str(product_id), [])
    return [int(point.get("units", 0)) for point in series]


def validate_trend(rec_id: str, product_id: int, product_daily_sales: dict, direction: str) -> dict[str, Any]:
    values = _daily_units(product_daily_sales, product_id)

    if len(values) < MIN_DAILY_POINTS:
        return _result(
            rec_id,
            False,
            "insufficient_data",
            None,
            f"Need at least {MIN_DAILY_POINTS} daily sales points; got {len(values)}.",
        )

    mid = len(values) // 2
    early = values[:mid]
    recent = values[mid:]

    if sum(early) == 0 and sum(recent) == 0:
        return _result(rec_id, False, "mannwhitneyu", None, "No sales recorded in the analysis window.")

    try:
        alternative = "greater" if direction == "increase" else "less"
        stat, p_value = mannwhitneyu(recent, early, alternative=alternative)
        early_mean = float(np.mean(early))
        recent_mean = float(np.mean(recent))

        if direction == "increase":
            passed = p_value < P_VALUE_THRESHOLD and recent_mean > early_mean
            msg = (
                f"Recent daily avg {recent_mean:.2f} vs earlier {early_mean:.2f} units "
                f"(Mann-Whitney p={p_value:.4f})."
            )
        else:
            passed = p_value < P_VALUE_THRESHOLD and recent_mean < early_mean
            msg = (
                f"Recent daily avg {recent_mean:.2f} vs earlier {early_mean:.2f} units "
                f"(Mann-Whitney p={p_value:.4f})."
            )

        return _result(rec_id, passed, "mannwhitneyu", float(p_value), msg)
    except ValueError as exc:
        return _result(rec_id, False, "mannwhitneyu", None, f"Could not run trend test: {exc}")


def validate_bundle(rec_id: str, product_ids: list, co_purchase_pairs: list) -> dict[str, Any]:
    if not product_ids or len(product_ids) != 2:
        return _result(rec_id, False, "invalid_input", None, "Bundle recommendations require exactly two productIds.")

    a_id, b_id = sorted([int(product_ids[0]), int(product_ids[1])])
    pair = next(
        (
            p
            for p in co_purchase_pairs
            if int(p.get("productAId")) == a_id and int(p.get("productBId")) == b_id
        ),
        None,
    )

    if not pair:
        return _result(rec_id, False, "co_purchase", None, "Products were not purchased together in recorded sales.")

    pair_count = int(pair.get("pairCount", 0))
    if pair_count < MIN_PAIR_COUNT:
        return _result(
            rec_id,
            False,
            "co_purchase",
            None,
            f"Co-purchase count {pair_count} is below minimum {MIN_PAIR_COUNT}.",
        )

    total_pairs = sum(int(p.get("pairCount", 0)) for p in co_purchase_pairs) or 1
    expected = max(pair_count / total_pairs, 0.01)

    observed = np.array([[pair_count, max(total_pairs - pair_count, 1)], [1, max(total_pairs - 1, 1)]])
    try:
        chi2, p_value, _, _ = chi2_contingency(observed)
        passed = pair_count >= MIN_PAIR_COUNT and p_value < P_VALUE_THRESHOLD
        return _result(
            rec_id,
            passed,
            "chi2_contingency",
            float(p_value),
            f"Products co-purchased {pair_count} time(s); chi-square p={p_value:.4f}.",
        )
    except ValueError:
        passed = pair_count >= MIN_PAIR_COUNT
        return _result(
            rec_id,
            passed,
            "co_purchase_threshold",
            None,
            f"Products co-purchased {pair_count} time(s) (threshold test).",
        )


def validate_recommendation(rec: dict, payload: dict) -> dict[str, Any]:
    rec_id = rec.get("id", "unknown")
    rec_type = rec.get("type")
    product_daily_sales = payload.get("productDailySales", {})
    co_purchase_pairs = payload.get("coPurchasePairs", [])

    if rec_type in ("restock", "promote"):
        product_id = rec.get("productId")
        if product_id is None:
            return _result(rec_id, False, "invalid_input", None, "Missing productId.")
        return validate_trend(rec_id, int(product_id), product_daily_sales, "increase")

    if rec_type == "discontinue":
        product_id = rec.get("productId")
        if product_id is None:
            return _result(rec_id, False, "invalid_input", None, "Missing productId.")
        return validate_trend(rec_id, int(product_id), product_daily_sales, "decrease")

    if rec_type == "bundle":
        return validate_bundle(rec_id, rec.get("productIds") or [], co_purchase_pairs)

    return _result(rec_id, False, "unsupported_type", None, f"Unsupported recommendation type: {rec_type}")


def validate_recommendations(payload: dict) -> dict[str, Any]:
    recommendations = payload.get("recommendations", [])
    results = [validate_recommendation(rec, payload) for rec in recommendations]
    return {
        "results": results,
        "passedCount": sum(1 for r in results if r["passed"]),
        "totalCount": len(results),
    }
