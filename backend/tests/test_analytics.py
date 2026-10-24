import pytest
from httpx import AsyncClient


@pytest.fixture
async def analytics_account_id(auth_client: AsyncClient) -> str:
    res = await auth_client.post(
        "/api/v1/accounts",
        json={"name": "Analytics Test Account", "currency": "USD", "initial_balance": "10000.00"},
    )
    return res.json()["id"]


@pytest.mark.asyncio
async def test_dashboard_summary_and_charts(auth_client: AsyncClient, analytics_account_id: str):
    # Log 3 closed trades: 2 wins (+300, +200), 1 loss (-100)
    await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": analytics_account_id,
            "symbol": "AAPL",
            "direction": "long",
            "entry_time": "2024-03-01T10:00:00Z",
            "exit_time": "2024-03-01T11:00:00Z",
            "entry_price": "150.00",
            "exit_price": "153.00",
            "quantity": "100",
            "gross_pnl": "300.00",
            "net_pnl": "300.00",
        },
    )
    await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": analytics_account_id,
            "symbol": "MSFT",
            "direction": "long",
            "entry_time": "2024-03-02T10:00:00Z",
            "exit_time": "2024-03-02T11:00:00Z",
            "entry_price": "300.00",
            "exit_price": "302.00",
            "quantity": "100",
            "gross_pnl": "200.00",
            "net_pnl": "200.00",
        },
    )
    await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": analytics_account_id,
            "symbol": "TSLA",
            "direction": "short",
            "entry_time": "2024-03-03T10:00:00Z",
            "exit_time": "2024-03-03T11:00:00Z",
            "entry_price": "200.00",
            "exit_price": "201.00",
            "quantity": "100",
            "gross_pnl": "-100.00",
            "net_pnl": "-100.00",
        },
    )

    # 1. Summary
    sum_res = await auth_client.get("/api/v1/dashboard/summary", params={"account_id": analytics_account_id})
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_trades"] == 3
    assert float(summary["net_realized_pnl"]) == 400.00
    assert summary["winning_trades"] == 2
    assert summary["losing_trades"] == 1
    assert summary["win_rate"] == 66.67
    assert summary["profit_factor"] == 5.0  # 500 wins / 100 losses
    assert float(summary["expectancy"]) == round(400 / 3, 2)
    # initial balance 10000 + 400 = 10400
    assert float(summary["current_equity"]) == 10400.00

    # 2. Equity Curve
    curve_res = await auth_client.get("/api/v1/dashboard/equity-curve", params={"account_id": analytics_account_id})
    assert curve_res.status_code == 200
    curve = curve_res.json()
    assert len(curve) == 4  # starting point + 3 trades

    # 3. Daily PnL
    daily_res = await auth_client.get("/api/v1/dashboard/daily-pnl", params={"account_id": analytics_account_id})
    assert daily_res.status_code == 200
    daily = daily_res.json()
    assert len(daily) == 3

    # 4. By Symbol
    sym_res = await auth_client.get("/api/v1/analytics/by-symbol", params={"account_id": analytics_account_id})
    assert sym_res.status_code == 200
    by_symbol = sym_res.json()
    assert len(by_symbol) == 3
    assert by_symbol[0]["symbol"] in ("AAPL", "MSFT", "TSLA")
