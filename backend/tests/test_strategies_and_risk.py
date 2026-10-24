from datetime import datetime, timezone

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_strategies(auth_client: AsyncClient):
    payload = {
        "name": "Opening Range Breakout",
        "description": "5-minute ORB on NQ after high relative volume at market open",
        "asset_class": "Futures",
        "status": "active",
        "entry_rules": {"timeframe": "5m", "confirmation": "Candle close outside ORB"},
        "exit_rules": {"target_rr": 2.0, "trail_stop": "15m swing low"},
    }
    res = await auth_client.post("/api/v1/strategies", json=payload)
    assert res.status_code == 201
    strat = res.json()
    assert strat["name"] == "Opening Range Breakout"
    assert strat["asset_class"] == "Futures"
    strategy_id = strat["id"]

    # List strategies
    list_res = await auth_client.get("/api/v1/strategies")
    assert list_res.status_code == 200
    assert any(s["id"] == strategy_id for s in list_res.json()["items"])

    # Strategy performance
    perf_res = await auth_client.get(f"/api/v1/strategies/{strategy_id}/performance")
    assert perf_res.status_code == 200
    perf = perf_res.json()
    assert perf["total_trades"] == 0
    assert perf["win_rate"] == 0.0


@pytest.mark.asyncio
async def test_strategy_performance_with_trades(auth_client: AsyncClient):
    # Create an account
    acc_res = await auth_client.post(
        "/api/v1/accounts",
        json={"name": "Strat Account", "currency": "USD", "initial_balance": "50000.00"},
    )
    account_id = acc_res.json()["id"]

    # Create strategy
    strat_res = await auth_client.post(
        "/api/v1/strategies",
        json={"name": "FVG Retest", "asset_class": "Futures"},
    )
    strategy_id = strat_res.json()["id"]

    # Add winning trade
    await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": account_id,
            "strategy_id": strategy_id,
            "symbol": "NQ",
            "direction": "long",
            "entry_time": datetime.now(timezone.utc).isoformat(),
            "entry_price": "20000.00",
            "exit_price": "20050.00",
            "quantity": "2.00",
            "contract_size": "20.00",
        },
    )

    # Add losing trade
    await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": account_id,
            "strategy_id": strategy_id,
            "symbol": "NQ",
            "direction": "long",
            "entry_time": datetime.now(timezone.utc).isoformat(),
            "entry_price": "20050.00",
            "exit_price": "20025.00",
            "quantity": "2.00",
            "contract_size": "20.00",
        },
    )

    # Query strategy performance
    perf_res = await auth_client.get(f"/api/v1/strategies/{strategy_id}/performance")
    assert perf_res.status_code == 200
    perf = perf_res.json()
    assert perf["total_trades"] == 2
    assert perf["winning_trades"] == 1
    assert perf["losing_trades"] == 1
    assert perf["win_rate"] == 50.0
    assert float(perf["profit_factor"]) == 2.0  # $2,000 profit / $1,000 loss = 2.0


@pytest.mark.asyncio
async def test_risk_rule_crud_and_breach_evaluation(auth_client: AsyncClient):
    # Create account
    acc_res = await auth_client.post(
        "/api/v1/accounts",
        json={"name": "Risk Account", "currency": "USD", "initial_balance": "50000.00"},
    )
    account_id = acc_res.json()["id"]

    # Create Max Daily Loss rule: $500 threshold
    rule_res = await auth_client.post(
        "/api/v1/risk/rules",
        json={
            "rule_type": "max_daily_loss",
            "threshold": "500.00",
            "action": "warn",
            "is_active": True,
        },
    )
    assert rule_res.status_code == 201
    rule_id = rule_res.json()["id"]

    # Initial risk status (no trades taken today yet -> safe)
    status_res = await auth_client.get("/api/v1/risk/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["overall_status"] == "safe"
    assert status_data["breaches_count"] == 0

    # Add a trade losing $800 today (entry: 20000, exit: 19980, qty: 2, mult: 20 -> loss = -800)
    await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": account_id,
            "symbol": "NQ",
            "direction": "long",
            "entry_time": datetime.now(timezone.utc).isoformat(),
            "entry_price": "20000.00",
            "exit_price": "19980.00",
            "quantity": "2.00",
            "contract_size": "20.00",
        },
    )

    # Re-evaluate risk -> Should now be BREACHED!
    breached_res = await auth_client.get("/api/v1/risk/status")
    assert breached_res.status_code == 200
    breached_data = breached_res.json()
    assert breached_data["overall_status"] == "breached"
    assert breached_data["breaches_count"] == 1
    eval_item = breached_data["evaluations"][0]
    assert eval_item["rule_id"] == rule_id
    assert eval_item["status"] == "breached"
    assert float(eval_item["current_value"]) == 800.0
