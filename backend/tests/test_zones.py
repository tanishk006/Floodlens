"""Tests for GET /api/zones endpoint."""

from fastapi.testclient import TestClient
from floodlens_ml.schemas import CandidateZone

from app.main import create_app
from app.schemas.zones import ZonesResponse


def test_get_zones_returns_all_ten_candidate_zones() -> None:
    client = TestClient(create_app())
    response = client.get("/api/zones")

    assert response.status_code == 200
    data = response.json()

    # Validate against ZonesResponse Pydantic schema
    validated = ZonesResponse.model_validate(data)
    assert validated.total == 10
    assert len(validated.zones) == 10
    assert "Candidate monitoring zones" in validated.disclaimer

    expected_states = {
        "Uttar Pradesh",
        "Bihar",
        "Punjab",
        "Rajasthan",
        "Assam",
        "West Bengal",
        "Haryana",
        "Odisha",
        "Andhra Pradesh",
        "Gujarat",
    }
    actual_states = {z.state for z in validated.zones}
    assert actual_states == expected_states

    for zone in validated.zones:
        assert isinstance(zone, CandidateZone)
        assert zone.data_status == "insufficient_data"
        assert zone.sources == []
        lon, lat = zone.coordinates
        assert -180 <= lon <= 180
        assert -90 <= lat <= 90
        # Longitude, latitude within India's approximate bounds
        assert 68.0 <= lon <= 98.0
        assert 8.0 <= lat <= 38.0
        assert "unverified" in (zone.notes or "")
