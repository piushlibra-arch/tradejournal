import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    unique = uuid.uuid4().hex[:8]
    email = f"user_{unique}@example.com"
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "first_name": "John",
            "last_name": "Doe",
            "timezone": "UTC",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == email.lower()
    assert data["first_name"] == "John"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    unique = uuid.uuid4().hex[:8]
    email = f"dup_{unique}@example.com"
    payload = {
        "email": email,
        "password": "Password123!",
        "first_name": "Jane",
        "last_name": "Doe",
    }
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    unique = uuid.uuid4().hex[:8]
    email = f"login_{unique}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "first_name": "Alice",
            "last_name": "Smith",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    unique = uuid.uuid4().hex[:8]
    email = f"badpass_{unique}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "first_name": "Bob",
            "last_name": "Builder",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword999!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(auth_client: AsyncClient):
    response = await auth_client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Trader"
    assert data["last_name"] == "Pro"
    assert data["timezone"] == "America/New_York"


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client: AsyncClient):
    # Ensure authorization header is removed if any
    headers = dict(client.headers)
    headers.pop("Authorization", None)
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
