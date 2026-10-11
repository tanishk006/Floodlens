"""Tests for POST /api/risk/estimate endpoint."""

from unittest.mock import patch

from fastapi.testclient import TestClient
from floodlens_ml.schemas import RiskScoreResult

from app.core.config import Settings, get_settings
from app.main import create_app


def test_valid_pilot_zone_risk_estimate() -> None:
    client = TestClient(create_app())
    payload = {
        "zone_id": "zone-uttar-pradesh",
        "scenario_id": "moderate",
    }
    response = client.post("/api/risk/estimate", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Validate against canonical ML schema
    result = RiskScoreResult.model_validate(data)
    assert result.zone_id == "zone-uttar-pradesh"
    assert result.locality == "Uttar Pradesh Monitoring Zone"
    assert result.coordinates == (80.9462, 26.8467)
    assert result.risk_index is not None
    assert 0.0 <= result.risk_index <= 100.0
    assert result.risk_category == "low"
    assert result.is_probability is False
    assert result.data_quality.status == "available"
    assert len(result.data_quality.missing_inputs) == 0
    assert result.scenario.id == "moderate"
    assert result.scenario.rainfall_mm_per_hour == 35.0
    assert len(result.factors) == 5
    assert all(f.available is True for f in result.factors)
    assert len(result.limitations) >= 4


def test_valid_risk_request_insufficient_data() -> None:
    client = TestClient(create_app())
    from floodlens_ml.schemas import CandidateZone

    unverified = CandidateZone(
        id="zone-unverified-test",
        name="Test Unverified Zone",
        state="Test State",
        coordinates=(78.0, 21.0),
        data_status="insufficient_data",
    )
    with patch("app.services.risk.find_candidate_zone_by_id", return_value=unverified):
        payload = {
            "zone_id": "zone-unverified-test",
            "scenario_id": "moderate",
        }
        response = client.post("/api/risk/estimate", json=payload)

        assert response.status_code == 200
        data = response.json()

        # Validate against canonical ML schema
        result = RiskScoreResult.model_validate(data)
        assert result.zone_id == "zone-unverified-test"
        assert result.locality == "Test Unverified Zone"
        assert result.coordinates == (78.0, 21.0)
        assert result.risk_index is None
        assert result.risk_category == "insufficient_data"
        assert result.is_probability is False
        assert result.data_quality.status == "insufficient_data"
        assert len(result.data_quality.missing_inputs) >= 4
        assert result.scenario.id == "moderate"
        assert result.scenario.rainfall_mm_per_hour == 35.0
        assert len(result.factors) == 5
        assert len(result.limitations) >= 4


def test_valid_risk_request_custom_rainfall() -> None:
    client = TestClient(create_app())
    payload = {
        "zone_id": "zone-bihar",
        "scenario_id": "heavy",
        "rainfall_mm_per_hour": 50.0,
    }
    response = client.post("/api/risk/estimate", json=payload)

    assert response.status_code == 200
    data = response.json()
    result = RiskScoreResult.model_validate(data)
    assert result.zone_id == "zone-bihar"
    assert result.scenario.rainfall_mm_per_hour == 50.0
    assert result.risk_index is not None
    assert 0.0 <= result.risk_index <= 100.0


def test_all_ten_zones_risk_estimate() -> None:
    client = TestClient(create_app())
    resp = client.get("/api/zones")
    assert resp.status_code == 200
    zones = resp.json()["zones"]
    assert len(zones) == 10

    for z in zones:
        res = client.post(
            "/api/risk/estimate",
            json={"zone_id": z["id"], "scenario_id": "moderate"},
        )
        assert res.status_code == 200
        data = res.json()
        result = RiskScoreResult.model_validate(data)
        assert result.zone_id == z["id"]
        assert result.risk_index is not None
        assert 0.0 <= result.risk_index <= 100.0
        assert result.risk_category in ("low", "moderate", "high", "severe")
        assert result.data_quality.status == "available"
        assert result.is_probability is False
        assert len(result.factors) == 5
        assert all(f.available is True for f in result.factors)


def test_pilot_zone_custom_rainfall() -> None:
    client = TestClient(create_app())
    payload = {
        "zone_id": "zone-uttar-pradesh",
        "scenario_id": "moderate",
        "rainfall_mm_per_hour": 65.0,
    }
    response = client.post("/api/risk/estimate", json=payload)

    assert response.status_code == 200
    data = response.json()
    result = RiskScoreResult.model_validate(data)
    assert result.zone_id == "zone-uttar-pradesh"
    assert result.scenario.rainfall_mm_per_hour == 65.0
    assert result.risk_index is not None
    assert result.risk_category == "moderate"


def test_invalid_zone_id_returns_outside_coverage() -> None:
    client = TestClient(create_app())
    payload = {
        "zone_id": "zone-atlantis",
        "scenario_id": "moderate",
    }
    response = client.post("/api/risk/estimate", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "outside_coverage"
    assert "outside covered monitoring zones" in data["message"]


def test_unsupported_scenario_returns_invalid_input() -> None:
    client = TestClient(create_app())
    payload = {
        "zone_id": "zone-uttar-pradesh",
        "scenario_id": "monsoon_super_deluge",
    }
    response = client.post("/api/risk/estimate", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "invalid_input"
    assert "monsoon_super_deluge" in data["message"]


def test_missing_required_request_body() -> None:
    client = TestClient(create_app())
    response = client.post("/api/risk/estimate", json={})

    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "invalid_input"
    assert data["message"] == "Request input is invalid."


def test_negative_rainfall_returns_invalid_input() -> None:
    client = TestClient(create_app())
    payload = {
        "zone_id": "zone-uttar-pradesh",
        "rainfall_mm_per_hour": -10.0,
    }
    response = client.post("/api/risk/estimate", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "invalid_input"


def test_data_unavailable_error_handling() -> None:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        app_name="Test API",
        model_config_path="nonexistent_config_file.yaml",
    )
    client = TestClient(app)
    payload = {
        "zone_id": "zone-uttar-pradesh",
        "scenario_id": "moderate",
    }
    response = client.post("/api/risk/estimate", json=payload)

    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "data_unavailable"
    assert "unavailable" in data["message"]


def test_no_leakage_of_internal_exception_details() -> None:
    app = create_app()
    client = TestClient(app, raise_server_exceptions=False)

    with patch(
        "app.services.risk.find_candidate_zone_by_id",
        side_effect=RuntimeError("internal secret connection string"),
    ):
        payload = {
            "zone_id": "zone-uttar-pradesh",
            "scenario_id": "moderate",
        }
        response = client.post("/api/risk/estimate", json=payload)

    assert response.status_code == 500
    data = response.json()
    assert data["status"] == "internal_error"
    assert data["message"] == "An internal error occurred."
    assert "internal secret connection string" not in response.text
