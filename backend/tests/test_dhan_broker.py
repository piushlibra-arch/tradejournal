import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import pytest

from app.brokers.base import BrokerExecution, BrokerLedgerEntryItem
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
async def test_dhan_adapter_fetch_executions_with_date_range_and_charges():
    adapter = DhanBrokerAdapter(client_id="1000000001", access_token="mock_token")

    page_0_trades = [
        {
            "dhanClientId": "1000000001",
            "orderId": "ORD001",
            "exchangeTradeId": "TRD001",
            "transactionType": "BUY",
            "exchangeSegment": "NSE_EQ",
            "tradingSymbol": "INFY",
            "tradedQuantity": 50,
            "tradedPrice": 1500.0,
            "createTime": "2024-10-01 09:30:00",
            "brokerageCharges": 20.0,
            "stt": 15.0,
            "exchangeTransactionCharges": 2.5,
            "sebiTax": 0.15,
            "stampDuty": 3.75,
            "serviceTax": 4.10,
        }
    ]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = page_0_trades

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp

        from_dt = datetime(2024, 10, 1, tzinfo=timezone.utc)
        to_dt = datetime(2024, 10, 15, tzinfo=timezone.utc)
        executions = await adapter.fetch_executions(from_date=from_dt, to_date=to_dt)

        assert len(executions) == 1
        ex = executions[0]
        assert ex.external_id == "dhan_TRD001"
        assert ex.symbol == "INFY"
        assert ex.brokerage == Decimal("20.0")
        assert ex.stt == Decimal("15.0")
        assert ex.exchange_turnover == Decimal("2.5")
        assert ex.sebi_turnover == Decimal("0.15")
        assert ex.stamp_duty == Decimal("3.75")
        assert ex.gst == Decimal("4.1")
        assert ex.total_charges == Decimal("45.50")
        assert ex.charge_provenance == "broker_reported"
        assert ex.commission == Decimal("20.0")
        assert ex.fees == Decimal("25.50")


@pytest.mark.asyncio
async def test_dhan_adapter_fetch_ledger():
    adapter = DhanBrokerAdapter(client_id="1000000001", access_token="mock_token")

    mock_ledger_data = [
        {
            "dhanClientId": "1000000001",
            "narration": "Funds Payin through UPI",
            "voucherDate": "2024-10-01 10:00:00",
            "voucherNumber": "VOUCH1001",
            "exchange": "NSE",
            "debit": 0.0,
            "credit": 50000.0,
            "runningbalance": 50000.0,
        },
        {
            "dhanClientId": "1000000001",
            "narration": "NSE Equity Settlement Charges",
            "voucherDate": "2024-10-02 18:00:00",
            "voucherNumber": "VOUCH1002",
            "exchange": "NSE",
            "debit": 45.50,
            "credit": 0.0,
            "runningbalance": 49954.50,
        },
    ]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_ledger_data

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp

        from_dt = datetime(2024, 10, 1, tzinfo=timezone.utc)
        to_dt = datetime(2024, 10, 31, tzinfo=timezone.utc)
        ledger_entries = await adapter.fetch_ledger(from_date=from_dt, to_date=to_dt)

        assert len(ledger_entries) == 2
        assert ledger_entries[0].credit == Decimal("50000.0")
        assert ledger_entries[0].voucher_number == "VOUCH1001"
        assert ledger_entries[1].debit == Decimal("45.50")
        assert ledger_entries[1].running_balance == Decimal("49954.50")


@pytest.mark.asyncio
async def test_dhan_sync_trades_matching_and_single_deduction():
    """Verify that opposite executions match, gross P&L is calculated accurately, and charges are deducted exactly once."""
    mock_db = AsyncMock()
    service = BrokerSyncService(mock_db)

    user_id = uuid.uuid4()
    conn = MagicMock()
    conn.client_id = "1000000001"
    conn.encrypted_access_token = encrypt_token("mock_token")
    conn.account_id = uuid.uuid4()

    with patch.object(service, "get_connection", return_value=conn):
        mock_adapter = MagicMock()
        mock_buy = BrokerExecution(
            external_id="dhan_TRD_B1",
            order_id="ORD1",
            symbol="RELIANCE",
            side="buy",
            quantity=Decimal("10"),
            price=Decimal("2500.0"),
            brokerage=Decimal("20.0"),
            stt=Decimal("25.0"),
            total_charges=Decimal("45.0"),
            commission=Decimal("20.0"),
            fees=Decimal("25.0"),
            executed_at=datetime(2024, 10, 1, 9, 30, tzinfo=timezone.utc),
            charge_provenance="broker_reported",
        )
        mock_sell = BrokerExecution(
            external_id="dhan_TRD_S1",
            order_id="ORD2",
            symbol="RELIANCE",
            side="sell",
            quantity=Decimal("10"),
            price=Decimal("2550.0"),
            brokerage=Decimal("20.0"),
            stt=Decimal("25.0"),
            total_charges=Decimal("45.0"),
            commission=Decimal("20.0"),
            fees=Decimal("25.0"),
            executed_at=datetime(2024, 10, 1, 14, 30, tzinfo=timezone.utc),
            charge_provenance="broker_reported",
        )
        mock_adapter.fetch_executions = AsyncMock(return_value=[mock_buy, mock_sell])
        mock_adapter.fetch_ledger = AsyncMock(return_value=[])

        with patch("app.services.broker_sync_service.get_broker_adapter", return_value=mock_adapter):
            # Mock DB queries:
            # 1. Existing execution IDs -> empty
            # 2. Match open trade -> first none, second returns the created trade
            mock_res_existing = MagicMock()
            mock_res_existing.fetchall.return_value = []

            # First match trade call returns None (buy execution)
            mock_res_match_1 = MagicMock()
            mock_res_match_1.scalar_one_or_none.return_value = None

            created_trade = None

            def mock_add(entity):
                nonlocal created_trade
                if hasattr(entity, "symbol") and hasattr(entity, "direction"):
                    created_trade = entity

            mock_db.add = MagicMock(side_effect=mock_add)

            # When sell execution executes, matched trade should be the created_trade
            def execute_mock_side_effect(stmt):
                m = MagicMock()
                sql = str(stmt)
                if "executions.external_id" in sql:
                    m.fetchall.return_value = []
                elif "trades.direction" in sql:
                    m.scalar_one_or_none.return_value = created_trade
                elif "broker_ledger_entries" in sql:
                    m.fetchall.return_value = []
                return m

            mock_db.execute.side_effect = execute_mock_side_effect

            result = await service.sync_trades(user_id=user_id, broker_id="dhan", sync_ledger=False)

            assert result["broker_id"] == "dhan"
            assert result["total_fetched"] == 2
            assert result["new_executions"] == 2

            # Verify matched trade state
            assert created_trade is not None
            assert created_trade.status == "closed"
            assert created_trade.exit_price == Decimal("2550.0")
            # Gross P&L: (2550 - 2500) * 10 = 500
            assert created_trade.gross_pnl == Decimal("500.0")
            # Total Commission: 20 + 20 = 40; Fees: 25 + 25 = 50. Total Charges = 90
            assert created_trade.commission == Decimal("40.0")
            assert created_trade.fees == Decimal("50.0")
            # Net P&L = Gross P&L - (commission + fees) = 500 - 90 = 410
            assert created_trade.net_pnl == Decimal("410.0")


@pytest.mark.asyncio
async def test_get_charges_summary():
    mock_db = AsyncMock()
    service = BrokerSyncService(mock_db)
    user_id = uuid.uuid4()

    mock_trade1 = MagicMock()
    mock_trade1.charges_breakdown = {
        "brokerage": 20.0,
        "stt": 15.0,
        "exchange_turnover": 2.5,
        "sebi_turnover": 0.15,
        "stamp_duty": 3.0,
        "gst": 4.10,
        "total_charges": 44.75,
    }
    mock_trade1.charge_provenance = "broker_reported"

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_trade1]
    mock_db.execute.return_value = mock_res

    summary = await service.get_charges_summary(user_id=user_id, broker_id="dhan")

    assert summary["broker_id"] == "dhan"
    assert summary["trade_count"] == 1
    assert summary["charges"]["brokerage"] == 20.0
    assert summary["charges"]["stt"] == 15.0
    assert summary["charges"]["total_charges"] == 44.75
    assert summary["provenance_distribution"]["broker_reported"] == 1


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
