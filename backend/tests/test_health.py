import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_liveness(client: AsyncClient):
    # Both /health and /api/health should respond 200
    res1 = await client.get("/health")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "healthy"
    assert "app" in data1
    assert "database" not in data1  # liveness does not leak internal db info
    assert "password" not in str(data1).lower()

    res2 = await client.get("/api/health")
    assert res2.status_code == 200
    assert res2.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_readiness_check_database(client: AsyncClient):
    # Both /health/ready and /api/health/ready should respond 200 when DB is connected
    res1 = await client.get("/health/ready")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "ready"
    assert data1["database"] == "connected"
    assert "password" not in str(data1).lower()
    assert "postgresql" not in str(data1).lower()

    res2 = await client.get("/api/health/ready")
    assert res2.status_code == 200
    assert res2.json()["status"] == "ready"
