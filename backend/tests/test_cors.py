"""Tests for CORS configuration."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_cors_headers_returned_for_vite_origin() -> None:
    client = TestClient(create_app())
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/api/zones", headers=headers)

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_headers_on_risk_estimate() -> None:
    client = TestClient(create_app())
    headers = {
        "Origin": "http://localhost:5173",
    }
    response = client.post(
        "/api/risk/estimate",
        json={"zone_id": "zone-uttar-pradesh", "scenario_id": "moderate"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
