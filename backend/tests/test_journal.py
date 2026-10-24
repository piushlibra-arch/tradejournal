import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_journal_entry(auth_client: AsyncClient):
    payload = {
        "date": "2026-10-24",
        "pre_market_plan": "Look for longs around 20,400 liquidity sweep on NQ. Risk 1% max.",
        "post_market_review": "Executed the long plan cleanly. Locked profits at 20,460.",
        "lessons_learned": "Patience paid off waiting for the 9:45 AM candle close.",
        "emotional_state": "Calm & Focused",
        "discipline_score": 9,
        "market_bias": "Bullish",
        "screenshots": [{"title": "NQ 5m Entry", "url": "https://example.com/screenshot1.png"}],
    }
    res = await auth_client.post("/api/v1/journal", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["date"] == "2026-10-24"
    assert data["pre_market_plan"] == payload["pre_market_plan"]
    assert data["discipline_score"] == 9
    assert data["market_bias"] == "Bullish"

    # Fetch entry by date
    get_res = await auth_client.get("/api/v1/journal/2026-10-24")
    assert get_res.status_code == 200
    entry = get_res.json()
    assert entry["id"] == data["id"]
    assert entry["post_market_review"] == payload["post_market_review"]


@pytest.mark.asyncio
async def test_update_existing_journal_entry_on_upsert(auth_client: AsyncClient):
    # Initial save
    await auth_client.post(
        "/api/v1/journal",
        json={
            "date": "2026-10-25",
            "pre_market_plan": "Initial note",
            "discipline_score": 7,
        },
    )

    # Upsert with updated notes
    res = await auth_client.post(
        "/api/v1/journal",
        json={
            "date": "2026-10-25",
            "pre_market_plan": "Updated note after morning meeting",
            "discipline_score": 8,
            "emotional_state": "Confident",
        },
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["pre_market_plan"] == "Updated note after morning meeting"
    assert updated["discipline_score"] == 8
    assert updated["emotional_state"] == "Confident"


@pytest.mark.asyncio
async def test_list_journal_entries_with_date_range(auth_client: AsyncClient):
    dates = ["2026-10-01", "2026-10-05", "2026-10-15", "2026-10-20"]
    for d in dates:
        await auth_client.post(
            "/api/v1/journal",
            json={
                "date": d,
                "pre_market_plan": f"Plan for {d}",
                "discipline_score": 8,
            },
        )

    # Filter between 10-04 and 10-16
    res = await auth_client.get("/api/v1/journal?start_date=2026-10-04&end_date=2026-10-16")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2
    returned_dates = [item["date"] for item in body["items"]]
    assert "2026-10-15" in returned_dates
    assert "2026-10-05" in returned_dates
    assert "2026-10-01" not in returned_dates


@pytest.mark.asyncio
async def test_delete_journal_entry(auth_client: AsyncClient):
    await auth_client.post(
        "/api/v1/journal",
        json={"date": "2026-10-26", "pre_market_plan": "Will delete"},
    )
    del_res = await auth_client.delete("/api/v1/journal/2026-10-26")
    assert del_res.status_code == 204

    # Subsequent GET returns 404
    get_res = await auth_client.get("/api/v1/journal/2026-10-26")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_journal_user_isolation(client: AsyncClient):
    import uuid

    # Register user 1
    u1 = uuid.uuid4().hex[:8]
    await client.post(
        "/api/v1/auth/register",
        json={"email": f"j1_{u1}@example.com", "password": "Password123!", "first_name": "J1", "last_name": "Test"},
    )
    l1 = await client.post("/api/v1/auth/login", json={"email": f"j1_{u1}@example.com", "password": "Password123!"})
    token1 = l1.json()["access_token"]

    # Register user 2
    u2 = uuid.uuid4().hex[:8]
    await client.post(
        "/api/v1/auth/register",
        json={"email": f"j2_{u2}@example.com", "password": "Password123!", "first_name": "J2", "last_name": "Test"},
    )
    l2 = await client.post("/api/v1/auth/login", json={"email": f"j2_{u2}@example.com", "password": "Password123!"})
    token2 = l2.json()["access_token"]

    # User 1 creates entry
    await client.post(
        "/api/v1/journal",
        headers={"Authorization": f"Bearer {token1}"},
        json={"date": "2026-10-27", "pre_market_plan": "User 1 secret trading notes"},
    )

    # User 2 cannot see it
    b_get = await client.get("/api/v1/journal/2026-10-27", headers={"Authorization": f"Bearer {token2}"})
    assert b_get.status_code == 404

    # User 2 list does not contain it
    b_list = await client.get("/api/v1/journal", headers={"Authorization": f"Bearer {token2}"})
    assert b_list.status_code == 200
    assert not any(item["date"] == "2026-10-27" for item in b_list.json()["items"])
