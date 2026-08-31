"""
tests/test_health.py — Health endpoint tests.
"""
import pytest


@pytest.mark.asyncio
async def test_health_root(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "VoxDetect" in data["service"]
    assert "version" in data


@pytest.mark.asyncio
async def test_v1_health(client):
    resp = await client.get("/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "ml_service" in data


@pytest.mark.asyncio
async def test_docs_available(client):
    resp = await client.get("/docs")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_redoc_available(client):
    resp = await client.get("/redoc")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema(client):
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    assert "paths" in schema
    assert "/v1/analyze-call" in schema["paths"]
    assert "/v1/enroll" in schema["paths"]
    assert "/v1/alerts" in schema["paths"]
