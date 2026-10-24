import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_account(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/v1/accounts",
        json={
            "name": "Futures Funded Account",
            "broker_name": "Apex Trader Funding",
            "account_type": "funded",
            "currency": "USD",
            "initial_balance": "50000.00",
        },
    )
    assert res.status_code == 201
    account = res.json()
    assert account["name"] == "Futures Funded Account"
    assert account["account_type"] == "funded"
    assert account["currency"] == "USD"
    assert float(account["initial_balance"]) == 50000.00
    account_id = account["id"]

    # Get single account
    get_res = await auth_client.get(f"/api/v1/accounts/{account_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == account_id


@pytest.mark.asyncio
async def test_list_accounts(auth_client: AsyncClient):
    await auth_client.post(
        "/api/v1/accounts",
        json={"name": "Account Alpha", "currency": "USD", "initial_balance": "10000.00"},
    )
    await auth_client.post(
        "/api/v1/accounts",
        json={"name": "Account Beta", "currency": "EUR", "initial_balance": "25000.00"},
    )

    res = await auth_client.get("/api/v1/accounts")
    assert res.status_code == 200
    accounts = res.json()
    assert len(accounts) >= 2


@pytest.mark.asyncio
async def test_update_account(auth_client: AsyncClient):
    create_res = await auth_client.post(
        "/api/v1/accounts",
        json={"name": "Original Account", "currency": "USD", "initial_balance": "5000.00"},
    )
    account_id = create_res.json()["id"]

    patch_res = await auth_client.patch(
        f"/api/v1/accounts/{account_id}",
        json={"name": "Renamed Account", "initial_balance": "7500.00"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Renamed Account"
    assert float(patch_res.json()["initial_balance"]) == 7500.00


@pytest.mark.asyncio
async def test_delete_account_archives(auth_client: AsyncClient):
    create_res = await auth_client.post(
        "/api/v1/accounts",
        json={"name": "To Archive", "currency": "USD"},
    )
    account_id = create_res.json()["id"]

    del_res = await auth_client.delete(f"/api/v1/accounts/{account_id}")
    assert del_res.status_code == 204

    # Verification: account is archived, not hard deleted, to preserve historical trade integrity
    get_res = await auth_client.get(f"/api/v1/accounts/{account_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "archived"


@pytest.mark.asyncio
async def test_account_user_isolation(client: AsyncClient):
    # Register user 1
    u1 = uuid.uuid4().hex[:8]
    await client.post(
        "/api/v1/auth/register",
        json={"email": f"u1_{u1}@example.com", "password": "Password123!", "first_name": "U1", "last_name": "Test"},
    )
    l1 = await client.post("/api/v1/auth/login", json={"email": f"u1_{u1}@example.com", "password": "Password123!"})
    token1 = l1.json()["access_token"]

    # Register user 2
    u2 = uuid.uuid4().hex[:8]
    await client.post(
        "/api/v1/auth/register",
        json={"email": f"u2_{u2}@example.com", "password": "Password123!", "first_name": "U2", "last_name": "Test"},
    )
    l2 = await client.post("/api/v1/auth/login", json={"email": f"u2_{u2}@example.com", "password": "Password123!"})
    token2 = l2.json()["access_token"]

    # User 1 creates account
    headers1 = {"Authorization": f"Bearer {token1}"}
    create_res = await client.post(
        "/api/v1/accounts",
        headers=headers1,
        json={"name": "User 1 Private Account", "currency": "USD"},
    )
    acc_id = create_res.json()["id"]

    # User 2 attempts to read User 1's account
    headers2 = {"Authorization": f"Bearer {token2}"}
    unauth_get = await client.get(f"/api/v1/accounts/{acc_id}", headers=headers2)
    assert unauth_get.status_code in [403, 404]

    # User 2 attempts to update User 1's account
    unauth_patch = await client.patch(
        f"/api/v1/accounts/{acc_id}",
        headers=headers2,
        json={"name": "Hacked Name"},
    )
    assert unauth_patch.status_code in [403, 404]
