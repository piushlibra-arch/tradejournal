import uuid
from decimal import Decimal
import pytest
from httpx import AsyncClient

from app.core.currency import resolve_instrument_currency, calculate_trade_pnl


@pytest.mark.asyncio
async def test_account_isolation_and_filtering(auth_client: AsyncClient):
    """
    Test account-level isolation:
    - Account A trades are isolated from Account B trades.
    - Global 'All Accounts' view aggregates both.
    """
    # 1. Create Account A (USD)
    res_a = await auth_client.post(
        "/api/v1/accounts",
        json={
            "name": "US Futures & Equities",
            "account_type": "personal",
            "currency": "USD",
            "initial_balance": 50000.0,
        },
    )
    assert res_a.status_code == 201
    account_a = res_a.json()

    # 2. Create Account B (INR)
    res_b = await auth_client.post(
        "/api/v1/accounts",
        json={
            "name": "Dhan Indian Trading",
            "account_type": "personal",
            "currency": "INR",
            "initial_balance": 200000.0,
        },
    )
    assert res_b.status_code == 201
    account_b = res_b.json()

    # 3. Create Trade in Account A
    res_t1 = await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": account_a["id"],
            "symbol": "NQ",
            "direction": "long",
            "entry_time": "2026-10-25T10:00:00Z",
            "exit_time": "2026-10-25T10:30:00Z",
            "entry_price": 20000.0,
            "exit_price": 20050.0,
            "quantity": 1.0,
            "contract_size": 20.0,
            "currency": "USD",
            "status": "closed",
        },
    )
    assert res_t1.status_code == 201
    trade_1 = res_t1.json()
    assert trade_1["currency"] == "USD"

    # 4. Create Trade in Account B
    res_t2 = await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": account_b["id"],
            "symbol": "RELIANCE",
            "direction": "long",
            "entry_time": "2026-10-25T11:00:00Z",
            "exit_time": "2026-10-25T11:45:00Z",
            "entry_price": 2800.0,
            "exit_price": 2840.0,
            "quantity": 50.0,
            "contract_size": 1.0,
            "currency": "INR",
            "status": "closed",
        },
    )
    assert res_t2.status_code == 201
    trade_2 = res_t2.json()
    assert trade_2["currency"] == "INR"

    # 5. Query Filter by Account A
    res_filtered_a = await auth_client.get(f"/api/v1/trades?account_id={account_a['id']}")
    assert res_filtered_a.status_code == 200
    data_a = res_filtered_a.json()
    trade_ids_a = [t["id"] for t in data_a["trades"]]
    assert trade_1["id"] in trade_ids_a
    assert trade_2["id"] not in trade_ids_a

    # 6. Query Filter by Account B
    res_filtered_b = await auth_client.get(f"/api/v1/trades?account_id={account_b['id']}")
    assert res_filtered_b.status_code == 200
    data_b = res_filtered_b.json()
    trade_ids_b = [t["id"] for t in data_b["trades"]]
    assert trade_2["id"] in trade_ids_b
    assert trade_1["id"] not in trade_ids_b

    # 7. Query All Accounts (unfiltered)
    res_all = await auth_client.get("/api/v1/trades")
    assert res_all.status_code == 200
    data_all = res_all.json()
    trade_ids_all = [t["id"] for t in data_all["trades"]]
    assert trade_1["id"] in trade_ids_all
    assert trade_2["id"] in trade_ids_all


@pytest.mark.asyncio
async def test_foreign_account_id_rejection(client: AsyncClient):
    """
    Verify security boundary:
    Accessing or operating on another user's account_id must result in 404 Not Found.
    """
    # 1. Register User 1
    u1_email = f"user1_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "StrongPassword123!"
    reg1 = await client.post(
        "/api/v1/auth/register",
        json={"email": u1_email, "password": pwd, "first_name": "User", "last_name": "One"},
    )
    assert reg1.status_code == 201
    log1 = await client.post("/api/v1/auth/login", json={"email": u1_email, "password": pwd})
    token1 = log1.json()["access_token"]

    # Create account for User 1
    client.headers["Authorization"] = f"Bearer {token1}"
    acc1_res = await client.post(
        "/api/v1/accounts",
        json={"name": "User 1 Account", "account_type": "personal", "currency": "USD"},
    )
    assert acc1_res.status_code == 201
    user1_account_id = acc1_res.json()["id"]

    # 2. Register User 2
    u2_email = f"user2_{uuid.uuid4().hex[:6]}@example.com"
    reg2 = await client.post(
        "/api/v1/auth/register",
        json={"email": u2_email, "password": pwd, "first_name": "User", "last_name": "Two"},
    )
    assert reg2.status_code == 201
    log2 = await client.post("/api/v1/auth/login", json={"email": u2_email, "password": pwd})
    token2 = log2.json()["access_token"]

    # User 2 operates with their token
    client.headers["Authorization"] = f"Bearer {token2}"

    # User 2 attempts to query User 1's account trades
    res_trades = await client.get(f"/api/v1/trades?account_id={user1_account_id}")
    assert res_trades.status_code == 404, f"Expected 404, got {res_trades.status_code}"

    # User 2 attempts to create trade inside User 1's account
    res_create = await client.post(
        "/api/v1/trades",
        json={
            "account_id": user1_account_id,
            "symbol": "AAPL",
            "direction": "long",
            "entry_time": "2026-10-25T10:00:00Z",
            "entry_price": 150.0,
            "quantity": 10.0,
        },
    )
    assert res_create.status_code == 404, f"Expected 404, got {res_create.status_code}"

    # User 2 attempts to query analytics for User 1's account
    res_analytics = await client.get(f"/api/v1/analytics/overview?account_id={user1_account_id}")
    assert res_analytics.status_code == 404, f"Expected 404, got {res_analytics.status_code}"


def test_currency_resolution_rules():
    """Verify instrument currency resolution across Indian, US, Forex, and Crypto."""
    # Indian instruments
    assert resolve_instrument_currency(symbol="RELIANCE", exchange="NSE") == "INR"
    assert resolve_instrument_currency(symbol="TATASTEEL.NS") == "INR"
    assert resolve_instrument_currency(symbol="INFY.BO") == "INR"
    assert resolve_instrument_currency(symbol="NIFTY", exchange="NSE") == "INR"
    assert resolve_instrument_currency(symbol="BANKNIFTY", segment="NSE_FNO") == "INR"
    assert resolve_instrument_currency(symbol="NIFTY24OCT25000CE") == "INR"

    # US instruments
    assert resolve_instrument_currency(symbol="AAPL", exchange="NASDAQ") == "USD"
    assert resolve_instrument_currency(symbol="ES", exchange="CME") == "USD"
    assert resolve_instrument_currency(symbol="NQ", exchange="CME_MINI") == "USD"

    # Forex pairs (quote currency)
    assert resolve_instrument_currency(symbol="EURUSD") == "USD"
    assert resolve_instrument_currency(symbol="USDJPY") == "JPY"
    assert resolve_instrument_currency(symbol="EURGBP") == "GBP"
    assert resolve_instrument_currency(symbol="AUDCAD") == "CAD"

    # Crypto (default USD)
    assert resolve_instrument_currency(symbol="BTCUSDT") == "USD"
    assert resolve_instrument_currency(symbol="ETHUSDT") == "USD"

    # Fallback to account currency when unknown
    assert resolve_instrument_currency(symbol="UNKNOWN", account_currency="INR") == "INR"
    assert resolve_instrument_currency(symbol="UNKNOWN", account_currency="EUR") == "EUR"


def test_decimal_safe_pnl_options_and_fees():
    """
    Ensure decimal-safe monetary arithmetic:
    - Options traded quantity is never double multiplied.
    - Commission, fees, and swap are accurately deducted.
    """
    gross, net = calculate_trade_pnl(
        direction="long",
        entry_price=Decimal("120.50"),
        exit_price=Decimal("150.75"),
        quantity=Decimal("50"),  # 1 lot of NIFTY
        contract_size=Decimal("1"),  # lot size already in quantity
        commission=Decimal("40.00"),  # Indian brokerage
        fees=Decimal("12.50"),  # STT / exchange turnover
    )

    # Gross: (150.75 - 120.50) * 50 = 30.25 * 50 = 1512.50
    assert gross == Decimal("1512.50")
    # Net: 1512.50 - 40.00 - 12.50 = 1460.00
    assert net == Decimal("1460.00")
