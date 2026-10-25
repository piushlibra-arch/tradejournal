import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import pytest

from app.brokers.dhan import DhanBrokerAdapter
from app.brokers.registry import get_broker_adapter
from app.core.encryption import decrypt_token, encrypt_token
from app.core.exceptions import UnauthorizedError
from app.main import app
from app.models.broker_connection import BrokerConnection
from app.services.broker_sync_service import BrokerSyncService


def test_encryption_and_decryption_lifecycle():
    sample_token = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.dummy_dhan_token_payload"
    cipher = encrypt_token(sample_token)
    assert cipher != sample_token
    assert len(cipher) > len(sample_token)

    decrypted = decrypt_token(cipher)
    assert decrypted == sample_token


@pytest.mark.asyncio
async def test_dhan_adapter_test_connection_success():
    adapter = DhanBrokerAdapter(client_id="1000000001", access_token="mock_token")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "dhanClientId": "1000000001",
        "availabelBalance": 145000.50,
        "utilizedAmount": 12500.0,
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        summary = await adapter.test_connection()

        assert summary.broker_id == "dhan"
        assert summary.client_id == "1000000001"
        assert summary.available_cash == Decimal("145000.50")
        assert summary.margin_used == Decimal("12500.0")


@pytest.mark.asyncio
async def test_dhan_adapter_test_connection_unauthorized():
    adapter = DhanBrokerAdapter(client_id="1000000001", access_token="expired_token")

    mock_response = MagicMock()
    mock_response.status_code = 401

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        with pytest.raises(UnauthorizedError):
            await adapter.test_connection()


@pytest.mark.asyncio
async def test_dhan_adapter_fetch_executions():
    adapter = DhanBrokerAdapter(client_id="1000000001", access_token="mock_token")

    mock_trades = [
        {
            "dhanClientId": "1000000001",
            "orderId": "112111182198",
            "exchangeTradeId": "987654321",
            "transactionType": "BUY",
            "exchangeSegment": "NSE_EQ",
            "tradingSymbol": "TATASTEEL",
            "tradedQuantity": 100,
            "tradedPrice": 142.50,
            "createTime": "2024-10-24 10:15:30",
        },
        {
            "dhanClientId": "1000000001",
            "orderId": "112111182199",
            "exchangeTradeId": "987654322",
            "transactionType": "SELL",
            "exchangeSegment": "NSE_EQ",
            "tradingSymbol": "RELIANCE",
            "tradedQuantity": 10,
            "tradedPrice": 2540.00,
            "createTime": "2024-10-24 11:20:00",
        },
    ]

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_trades

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        executions = await adapter.fetch_executions()

        assert len(executions) == 2
        assert executions[0].external_id == "dhan_987654321"
        assert executions[0].symbol == "TATASTEEL"
        assert executions[0].side == "buy"
        assert executions[0].quantity == Decimal("100")
        assert executions[0].price == Decimal("142.50")

        assert executions[1].external_id == "dhan_987654322"
        assert executions[1].symbol == "RELIANCE"
        assert executions[1].side == "sell"


@pytest.mark.asyncio
async def test_broker_providers_endpoint():
    from httpx import ASGITransport, AsyncClient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/brokers/providers")
        assert res.status_code == 200
        providers = res.json()
        ids = [p["id"] for p in providers]
        assert "dhan" in ids
        assert "mt5" in ids
