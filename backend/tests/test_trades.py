import pytest
from httpx import AsyncClient


@pytest.fixture
async def sample_account_id(auth_client: AsyncClient) -> str:
    res = await auth_client.post(
        "/api/v1/accounts",
        json={"name": "Trading Journal Main", "currency": "USD", "initial_balance": "25000.00"},
    )
    return res.json()["id"]


@pytest.mark.asyncio
async def test_create_long_trade_calculated_pnl(auth_client: AsyncClient, sample_account_id: str):
    # Long trade: buy 100 shares AAPL at 150, sell at 155 -> Gross: +500, Comm: 2.0, Fees: 1.0 -> Net: 497.0
    payload = {
        "account_id": sample_account_id,
        "symbol": "AAPL",
        "asset_class": "equity",
        "direction": "long",
        "entry_time": "2024-03-01T14:30:00Z",
        "exit_time": "2024-03-01T15:45:00Z",
        "entry_price": "150.00",
        "exit_price": "155.00",
        "quantity": "100.00",
        "contract_size": "1.0",
        "commission": "2.00",
        "fees": "1.00",
        "stop_loss_price": "148.00",
        "take_profit_price": "156.00",
        "setup_name": "Breakout",
        "followed_plan": True,
        "status": "closed",
    }
    res = await auth_client.post("/api/v1/trades", json=payload)
    assert res.status_code == 201
    trade = res.json()
    assert trade["symbol"] == "AAPL"
    assert trade["direction"] == "long"
    assert float(trade["gross_pnl"]) == 500.00
    assert float(trade["net_pnl"]) == 497.00
    assert trade["followed_plan"] is True


@pytest.mark.asyncio
async def test_create_short_trade_calculated_pnl(auth_client: AsyncClient, sample_account_id: str):
    # Short trade: short 10 NQ contracts at 18000, buy back at 17950, contract_size 20
    # Gross: (18000 - 17950) * 10 * 20 = 50 * 200 = 10000
    # Comm: 40.0, Fees: 10.0 -> Net: 9950.0
    payload = {
        "account_id": sample_account_id,
        "symbol": "NQ",
        "asset_class": "futures",
        "direction": "short",
        "entry_time": "2024-03-02T10:00:00Z",
        "exit_time": "2024-03-02T11:30:00Z",
        "entry_price": "18000.00",
        "exit_price": "17950.00",
        "quantity": "10.00",
        "contract_size": "20.0",
        "commission": "40.00",
        "fees": "10.00",
        "status": "closed",
    }
    res = await auth_client.post("/api/v1/trades", json=payload)
    assert res.status_code == 201
    trade = res.json()
    assert float(trade["gross_pnl"]) == 10000.00
    assert float(trade["net_pnl"]) == 9950.00


@pytest.mark.asyncio
async def test_filter_and_paginate_trades(auth_client: AsyncClient, sample_account_id: str):
    symbols = ["EURUSD", "GBPUSD", "USDJPY", "EURUSD", "XAUUSD"]
    for sym in symbols:
        await auth_client.post(
            "/api/v1/trades",
            json={
                "account_id": sample_account_id,
                "symbol": sym,
                "direction": "long",
                "entry_time": "2024-03-05T08:00:00Z",
                "entry_price": "100.00",
                "exit_price": "102.00",
                "quantity": "1.00",
            },
        )

    # Filter by symbol EURUSD
    res = await auth_client.get("/api/v1/trades", params={"symbol": "EURUSD"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    for t in data["trades"]:
        assert "EURUSD" in t["symbol"]


@pytest.mark.asyncio
async def test_update_trade_recalculates_pnl(auth_client: AsyncClient, sample_account_id: str):
    res = await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": sample_account_id,
            "symbol": "TSLA",
            "direction": "long",
            "entry_time": "2024-03-05T15:00:00Z",
            "entry_price": "200.00",
            "exit_price": "210.00",
            "quantity": "10.00",
        },
    )
    trade_id = res.json()["id"]
    assert float(res.json()["net_pnl"]) == 100.00

    # Update exit price to 220 -> Net PnL should become 200.00
    patch_res = await auth_client.patch(
        f"/api/v1/trades/{trade_id}",
        json={"exit_price": "220.00", "notes": "Target extended on momentum"},
    )
    assert patch_res.status_code == 200
    assert float(patch_res.json()["net_pnl"]) == 200.00
    assert patch_res.json()["notes"] == "Target extended on momentum"


@pytest.mark.asyncio
async def test_delete_trade(auth_client: AsyncClient, sample_account_id: str):
    res = await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": sample_account_id,
            "symbol": "MSFT",
            "direction": "long",
            "entry_time": "2024-03-05T15:00:00Z",
            "entry_price": "400.00",
            "quantity": "5.00",
        },
    )
    trade_id = res.json()["id"]

    del_res = await auth_client.delete(f"/api/v1/trades/{trade_id}")
    assert del_res.status_code == 204

    # Verify not found
    get_res = await auth_client.get(f"/api/v1/trades/{trade_id}")
    assert get_res.status_code == 404
