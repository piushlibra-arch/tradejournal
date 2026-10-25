import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_get_market_data_instruments():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/market-data/instruments")
        assert res.status_code == 200
        instruments = res.json()
        assert len(instruments) >= 5
        symbols = [i["symbol"] for i in instruments]
        assert "XAUUSD" in symbols
        assert "BTCUSDT" in symbols
        assert "NQ" in symbols


@pytest.mark.asyncio
async def test_get_market_data_candles():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/market-data/candles?symbol=XAUUSD&timeframe=15m&limit=25")
        assert res.status_code == 200
        candles = res.json()
        assert len(candles) == 25
        first = candles[0]
        assert "open" in first
        assert "high" in first
        assert "low" in first
        assert "close" in first
        assert first["high"] >= first["low"]
