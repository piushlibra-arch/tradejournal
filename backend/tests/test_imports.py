import pytest
from httpx import AsyncClient


@pytest.fixture
async def import_account_id(auth_client: AsyncClient) -> str:
    res = await auth_client.post(
        "/api/v1/accounts",
        json={"name": "Import Test Account", "currency": "USD", "initial_balance": "50000.00"},
    )
    return res.json()["id"]


SAMPLE_CSV = """symbol,direction,entry_time,exit_time,entry_price,exit_price,quantity,contract_size,commission,fees,net_pnl,setup_name,external_id
AAPL,long,2024-03-01 14:30:00,2024-03-01 15:45:00,180.50,182.25,100,1,1.50,0.50,173.00,Breakout,CSV-EXT-1
NQ,short,2024-03-02 10:00:00,2024-03-02 11:15:00,18250.00,18200.00,2,20,8.00,2.40,1989.60,FVG,CSV-EXT-2
EURUSD,long,2024-03-03 08:30:00,2024-03-03 12:00:00,1.08500,1.08900,1,100000,4.00,0.00,396.00,Sweep,CSV-EXT-3
"""

SAMPLE_CSV_WITH_ERRORS = """ticker,side,open_time,close_price,qty
INVALID,,not-a-date,-10,0
TSLA,buy,2024-03-04 10:00:00,210.00,10
"""


@pytest.mark.asyncio
async def test_download_template(client: AsyncClient):
    res = await client.get("/api/v1/imports/template/download")
    assert res.status_code == 200
    assert "symbol,direction" in res.text
    assert "text/csv" in res.headers["content-type"]


@pytest.mark.asyncio
async def test_preview_csv(auth_client: AsyncClient, import_account_id: str):
    res = await auth_client.post(
        "/api/v1/imports/preview",
        json={
            "account_id": import_account_id,
            "csv_content": SAMPLE_CSV,
            "broker_source": "generic",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["delimiter"] == ","
    assert "symbol" in data["headers"]
    assert data["suggested_mapping"]["symbol"] == "symbol"
    assert data["suggested_mapping"]["direction"] == "direction"
    assert len(data["sample_rows"]) == 3


@pytest.mark.asyncio
async def test_validate_and_confirm_import(auth_client: AsyncClient, import_account_id: str):
    mapping = {
        "symbol": "symbol",
        "direction": "direction",
        "entry_time": "entry_time",
        "exit_time": "exit_time",
        "entry_price": "entry_price",
        "exit_price": "exit_price",
        "quantity": "quantity",
        "contract_size": "contract_size",
        "commission": "commission",
        "fees": "fees",
        "net_pnl": "net_pnl",
        "setup_name": "setup_name",
        "external_id": "external_id",
    }

    # 1. Validate
    val_res = await auth_client.post(
        "/api/v1/imports/validate",
        json={
            "account_id": import_account_id,
            "csv_content": SAMPLE_CSV,
            "column_mapping": mapping,
        },
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid_rows_count"] == 3
    assert val_data["duplicate_rows_count"] == 0
    assert val_data["error_rows_count"] == 0

    # 2. Confirm
    conf_res = await auth_client.post(
        "/api/v1/imports/confirm",
        json={
            "account_id": import_account_id,
            "csv_content": SAMPLE_CSV,
            "column_mapping": mapping,
            "filename": "my_trades.csv",
        },
    )
    assert conf_res.status_code == 200
    conf_data = conf_res.json()
    assert conf_data["imported_rows"] == 3
    assert conf_data["skipped_rows"] == 0

    # 3. Verify Trades created in database
    trades_res = await auth_client.get("/api/v1/trades", params={"account_id": import_account_id})
    assert trades_res.status_code == 200
    trades_list = trades_res.json()["trades"]
    assert len(trades_list) == 3

    symbols = [t["symbol"] for t in trades_list]
    assert "AAPL" in symbols
    assert "NQ" in symbols
    assert "EURUSD" in symbols

    # 4. Duplicate Detection: Re-import same CSV
    val_dup = await auth_client.post(
        "/api/v1/imports/validate",
        json={
            "account_id": import_account_id,
            "csv_content": SAMPLE_CSV,
            "column_mapping": mapping,
        },
    )
    assert val_dup.status_code == 200
    # All 3 have identical external_id and must be flagged as duplicates
    assert val_dup.json()["duplicate_rows_count"] == 3


@pytest.mark.asyncio
async def test_validation_captures_malformed_rows(auth_client: AsyncClient, import_account_id: str):
    mapping = {
        "symbol": "ticker",
        "direction": "side",
        "entry_time": "open_time",
        "entry_price": "close_price",
        "quantity": "qty",
    }
    val_res = await auth_client.post(
        "/api/v1/imports/validate",
        json={
            "account_id": import_account_id,
            "csv_content": SAMPLE_CSV_WITH_ERRORS,
            "column_mapping": mapping,
        },
    )
    assert val_res.status_code == 200
    data = val_res.json()
    assert data["error_rows_count"] == 1
    assert data["valid_rows_count"] == 1
    assert "Invalid direction" in data["errors"][0]["error_message"]
