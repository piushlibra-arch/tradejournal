from datetime import datetime, timezone

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_assistant_insights_with_no_trades(auth_client: AsyncClient):
    res = await auth_client.get("/api/v1/assistant/insights")
    assert res.status_code == 200
    data = res.json()
    assert "No historical trades found" in data["summary"]
    assert "Correlation does not imply causation" in data["disclaimer"]


@pytest.mark.asyncio
async def test_assistant_insights_with_trades_and_mistakes(auth_client: AsyncClient):
    # Create account
    acc_res = await auth_client.post(
        "/api/v1/accounts",
        json={"name": "AI Test Account", "currency": "USD", "initial_balance": "50000.00"},
    )
    account_id = acc_res.json()["id"]

    # Add a winning trade
    await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": account_id,
            "symbol": "NQ",
            "direction": "long",
            "entry_time": datetime.now(timezone.utc).isoformat(),
            "entry_price": "20000.00",
            "exit_price": "20050.00",
            "quantity": "2.00",
            "contract_size": "20.00",
        },
    )

    # Add a losing trade with a mistake tag
    await auth_client.post(
        "/api/v1/trades",
        json={
            "account_id": account_id,
            "symbol": "NQ",
            "direction": "short",
            "entry_time": datetime.now(timezone.utc).isoformat(),
            "entry_price": "20050.00",
            "exit_price": "20080.00",
            "quantity": "2.00",
            "contract_size": "20.00",
            "mistake_classification": "FOMO chasing high",
        },
    )

    # Query assistant insights
    res = await auth_client.get("/api/v1/assistant/insights")
    assert res.status_code == 200
    data = res.json()
    assert data["metrics"]["total_trades"] == 2
    assert "Correlation does not imply causation" in data["disclaimer"]
    assert any("FOMO chasing high" in i for i in data["insights"])

    # Query specific question
    query_res = await auth_client.post(
        "/api/v1/assistant/query",
        json={"query": "What are my costliest mistakes?"},
    )
    assert query_res.status_code == 200
    q_data = query_res.json()
    assert "mistakes" in q_data["summary"].lower()
