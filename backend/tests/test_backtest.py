import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_run_backtest_simulation(auth_client: AsyncClient):
    payload = {
        "strategy_name": "Opening Range Breakout 5m",
        "symbol": "NQ",
        "timeframe": "5m",
        "start_date": "2024-01-01",
        "end_date": "2024-03-31",
        "initial_capital": "50000.00",
        "risk_per_trade_pct": "1.00",
        "target_rr": "2.00",
    }
    res = await auth_client.post("/api/v1/backtest/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["strategy_name"] == "Opening Range Breakout 5m"
    assert data["symbol"] == "NQ"
    assert data["total_trades"] > 0
    assert data["winning_trades"] + data["losing_trades"] == data["total_trades"]
    assert len(data["trades"]) == data["total_trades"]
    assert len(data["equity_curve"]) > 0
    assert "profit_factor" in data
    assert "sharpe_ratio" in data
    assert "max_drawdown_pct" in data
