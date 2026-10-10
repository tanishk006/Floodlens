"""Tests for Pydantic data schemas and contract validation."""

import pytest
from pydantic import ValidationError

from floodlens_ml.schemas import (
    CandidateZone,
    DataQualityReport,
    FactorContribution,
    FeatureInput,
    RiskScoreResult,
    ScenarioInfo,
)


def test_candidate_zone_coordinate_validation() -> None:
    # Valid coordinates: [lon, lat]
    zone = CandidateZone(
        id="zone-test",
        name="Test Zone",
        state="Test State",
        coordinates=(80.5, 26.5),
        aoi_bbox=(80.0, 26.0, 81.0, 27.0),
        data_status="insufficient_data",
        sources=[],
    )
    assert zone.coordinates == (80.5, 26.5)

    # Invalid longitude (> 180)
    with pytest.raises(ValidationError):
        CandidateZone(
            id="zone-bad-lon",
            name="Bad Lon",
            state="State",
            coordinates=(185.0, 20.0),
            data_status="insufficient_data",
        )

    # Invalid latitude (> 90)
    with pytest.raises(ValidationError):
        CandidateZone(
            id="zone-bad-lat",
            name="Bad Lat",
            state="State",
            coordinates=(80.0, 95.0),
            data_status="insufficient_data",
        )

    # Invalid bbox: west >= east
    with pytest.raises(ValidationError):
        CandidateZone(
            id="zone-bad-bbox",
            name="Bad BBox",
            state="State",
            coordinates=(80.0, 20.0),
            aoi_bbox=(82.0, 20.0, 80.0, 22.0),
            data_status="insufficient_data",
        )


def test_risk_score_result_consistency_rules() -> None:
    scenario = ScenarioInfo(
        id="moderate",
        label="Moderate",
        rainfall_mm_per_hour=35.0,
        assumption="ASSUMPTION",
    )

    # When status is insufficient_data, risk_index MUST be None
    with pytest.raises(ValidationError, match="risk_index must be None"):
        RiskScoreResult(
            scenario=scenario,
            risk_index=45.0,
            risk_category="insufficient_data",
            data_quality=DataQualityReport(
                status="insufficient_data", missing_inputs=["elevation"]
            ),
            model_version="0.1.0",
            generated_at="2026-10-11T00:00:00Z",
            limitations=["Limitation"],
        )

    # When status is available, risk_index CANNOT be None
    with pytest.raises(ValidationError, match="risk_index must be provided"):
        RiskScoreResult(
            scenario=scenario,
            risk_index=None,
            risk_category="moderate",
            data_quality=DataQualityReport(status="available", missing_inputs=[]),
            model_version="0.1.0",
            generated_at="2026-10-11T00:00:00Z",
            limitations=["Limitation"],
        )


def test_is_probability_strictly_false() -> None:
    scenario = ScenarioInfo(
        id="light",
        label="Light",
        rainfall_mm_per_hour=7.5,
        assumption="ASSUMPTION",
    )

    # Default is_probability is False
    res = RiskScoreResult(
        scenario=scenario,
        risk_index=30.0,
        risk_category="moderate",
        data_quality=DataQualityReport(status="available", missing_inputs=[]),
        model_version="0.1.0",
        generated_at="2026-10-11T00:00:00Z",
        limitations=["Limitation"],
    )
    assert res.is_probability is False

    # Attempting to set is_probability to True is forbidden by literal typing
    with pytest.raises(ValidationError):
        RiskScoreResult(
            scenario=scenario,
            risk_index=30.0,
            risk_category="moderate",
            is_probability=True,  # type: ignore[arg-type]
            data_quality=DataQualityReport(status="available", missing_inputs=[]),
            model_version="0.1.0",
            generated_at="2026-10-11T00:00:00Z",
            limitations=["Limitation"],
        )


def test_factor_contribution_validation() -> None:
    factor = FactorContribution(
        factor_name="rainfall",
        raw_value=35.0,
        normalized_value=0.3043,
        weight=0.30,
        weighted_score=9.13,
        available=True,
        interpretation="Rainfall contribution",
    )
    assert factor.weight == 0.30
    assert factor.available is True

    # Weight > 1.0 rejected
    with pytest.raises(ValidationError):
        FactorContribution(
            factor_name="rainfall",
            weight=1.5,
            available=True,
            interpretation="Invalid weight",
        )


def test_feature_input_missing_detection() -> None:
    feats = FeatureInput(
        elevation_m=None,
        local_relief_m=1.0,
        slope_deg=None,
        flow_accumulation=500.0,
        rainfall_mm_per_hour=35.0,
    )
    missing = feats.missing_features()
    assert missing == ["elevation_m", "slope_deg"]
    assert feats.has_all_features() is False
